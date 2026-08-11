"""End-to-end: login → hit all 3 report endpoints in both formats."""
import json, subprocess, sys, time, urllib.request, urllib.error, tempfile, os

BASE = "http://127.0.0.1:8000"

def wait(t=12):
    d = time.time() + t
    while time.time() < d:
        try: urllib.request.urlopen(BASE + "/health", timeout=1); return True
        except: time.sleep(0.4)
    return False

def login():
    body = json.dumps({"username": "admin", "password": "Admin@123"}).encode()
    req = urllib.request.Request(BASE + "/api/v1/auth/login", data=body,
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())["access_token"]

def get_bytes(path, token):
    req = urllib.request.Request(BASE + path, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req) as r:
        return r.status, r.headers.get("Content-Type"), r.read()

proc = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
)
assert wait(), "Server failed to start"
print("Server ready.\n")

try:
    token = login()
    print("Login: OK\n")

    cases = [
        ("/api/v1/reports/customers?format=csv",   "text/csv",    "customers_csv"),
        ("/api/v1/reports/customers?format=excel", "application/vnd", "customers_xlsx"),
        ("/api/v1/reports/leads?format=csv",       "text/csv",    "leads_csv"),
        ("/api/v1/reports/leads?format=excel",     "application/vnd", "leads_xlsx"),
        ("/api/v1/reports/sales?format=csv",       "text/csv",    "sales_csv"),
        ("/api/v1/reports/sales?format=excel",     "application/vnd", "sales_xlsx"),
    ]

    for path, expected_ct, label in cases:
        status, ct, body = get_bytes(path, token)
        assert status == 200, f"{label}: expected 200, got {status}"
        assert expected_ct in (ct or ""), f"{label}: expected {expected_ct!r} in content-type, got {ct!r}"
        print(f"  {label:20s}  HTTP {status}  {len(body):6d} bytes  {ct.split(';')[0]}")

    print("\nAll 6 report endpoints PASSED")

    # Show CSV preview
    print("\n── Customer CSV preview ──────────────────────")
    _, _, csv_body = get_bytes("/api/v1/reports/customers?format=csv", token)
    print(csv_body.decode("utf-8-sig")[:400] or "(empty — no customers yet)")

    print("\n── Sales CSV preview ─────────────────────────")
    _, _, csv_body = get_bytes("/api/v1/reports/sales?format=csv", token)
    print(csv_body.decode("utf-8-sig")[:400] or "(empty — no leads with value yet)")

finally:
    proc.terminate(); proc.wait()
    print("\nServer stopped.")
