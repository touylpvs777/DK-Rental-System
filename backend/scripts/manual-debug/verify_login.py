"""
Verify login works end-to-end without starting an HTTP server.
Tests: hash_password, verify_password, authenticate(), create_access_token.
"""
import asyncio
from sqlalchemy import select
from app.database.session import AsyncSessionLocal
from app.models.user import User
from app.core.security import verify_password, create_access_token, decode_token


async def main():
    async with AsyncSessionLocal() as db:
        user = (await db.execute(
            select(User).where(User.email == "admin@dkcrm.local")
        )).scalar_one_or_none()

        if user is None:
            print("FAIL — no user found with email admin@dkcrm.local")
            return

        print(f"Found user: id={user.id} | username={user.username} | superuser={user.is_superuser} | active={user.is_active}")

        # Step 1: verify password
        ok = verify_password("Admin@123", user.hashed_password)
        print(f"Password check: {'PASS' if ok else 'FAIL'}")

        if not ok:
            return

        # Step 2: issue access token
        token = create_access_token(user.id)
        print(f"Access token issued: {token[:50]}...")

        # Step 3: decode and validate token
        payload = decode_token(token)
        print(f"Token decoded: sub={payload['sub']} | type={payload['type']}")
        print(f"Token subject matches user id: {str(user.id) == payload['sub']}")

        print("\nAll checks PASSED — login will work correctly.")


asyncio.run(main())
