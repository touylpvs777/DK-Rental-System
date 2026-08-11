"""
Simulate exactly what FastAPI does when it serializes User → UserOut.
Run from: f:/DK Sevice/CRM-System/backend/
"""
import asyncio
from sqlalchemy import select
from app.database.session import AsyncSessionLocal
from app.models.user import User
from app.schemas.user import UserOut


async def main():
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.username == "admin"))).scalar_one_or_none()

        if user is None:
            print("FAIL — no user found")
            return

        print(f"Raw ORM object:")
        print(f"  id={user.id!r}")
        print(f"  email={user.email!r}")
        print(f"  username={user.username!r}")
        print(f"  full_name={user.full_name!r}")
        print(f"  is_active={user.is_active!r}")
        print(f"  is_superuser={user.is_superuser!r}")
        print(f"  role_id={user.role_id!r}")
        print(f"  created_at={user.created_at!r}  type={type(user.created_at).__name__}")
        print(f"  last_login={user.last_login!r}")
        print()

        try:
            out = UserOut.model_validate(user)
            print("UserOut.model_validate(user) -> OK")
            print(out.model_dump_json(indent=2))
        except Exception as e:
            print(f"UserOut.model_validate FAILED: {type(e).__name__}: {e}")


asyncio.run(main())
