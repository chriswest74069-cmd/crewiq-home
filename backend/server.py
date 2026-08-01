from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

app = FastAPI(title="CrewIQ Home Edition")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("crewiq")


# ---------------- helpers ----------------
def now_iso():
    return datetime.now(timezone.utc).isoformat()


def new_id():
    return str(uuid.uuid4())


def hash_secret(s: str) -> str:
    return bcrypt.hashpw(s.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_secret(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


LEVELS = [
    (0, 1, "Recruit"),
    (100, 2, "Helper"),
    (300, 3, "Crew Member"),
    (600, 4, "Specialist"),
    (1000, 5, "Team Captain"),
    (1500, 6, "Household Hero"),
    (2500, 7, "Legend"),
]


def level_for(lifetime_points: int):
    current = LEVELS[0]
    nxt = None
    for i, tier in enumerate(LEVELS):
        if lifetime_points >= tier[0]:
            current = tier
            nxt = LEVELS[i + 1] if i + 1 < len(LEVELS) else None
    floor = current[0]
    ceil = nxt[0] if nxt else current[0]
    span = (ceil - floor) if nxt else 1
    into = lifetime_points - floor
    progress = min(100, round((into / span) * 100)) if nxt else 100
    return {
        "level": current[1],
        "rank": current[2],
        "level_floor": floor,
        "next_level_at": ceil if nxt else None,
        "next_rank": nxt[2] if nxt else None,
        "progress_pct": progress,
        "points_into_level": into,
        "points_to_next": (ceil - lifetime_points) if nxt else 0,
    }


PET_THRESHOLDS = [0, 50, 150, 300, 500, 750, 1050, 1400]
PET_TITLES = ["Hatchling", "Buddy", "Companion", "Champion", "Guardian", "Legend", "Mythic", "Cosmic"]
PET_ACCESSORIES = [
    {"level": 2, "name": "Cool Hat"},
    {"level": 3, "name": "Sunglasses"},
    {"level": 4, "name": "Hero Cape"},
    {"level": 5, "name": "Golden Crown"},
    {"level": 6, "name": "Magic Wand"},
    {"level": 7, "name": "Shining Halo"},
]


def pet_progress(xp: int):
    level = 1
    for i, t in enumerate(PET_THRESHOLDS):
        if xp >= t:
            level = i + 1
    level = min(level, len(PET_THRESHOLDS))
    floor = PET_THRESHOLDS[level - 1]
    nxt = PET_THRESHOLDS[level] if level < len(PET_THRESHOLDS) else None
    span = (nxt - floor) if nxt else 1
    pct = min(100, round(((xp - floor) / span) * 100)) if nxt else 100
    accessories = [a["name"] for a in PET_ACCESSORIES if level >= a["level"]]
    title = PET_TITLES[min(level - 1, len(PET_TITLES) - 1)]
    return {
        "level": level, "title": title, "xp": xp,
        "next_level_at": nxt, "progress_pct": pct,
        "xp_to_next": (nxt - xp) if nxt else 0,
        "accessories": accessories,
        "next_accessory": next((a for a in PET_ACCESSORIES if a["level"] > level), None),
    }



def age_group(age: Optional[int]) -> str:
    if age is None:
        return "18+"
    if age <= 8:
        return "5-8"
    if age <= 12:
        return "9-12"
    if age <= 17:
        return "13-17"
    return "18+"


ACHIEVEMENTS = [
    {"id": "first_mission", "name": "First Mission", "icon": "rocket", "desc": "Complete your first mission"},
    {"id": "missions_10", "name": "10 Missions", "icon": "target", "desc": "Complete 10 missions"},
    {"id": "missions_50", "name": "50 Missions", "icon": "flame", "desc": "Complete 50 missions"},
    {"id": "missions_100", "name": "100 Missions", "icon": "crown", "desc": "Complete 100 missions"},
    {"id": "streak_7", "name": "7 Day Streak", "icon": "zap", "desc": "Keep a 7 day streak"},
    {"id": "streak_30", "name": "30 Day Streak", "icon": "sparkles", "desc": "Keep a 30 day streak"},
    {"id": "kitchen_master", "name": "Kitchen Master", "icon": "utensils", "desc": "Complete 10 kitchen chores"},
    {"id": "yard_warrior", "name": "Yard Warrior", "icon": "trees", "desc": "Complete 10 yard chores"},
    {"id": "cleaning_champion", "name": "Cleaning Champion", "icon": "star", "desc": "Complete 25 missions"},
    {"id": "family_mvp", "name": "Family MVP", "icon": "trophy", "desc": "Earn 2000 lifetime points"},
]

PREBUILT_AREAS = [
    "Front Room", "Kitchen", "Bathroom", "Hallway", "Bedroom", "Front Yard",
    "Backyard", "Side Yard", "Driveway", "Garage", "Laundry Room",
]

DEFAULT_SETTINGS = {
    "id": "household",
    "free_transfers_per_week": 1,
    "transfer_cost": 10,
    "transfers_enabled": True,
    "week_start": "monday",
    "terms_version": "1.0",
    "household_name": "The Crew",
    "household_motto": "Together we get it done!",
    "household_logo": "",
    "timezone": "Local",
    "theme_accent": "blue",
    "leaderboards_enabled": True,
    "hide_point_totals": False,
}


# ---------------- auth ----------------
async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else None
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("disabled") and user.get("role") == "member":
        raise HTTPException(status_code=403, detail="This account has been disabled by your administrator")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


def public_user(u: dict) -> dict:
    u = dict(u)
    u.pop("_id", None)
    u.pop("password_hash", None)
    u.pop("pin_hash", None)
    return u


# ---------------- models ----------------
class AdminLogin(BaseModel):
    email: str
    password: str


class MemberLogin(BaseModel):
    user_id: str
    pin: str


class ProfileCreate(BaseModel):
    first_name: str
    last_name: Optional[str] = ""
    nickname: Optional[str] = ""
    age: Optional[int] = None
    grade: Optional[str] = ""
    email: Optional[str] = ""
    avatar: Optional[str] = ""
    pin: str
    household_role: str = "Child"
    chore_time_window: Optional[str] = "Anytime"


class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    nickname: Optional[str] = None
    age: Optional[int] = None
    grade: Optional[str] = None
    email: Optional[str] = None
    avatar: Optional[str] = None
    pin: Optional[str] = None
    household_role: Optional[str] = None
    chore_time_window: Optional[str] = None


class AreaCreate(BaseModel):
    name: str


class ChoreCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    area: str
    age_group: str = "18+"
    frequency: str = "Daily"
    points: int = 10
    difficulty: str = "Easy"
    estimated_time: Optional[str] = "15 min"
    repeat_settings: Optional[str] = ""
    transfer_locked: bool = False
    active: bool = True


class AssignmentCreate(BaseModel):
    chore_id: str
    user_ids: List[str]
    due_date: Optional[str] = None


class ApprovalAction(BaseModel):
    bonus_points: int = 0
    comment: Optional[str] = ""


class TransferCreate(BaseModel):
    assignment_id: str
    to_user_id: str
    message: Optional[str] = ""


class MessageCreate(BaseModel):
    to_user_id: Optional[str] = None  # None = to admin (from member)
    body: str
    category: str = "General"


class AnnouncementCreate(BaseModel):
    title: str
    body: str


class RewardCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    category: str = "Custom"
    cost: int = 100
    quantity: int = 1
    approval_required: bool = True


class SettingsUpdate(BaseModel):
    free_transfers_per_week: Optional[int] = None
    transfer_cost: Optional[int] = None
    transfers_enabled: Optional[bool] = None
    week_start: Optional[str] = None
    household_name: Optional[str] = None
    household_motto: Optional[str] = None
    household_logo: Optional[str] = None
    timezone: Optional[str] = None
    theme_accent: Optional[str] = None
    leaderboards_enabled: Optional[bool] = None
    hide_point_totals: Optional[bool] = None


class ChallengeCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    difficulty: str = "Easy"
    type: str = "Daily"
    points_reward: int = 25
    xp_reward: int = 25
    badge_reward: Optional[str] = ""
    expires_at: Optional[str] = None
    active: bool = True


class BadgeCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    tier: str = "Common"
    icon: str = "award"
    point_reward: int = Field(default=0, ge=0)
    xp_reward: int = Field(default=0, ge=0)


class EventCreate(BaseModel):
    title: str
    type: str = "Family Event"
    date: str
    description: Optional[str] = ""
    bonus_points_day: bool = False


class TeamMissionCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    area: Optional[str] = ""
    points_reward: int = 100
    teamwork_badge: Optional[str] = "Teamwork"
    participant_ids: List[str]


class PetAdopt(BaseModel):
    species: str
    name: str


class QuestMilestone(BaseModel):
    title: str
    target: int = Field(ge=1)
    points: int = Field(default=0, ge=0)


class QuestCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    theme: str = "Adventure"
    milestones: List[QuestMilestone]


class RuleCreate(BaseModel):
    title: str
    body: str
    category: str = "Household Rules"
    pinned: bool = False
    require_ack: bool = True


# ---------------- utility ----------------
async def get_settings():
    s = await db.settings.find_one({"id": "household"}, {"_id": 0})
    if not s:
        await db.settings.insert_one(dict(DEFAULT_SETTINGS))
        return dict(DEFAULT_SETTINGS)
    missing = {k: v for k, v in DEFAULT_SETTINGS.items() if k not in s}
    if missing:
        await db.settings.update_one({"id": "household"}, {"$set": missing})
        s.update(missing)
    return s


async def log_activity(kind: str, text: str, user_id: Optional[str] = None):
    await db.activity.insert_one({
        "id": new_id(), "kind": kind, "text": text,
        "user_id": user_id, "created_at": now_iso(),
    })


async def notify(user_id: str, title: str, body: str, kind: str = "info"):
    await db.notifications.insert_one({
        "id": new_id(), "user_id": user_id, "title": title, "body": body,
        "kind": kind, "read": False, "created_at": now_iso(),
    })


async def add_pet_xp(user_id: str, amount: int):
    pet = await db.pets.find_one({"user_id": user_id})
    if not pet:
        return
    new_xp = pet.get("xp", 0) + amount
    old_level = pet_progress(pet.get("xp", 0))["level"]
    new_level = pet_progress(new_xp)["level"]
    await db.pets.update_one({"user_id": user_id}, {"$set": {"xp": new_xp}})
    if new_level > old_level:
        prog = pet_progress(new_xp)
        await notify(user_id, "Your pet leveled up!", f"{pet['name']} reached Level {new_level} · {prog['title']}", "pet")


def week_bounds(week_start: str = "monday"):
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=now.weekday())
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    return start.isoformat(), (start + timedelta(days=7)).isoformat()


async def recompute_user(user_id: str):
    u = await db.users.find_one({"id": user_id})
    if not u:
        return
    lifetime = u.get("lifetime_points", 0)
    lvl = level_for(lifetime)
    # count approved assignments
    approved = await db.assignments.count_documents({"assignee_id": user_id, "status": "approved"})
    ach_count = len(u.get("achievements", []))
    await db.users.update_one({"id": user_id}, {"$set": {
        "level": lvl["level"], "rank": lvl["rank"], "mission_count": approved,
        "achievement_count": ach_count,
    }})


async def check_achievements(user_id: str):
    u = await db.users.find_one({"id": user_id})
    if not u:
        return []
    earned = set(u.get("achievements", []))
    approved = await db.assignments.count_documents({"assignee_id": user_id, "status": "approved"})
    lifetime = u.get("lifetime_points", 0)
    streak = u.get("streak_count", 0)
    kitchen = await db.assignments.count_documents({"assignee_id": user_id, "status": "approved", "area": "Kitchen"})
    yard = await db.assignments.count_documents({"assignee_id": user_id, "status": "approved", "area": {"$in": ["Front Yard", "Backyard", "Side Yard"]}})
    checks = {
        "first_mission": approved >= 1,
        "missions_10": approved >= 10,
        "missions_50": approved >= 50,
        "missions_100": approved >= 100,
        "streak_7": streak >= 7,
        "streak_30": streak >= 30,
        "kitchen_master": kitchen >= 10,
        "yard_warrior": yard >= 10,
        "cleaning_champion": approved >= 25,
        "family_mvp": lifetime >= 2000,
    }
    newly = []
    for aid, ok in checks.items():
        if ok and aid not in earned:
            earned.add(aid)
            newly.append(aid)
    if newly:
        await db.users.update_one({"id": user_id}, {"$set": {"achievements": list(earned)}})
        for aid in newly:
            meta = next((a for a in ACHIEVEMENTS if a["id"] == aid), None)
            name = meta["name"] if meta else aid
            await notify(user_id, "New Achievement Unlocked!", name, "achievement")
    return newly


# ---------------- auth routes ----------------
@api.get("/")
async def root():
    return {"app": "CrewIQ Home Edition", "status": "ok"}


@api.post("/auth/admin/login")
async def admin_login(data: AdminLogin):
    u = await db.users.find_one({"email": data.email.lower().strip(), "role": "admin"})
    if not u or not verify_secret(data.password, u.get("password_hash", "")):
        await db.login_history.insert_one({"id": new_id(), "identity": data.email.lower().strip(), "role": "admin", "success": False, "at": now_iso()})
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.login_history.insert_one({"id": new_id(), "user_id": u["id"], "identity": u["first_name"], "role": "admin", "success": True, "at": now_iso()})
    token = create_token(u["id"], "admin")
    return {"token": token, "user": public_user(u)}


@api.get("/auth/members")
async def list_member_logins():
    members = await db.users.find({"role": "member", "disabled": {"$ne": True}}, {"_id": 0}).to_list(200)
    return [{"id": m["id"], "first_name": m["first_name"], "nickname": m.get("nickname", ""),
             "avatar": m.get("avatar", ""), "rank": m.get("rank", "Recruit")} for m in members]


@api.post("/auth/member/login")
async def member_login(data: MemberLogin):
    u = await db.users.find_one({"id": data.user_id, "role": "member"})
    if not u or not verify_secret(data.pin, u.get("pin_hash", "")):
        await db.login_history.insert_one({"id": new_id(), "user_id": data.user_id, "role": "member", "success": False, "at": now_iso()})
        raise HTTPException(status_code=401, detail="Incorrect PIN")
    if u.get("disabled"):
        raise HTTPException(status_code=403, detail="This account has been disabled by your administrator")
    await db.login_history.insert_one({"id": new_id(), "user_id": u["id"], "identity": u["first_name"], "role": "member", "success": True, "at": now_iso()})
    token = create_token(u["id"], "member")
    return {"token": token, "user": public_user(u)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


# ---------------- onboarding ----------------
@api.post("/onboarding/complete")
async def complete_onboarding(user: dict = Depends(get_current_user)):
    settings = await get_settings()
    record = {
        "onboarding_complete": True,
        "onboarding_accepted_at": now_iso(),
        "terms_version_accepted": settings.get("terms_version", "1.0"),
    }
    await db.users.update_one({"id": user["id"]}, {"$set": record})
    await log_activity("onboarding", f"{user['first_name']} completed onboarding", user["id"])
    return {"ok": True}


# ---------------- profiles ----------------
@api.get("/users")
async def get_users(user: dict = Depends(require_admin)):
    users = await db.users.find({"role": "member"}, {"_id": 0, "password_hash": 0, "pin_hash": 0}).to_list(200)
    for u in users:
        u["age_group"] = age_group(u.get("age"))
    return users


@api.post("/users")
async def create_profile(data: ProfileCreate, admin: dict = Depends(require_admin)):
    if not (data.pin.isdigit() and 4 <= len(data.pin) <= 8):
        raise HTTPException(status_code=400, detail="PIN must be 4-8 digits")
    doc = {
        "id": new_id(),
        "role": "member",
        "first_name": data.first_name,
        "last_name": data.last_name or "",
        "nickname": data.nickname or "",
        "age": data.age,
        "age_group": age_group(data.age),
        "grade": data.grade or "",
        "email": (data.email or "").lower(),
        "avatar": data.avatar or "",
        "pin_hash": hash_secret(data.pin),
        "household_role": data.household_role,
        "chore_time_window": data.chore_time_window or "Anytime",
        "points_balance": 0,
        "lifetime_points": 0,
        "spent_points": 0,
        "level": 1,
        "rank": "Recruit",
        "streak_count": 0,
        "achievements": [],
        "achievement_count": 0,
        "mission_count": 0,
        "onboarding_complete": False,
        "transfer_privileges": True,
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    await log_activity("profile", f"Profile created: {data.first_name}", doc["id"])
    return public_user({k: v for k, v in doc.items() if k != "_id"})


@api.put("/users/{user_id}")
async def update_profile(user_id: str, data: ProfileUpdate, admin: dict = Depends(require_admin)):
    upd = {k: v for k, v in data.model_dump().items() if v is not None and k != "pin"}
    if data.pin is not None:
        if not (data.pin.isdigit() and 4 <= len(data.pin) <= 8):
            raise HTTPException(status_code=400, detail="PIN must be 4-8 digits")
        upd["pin_hash"] = hash_secret(data.pin)
    if "age" in upd:
        upd["age_group"] = age_group(upd["age"])
    if "email" in upd:
        upd["email"] = (upd["email"] or "").lower()
    await db.users.update_one({"id": user_id}, {"$set": upd})
    u = await db.users.find_one({"id": user_id}, {"_id": 0})
    return public_user(u)


@api.delete("/users/{user_id}")
async def delete_profile(user_id: str, admin: dict = Depends(require_admin)):
    await db.users.delete_one({"id": user_id, "role": "member"})
    return {"ok": True}


@api.post("/users/{user_id}/reset-onboarding")
async def reset_onboarding(user_id: str, admin: dict = Depends(require_admin)):
    await db.users.update_one({"id": user_id}, {"$set": {"onboarding_complete": False}})
    return {"ok": True}


@api.post("/users/{user_id}/reset-progress")
async def reset_progress(user_id: str, admin: dict = Depends(require_admin)):
    u = await db.users.find_one({"id": user_id})
    if not u:
        raise HTTPException(404, "Not found")
    await db.users.update_one({"id": user_id}, {"$set": {
        "points_balance": 0, "lifetime_points": 0, "spent_points": 0, "level": 1,
        "rank": "Recruit", "streak_count": 0, "achievements": [], "achievement_count": 0, "mission_count": 0,
    }})
    await log_activity("admin", f"Reset all progress for {u['first_name']}", user_id)
    return {"ok": True}


@api.post("/users/{user_id}/reset-streak")
async def reset_streak(user_id: str, admin: dict = Depends(require_admin)):
    u = await db.users.find_one({"id": user_id})
    if not u:
        raise HTTPException(404, "Not found")
    await db.users.update_one({"id": user_id}, {"$set": {"streak_count": 0}})
    await log_activity("admin", f"Reset streak for {u['first_name']}", user_id)
    return {"ok": True}


@api.post("/users/{user_id}/toggle-active")
async def toggle_active(user_id: str, admin: dict = Depends(require_admin)):
    u = await db.users.find_one({"id": user_id})
    if not u:
        raise HTTPException(404, "Not found")
    newval = not u.get("disabled", False)
    await db.users.update_one({"id": user_id}, {"$set": {"disabled": newval}})
    await log_activity("admin", f"{'Disabled' if newval else 'Enabled'} account: {u['first_name']}", user_id)
    return {"ok": True, "disabled": newval}


@api.post("/users/{user_id}/adjust-points")
async def adjust_points(user_id: str, payload: dict, admin: dict = Depends(require_admin)):
    amount = int(payload.get("amount", 0))
    u = await db.users.find_one({"id": user_id})
    if not u:
        raise HTTPException(404, "User not found")
    new_balance = max(0, u.get("points_balance", 0) + amount)
    lifetime = u.get("lifetime_points", 0) + (amount if amount > 0 else 0)
    await db.users.update_one({"id": user_id}, {"$set": {"points_balance": new_balance, "lifetime_points": lifetime}})
    await recompute_user(user_id)
    await log_activity("points", f"Admin adjusted {u['first_name']} by {amount} points", user_id)
    return {"ok": True}


# ---------------- areas ----------------
@api.get("/areas")
async def get_areas(user: dict = Depends(get_current_user)):
    areas = await db.areas.find({}, {"_id": 0}).sort("name", 1).to_list(200)
    return areas


@api.post("/areas")
async def create_area(data: AreaCreate, admin: dict = Depends(require_admin)):
    existing = await db.areas.find_one({"name": data.name})
    if existing:
        raise HTTPException(400, "Area already exists")
    doc = {"id": new_id(), "name": data.name, "custom": True}
    await db.areas.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api.delete("/areas/{area_id}")
async def delete_area(area_id: str, admin: dict = Depends(require_admin)):
    await db.areas.delete_one({"id": area_id})
    return {"ok": True}


# ---------------- chores ----------------
@api.get("/chores")
async def get_chores(user: dict = Depends(get_current_user)):
    return await db.chores.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.post("/chores")
async def create_chore(data: ChoreCreate, admin: dict = Depends(require_admin)):
    doc = {"id": new_id(), **data.model_dump(), "created_at": now_iso()}
    await db.chores.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api.put("/chores/{chore_id}")
async def update_chore(chore_id: str, data: ChoreCreate, admin: dict = Depends(require_admin)):
    await db.chores.update_one({"id": chore_id}, {"$set": data.model_dump()})
    c = await db.chores.find_one({"id": chore_id}, {"_id": 0})
    return c


@api.delete("/chores/{chore_id}")
async def delete_chore(chore_id: str, admin: dict = Depends(require_admin)):
    await db.chores.delete_one({"id": chore_id})
    return {"ok": True}


# ---------------- assignments ----------------
async def build_assignment_view(a: dict):
    assignee = await db.users.find_one({"id": a.get("assignee_id")}, {"_id": 0, "first_name": 1, "nickname": 1, "avatar": 1})
    a["assignee"] = assignee or {}
    return a


@api.get("/assignments")
async def get_assignments(user: dict = Depends(get_current_user)):
    q = {} if user["role"] == "admin" else {"assignee_id": user["id"]}
    items = await db.assignments.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for a in items:
        await build_assignment_view(a)
    return items


@api.post("/assignments")
async def create_assignment(data: AssignmentCreate, admin: dict = Depends(require_admin)):
    chore = await db.chores.find_one({"id": data.chore_id}, {"_id": 0})
    if not chore:
        raise HTTPException(404, "Chore not found")
    created = []
    for uid in data.user_ids:
        doc = {
            "id": new_id(),
            "chore_id": chore["id"],
            "title": chore["name"],
            "description": chore.get("description", ""),
            "area": chore.get("area", ""),
            "points": chore.get("points", 0),
            "difficulty": chore.get("difficulty", "Easy"),
            "estimated_time": chore.get("estimated_time", ""),
            "transfer_locked": chore.get("transfer_locked", False),
            "assignee_id": uid,
            "original_assignee_id": uid,
            "transferred": False,
            "status": "assigned",
            "due_date": data.due_date,
            "comment": "",
            "bonus_points": 0,
            "created_at": now_iso(),
        }
        await db.assignments.insert_one(doc)
        created.append(doc["id"])
        u = await db.users.find_one({"id": uid})
        await notify(uid, "New Mission Assigned", chore["name"], "mission")
        await log_activity("assignment", f"{chore['name']} assigned to {u['first_name'] if u else uid}", uid)
    return {"ok": True, "count": len(created)}


@api.post("/assignments/{aid}/start")
async def start_assignment(aid: str, user: dict = Depends(get_current_user)):
    a = await db.assignments.find_one({"id": aid})
    if not a or a["assignee_id"] != user["id"]:
        raise HTTPException(404, "Not found")
    await db.assignments.update_one({"id": aid}, {"$set": {"status": "in_progress"}})
    return {"ok": True}


@api.post("/assignments/{aid}/complete")
async def complete_assignment(aid: str, user: dict = Depends(get_current_user)):
    a = await db.assignments.find_one({"id": aid})
    if not a or a["assignee_id"] != user["id"]:
        raise HTTPException(404, "Not found")
    await db.assignments.update_one({"id": aid}, {"$set": {"status": "pending_approval", "completed_at": now_iso()}})
    admins = await db.users.find({"role": "admin"}).to_list(10)
    for adm in admins:
        await notify(adm["id"], "Approval Needed", f"{user['first_name']} completed '{a['title']}'", "approval")
    await log_activity("completion", f"{user['first_name']} completed '{a['title']}'", user["id"])
    return {"ok": True}


@api.post("/assignments/{aid}/approve")
async def approve_assignment(aid: str, data: ApprovalAction, admin: dict = Depends(require_admin)):
    a = await db.assignments.find_one({"id": aid})
    if not a:
        raise HTTPException(404, "Not found")
    total = a.get("points", 0) + (data.bonus_points or 0)
    uid = a["assignee_id"]
    u = await db.users.find_one({"id": uid})
    await db.assignments.update_one({"id": aid}, {"$set": {
        "status": "approved", "bonus_points": data.bonus_points or 0,
        "comment": data.comment or "", "approved_at": now_iso(),
    }})
    new_streak = u.get("streak_count", 0) + 1
    await db.users.update_one({"id": uid}, {"$inc": {
        "points_balance": total, "lifetime_points": total,
    }, "$set": {"streak_count": new_streak}})
    await recompute_user(uid)
    newly = await check_achievements(uid)
    await recompute_user(uid)
    await add_pet_xp(uid, total)
    await notify(uid, "Mission Approved!", f"'{a['title']}' +{total} points", "approval")
    await log_activity("approval", f"Approved '{a['title']}' for {u['first_name']} (+{total})", uid)
    return {"ok": True, "points_awarded": total, "new_achievements": newly}


@api.post("/assignments/{aid}/deny")
async def deny_assignment(aid: str, data: ApprovalAction, admin: dict = Depends(require_admin)):
    a = await db.assignments.find_one({"id": aid})
    if not a:
        raise HTTPException(404, "Not found")
    await db.assignments.update_one({"id": aid}, {"$set": {"status": "denied", "comment": data.comment or ""}})
    await notify(a["assignee_id"], "Mission Denied", f"'{a['title']}': {data.comment or 'Please review'}", "approval")
    return {"ok": True}


@api.post("/assignments/{aid}/rework")
async def rework_assignment(aid: str, data: ApprovalAction, admin: dict = Depends(require_admin)):
    a = await db.assignments.find_one({"id": aid})
    if not a:
        raise HTTPException(404, "Not found")
    await db.assignments.update_one({"id": aid}, {"$set": {"status": "assigned", "comment": data.comment or ""}})
    await notify(a["assignee_id"], "Rework Requested", f"'{a['title']}': {data.comment or 'Please redo'}", "approval")
    return {"ok": True}


@api.delete("/assignments/{aid}")
async def delete_assignment(aid: str, admin: dict = Depends(require_admin)):
    await db.assignments.delete_one({"id": aid})
    return {"ok": True}


# ---------------- transfers ----------------
@api.get("/transfers")
async def get_transfers(user: dict = Depends(get_current_user)):
    if user["role"] == "admin":
        q = {}
    else:
        q = {"$or": [{"from_user_id": user["id"]}, {"to_user_id": user["id"]}]}
    items = await db.transfers.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    for t in items:
        fu = await db.users.find_one({"id": t["from_user_id"]}, {"_id": 0, "first_name": 1})
        tu = await db.users.find_one({"id": t["to_user_id"]}, {"_id": 0, "first_name": 1})
        t["from_name"] = fu["first_name"] if fu else "?"
        t["to_name"] = tu["first_name"] if tu else "?"
    return items


@api.post("/transfers")
async def create_transfer(data: TransferCreate, user: dict = Depends(get_current_user)):
    settings = await get_settings()
    if not settings.get("transfers_enabled", True):
        raise HTTPException(400, "Transfers are disabled by your administrator")
    if not user.get("transfer_privileges", True):
        raise HTTPException(403, "Your transfer privileges have been suspended")
    a = await db.assignments.find_one({"id": data.assignment_id})
    if not a or a["assignee_id"] != user["id"]:
        raise HTTPException(404, "Assignment not found")
    if a.get("transfer_locked"):
        raise HTTPException(400, "This chore is locked and cannot be transferred")
    if a.get("transferred"):
        raise HTTPException(400, "Transferred chores may not be transferred again")
    if data.to_user_id == a.get("original_assignee_id"):
        raise HTTPException(400, "A transferred chore may not return to the original owner")
    if data.to_user_id == user["id"]:
        raise HTTPException(400, "You cannot transfer a chore to yourself")
    existing = await db.transfers.find_one({"assignment_id": data.assignment_id, "status": {"$in": ["pending_recipient", "pending_admin"]}})
    if existing:
        raise HTTPException(400, "An active transfer request already exists for this chore")

    week_from, week_to = week_bounds(settings.get("week_start", "monday"))
    used_free = await db.transfers.count_documents({
        "from_user_id": user["id"], "status": "approved", "was_free": True,
        "approved_at": {"$gte": week_from, "$lt": week_to},
    })
    free_allowance = settings.get("free_transfers_per_week", 1)
    is_free = used_free < free_allowance
    cost = 0 if is_free else settings.get("transfer_cost", 10)
    if not is_free and user.get("points_balance", 0) < cost:
        raise HTTPException(400, "You do not have enough points to request another chore transfer.")

    doc = {
        "id": new_id(),
        "assignment_id": data.assignment_id,
        "chore_title": a["title"],
        "from_user_id": user["id"],
        "to_user_id": data.to_user_id,
        "message": data.message or "",
        "status": "pending_recipient",
        "was_free": is_free,
        "cost": cost,
        "created_at": now_iso(),
        "requested_at": now_iso(),
        "accepted_at": None,
        "approved_at": None,
    }
    await db.transfers.insert_one(doc)
    await notify(data.to_user_id, "Chore Transfer Request", f"{user['first_name']} wants you to take '{a['title']}'", "transfer")
    await log_activity("transfer", f"{user['first_name']} requested to transfer '{a['title']}'", user["id"])
    return {k: v for k, v in doc.items() if k != "_id"}


@api.post("/transfers/{tid}/accept")
async def accept_transfer(tid: str, user: dict = Depends(get_current_user)):
    t = await db.transfers.find_one({"id": tid})
    if not t or t["to_user_id"] != user["id"] or t["status"] != "pending_recipient":
        raise HTTPException(404, "Not found")
    await db.transfers.update_one({"id": tid}, {"$set": {"status": "pending_admin", "accepted_at": now_iso()}})
    admins = await db.users.find({"role": "admin"}).to_list(10)
    for adm in admins:
        await notify(adm["id"], "Transfer Needs Approval", f"'{t['chore_title']}' -> {user['first_name']}", "transfer")
    return {"ok": True}


@api.post("/transfers/{tid}/decline")
async def decline_transfer(tid: str, user: dict = Depends(get_current_user)):
    t = await db.transfers.find_one({"id": tid})
    if not t or t["to_user_id"] != user["id"]:
        raise HTTPException(404, "Not found")
    await db.transfers.update_one({"id": tid}, {"$set": {"status": "declined"}})
    await notify(t["from_user_id"], "Transfer Declined", f"'{t['chore_title']}' was declined", "transfer")
    return {"ok": True}


@api.post("/transfers/{tid}/approve")
async def approve_transfer(tid: str, admin: dict = Depends(require_admin)):
    t = await db.transfers.find_one({"id": tid})
    if not t or t["status"] != "pending_admin":
        raise HTTPException(404, "Not found or not ready")
    a = await db.assignments.find_one({"id": t["assignment_id"]})
    if not a:
        raise HTTPException(404, "Assignment gone")
    if t.get("cost", 0) > 0:
        await db.users.update_one({"id": t["from_user_id"]}, {"$inc": {"points_balance": -t["cost"], "spent_points": t["cost"]}})
    await db.assignments.update_one({"id": t["assignment_id"]}, {"$set": {
        "assignee_id": t["to_user_id"], "transferred": True, "status": "assigned",
    }})
    await db.transfers.update_one({"id": tid}, {"$set": {"status": "approved", "approved_at": now_iso()}})
    await notify(t["to_user_id"], "Chore Transferred To You", f"You now own '{t['chore_title']}'", "transfer")
    await notify(t["from_user_id"], "Transfer Approved", f"'{t['chore_title']}' moved successfully", "transfer")
    await log_activity("transfer", f"Transfer approved: '{t['chore_title']}'", t["to_user_id"])
    return {"ok": True}


@api.post("/transfers/{tid}/deny")
async def deny_transfer(tid: str, admin: dict = Depends(require_admin)):
    t = await db.transfers.find_one({"id": tid})
    if not t:
        raise HTTPException(404, "Not found")
    await db.transfers.update_one({"id": tid}, {"$set": {"status": "denied"}})
    await notify(t["from_user_id"], "Transfer Denied", f"'{t['chore_title']}' transfer was denied", "transfer")
    return {"ok": True}


# ---------------- messaging ----------------
@api.get("/messages")
async def get_messages(user: dict = Depends(get_current_user)):
    if user["role"] == "admin":
        items = await db.messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    else:
        items = await db.messages.find({"$or": [{"from_user_id": user["id"]}, {"to_user_id": user["id"]}]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for m in items:
        fu = await db.users.find_one({"id": m["from_user_id"]}, {"_id": 0, "first_name": 1})
        m["from_name"] = "Admin" if m.get("from_role") == "admin" else (fu["first_name"] if fu else "?")
    return items


@api.post("/messages")
async def send_message(data: MessageCreate, user: dict = Depends(get_current_user)):
    if user["role"] == "admin":
        to_id = data.to_user_id
        if not to_id:
            raise HTTPException(400, "Recipient required")
    else:
        to_id = "admin"
    doc = {
        "id": new_id(),
        "from_user_id": user["id"],
        "from_role": user["role"],
        "to_user_id": to_id,
        "body": data.body,
        "category": data.category,
        "read": False,
        "pinned": False,
        "created_at": now_iso(),
    }
    await db.messages.insert_one(doc)
    if to_id == "admin":
        admins = await db.users.find({"role": "admin"}).to_list(10)
        for adm in admins:
            await notify(adm["id"], "New Message", f"{user['first_name']}: {data.body[:40]}", "message")
    else:
        await notify(to_id, "New Message from Admin", data.body[:40], "message")
    return {k: v for k, v in doc.items() if k != "_id"}


@api.post("/messages/{mid}/read")
async def read_message(mid: str, user: dict = Depends(get_current_user)):
    await db.messages.update_one({"id": mid}, {"$set": {"read": True, "read_at": now_iso()}})
    return {"ok": True}


@api.post("/messages/{mid}/pin")
async def pin_message(mid: str, admin: dict = Depends(require_admin)):
    m = await db.messages.find_one({"id": mid})
    if not m:
        raise HTTPException(404, "Not found")
    await db.messages.update_one({"id": mid}, {"$set": {"pinned": not m.get("pinned", False)}})
    return {"ok": True}


@api.delete("/messages/{mid}")
async def delete_message(mid: str, admin: dict = Depends(require_admin)):
    await db.messages.delete_one({"id": mid})
    return {"ok": True}


# ---------------- announcements ----------------
@api.get("/announcements")
async def get_announcements(user: dict = Depends(get_current_user)):
    return await db.announcements.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)


@api.post("/announcements")
async def create_announcement(data: AnnouncementCreate, admin: dict = Depends(require_admin)):
    doc = {"id": new_id(), "title": data.title, "body": data.body, "created_at": now_iso()}
    await db.announcements.insert_one(doc)
    members = await db.users.find({"role": "member"}).to_list(200)
    for m in members:
        await notify(m["id"], "New Household Announcement", data.title, "announcement")
    await log_activity("announcement", f"Announcement: {data.title}")
    return {k: v for k, v in doc.items() if k != "_id"}


# ---------------- rewards ----------------
@api.get("/rewards")
async def get_rewards(user: dict = Depends(get_current_user)):
    return await db.rewards.find({}, {"_id": 0}).sort("cost", 1).to_list(200)


@api.post("/rewards")
async def create_reward(data: RewardCreate, admin: dict = Depends(require_admin)):
    doc = {"id": new_id(), **data.model_dump(), "created_at": now_iso()}
    await db.rewards.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api.delete("/rewards/{rid}")
async def delete_reward(rid: str, admin: dict = Depends(require_admin)):
    await db.rewards.delete_one({"id": rid})
    return {"ok": True}


@api.post("/rewards/{rid}/redeem")
async def redeem_reward(rid: str, user: dict = Depends(get_current_user)):
    r = await db.rewards.find_one({"id": rid})
    if not r:
        raise HTTPException(404, "Reward not found")
    if user.get("points_balance", 0) < r["cost"]:
        raise HTTPException(400, "Not enough points to redeem this reward")
    if r.get("quantity", 0) <= 0:
        raise HTTPException(400, "This reward is out of stock")
    await db.users.update_one({"id": user["id"]}, {"$inc": {"points_balance": -r["cost"], "spent_points": r["cost"]}})
    await db.rewards.update_one({"id": rid}, {"$inc": {"quantity": -1}})
    await db.redemptions.insert_one({
        "id": new_id(), "reward_id": rid, "reward_name": r["name"], "user_id": user["id"],
        "cost": r["cost"], "status": "pending" if r.get("approval_required") else "fulfilled",
        "created_at": now_iso(),
    })
    admins = await db.users.find({"role": "admin"}).to_list(10)
    for adm in admins:
        await notify(adm["id"], "Reward Redeemed", f"{user['first_name']} redeemed '{r['name']}'", "reward")
    return {"ok": True}


# ---------------- achievements ----------------
@api.get("/achievements")
async def get_achievements(user: dict = Depends(get_current_user)):
    earned = set(user.get("achievements", []))
    return [{**a, "earned": a["id"] in earned} for a in ACHIEVEMENTS]


# ---------------- notifications ----------------
@api.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    return await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)


@api.post("/notifications/{nid}/read")
async def read_notification(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


@api.post("/notifications/read-all")
async def read_all_notifications(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ---------------- activity ----------------
@api.get("/activity")
async def get_activity(admin: dict = Depends(require_admin)):
    return await db.activity.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)


# ---------------- household rules ----------------
@api.get("/rules")
async def get_rules(user: dict = Depends(get_current_user)):
    q = {} if user["role"] == "admin" else {"archived": {"$ne": True}}
    rules = await db.rules.find(q, {"_id": 0}).sort([("pinned", -1), ("created_at", -1)]).to_list(500)
    acks = await db.rule_acks.find({"user_id": user["id"]}, {"_id": 0}).to_list(1000)
    ack_map = {(a["rule_id"], a["version"]) for a in acks}
    for r in rules:
        r["acknowledged"] = (r["id"], r.get("version", 1)) in ack_map
    return rules


@api.post("/rules")
async def create_rule(data: RuleCreate, admin: dict = Depends(require_admin)):
    doc = {"id": new_id(), **data.model_dump(), "archived": False, "version": 1, "created_at": now_iso()}
    await db.rules.insert_one(doc)
    members = await db.users.find({"role": "member"}).to_list(200)
    for m in members:
        await notify(m["id"], "Household Rules Updated", data.title, "rule")
    await log_activity("rule", f"Rule created: {data.title}")
    return {k: v for k, v in doc.items() if k != "_id"}


@api.put("/rules/{rid}")
async def update_rule(rid: str, data: RuleCreate, admin: dict = Depends(require_admin)):
    r = await db.rules.find_one({"id": rid})
    if not r:
        raise HTTPException(404, "Not found")
    new_version = r.get("version", 1) + 1
    await db.rules.update_one({"id": rid}, {"$set": {**data.model_dump(), "version": new_version}})
    members = await db.users.find({"role": "member"}).to_list(200)
    for m in members:
        await notify(m["id"], "Household Rules Updated", f"'{data.title}' was updated", "rule")
    return await db.rules.find_one({"id": rid}, {"_id": 0})


@api.post("/rules/{rid}/pin")
async def pin_rule(rid: str, admin: dict = Depends(require_admin)):
    r = await db.rules.find_one({"id": rid})
    if not r:
        raise HTTPException(404, "Not found")
    await db.rules.update_one({"id": rid}, {"$set": {"pinned": not r.get("pinned", False)}})
    return {"ok": True}


@api.post("/rules/{rid}/archive")
async def archive_rule(rid: str, admin: dict = Depends(require_admin)):
    r = await db.rules.find_one({"id": rid})
    if not r:
        raise HTTPException(404, "Not found")
    await db.rules.update_one({"id": rid}, {"$set": {"archived": not r.get("archived", False)}})
    return {"ok": True}


@api.delete("/rules/{rid}")
async def delete_rule(rid: str, admin: dict = Depends(require_admin)):
    await db.rules.delete_one({"id": rid})
    await db.rule_acks.delete_many({"rule_id": rid})
    return {"ok": True}


@api.post("/rules/{rid}/acknowledge")
async def acknowledge_rule(rid: str, user: dict = Depends(get_current_user)):
    r = await db.rules.find_one({"id": rid})
    if not r:
        raise HTTPException(404, "Not found")
    version = r.get("version", 1)
    existing = await db.rule_acks.find_one({"rule_id": rid, "user_id": user["id"], "version": version})
    if not existing:
        await db.rule_acks.insert_one({
            "id": new_id(), "rule_id": rid, "user_id": user["id"], "user_name": user["first_name"],
            "version": version, "acknowledged_at": now_iso(),
        })
        await log_activity("rule_ack", f"{user['first_name']} acknowledged '{r['title']}'", user["id"])
    return {"ok": True}


@api.get("/rules/{rid}/acks")
async def rule_acks(rid: str, admin: dict = Depends(require_admin)):
    r = await db.rules.find_one({"id": rid}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Not found")
    version = r.get("version", 1)
    acks = await db.rule_acks.find({"rule_id": rid, "version": version}, {"_id": 0}).to_list(500)
    members = await db.users.find({"role": "member"}, {"_id": 0, "id": 1, "first_name": 1, "avatar": 1}).to_list(200)
    acked_ids = {a["user_id"] for a in acks}
    return {
        "rule": r,
        "acknowledged": [{"user_id": a["user_id"], "user_name": a["user_name"], "acknowledged_at": a["acknowledged_at"]} for a in acks],
        "pending": [{"user_id": m["id"], "first_name": m["first_name"], "avatar": m.get("avatar", "")} for m in members if m["id"] not in acked_ids],
    }


# ---------------- challenges ----------------
@api.get("/challenges")
async def get_challenges(user: dict = Depends(get_current_user)):
    q = {} if user["role"] == "admin" else {"active": True}
    items = await db.challenges.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    claims = await db.challenge_claims.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    claimed = {c["challenge_id"] for c in claims}
    for c in items:
        c["claimed"] = c["id"] in claimed
        c["claim_count"] = await db.challenge_claims.count_documents({"challenge_id": c["id"]})
    return items


@api.post("/challenges")
async def create_challenge(data: ChallengeCreate, admin: dict = Depends(require_admin)):
    doc = {"id": new_id(), **data.model_dump(), "created_at": now_iso()}
    await db.challenges.insert_one(doc)
    members = await db.users.find({"role": "member"}).to_list(200)
    for m in members:
        await notify(m["id"], "New Challenge!", data.title, "challenge")
    await log_activity("challenge", f"Challenge created: {data.title}")
    return {k: v for k, v in doc.items() if k != "_id"}


@api.put("/challenges/{cid}")
async def update_challenge(cid: str, data: ChallengeCreate, admin: dict = Depends(require_admin)):
    await db.challenges.update_one({"id": cid}, {"$set": data.model_dump()})
    return await db.challenges.find_one({"id": cid}, {"_id": 0})


@api.delete("/challenges/{cid}")
async def delete_challenge(cid: str, admin: dict = Depends(require_admin)):
    await db.challenges.delete_one({"id": cid})
    await db.challenge_claims.delete_many({"challenge_id": cid})
    return {"ok": True}


@api.post("/challenges/{cid}/claim")
async def claim_challenge(cid: str, user: dict = Depends(get_current_user)):
    c = await db.challenges.find_one({"id": cid})
    if not c or not c.get("active"):
        raise HTTPException(404, "Challenge not available")
    existing = await db.challenge_claims.find_one({"challenge_id": cid, "user_id": user["id"]})
    if existing:
        raise HTTPException(400, "You already completed this challenge")
    pts = c.get("points_reward", 0)
    await db.challenge_claims.insert_one({"id": new_id(), "challenge_id": cid, "user_id": user["id"], "claimed_at": now_iso()})
    await db.users.update_one({"id": user["id"]}, {"$inc": {"points_balance": pts, "lifetime_points": pts}})
    await recompute_user(user["id"])
    newly = await check_achievements(user["id"])
    await notify(user["id"], "Challenge Complete!", f"'{c['title']}' +{pts} points", "challenge")
    await log_activity("challenge", f"{user['first_name']} completed challenge '{c['title']}' (+{pts})", user["id"])
    return {"ok": True, "points_awarded": pts, "new_achievements": newly}


# ---------------- reports & analytics ----------------
@api.get("/reports/analytics")
async def reports_analytics(admin: dict = Depends(require_admin)):
    members = await db.users.find({"role": "member"}, {"_id": 0}).to_list(200)
    completion, rankings = [], []
    for m in members:
        approved = await db.assignments.count_documents({"assignee_id": m["id"], "status": "approved"})
        completion.append({"name": m["first_name"], "missions": approved})
        rankings.append({"name": m["first_name"], "points": m.get("lifetime_points", 0), "streak": m.get("streak_count", 0), "achievements": len(m.get("achievements", []))})
    rankings.sort(key=lambda x: x["points"], reverse=True)

    # point growth over last 7 days from approval activity
    from collections import defaultdict
    approvals = await db.assignments.find({"status": "approved"}, {"_id": 0}).to_list(2000)
    by_day = defaultdict(int)
    for a in approvals:
        day = (a.get("approved_at") or a.get("created_at") or now_iso())[:10]
        by_day[day] += a.get("points", 0) + a.get("bonus_points", 0)
    growth = [{"date": d[5:], "points": p} for d, p in sorted(by_day.items())][-7:]

    redemptions = await db.redemptions.find({}, {"_id": 0}).to_list(500)
    redeem_by = defaultdict(int)
    for r in redemptions:
        redeem_by[r["reward_name"]] += 1
    redeem_data = [{"name": n, "count": c} for n, c in redeem_by.items()]

    total_assign = await db.assignments.count_documents({})
    total_approved = await db.assignments.count_documents({"status": "approved"})
    total_points = sum(m.get("lifetime_points", 0) for m in members)
    return {
        "mission_completion": completion,
        "rankings": rankings,
        "point_growth": growth,
        "reward_redemptions": redeem_data,
        "totals": {
            "total_points_awarded": total_points,
            "total_assignments": total_assign,
            "total_approved": total_approved,
            "participation_pct": round((total_approved / total_assign) * 100) if total_assign else 0,
            "active_members": len(members),
            "total_redemptions": len(redemptions),
        },
    }


# ---------------- security / audit logs ----------------
@api.get("/security/logs")
async def security_logs(admin: dict = Depends(require_admin)):
    activity = await db.activity.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    logins = await db.login_history.find({}, {"_id": 0}).sort("at", -1).to_list(50)
    redemptions = await db.redemptions.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    for r in redemptions:
        u = await db.users.find_one({"id": r.get("user_id")}, {"_id": 0, "first_name": 1})
        r["user_name"] = u["first_name"] if u else "?"
    point_logs = [a for a in activity if a.get("kind") in ("points", "approval", "challenge", "admin")]
    rule_logs = [a for a in activity if a.get("kind") in ("rule", "rule_ack")]
    return {
        "activity": activity,
        "logins": logins,
        "redemptions": redemptions,
        "point_logs": point_logs,
        "rule_logs": rule_logs,
        "failed_logins": [l for l in logins if not l.get("success")],
    }


# ---------------- badges (custom) ----------------
@api.get("/badges")
async def get_badges(user: dict = Depends(get_current_user)):
    badges = await db.badges.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    for b in badges:
        b["award_count"] = await db.badge_awards.count_documents({"badge_id": b["id"]})
    return badges


@api.get("/my-badges")
async def my_badges(user: dict = Depends(get_current_user)):
    awards = await db.badge_awards.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    ids = [a["badge_id"] for a in awards]
    badges = await db.badges.find({"id": {"$in": ids}}, {"_id": 0}).to_list(200)
    return badges


@api.post("/badges")
async def create_badge(data: BadgeCreate, admin: dict = Depends(require_admin)):
    doc = {"id": new_id(), **data.model_dump(), "created_at": now_iso()}
    await db.badges.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api.delete("/badges/{bid}")
async def delete_badge(bid: str, admin: dict = Depends(require_admin)):
    await db.badges.delete_one({"id": bid})
    await db.badge_awards.delete_many({"badge_id": bid})
    return {"ok": True}


@api.post("/badges/{bid}/award")
async def award_badge(bid: str, payload: dict, admin: dict = Depends(require_admin)):
    b = await db.badges.find_one({"id": bid})
    if not b:
        raise HTTPException(404, "Badge not found")
    uid = payload.get("user_id")
    u = await db.users.find_one({"id": uid, "role": "member"})
    if not u:
        raise HTTPException(404, "Member not found")
    existing = await db.badge_awards.find_one({"badge_id": bid, "user_id": uid})
    if existing:
        raise HTTPException(400, f"{u['first_name']} already has this badge")
    await db.badge_awards.insert_one({"id": new_id(), "badge_id": bid, "user_id": uid, "awarded_at": now_iso()})
    pts = b.get("point_reward", 0)
    if pts:
        await db.users.update_one({"id": uid}, {"$inc": {"points_balance": pts, "lifetime_points": pts}})
        await recompute_user(uid)
    await notify(uid, "New Badge Earned!", f"{b['name']} ({b['tier']})" + (f" +{pts} points" if pts else ""), "achievement")
    await log_activity("badge", f"Awarded '{b['name']}' to {u['first_name']}", uid)
    return {"ok": True}


# ---------------- family calendar ----------------
@api.get("/events")
async def get_events(user: dict = Depends(get_current_user)):
    return await db.events.find({}, {"_id": 0}).sort("date", 1).to_list(300)


@api.post("/events")
async def create_event(data: EventCreate, admin: dict = Depends(require_admin)):
    doc = {"id": new_id(), **data.model_dump(), "created_at": now_iso()}
    await db.events.insert_one(doc)
    members = await db.users.find({"role": "member"}).to_list(200)
    for m in members:
        await notify(m["id"], "New Family Event", f"{data.title} · {data.date}", "event")
    await log_activity("event", f"Event scheduled: {data.title} ({data.date})")
    return {k: v for k, v in doc.items() if k != "_id"}


@api.delete("/events/{eid}")
async def delete_event(eid: str, admin: dict = Depends(require_admin)):
    await db.events.delete_one({"id": eid})
    return {"ok": True}


# ---------------- team missions ----------------
async def team_mission_view(t: dict):
    parts = []
    for uid in t.get("participant_ids", []):
        u = await db.users.find_one({"id": uid}, {"_id": 0, "first_name": 1, "avatar": 1})
        parts.append({"id": uid, "first_name": u["first_name"] if u else "?", "avatar": u.get("avatar", "") if u else "", "done": t.get("progress", {}).get(uid, False)})
    t["participants"] = parts
    return t


@api.get("/team-missions")
async def get_team_missions(user: dict = Depends(get_current_user)):
    q = {} if user["role"] == "admin" else {"participant_ids": user["id"]}
    items = await db.team_missions.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    for t in items:
        await team_mission_view(t)
    return items


@api.post("/team-missions")
async def create_team_mission(data: TeamMissionCreate, admin: dict = Depends(require_admin)):
    pids = list(dict.fromkeys(data.participant_ids))
    if len(pids) < 2:
        raise HTTPException(400, "Pick at least two crew members for a team mission")
    payload = data.model_dump()
    payload["participant_ids"] = pids
    doc = {"id": new_id(), **payload, "progress": {uid: False for uid in pids},
           "status": "active", "created_at": now_iso()}
    await db.team_missions.insert_one(doc)
    for uid in pids:
        await notify(uid, "New Team Mission!", data.title, "team")
    await log_activity("team", f"Team mission created: {data.title}")
    return {k: v for k, v in doc.items() if k != "_id"}


@api.post("/team-missions/{tid}/contribute")
async def contribute_team_mission(tid: str, user: dict = Depends(get_current_user)):
    t = await db.team_missions.find_one({"id": tid})
    if not t or user["id"] not in t.get("participant_ids", []):
        raise HTTPException(404, "Not found")
    if t["status"] != "active":
        raise HTTPException(400, "This team mission is no longer active")
    progress = t.get("progress", {})
    progress[user["id"]] = True
    update = {"progress": progress}
    if all(progress.get(uid) for uid in t["participant_ids"]):
        update["status"] = "pending_approval"
        admins = await db.users.find({"role": "admin"}).to_list(10)
        for adm in admins:
            await notify(adm["id"], "Team Mission Ready", f"'{t['title']}' needs approval", "team")
    await db.team_missions.update_one({"id": tid}, {"$set": update})
    return {"ok": True, "all_done": update.get("status") == "pending_approval"}


@api.post("/team-missions/{tid}/approve")
async def approve_team_mission(tid: str, admin: dict = Depends(require_admin)):
    t = await db.team_missions.find_one({"id": tid})
    if not t:
        raise HTTPException(404, "Not found")
    parts = t["participant_ids"]
    share = t.get("points_reward", 0) // max(1, len(parts))
    for uid in parts:
        await db.users.update_one({"id": uid}, {"$inc": {"points_balance": share, "lifetime_points": share}})
        await recompute_user(uid)
        await check_achievements(uid)
        await add_pet_xp(uid, share)
        await notify(uid, "Team Mission Complete!", f"'{t['title']}' +{share} points · {t.get('teamwork_badge', 'Teamwork')} badge!", "team")
    await db.team_missions.update_one({"id": tid}, {"$set": {"status": "completed", "completed_at": now_iso()}})
    await log_activity("team", f"Team mission approved: {t['title']} (+{share} each)")
    return {"ok": True, "share": share}


@api.delete("/team-missions/{tid}")
async def delete_team_mission(tid: str, admin: dict = Depends(require_admin)):
    await db.team_missions.delete_one({"id": tid})
    return {"ok": True}


# ---------------- virtual pets ----------------
@api.get("/pet")
async def get_pet(user: dict = Depends(get_current_user)):
    pet = await db.pets.find_one({"user_id": user["id"]}, {"_id": 0})
    if not pet:
        return {"pet": None}
    pet["progress"] = pet_progress(pet.get("xp", 0))
    return {"pet": pet}


@api.post("/pet/adopt")
async def adopt_pet(data: PetAdopt, user: dict = Depends(get_current_user)):
    existing = await db.pets.find_one({"user_id": user["id"]})
    if existing:
        raise HTTPException(400, "You already have a pet")
    doc = {"id": new_id(), "user_id": user["id"], "species": data.species,
           "name": data.name, "xp": 0, "created_at": now_iso()}
    await db.pets.insert_one(doc)
    await log_activity("pet", f"{user['first_name']} adopted a {data.species} named {data.name}", user["id"])
    out = {k: v for k, v in doc.items() if k != "_id"}
    out["progress"] = pet_progress(0)
    return {"pet": out}


# ---------------- quest campaigns ----------------
async def quest_view(q: dict, user_id: str, user_role: str):
    if user_role == "member":
        completed = await db.assignments.count_documents({
            "assignee_id": user_id, "status": "approved",
            "approved_at": {"$gte": q["created_at"]},
        })
    else:
        completed = 0
    claims = await db.quest_claims.find({"quest_id": q["id"], "user_id": user_id}, {"_id": 0}).to_list(100)
    claimed_ids = {c["milestone_id"] for c in claims}
    q["progress"] = completed
    q["total_target"] = max((m["target"] for m in q.get("milestones", [])), default=0)
    for m in q.get("milestones", []):
        m["reached"] = completed >= m["target"]
        m["claimed"] = m["id"] in claimed_ids
    return q


@api.get("/quests")
async def get_quests(user: dict = Depends(get_current_user)):
    q = {} if user["role"] == "admin" else {"active": True}
    quests = await db.quests.find(q, {"_id": 0}).sort("created_at", -1).to_list(100)
    for qs in quests:
        await quest_view(qs, user["id"], user["role"])
    return quests


@api.post("/quests")
async def create_quest(data: QuestCreate, admin: dict = Depends(require_admin)):
    milestones = []
    for m in data.milestones:
        milestones.append({"id": new_id(), "title": m.title, "target": m.target, "points": m.points})
    milestones.sort(key=lambda x: x["target"])
    doc = {"id": new_id(), "title": data.title, "description": data.description or "",
           "theme": data.theme, "milestones": milestones, "active": True, "created_at": now_iso()}
    await db.quests.insert_one(doc)
    members = await db.users.find({"role": "member"}).to_list(200)
    for mem in members:
        await notify(mem["id"], "New Quest Campaign!", data.title, "quest")
    await log_activity("quest", f"Quest launched: {data.title}")
    return {k: v for k, v in doc.items() if k != "_id"}


@api.delete("/quests/{qid}")
async def delete_quest(qid: str, admin: dict = Depends(require_admin)):
    await db.quests.delete_one({"id": qid})
    await db.quest_claims.delete_many({"quest_id": qid})
    return {"ok": True}


@api.post("/quests/{qid}/milestones/{mid}/claim")
async def claim_milestone(qid: str, mid: str, user: dict = Depends(get_current_user)):
    q = await db.quests.find_one({"id": qid})
    if not q or not q.get("active"):
        raise HTTPException(404, "Quest not available")
    milestone = next((m for m in q.get("milestones", []) if m["id"] == mid), None)
    if not milestone:
        raise HTTPException(404, "Milestone not found")
    completed = await db.assignments.count_documents({
        "assignee_id": user["id"], "status": "approved", "approved_at": {"$gte": q["created_at"]},
    })
    if completed < milestone["target"]:
        raise HTTPException(400, f"Complete {milestone['target']} missions first ({completed}/{milestone['target']})")
    existing = await db.quest_claims.find_one({"quest_id": qid, "milestone_id": mid, "user_id": user["id"]})
    if existing:
        raise HTTPException(400, "Already claimed")
    pts = milestone.get("points", 0)
    await db.quest_claims.insert_one({"id": new_id(), "quest_id": qid, "milestone_id": mid, "user_id": user["id"], "claimed_at": now_iso()})
    if pts:
        await db.users.update_one({"id": user["id"]}, {"$inc": {"points_balance": pts, "lifetime_points": pts}})
        await recompute_user(user["id"])
        await add_pet_xp(user["id"], pts)
    await notify(user["id"], "Quest Milestone Reached!", f"{milestone['title']} +{pts} points", "quest")
    await log_activity("quest", f"{user['first_name']} claimed milestone '{milestone['title']}' (+{pts})", user["id"])
    return {"ok": True, "points_awarded": pts}


# ---------------- settings ----------------
@api.get("/settings")
async def read_settings(user: dict = Depends(get_current_user)):
    return await get_settings()


@api.put("/settings")
async def update_settings(data: SettingsUpdate, admin: dict = Depends(require_admin)):
    upd = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.settings.update_one({"id": "household"}, {"$set": upd}, upsert=True)
    return await get_settings()


# ---------------- dashboards ----------------
@api.get("/dashboard/admin")
async def admin_dashboard(admin: dict = Depends(require_admin)):
    pending = await db.assignments.count_documents({"status": "pending_approval"})
    today = await db.assignments.count_documents({"status": {"$in": ["assigned", "in_progress"]}})
    members = await db.users.find({"role": "member"}, {"_id": 0, "password_hash": 0, "pin_hash": 0}).to_list(200)
    ranking = sorted(members, key=lambda m: m.get("lifetime_points", 0), reverse=True)
    approvals = await db.assignments.find({"status": "pending_approval"}, {"_id": 0}).sort("completed_at", -1).to_list(50)
    for a in approvals:
        await build_assignment_view(a)
    activity = await db.activity.find({}, {"_id": 0}).sort("created_at", -1).to_list(12)
    total_approved = await db.assignments.count_documents({"status": "approved"})
    unread_msgs = await db.messages.count_documents({"to_user_id": "admin", "read": False})
    return {
        "pending_approvals": pending,
        "todays_chores": today,
        "member_count": len(members),
        "total_approved": total_approved,
        "unread_messages": unread_msgs,
        "ranking": [{"id": m["id"], "first_name": m["first_name"], "avatar": m.get("avatar", ""),
                     "lifetime_points": m.get("lifetime_points", 0), "rank": m.get("rank", "Recruit"),
                     "level": m.get("level", 1)} for m in ranking],
        "approvals": approvals,
        "activity": activity,
    }


@api.get("/dashboard/user")
async def user_dashboard(user: dict = Depends(get_current_user)):
    uid = user["id"]
    missions = await db.assignments.find({"assignee_id": uid, "status": {"$in": ["assigned", "in_progress"]}}, {"_id": 0}).sort("created_at", -1).to_list(100)
    lifetime = user.get("lifetime_points", 0)
    lvl = level_for(lifetime)
    members = await db.users.find({"role": "member"}, {"_id": 0}).to_list(200)
    ranking = sorted(members, key=lambda m: m.get("lifetime_points", 0), reverse=True)
    position = next((i + 1 for i, m in enumerate(ranking) if m["id"] == uid), None)
    unread = await db.notifications.count_documents({"user_id": uid, "read": False})
    unread_ann = await db.notifications.count_documents({"user_id": uid, "read": False, "kind": "announcement"})
    active_rules = await db.rules.find({"archived": {"$ne": True}, "require_ack": True}, {"_id": 0}).to_list(500)
    acks = await db.rule_acks.find({"user_id": uid}, {"_id": 0}).to_list(1000)
    ack_set = {(a["rule_id"], a["version"]) for a in acks}
    unack_rules = sum(1 for r in active_rules if (r["id"], r.get("version", 1)) not in ack_set)
    return {
        "missions": missions,
        "mission_count": len(missions),
        "points_balance": user.get("points_balance", 0),
        "lifetime_points": lifetime,
        "spent_points": user.get("spent_points", 0),
        "streak_count": user.get("streak_count", 0),
        "achievement_count": len(user.get("achievements", [])),
        "level_info": lvl,
        "leaderboard_position": position,
        "leaderboard": [{"id": m["id"], "first_name": m["first_name"], "avatar": m.get("avatar", ""),
                         "lifetime_points": m.get("lifetime_points", 0), "rank": m.get("rank", "Recruit")}
                        for m in ranking[:10]],
        "unread_notifications": unread,
        "unread_announcements": unread_ann,
        "unacknowledged_rules": unack_rules,
    }


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------- seeding ----------------
async def seed():
    # indexes
    await db.users.create_index("id", unique=True)
    await db.users.create_index("email")
    # areas
    if await db.areas.count_documents({}) == 0:
        for name in PREBUILT_AREAS:
            await db.areas.insert_one({"id": new_id(), "name": name, "custom": False})
    # settings
    await get_settings()
    # demo rules (independent, seed once)
    if await db.rules.count_documents({}) == 0:
        rules_seed = [
            {"title": "Screens off by 9 PM on school nights", "category": "Screen Time Rules", "pinned": True, "require_ack": True,
             "body": "All devices go on the charging station in the kitchen by 9:00 PM Sunday through Thursday. Weekends are more relaxed but be reasonable."},
            {"title": "Kitchen must be clean before bed", "category": "Chore Policies", "pinned": False, "require_ack": True,
             "body": "Whoever cooks does not clean. Everyone helps clear their own plate and the counters get wiped down every night."},
            {"title": "Be kind in messages", "category": "Communication Rules", "pinned": False, "require_ack": True,
             "body": "Use CrewIQ messaging respectfully. No teasing, no all-caps arguments. Treat your crew the way you want to be treated."},
        ]
        for r in rules_seed:
            await db.rules.insert_one({"id": new_id(), **r, "archived": False, "version": 1, "created_at": now_iso()})
    # demo challenges (independent, seed once)
    if await db.challenges.count_documents({}) == 0:
        ch_seed = [
            {"title": "Triple Threat", "description": "Complete 3 missions today.", "difficulty": "Medium", "type": "Daily", "points_reward": 30, "xp_reward": 30, "badge_reward": "Daily Hustler"},
            {"title": "Kitchen Crusader", "description": "Finish any kitchen mission this week.", "difficulty": "Easy", "type": "Weekly", "points_reward": 20, "xp_reward": 20, "badge_reward": ""},
            {"title": "Streak Keeper", "description": "Log in and complete a mission 5 days in a row.", "difficulty": "Hard", "type": "Weekly", "points_reward": 60, "xp_reward": 60, "badge_reward": "Consistency King"},
        ]
        for c in ch_seed:
            await db.challenges.insert_one({"id": new_id(), **c, "expires_at": None, "active": True, "created_at": now_iso()})
    # demo badges (independent, seed once)
    if await db.badges.count_documents({}) == 0:
        badge_seed = [
            {"name": "Helping Hand", "description": "Awarded for going above and beyond for the family.", "tier": "Common", "icon": "hand-heart", "point_reward": 25, "xp_reward": 25},
            {"name": "Clean Machine", "description": "For spotless, consistent cleaning work.", "tier": "Rare", "icon": "sparkles", "point_reward": 50, "xp_reward": 50},
            {"name": "Household Legend", "description": "The highest honor in the household.", "tier": "Legendary", "icon": "crown", "point_reward": 150, "xp_reward": 150},
        ]
        for b in badge_seed:
            await db.badges.insert_one({"id": new_id(), **b, "created_at": now_iso()})
    # demo events (independent, seed once)
    if await db.events.count_documents({}) == 0:
        from datetime import date
        today = date.today()
        ev_seed = [
            {"title": "Family Movie Night", "type": "Family Event", "date": (today + timedelta(days=2)).isoformat(), "description": "Popcorn and a film everyone votes on.", "bonus_points_day": False},
            {"title": "Double Points Saturday", "type": "Bonus Point Day", "date": (today + timedelta(days=5)).isoformat(), "description": "Every approved mission earns double points!", "bonus_points_day": True},
            {"title": "Willow's Birthday", "type": "Birthday", "date": (today + timedelta(days=12)).isoformat(), "description": "Celebrate Willow!", "bonus_points_day": False},
        ]
        for e in ev_seed:
            await db.events.insert_one({"id": new_id(), **e, "created_at": now_iso()})
    # demo team mission (independent, seed once)
    if await db.team_missions.count_documents({}) == 0:
        mem = await db.users.find({"role": "member"}, {"_id": 0, "id": 1}).to_list(10)
        if len(mem) >= 2:
            pids = [m["id"] for m in mem[:3]]
            await db.team_missions.insert_one({
                "id": new_id(), "title": "Clean the Garage", "description": "Team up to sort, sweep and organize the whole garage.",
                "area": "Garage", "points_reward": 120, "teamwork_badge": "Teamwork Titan",
                "participant_ids": pids, "progress": {p: False for p in pids}, "status": "active", "created_at": now_iso(),
            })
    # demo quest (independent, seed once)
    if await db.quests.count_documents({}) == 0:
        await db.quests.insert_one({
            "id": new_id(), "title": "Spring Cleaning Quest", "theme": "Spring Cleaning",
            "description": "A multi-week campaign to get the whole house sparkling. Hit each milestone for bonus rewards!",
            "milestones": [
                {"id": new_id(), "title": "Getting Started", "target": 3, "points": 25},
                {"id": new_id(), "title": "On a Roll", "target": 7, "points": 50},
                {"id": new_id(), "title": "Spring Champion", "target": 15, "points": 120},
            ],
            "active": True, "created_at": now_iso(),
        })
    # admin
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_pw = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email, "role": "admin"})
    if not existing:
        await db.users.insert_one({
            "id": new_id(), "role": "admin", "email": admin_email,
            "password_hash": hash_secret(admin_pw), "first_name": "Household",
            "last_name": "Admin", "nickname": "Admin", "avatar": "",
            "onboarding_complete": True, "created_at": now_iso(),
        })
    elif not verify_secret(admin_pw, existing.get("password_hash", "")):
        await db.users.update_one({"id": existing["id"]}, {"$set": {"password_hash": hash_secret(admin_pw)}})

    # demo members
    if await db.users.count_documents({"role": "member"}) == 0:
        demo = [
            {"first_name": "Garralt", "nickname": "Gar", "age": 14, "grade": "9th", "pin": "1234",
             "household_role": "Teen", "avatar": "https://images.unsplash.com/photo-1740252117013-4fb21771e7ca?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHw0fHwzZCUyMGN1dGUlMjBhdmF0YXIlMjBjaGFyYWN0ZXJ8ZW58MHx8fHwxNzg1NTQ5ODk2fDA&ixlib=rb-4.1.0&q=85",
             "lifetime": 1275, "streak": 14},
            {"first_name": "Willow", "nickname": "Will", "age": 11, "grade": "6th", "pin": "5678",
             "household_role": "Child", "avatar": "https://images.unsplash.com/photo-1740252117027-4275d3f84385?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwzfHwzZCUyMGN1dGUlMjBhdmF0YXIlMjBjaGFyYWN0ZXJ8ZW58MHx8fHwxNzg1NTQ5ODk2fDA&ixlib=rb-4.1.0&q=85",
             "lifetime": 420, "streak": 5},
            {"first_name": "Avery", "nickname": "Ave", "age": 8, "grade": "3rd", "pin": "4321",
             "household_role": "Child", "avatar": "https://images.unsplash.com/photo-1740252117070-7aa2955b25f8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwyfHwzZCUyMGN1dGUlMjBhdmF0YXIlMjBjaGFyYWN0ZXJ8ZW58MHx8fHwxNzg1NTQ5ODk2fDA&ixlib=rb-4.1.0&q=85",
             "lifetime": 150, "streak": 2},
        ]
        member_ids = {}
        for d in demo:
            lvl = level_for(d["lifetime"])
            mid = new_id()
            member_ids[d["first_name"]] = mid
            await db.users.insert_one({
                "id": mid, "role": "member", "first_name": d["first_name"], "last_name": "Family",
                "nickname": d["nickname"], "age": d["age"], "age_group": age_group(d["age"]),
                "grade": d["grade"], "email": "", "avatar": d["avatar"],
                "pin_hash": hash_secret(d["pin"]), "household_role": d["household_role"],
                "chore_time_window": "After School", "points_balance": d["lifetime"],
                "lifetime_points": d["lifetime"], "spent_points": 0, "level": lvl["level"],
                "rank": lvl["rank"], "streak_count": d["streak"], "achievements": [],
                "achievement_count": 0, "mission_count": 0, "onboarding_complete": False,
                "transfer_privileges": True, "created_at": now_iso(),
            })

        # demo chores
        chores_seed = [
            {"name": "Sweep Front Porch", "area": "Front Yard", "points": 15, "difficulty": "Easy", "age_group": "9-12", "frequency": "Daily", "estimated_time": "10 min", "description": "Sweep leaves and dirt off the front porch."},
            {"name": "Load the Dishwasher", "area": "Kitchen", "points": 20, "difficulty": "Medium", "age_group": "13-17", "frequency": "Daily", "estimated_time": "15 min", "description": "Rinse and load all dirty dishes."},
            {"name": "Take Out Trash", "area": "Kitchen", "points": 10, "difficulty": "Easy", "age_group": "9-12", "frequency": "Daily", "estimated_time": "5 min", "description": "Empty trash bins and replace liners."},
            {"name": "Mow the Backyard", "area": "Backyard", "points": 40, "difficulty": "Hard", "age_group": "13-17", "frequency": "Weekly", "estimated_time": "45 min", "description": "Mow and edge the backyard grass."},
            {"name": "Clean Your Bedroom", "area": "Bedroom", "points": 25, "difficulty": "Medium", "age_group": "5-8", "frequency": "Weekly", "estimated_time": "30 min", "description": "Make bed, tidy toys, vacuum floor.", "transfer_locked": True},
            {"name": "Fold Laundry", "area": "Laundry Room", "points": 20, "difficulty": "Medium", "age_group": "9-12", "frequency": "Weekly", "estimated_time": "20 min", "description": "Fold and put away clean laundry."},
        ]
        chore_ids = {}
        for c in chores_seed:
            cid = new_id()
            chore_ids[c["name"]] = c
            await db.chores.insert_one({
                "id": cid, "name": c["name"], "description": c.get("description", ""), "area": c["area"],
                "age_group": c["age_group"], "frequency": c["frequency"], "points": c["points"],
                "difficulty": c["difficulty"], "estimated_time": c["estimated_time"], "repeat_settings": "",
                "transfer_locked": c.get("transfer_locked", False), "active": True, "created_at": now_iso(),
            })
            c["_id"] = cid

        # demo assignments
        def mk_assignment(chore, uid):
            return {
                "id": new_id(), "chore_id": chore["_id"], "title": chore["name"],
                "description": chore.get("description", ""), "area": chore["area"], "points": chore["points"],
                "difficulty": chore["difficulty"], "estimated_time": chore["estimated_time"],
                "transfer_locked": chore.get("transfer_locked", False), "assignee_id": uid,
                "original_assignee_id": uid, "transferred": False, "status": "assigned",
                "due_date": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
                "comment": "", "bonus_points": 0, "created_at": now_iso(),
            }
        g = member_ids["Garralt"]
        w = member_ids["Willow"]
        av = member_ids["Avery"]
        await db.assignments.insert_one(mk_assignment(chore_ids["Sweep Front Porch"], g))
        await db.assignments.insert_one(mk_assignment(chore_ids["Load the Dishwasher"], g))
        await db.assignments.insert_one(mk_assignment(chore_ids["Take Out Trash"], w))
        await db.assignments.insert_one(mk_assignment(chore_ids["Fold Laundry"], w))
        await db.assignments.insert_one(mk_assignment(chore_ids["Clean Your Bedroom"], av))
        pend = mk_assignment(chore_ids["Mow the Backyard"], g)
        pend["status"] = "pending_approval"
        pend["completed_at"] = now_iso()
        await db.assignments.insert_one(pend)

        # demo rewards
        rewards_seed = [
            {"name": "30 Min Extra Screen Time", "category": "Screen Time", "cost": 100, "quantity": 10, "approval_required": True, "description": "Earn 30 extra minutes of screen time."},
            {"name": "Choose Movie Night Film", "category": "Privileges", "cost": 150, "quantity": 5, "approval_required": True, "description": "Pick the movie for family movie night."},
            {"name": "$5 Gift Card", "category": "Gift Cards", "cost": 500, "quantity": 3, "approval_required": True, "description": "Redeem for a $5 gift card of your choice."},
            {"name": "Skip One Chore", "category": "Privileges", "cost": 300, "quantity": 2, "approval_required": True, "description": "Skip a single assigned chore, guilt free."},
        ]
        for r in rewards_seed:
            await db.rewards.insert_one({"id": new_id(), **r, "created_at": now_iso()})

        # demo announcement
        await db.announcements.insert_one({
            "id": new_id(), "title": "Double Points Weekend!",
            "body": "Complete any mission this weekend to earn bonus points. Let's go crew!",
            "created_at": now_iso(),
        })
        await log_activity("system", "Household seeded with demo crew")


@app.on_event("startup")
async def on_start():
    await seed()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
