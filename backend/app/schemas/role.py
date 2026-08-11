from datetime import datetime

from pydantic import BaseModel

from app.core.permissions import PermissionName
from app.models.role import RoleName


class RoleBase(BaseModel):
    name: RoleName
    description: str | None = None


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseModel):
    description: str | None = None
    is_active: bool | None = None


class RoleOut(RoleBase):
    model_config = {"from_attributes": True}

    id: int
    is_active: bool
    created_at: datetime


class RoleWithPermissionsOut(RoleOut):
    permissions: list[PermissionName]
