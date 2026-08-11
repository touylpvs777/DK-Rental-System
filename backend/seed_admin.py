"""
One-time script: create the initial admin user in crm.db.
Run from: f:/DK Sevice/CRM-System/backend/
Command:  ..\venv\Scripts\python seed_admin.py
"""
import asyncio
from datetime import datetime, UTC

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import AsyncSessionLocal
from app.database.base import Base
from app.database.session import engine
import app.models as _models  # noqa: F401 — registers all models with Base
from app.models.role import Role, RoleName
from app.models.user import User
from app.core.security import hash_password, verify_password


ADMIN = {
    "email": "admin@dkservice.com",
    "username": "admin",
    "full_name": "System Administrator",
    "password": "Admin@123",
}


async def main() -> None:
    # Ensure tables exist (safe to run multiple times)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        existing = (
            await session.execute(
                select(User).where(
                    (User.email == ADMIN["email"]) | (User.username == ADMIN["username"])
                )
            )
        ).scalar_one_or_none()

        if existing:
            print(f"[SKIP] User already exists: {existing.email} (id={existing.id})")
        else:
            role = (
                await session.execute(
                    select(Role).where(Role.name == RoleName.SUPER_ADMIN.value)
                )
            ).scalar_one_or_none()
            if not role:
                role = Role(name=RoleName.SUPER_ADMIN.value, description="Super Administrator")
                session.add(role)
                await session.flush()

            hashed = hash_password(ADMIN["password"])
            user = User(
                email=ADMIN["email"],
                username=ADMIN["username"],
                full_name=ADMIN["full_name"],
                hashed_password=hashed,
                is_active=True,
                is_superuser=True,
                role_id=role.id,
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
            session.add(user)
            await session.commit()
            await session.refresh(user)
            print(f"[CREATED] id={user.id} | email={user.email} | superuser={user.is_superuser}")

        # Verify password hash is correct
        target = existing or user  # type: ignore[possibly-undefined]
        ok = verify_password(ADMIN["password"], target.hashed_password)
        print(f"[VERIFY]  password check -> {'PASS' if ok else 'FAIL'}")


asyncio.run(main())
