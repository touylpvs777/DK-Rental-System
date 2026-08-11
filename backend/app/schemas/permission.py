from pydantic import BaseModel

from app.core.permissions import ROLE_PERMISSIONS, PermissionName
from app.models.role import RoleName


class RolePermissionEntry(BaseModel):
    role: RoleName
    permissions: list[PermissionName]


class PermissionMatrixOut(BaseModel):
    matrix: list[RolePermissionEntry]

    @classmethod
    def from_mapping(cls) -> "PermissionMatrixOut":
        return cls(
            matrix=[
                RolePermissionEntry(role=role, permissions=sorted(perms, key=lambda p: p.value))
                for role, perms in ROLE_PERMISSIONS.items()
            ]
        )
