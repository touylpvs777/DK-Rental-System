"""Debug version — server stderr visible, single targeted GET."""
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

proc = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000",
     "--log-level", "debug"],
    # leave stdout/stderr open so we see server logs
)
assert wait(12), "Server did not start"
print("\n--- server ready ---\n")

try:
    body = json.dumps({"username": "admin", "password": "Admin@123"}).encode()
    r = urllib.request.Request(BASE + "/api/v1/auth/login", data=body,
                               headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(r) as resp:
        token = json.loads(resp.read())["access_token"]
    print(f"token: {token[:20]}...")

    r2 = urllib.request.Request(BASE + "/api/v1/activity/?limit=5",
                                headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(r2) as resp:
            print("HTTP", resp.status)
            print(resp.read().decode())
    except urllib.error.HTTPError as e:
        print("HTTP ERROR", e.code, e.reason)
        print("body:", e.read().decode()[:2000] or "(empty)")
finally:
    proc.terminate()
    proc.wait()
