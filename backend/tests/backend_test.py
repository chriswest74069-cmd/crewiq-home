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
        # Ensure Willow has a fresh transferable assignment (idempotent regardless of prior state)
        payload = {"name": "TEST_Transferable Chore", "description": "t", "area": "Kitchen",
                   "age_group": "9-12", "frequency": "Daily", "points": 15, "difficulty": "Easy",
                   "estimated_time": "10 min", "transfer_locked": False, "active": True}
        chore = s.post(f"{API}/chores", json=payload, headers=admin_h).json()
        s.post(f"{API}/assignments",
               json={"chore_id": chore["id"], "user_ids": [members["Willow"]["id"]]}, headers=admin_h)

        # Willow transfers a non-locked assignment to Garralt
        tok_w, _ = _member_login(s, members, "Willow", "5678")
        hw = {"Authorization": f"Bearer {tok_w}"}
        assigns = s.get(f"{API}/assignments", headers=hw).json()
        cand = next((a for a in assigns if a["title"] == "TEST_Transferable Chore"
                     and not a.get("transferred") and a["status"] in ("assigned", "in_progress")), None)
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

    def test_general_settings_persist(self, s, admin_h):
        payload = {"household_name": "TEST_Home", "household_motto": "TEST_motto",
                   "theme_accent": "violet", "timezone": "UTC"}
        r = s.put(f"{API}/settings", json=payload, headers=admin_h)
        assert r.status_code == 200
        j = r.json()
        assert j["household_name"] == "TEST_Home"
        assert j["theme_accent"] == "violet"
        r = s.get(f"{API}/settings", headers=admin_h)
        j = r.json()
        assert j["household_name"] == "TEST_Home"
        assert j["household_motto"] == "TEST_motto"
        assert j["theme_accent"] == "violet"
        # restore
        s.put(f"{API}/settings", json={"household_name": "The Crew",
              "household_motto": "Together we get it done!", "theme_accent": "blue"}, headers=admin_h)

    def test_pin_validation(self, s, admin_h):
        r = s.post(f"{API}/users",
                   json={"first_name": "TESTBad", "pin": "12", "household_role": "Child"},
                   headers=admin_h)
        assert r.status_code == 400


# ---------- household rules ----------
class TestRules:
    def test_seed_rules_exist(self, s, admin_h):
        r = s.get(f"{API}/rules", headers=admin_h)
        assert r.status_code == 200
        assert len(r.json()) >= 3

    def test_rule_crud_and_ack_flow(self, s, admin_h, members):
        # Create
        payload = {"title": "TEST_No shoes indoors", "body": "Please remove shoes at the door.",
                   "category": "Household Rules", "pinned": False, "require_ack": True}
        r = s.post(f"{API}/rules", json=payload, headers=admin_h)
        assert r.status_code == 200, r.text
        rid = r.json()["id"]
        assert r.json()["version"] == 1
        assert r.json()["archived"] is False

        # Pin toggle
        r = s.post(f"{API}/rules/{rid}/pin", headers=admin_h)
        assert r.status_code == 200
        rules = s.get(f"{API}/rules", headers=admin_h).json()
        this_rule = next(x for x in rules if x["id"] == rid)
        assert this_rule["pinned"] is True

        # Edit -> version bumps
        r = s.put(f"{API}/rules/{rid}",
                  json={**payload, "body": "Updated body", "pinned": True}, headers=admin_h)
        assert r.status_code == 200
        assert r.json()["version"] == 2

        # Member ack
        tok, u = _member_login(s, members, "Willow", "5678")
        h = {"Authorization": f"Bearer {tok}"}
        # user dashboard exposes unacknowledged count > 0
        dash = s.get(f"{API}/dashboard/user", headers=h).json()
        unack_before = dash["unacknowledged_rules"]
        assert unack_before >= 1

        r = s.post(f"{API}/rules/{rid}/acknowledge", headers=h)
        assert r.status_code == 200

        # rules list shows acknowledged=True
        rules_m = s.get(f"{API}/rules", headers=h).json()
        me_rule = next(x for x in rules_m if x["id"] == rid)
        assert me_rule["acknowledged"] is True

        # dashboard unack count decreased
        dash2 = s.get(f"{API}/dashboard/user", headers=h).json()
        assert dash2["unacknowledged_rules"] == unack_before - 1

        # Admin acks view lists Willow under acknowledged
        acks = s.get(f"{API}/rules/{rid}/acks", headers=admin_h).json()
        acked_ids = {a["user_id"] for a in acks["acknowledged"]}
        pending_ids = {p["user_id"] for p in acks["pending"]}
        assert u["id"] in acked_ids
        assert u["id"] not in pending_ids

        # Archive
        r = s.post(f"{API}/rules/{rid}/archive", headers=admin_h)
        assert r.status_code == 200
        # Member GET /rules should hide archived
        rules_m2 = s.get(f"{API}/rules", headers=h).json()
        assert not any(x["id"] == rid for x in rules_m2)
        # Admin sees archived
        rules_a = s.get(f"{API}/rules", headers=admin_h).json()
        assert any(x["id"] == rid and x.get("archived") for x in rules_a)

        # Delete (also removes acks)
        r = s.delete(f"{API}/rules/{rid}", headers=admin_h)
        assert r.status_code == 200

    def test_rule_ack_requires_auth(self, s):
        r = s.post(f"{API}/rules/fake-id/acknowledge")
        assert r.status_code == 401

    def test_rule_create_requires_admin(self, s, members):
        tok, _ = _member_login(s, members, "Garralt", "1234")
        h = {"Authorization": f"Bearer {tok}"}
        r = s.post(f"{API}/rules",
                   json={"title": "x", "body": "y", "category": "Household Rules"}, headers=h)
        assert r.status_code == 403



# ---------- challenges ----------
class TestChallenges:
    def test_seed_challenges(self, s, admin_h):
        r = s.get(f"{API}/challenges", headers=admin_h)
        assert r.status_code == 200
        assert len(r.json()) >= 3

    def test_challenge_crud_and_claim(self, s, admin_h, members):
        # Create
        payload = {"title": "TEST_Read 10 pages", "description": "Read a book",
                   "difficulty": "Easy", "type": "Daily", "points_reward": 12,
                   "xp_reward": 12, "active": True}
        r = s.post(f"{API}/challenges", json=payload, headers=admin_h)
        assert r.status_code == 200, r.text
        cid = r.json()["id"]
        assert r.json()["points_reward"] == 12

        # Edit
        r = s.put(f"{API}/challenges/{cid}",
                  json={**payload, "points_reward": 15}, headers=admin_h)
        assert r.status_code == 200
        assert r.json()["points_reward"] == 15

        # Member claim
        tok, u = _member_login(s, members, "Garralt", "1234")
        h = {"Authorization": f"Bearer {tok}"}
        before = s.get(f"{API}/auth/me", headers=h).json()["points_balance"]
        r = s.post(f"{API}/challenges/{cid}/claim", headers=h)
        assert r.status_code == 200, r.text
        assert r.json()["points_awarded"] == 15
        after = s.get(f"{API}/auth/me", headers=h).json()["points_balance"]
        assert after - before == 15

        # Double claim prevented
        r = s.post(f"{API}/challenges/{cid}/claim", headers=h)
        assert r.status_code == 400

        # Claimed flag reflected in GET
        chs = s.get(f"{API}/challenges", headers=h).json()
        this = next(c for c in chs if c["id"] == cid)
        assert this.get("claimed") is True
        assert this.get("claim_count", 0) >= 1

        # Delete cleanup
        r = s.delete(f"{API}/challenges/{cid}", headers=admin_h)
        assert r.status_code == 200

    def test_challenge_create_requires_admin(self, s, members):
        tok, _ = _member_login(s, members, "Willow", "5678")
        h = {"Authorization": f"Bearer {tok}"}
        r = s.post(f"{API}/challenges",
                   json={"title": "x", "type": "Daily", "difficulty": "Easy", "points_reward": 5},
                   headers=h)
        assert r.status_code == 403


# ---------- reports & analytics ----------
class TestReports:
    def test_reports_shape_and_data(self, s, admin_h):
        r = s.get(f"{API}/reports/analytics", headers=admin_h)
        assert r.status_code == 200
        j = r.json()
        for k in ["mission_completion", "rankings", "point_growth", "reward_redemptions", "totals"]:
            assert k in j
        totals = j["totals"]
        for k in ["total_points_awarded", "total_assignments", "total_approved",
                  "participation_pct", "active_members", "total_redemptions"]:
            assert k in totals
        # Seeded data => >=3 members with rankings, some approved assignments
        assert totals["active_members"] >= 3
        assert isinstance(j["rankings"], list) and len(j["rankings"]) >= 3

    def test_reports_admin_only(self, s, members):
        tok, _ = _member_login(s, members, "Garralt", "1234")
        r = s.get(f"{API}/reports/analytics", headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 403


# ---------- security / audit ----------
class TestSecurity:
    def test_security_logs_shape(self, s, admin_h):
        r = s.get(f"{API}/security/logs", headers=admin_h)
        assert r.status_code == 200
        j = r.json()
        for k in ["activity", "logins", "redemptions", "point_logs", "rule_logs", "failed_logins"]:
            assert k in j
        # An admin login just happened -> logins has entries
        assert len(j["logins"]) >= 1
        assert any(l.get("role") == "admin" and l.get("success") for l in j["logins"])

    def test_security_admin_only(self, s, members):
        tok, _ = _member_login(s, members, "Garralt", "1234")
        r = s.get(f"{API}/security/logs", headers={"Authorization": f"Bearer {tok}"})
        assert r.status_code == 403


# ---------- power actions & leaderboard settings ----------
class TestPowerActions:
    def test_reset_streak_sets_zero(self, s, admin_h, members):
        uid = members["Willow"]["id"]
        # bump to nonzero
        r = s.post(f"{API}/users/{uid}/reset-streak", headers=admin_h)
        assert r.status_code == 200
        # verify
        r = s.get(f"{API}/users", headers=admin_h)
        w = next(u for u in r.json() if u["id"] == uid)
        assert w["streak_count"] == 0

    def test_reset_progress(self, s, admin_h):
        # Create sacrificial user
        r = s.post(f"{API}/users",
                   json={"first_name": "TEST_Progress", "pin": "9922", "age": 10,
                         "household_role": "Child"}, headers=admin_h)
        uid = r.json()["id"]
        s.post(f"{API}/users/{uid}/adjust-points", json={"amount": 200}, headers=admin_h)
        r = s.post(f"{API}/users/{uid}/reset-progress", headers=admin_h)
        assert r.status_code == 200
        users = s.get(f"{API}/users", headers=admin_h).json()
        u = next(x for x in users if x["id"] == uid)
        assert u["points_balance"] == 0
        assert u["lifetime_points"] == 0
        assert u["streak_count"] == 0
        s.delete(f"{API}/users/{uid}", headers=admin_h)

    def test_toggle_active_hides_from_pin_list(self, s, admin_h):
        # Use a throwaway user to avoid interfering with parallel tests
        r = s.post(f"{API}/users",
                   json={"first_name": "TEST_Toggle", "pin": "8877", "age": 12,
                         "household_role": "Child"}, headers=admin_h)
        uid = r.json()["id"]
        # Confirm visible pre-disable
        pub = s.get(f"{API}/auth/members").json()
        assert any(m["id"] == uid for m in pub)
        # Disable
        r = s.post(f"{API}/users/{uid}/toggle-active", headers=admin_h)
        assert r.status_code == 200 and r.json()["disabled"] is True
        pub = s.get(f"{API}/auth/members").json()
        assert not any(m["id"] == uid for m in pub)
        r = s.post(f"{API}/auth/member/login", json={"user_id": uid, "pin": "8877"})
        assert r.status_code == 403
        # Re-enable
        r = s.post(f"{API}/users/{uid}/toggle-active", headers=admin_h)
        assert r.status_code == 200 and r.json()["disabled"] is False
        pub = s.get(f"{API}/auth/members").json()
        assert any(m["id"] == uid for m in pub)
        s.delete(f"{API}/users/{uid}", headers=admin_h)


class TestLeaderboardSettings:
    def test_leaderboard_toggles_persist(self, s, admin_h):
        r = s.put(f"{API}/settings",
                  json={"leaderboards_enabled": False, "hide_point_totals": True}, headers=admin_h)
        assert r.status_code == 200
        j = r.json()
        assert j["leaderboards_enabled"] is False
        assert j["hide_point_totals"] is True
        # Verify persisted
        j2 = s.get(f"{API}/settings", headers=admin_h).json()
        assert j2["leaderboards_enabled"] is False
        assert j2["hide_point_totals"] is True
        # Restore defaults
        s.put(f"{API}/settings",
              json={"leaderboards_enabled": True, "hide_point_totals": False}, headers=admin_h)
        j3 = s.get(f"{API}/settings", headers=admin_h).json()
        assert j3["leaderboards_enabled"] is True
        assert j3["hide_point_totals"] is False
