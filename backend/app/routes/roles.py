from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.dependencies import get_current_user
from app.models.role import RoleName
from app.models.user import User
from app.schemas.permission import PermissionMatrixOut
from app.schemas.role import RoleCreate, RoleOut, RoleUpdate, RoleWithPermissionsOut
from app.services.rbac_service import RBACService

router = APIRouter(prefix="/roles", tags=["Roles"])


@router.get("/permissions", response_model=PermissionMatrixOut)
async def get_permission_matrix(
    _: User = Depends(get_current_user),
):
    """Return the full role → permission matrix. Useful for frontend UI gating."""
    return PermissionMatrixOut.from_mapping()


@router.get("/", response_model=list[RoleOut])
async def list_roles(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await RBACService(db).get_all()


@router.post("/", response_model=RoleOut, status_code=status.HTTP_201_CREATED)
async def create_role(
    data: RoleCreate,
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.MANAGE_USERS),
):
    service = RBACService(db)
    if await service.get_by_name(data.name):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Role already exists")
    return await service.create(data)


@router.get("/{role_id}", response_model=RoleWithPermissionsOut)
async def get_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    role = await RBACService(db).get_by_id(role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    try:
        role_name = RoleName(role.name)
        permissions = RBACService(db).get_permissions(role_name)
    except ValueError:
        permissions = []
    return RoleWithPermissionsOut(
        id=role.id,
        name=role.name,
        description=role.description,
        is_active=role.is_active,
        created_at=role.created_at,
        permissions=permissions,
    )


@router.patch("/{role_id}", response_model=RoleOut)
async def update_role(
    role_id: int,
    data: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.MANAGE_USERS),
):
    service = RBACService(db)
    role = await service.get_by_id(role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    return await service.update(role, data)


@router.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_role(
    role_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.MANAGE_USERS),
):
    service = RBACService(db)
    role = await service.get_by_id(role_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    await service.delete(role)
