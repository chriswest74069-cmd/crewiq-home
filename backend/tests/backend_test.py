"""CrewIQ backend end-to-end API tests covering auth, onboarding, users, chores,
assignments (start/complete/approve), transfers (create/accept/approve/lock),
messages, announcements, rewards, and settings."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://crew-headquarters.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@crewiq.com"
ADMIN_PW = "Admin123!"


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{API}/auth/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_h(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def members(s):
    r = s.get(f"{API}/auth/members")
    assert r.status_code == 200
    data = r.json()
    return {m["first_name"]: m for m in data}


def _member_login(s, members, name, pin):
    r = s.post(f"{API}/auth/member/login", json={"user_id": members[name]["id"], "pin": pin})
    assert r.status_code == 200, r.text
    return r.json()["token"], r.json()["user"]


# ---------- auth ----------
class TestAuth:
    def test_admin_login_ok(self, s):
        r = s.post(f"{API}/auth/admin/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
        assert r.status_code == 200
        j = r.json()
        assert "token" in j and j["user"]["role"] == "admin"

    def test_admin_login_bad_pw(self, s):
        r = s.post(f"{API}/auth/admin/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_members_public_list(self, s):
        r = s.get(f"{API}/auth/members")
        assert r.status_code == 200
        names = {m["first_name"] for m in r.json()}
        assert {"Garralt", "Willow", "Avery"}.issubset(names)

    def test_member_login_ok(self, s, members):
        tok, u = _member_login(s, members, "Willow", "5678")
        assert u["role"] == "member" and u["first_name"] == "Willow"

    def test_member_login_bad_pin(self, s, members):
        r = s.post(f"{API}/auth/member/login", json={"user_id": members["Willow"]["id"], "pin": "9999"})
        assert r.status_code == 401

    def test_me_requires_auth(self, s):
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_ok(self, s, admin_h):
        r = s.get(f"{API}/auth/me", headers=admin_h)
        assert r.status_code == 200 and r.json()["role"] == "admin"


# ---------- onboarding ----------
class TestOnboarding:
    def test_reset_then_complete(self, s, admin_h, members):
        # reset Avery's onboarding as admin
        r = s.post(f"{API}/users/{members['Avery']['id']}/reset-onboarding", headers=admin_h)
        assert r.status_code == 200

        tok, u = _member_login(s, members, "Avery", "4321")
        assert u["onboarding_complete"] is False
        h = {"Authorization": f"Bearer {tok}"}

        r = s.post(f"{API}/onboarding/complete", headers=h)
        assert r.status_code == 200

        r = s.get(f"{API}/auth/me", headers=h)
        assert r.json()["onboarding_complete"] is True


# ---------- dashboards ----------
class TestDashboards:
    def test_admin_dashboard(self, s, admin_h):
        r = s.get(f"{API}/dashboard/admin", headers=admin_h)
        assert r.status_code == 200
        j = r.json()
        for k in ["pending_approvals", "todays_chores", "member_count", "ranking", "approvals"]:
            assert k in j
        assert j["member_count"] >= 3

    def test_user_dashboard(self, s, members):
        tok, _ = _member_login(s, members, "Garralt", "1234")
        r = s.get(f"{API}/dashboard/user", headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 200
        j = r.json()
        assert j["points_balance"] >= 0
        assert "level_info" in j and "leaderboard" in j


# ---------- chores/areas/assignments ----------
class TestChoresAssignments:
    def test_areas_list(self, s, admin_h):
        r = s.get(f"{API}/areas", headers=admin_h)
        assert r.status_code == 200 and len(r.json()) >= 5

    def test_create_chore_assign_start_complete_approve(self, s, admin_h, members):
        # create chore
        payload = {"name": "TEST_Wipe Windows", "description": "test", "area": "Kitchen",
                   "age_group": "13-17", "frequency": "Daily", "points": 25, "difficulty": "Easy",
                   "estimated_time": "10 min", "transfer_locked": False, "active": True}
        r = s.post(f"{API}/chores", json=payload, headers=admin_h)
        assert r.status_code == 200, r.text
        chore = r.json()

        # assign to Willow
        r = s.post(f"{API}/assignments",
                   json={"chore_id": chore["id"], "user_ids": [members["Willow"]["id"]]},
                   headers=admin_h)
        assert r.status_code == 200 and r.json()["count"] == 1

        # member login and start/complete
        tok, u = _member_login(s, members, "Willow", "5678")
        h = {"Authorization": f"Bearer {tok}"}
        r = s.get(f"{API}/assignments", headers=h)
        assert r.status_code == 200
        aid = next(a["id"] for a in r.json() if a["title"] == "TEST_Wipe Windows")

        assert s.post(f"{API}/assignments/{aid}/start", headers=h).status_code == 200
        assert s.post(f"{API}/assignments/{aid}/complete", headers=h).status_code == 200

        # points before
        before = s.get(f"{API}/auth/me", headers=h).json()["points_balance"]

        # admin approve with bonus
        r = s.post(f"{API}/assignments/{aid}/approve",
                   json={"bonus_points": 5, "comment": "great job"}, headers=admin_h)
        assert r.status_code == 200, r.text
        assert r.json()["points_awarded"] == 30

        after = s.get(f"{API}/auth/me", headers=h).json()["points_balance"]
        assert after - before == 30

        # cleanup: delete assignment and chore
        s.delete(f"{API}/assignments/{aid}", headers=admin_h)
        s.delete(f"{API}/chores/{chore['id']}", headers=admin_h)


# ---------- transfers ----------
class TestTransfers:
    def test_transfer_locked_blocked(self, s, admin_h, members):
        # Avery has the locked "Clean Your Bedroom"
        tok, _ = _member_login(s, members, "Avery", "4321")
        h = {"Authorization": f"Bearer {tok}"}
        assigns = s.get(f"{API}/assignments", headers=h).json()
        locked = next((a for a in assigns if a.get("transfer_locked")), None)
        assert locked is not None, "expected a locked assignment for Avery"

        r = s.post(f"{API}/transfers",
                   json={"assignment_id": locked["id"], "to_user_id": members["Willow"]["id"],
                         "message": "please"}, headers=h)
        assert r.status_code == 400
        assert "locked" in r.text.lower()

    def test_transfer_flow_accept_and_admin_approve(self, s, admin_h, members):
        # Willow transfers a non-locked assignment to Garralt
        tok_w, _ = _member_login(s, members, "Willow", "5678")
        hw = {"Authorization": f"Bearer {tok_w}"}
        assigns = s.get(f"{API}/assignments", headers=hw).json()
        cand = next((a for a in assigns if not a.get("transfer_locked") and not a.get("transferred")
                     and a["status"] in ("assigned", "in_progress")), None)
        assert cand is not None

        r = s.post(f"{API}/transfers",
                   json={"assignment_id": cand["id"], "to_user_id": members["Garralt"]["id"],
                         "message": "swap?"}, headers=hw)
        assert r.status_code == 200, r.text
        tid = r.json()["id"]

        # recipient accepts
        tok_g, _ = _member_login(s, members, "Garralt", "1234")
        hg = {"Authorization": f"Bearer {tok_g}"}
        r = s.post(f"{API}/transfers/{tid}/accept", headers=hg)
        assert r.status_code == 200

        # admin approves
        r = s.post(f"{API}/transfers/{tid}/approve", headers=admin_h)
        assert r.status_code == 200

        # verify assignment owner changed
        assigns_g = s.get(f"{API}/assignments", headers=hg).json()
        moved = next((a for a in assigns_g if a["id"] == cand["id"]), None)
        assert moved is not None and moved["assignee_id"] == members["Garralt"]["id"]
        assert moved["transferred"] is True


# ---------- messaging / announcements ----------
class TestMessaging:
    def test_member_message_admin_and_reply(self, s, admin_h, members):
        tok, u = _member_login(s, members, "Willow", "5678")
        h = {"Authorization": f"Bearer {tok}"}
        r = s.post(f"{API}/messages", json={"body": "TEST_hi admin", "category": "General"}, headers=h)
        assert r.status_code == 200
        # admin sees it
        r = s.get(f"{API}/messages", headers=admin_h)
        assert r.status_code == 200
        assert any(m["body"] == "TEST_hi admin" for m in r.json())
        # admin replies
        r = s.post(f"{API}/messages",
                   json={"to_user_id": u["id"], "body": "TEST_hello willow"}, headers=admin_h)
        assert r.status_code == 200

    def test_announcement(self, s, admin_h):
        r = s.post(f"{API}/announcements",
                   json={"title": "TEST_Announce", "body": "Test body"}, headers=admin_h)
        assert r.status_code == 200
        r = s.get(f"{API}/announcements", headers=admin_h)
        assert any(a["title"] == "TEST_Announce" for a in r.json())


# ---------- rewards ----------
class TestRewards:
    def test_create_and_redeem(self, s, admin_h, members):
        r = s.post(f"{API}/rewards",
                   json={"name": "TEST_Cheap Reward", "description": "d", "category": "Custom",
                         "cost": 5, "quantity": 3, "approval_required": True}, headers=admin_h)
        assert r.status_code == 200
        rid = r.json()["id"]

        tok, u = _member_login(s, members, "Garralt", "1234")  # has 1275 points
        h = {"Authorization": f"Bearer {tok}"}
        before = s.get(f"{API}/auth/me", headers=h).json()["points_balance"]
        r = s.post(f"{API}/rewards/{rid}/redeem", headers=h)
        assert r.status_code == 200
        after = s.get(f"{API}/auth/me", headers=h).json()["points_balance"]
        assert before - after == 5

        s.delete(f"{API}/rewards/{rid}", headers=admin_h)

    def test_redeem_insufficient_points(self, s, admin_h, members):
        r = s.post(f"{API}/rewards",
                   json={"name": "TEST_Expensive", "cost": 999999, "quantity": 1,
                         "approval_required": True}, headers=admin_h)
        rid = r.json()["id"]
        tok, _ = _member_login(s, members, "Avery", "4321")
        h = {"Authorization": f"Bearer {tok}"}
        r = s.post(f"{API}/rewards/{rid}/redeem", headers=h)
        assert r.status_code == 400
        s.delete(f"{API}/rewards/{rid}", headers=admin_h)


# ---------- settings & user CRUD ----------
class TestSettingsAndUsers:
    def test_settings_update(self, s, admin_h):
        r = s.put(f"{API}/settings",
                  json={"free_transfers_per_week": 2, "transfer_cost": 15}, headers=admin_h)
        assert r.status_code == 200
        assert r.json()["free_transfers_per_week"] == 2
        assert r.json()["transfer_cost"] == 15
        # restore
        s.put(f"{API}/settings", json={"free_transfers_per_week": 1, "transfer_cost": 10}, headers=admin_h)

    def test_create_update_adjust_delete_user(self, s, admin_h):
        r = s.post(f"{API}/users",
                   json={"first_name": "TESTUser", "pin": "9911", "age": 10,
                         "household_role": "Child"}, headers=admin_h)
        assert r.status_code == 200, r.text
        uid = r.json()["id"]

        r = s.put(f"{API}/users/{uid}", json={"nickname": "TN"}, headers=admin_h)
        assert r.status_code == 200 and r.json()["nickname"] == "TN"

        r = s.post(f"{API}/users/{uid}/adjust-points", json={"amount": 50}, headers=admin_h)
        assert r.status_code == 200

        # verify via list
        r = s.get(f"{API}/users", headers=admin_h)
        found = next((u for u in r.json() if u["id"] == uid), None)
        assert found and found["points_balance"] == 50

        r = s.delete(f"{API}/users/{uid}", headers=admin_h)
        assert r.status_code == 200

    def test_pin_validation(self, s, admin_h):
        r = s.post(f"{API}/users",
                   json={"first_name": "TESTBad", "pin": "12", "household_role": "Child"},
                   headers=admin_h)
        assert r.status_code == 400
