"""End-to-end test: activity tracking across all entity types."""
import json
import subprocess
import sys
import time
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000"


def wait(t=15):
    d = time.time() + t
    while time.time() < d:
        try:
            urllib.request.urlopen(BASE + "/health", timeout=1)
            return True
        except Exception:
            time.sleep(0.4)
    return False


def req(method, path, body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else None
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


proc = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)
print("Starting server...")
assert wait(15), "Server did not start"
print("Server ready.\n")

try:
    # ── Login ────────────────────────────────────────────────────────────────
    s, r = req("POST", "/api/v1/auth/login", {"username": "admin", "password": "Admin@123"})
    assert s == 200, r
    token = r["access_token"]
    print("Login: OK")

    # ── Create customer ──────────────────────────────────────────────────────
    s, cust = req("POST", "/api/v1/customers/",
                  {"first_name": "Alice", "last_name": "Activity", "status": "prospect"}, token)
    assert s == 201, cust
    cust_id = cust["id"]
    print(f"Customer created: id={cust_id}")

    # ── Update customer status ───────────────────────────────────────────────
    s, r = req("PATCH", f"/api/v1/customers/{cust_id}", {"status": "active"}, token)
    assert s == 200, r
    print("Customer status -> active")

    # ── Create lead ──────────────────────────────────────────────────────────
    s, lead = req("POST", "/api/v1/leads/",
                  {"title": "Big Deal", "value": 9999, "source": "referral", "customer_id": cust_id}, token)
    assert s == 201, lead
    lead_id = lead["id"]
    print(f"Lead created: id={lead_id}")

    # ── Update lead status ───────────────────────────────────────────────────
    s, r = req("PUT", f"/api/v1/leads/{lead_id}", {"status": "contacted"}, token)
    assert s == 200, r
    print("Lead status -> contacted")

    # ── Add lead note ────────────────────────────────────────────────────────
    s, note = req("POST", f"/api/v1/leads/{lead_id}/notes",
                  {"content": "Spoke with Alice, very interested."}, token)
    assert s == 201, note
    note_id = note["id"]
    print(f"Note added: id={note_id}")

    # ── /activity — all events (superuser) ──────────────────────────────────
    s, logs = req("GET", "/api/v1/activity/?limit=50", token=token)
    assert s == 200, logs
    actions = [e["action"] for e in logs]
    print(f"\n/activity  ({len(logs)} events):")
    for e in logs:
        det = e.get("details") or {}
        user_label = e["user"]["username"] if e.get("user") else "?"
        print(f"  {e['action']:35s} entity={e['entity_type']}#{e['entity_id']}  "
              f"by={user_label}  details={det}")

    required_actions = {
        "user_login", "customer_created", "customer_updated",
        "customer_status_changed", "lead_created", "lead_updated",
        "lead_status_changed", "lead_note_added",
    }
    missing = required_actions - set(actions)
    assert not missing, f"Missing actions: {missing}"
    print("\n  All expected action types present: PASS")

    # ── Status-change details ────────────────────────────────────────────────
    csc = next(e for e in logs if e["action"] == "customer_status_changed")
    assert csc["details"]["from"] == "prospect", csc["details"]
    assert csc["details"]["to"] == "active", csc["details"]
    print("  customer_status_changed details: PASS")

    lsc = next(e for e in logs if e["action"] == "lead_status_changed")
    assert lsc["details"]["from"] == "new", lsc["details"]
    assert lsc["details"]["to"] == "contacted", lsc["details"]
    print("  lead_status_changed details: PASS")

    # ── CUSTOMER_UPDATED has changed_fields ──────────────────────────────────
    cu = next(e for e in logs if e["action"] == "customer_updated")
    assert "changed_fields" in cu["details"], cu["details"]
    assert "status" in cu["details"]["changed_fields"], cu["details"]
    print("  customer_updated changed_fields: PASS")

    # ── /activity/me ────────────────────────────────────────────────────────
    s, mine = req("GET", "/api/v1/activity/me", token=token)
    assert s == 200, mine
    assert len(mine) > 0
    print(f"\n/activity/me  ({len(mine)} events): PASS")

    # ── /activity/entity/{type}/{id} ─────────────────────────────────────────
    s, hist = req("GET", f"/api/v1/activity/entity/lead/{lead_id}", token=token)
    assert s == 200, hist
    lead_actions_in_hist = {e["action"] for e in hist}
    assert "lead_created" in lead_actions_in_hist, lead_actions_in_hist
    assert "lead_status_changed" in lead_actions_in_hist, lead_actions_in_hist
    print(f"/activity/entity/lead/{lead_id}  actions={lead_actions_in_hist}: PASS")

    # ── /activity filter by action ───────────────────────────────────────────
    s, filtered = req("GET", "/api/v1/activity/?action=customer_status_changed", token=token)
    assert s == 200, filtered
    assert all(e["action"] == "customer_status_changed" for e in filtered)
    print(f"/activity?action=customer_status_changed  ({len(filtered)} events): PASS")

    # ── Nested user info in response ─────────────────────────────────────────
    entries_with_user = [e for e in logs if e.get("user")]
    assert len(entries_with_user) > 0
    assert all("username" in e["user"] for e in entries_with_user)
    print("Nested user in response: PASS")

    print("\nAll activity tracking assertions PASSED")

finally:
    proc.terminate()
    proc.wait()
    print("Server stopped.")
