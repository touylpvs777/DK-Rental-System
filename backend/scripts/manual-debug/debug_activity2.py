"""Replicate the exact test sequence that fails."""
import json, subprocess, sys, time, urllib.request, urllib.error

BASE = "http://127.0.0.1:8000"

def wait(t=12):
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
        raw = e.read()
        print(f"  HTTPError {e.code}: body={raw!r}")
        return e.code, json.loads(raw) if raw else {}
    except urllib.error.URLError as e:
        print(f"  URLError: {e.reason}")
        return 0, {}

proc = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000",
     "--log-level", "info"],
    stderr=subprocess.PIPE, stdout=subprocess.PIPE,
)
assert wait(12)
print("Server ready.\n")

try:
    s, r = req("POST", "/api/v1/auth/login", {"username": "admin", "password": "Admin@123"})
    token = r["access_token"]
    print(f"Login: {s}")

    s, cust = req("POST", "/api/v1/customers/",
                  {"first_name": "Debug", "last_name": "Test", "status": "prospect"}, token)
    print(f"Create customer: {s}, id={cust.get('id')}")
    cust_id = cust["id"]

    s, r = req("PATCH", f"/api/v1/customers/{cust_id}", {"status": "active"}, token)
    print(f"Update customer status: {s}")

    s, lead = req("POST", "/api/v1/leads/",
                  {"title": "Debug Lead", "value": 100, "source": "referral"}, token)
    print(f"Create lead: {s}, id={lead.get('id')}")
    lead_id = lead["id"]

    s, r = req("PUT", f"/api/v1/leads/{lead_id}", {"status": "contacted"}, token)
    print(f"Update lead status: {s}")

    s, note = req("POST", f"/api/v1/leads/{lead_id}/notes", {"content": "Test note"}, token)
    print(f"Add note: {s}, id={note.get('id')}")

    print("\nGET /activity/ ...")
    s, logs = req("GET", "/api/v1/activity/?limit=10", token=token)
    print(f"GET /activity/: HTTP {s}, entries={len(logs) if isinstance(logs, list) else logs}")

finally:
    proc.terminate()
    out, err = proc.communicate(timeout=5)
    print("\n--- server stdout ---")
    print(out.decode()[-2000:] if out else "(empty)")
    print("\n--- server stderr ---")
    print(err.decode()[-3000:] if err else "(empty)")
