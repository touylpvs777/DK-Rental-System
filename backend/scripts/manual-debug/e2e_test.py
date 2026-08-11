"""
End-to-end test: login → GET /users/me
Run from: f:/DK Sevice/CRM-System/backend/
Requires uvicorn already running on port 8000, OR run via test_runner below.
"""
import asyncio
import json
import subprocess
import sys
import time
import urllib.request
import urllib.error

BASE = "http://127.0.0.1:8000"


def post_json(path: str, body: dict) -> tuple[int, dict]:
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        BASE + path,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def get_json(path: str, token: str) -> tuple[int, dict]:
    req = urllib.request.Request(
        BASE + path,
        headers={"Authorization": f"Bearer {token}"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def wait_for_server(timeout: int = 10) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            urllib.request.urlopen(BASE + "/health", timeout=1)
            return True
        except Exception:
            time.sleep(0.4)
    return False


def separator(title: str) -> None:
    print(f"\n{'─' * 50}")
    print(f"  {title}")
    print(f"{'─' * 50}")


async def run_tests():
    separator("1. Health check")
    try:
        with urllib.request.urlopen(BASE + "/health") as r:
            health = json.loads(r.read())
        print(f"  GET /health → {health}")
    except Exception as e:
        print(f"  Server not reachable: {e}")
        return

    separator("2. POST /api/v1/auth/login")
    status, body = post_json("/api/v1/auth/login", {"username": "admin", "password": "Admin@123"})
    print(f"  HTTP {status}")
    if status != 200:
        print(f"  FAIL: {body}")
        return
    access_token = body["access_token"]
    print(f"  token_type : {body['token_type']}")
    print(f"  access_token : {access_token[:40]}...")
    print(f"  refresh_token: {body['refresh_token'][:20]}...")

    separator("3. GET /api/v1/users/me")
    status, body = get_json("/api/v1/users/me", access_token)
    print(f"  HTTP {status}")
    if status != 200:
        print(f"  FAIL: {body}")
        return
    print(f"  Response JSON:")
    print(json.dumps(body, indent=4))

    separator("RESULT")
    print("  All checks PASSED")
    print(f"  id          : {body['id']}")
    print(f"  email       : {body['email']}")
    print(f"  username    : {body['username']}")
    print(f"  full_name   : {body['full_name']}")
    print(f"  is_active   : {body['is_active']}")
    print(f"  is_superuser: {body['is_superuser']}")
    print(f"  created_at  : {body['created_at']}")
    print(f"  last_login  : {body['last_login']}")


if __name__ == "__main__":
    # Start uvicorn in a subprocess, run tests, then stop it
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print("Starting server...")
    if not wait_for_server(12):
        print("Server did not start in time")
        proc.terminate()
        sys.exit(1)
    print("Server ready.")

    try:
        asyncio.run(run_tests())
    finally:
        proc.terminate()
        proc.wait()
        print("\nServer stopped.")
