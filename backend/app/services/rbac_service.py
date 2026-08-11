from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import ROLE_PERMISSIONS, PermissionName
from app.models.role import Role, RoleName
from app.schemas.role import RoleCreate, RoleUpdate

_ROLE_DESCRIPTIONS: dict[RoleName, str] = {
    RoleName.SUPER_ADMIN: "Full system access — all permissions",
    RoleName.MANAGER: "Manage customers, leads, and view dashboard",
    RoleName.SALES: "Create and edit customers and leads",
    RoleName.SUPPORT: "Create and edit customers; view dashboard",
}


class RBACService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Seed ──────────────────────────────────────────────────────────────────

    async def seed_roles(self) -> None:
        """Insert default roles if they do not already exist. Safe to call on every startup."""
        for role_name in RoleName:
            exists = (
                await self.db.execute(select(Role).where(Role.name == role_name.value))
            ).scalar_one_or_none()
            if exists is None:
                self.db.add(Role(
                    name=role_name.value,
                    description=_ROLE_DESCRIPTIONS[role_name],
                ))
        await self.db.commit()

    # ── CRUD ──────────────────────────────────────────────────────────────────

    async def get_all(self) -> list[Role]:
        result = await self.db.execute(select(Role).order_by(Role.id))
        return list(result.scalars().all())

    async def get_by_id(self, role_id: int) -> Role | None:
        return await self.db.get(Role, role_id)

    async def get_by_name(self, name: RoleName) -> Role | None:
        result = await self.db.execute(select(Role).where(Role.name == name.value))
        return result.scalar_one_or_none()

    async def create(self, data: RoleCreate) -> Role:
        role = Role(name=data.name.value, description=data.description)
        self.db.add(role)
        await self.db.commit()
        await self.db.refresh(role)
        return role

    async def update(self, role: Role, data: RoleUpdate) -> Role:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(role, field, value)
        await self.db.commit()
        await self.db.refresh(role)
        return role

    async def delete(self, role: Role) -> None:
        await self.db.delete(role)
        await self.db.commit()

    # ── Permissions ───────────────────────────────────────────────────────────

    def get_permissions(self, role_name: RoleName) -> list[PermissionName]:
        return sorted(ROLE_PERMISSIONS.get(role_name, frozenset()), key=lambda p: p.value)
