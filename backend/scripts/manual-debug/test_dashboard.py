"""End-to-end test for all four dashboard endpoints."""
import json
import subprocess
import sys
import time
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000"


def wait(timeout=12):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(BASE + "/health", timeout=1)
            return True
        except Exception:
            time.sleep(0.4)
    return False


def get_json(path, token):
    req = urllib.request.Request(
        BASE + path, headers={"Authorization": f"Bearer {token}"}
    )
    with urllib.request.urlopen(req) as r:
        return r.status, json.loads(r.read())


proc = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)
print("Starting server...")
assert wait(12), "Server did not start"
print("Server ready.\n")

try:
    # Login
    body = json.dumps({"username": "admin", "password": "Admin@123"}).encode()
    req = urllib.request.Request(
        BASE + "/api/v1/auth/login", data=body,
        headers={"Content-Type": "application/json"}, method="POST",
    )
    with urllib.request.urlopen(req) as r:
        token = json.loads(r.read())["access_token"]
    print("Login: OK\n")

    # ── /summary ────────────────────────────────────────────────────────────
    status, data = get_json("/api/v1/dashboard/summary", token)
    print(f"GET /summary → HTTP {status}")
    print(json.dumps(data, indent=2))

    assert status == 200
    assert set(data.keys()) == {
        "total_customers", "active_customers", "prospect_customers",
        "total_leads", "new_leads", "contacted_leads", "qualified_leads",
        "proposal_leads", "won_leads", "lost_leads",
        "leads_by_source",
        "conversion_rate", "win_rate", "lost_rate",
    }
    assert isinstance(data["conversion_rate"], float)
    assert isinstance(data["leads_by_source"], dict)
    print("  /summary assertions PASSED\n")

    # ── /lead-trend ─────────────────────────────────────────────────────────
    status, data = get_json("/api/v1/dashboard/lead-trend?months=6", token)
    print(f"GET /lead-trend?months=6 → HTTP {status}")
    print(json.dumps(data, indent=2))

    assert status == 200
    assert isinstance(data, list) and len(data) == 6
    assert all({"month", "count"} == set(p.keys()) for p in data)
    assert all(p["count"] >= 0 for p in data)
    print("  /lead-trend assertions PASSED\n")

    # ── /customer-trend ─────────────────────────────────────────────────────
    status, data = get_json("/api/v1/dashboard/customer-trend?months=6", token)
    print(f"GET /customer-trend?months=6 → HTTP {status}")
    print(json.dumps(data, indent=2))

    assert status == 200
    assert isinstance(data, list) and len(data) == 6
    assert all({"month", "count"} == set(p.keys()) for p in data)
    print("  /customer-trend assertions PASSED\n")

    # ── /lead-metrics ────────────────────────────────────────────────────────
    status, data = get_json("/api/v1/dashboard/lead-metrics", token)
    print(f"GET /lead-metrics → HTTP {status}")
    print(json.dumps(data, indent=2))

    assert status == 200
    assert set(data.keys()) == {
        "total", "conversion_rate", "win_rate", "lost_rate",
        "by_status", "by_source",
    }
    assert set(data["by_status"].keys()) == {
        "new", "contacted", "qualified", "proposal", "won", "lost"
    }
    assert isinstance(data["by_source"], dict)
    assert 0.0 <= data["conversion_rate"] <= 100.0
    assert 0.0 <= data["win_rate"] <= 100.0
    assert 0.0 <= data["lost_rate"] <= 100.0
    print("  /lead-metrics assertions PASSED\n")

    print("All dashboard assertions PASSED")

finally:
    proc.terminate()
    proc.wait()
    print("Server stopped.")
