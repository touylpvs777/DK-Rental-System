import logging

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.dependencies import get_current_user
from app.models.activity_log import ActionType, EntityType
from app.models.user import User
from app.schemas.brand import BrandCreate, BrandOut, BrandUpdate
from app.services.activity_log_service import ActivityLogService
from app.services.brand_service import BrandService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/brands", tags=["Catalog – Brands"])


@router.get("/", response_model=list[BrandOut], summary="List brands")
async def list_brands(
    skip: int = 0,
    limit: int = 100,
    is_active: bool | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await BrandService(db).list_brands(skip=skip, limit=limit, is_active=is_active)


@router.post(
    "/",
    response_model=BrandOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create brand",
)
async def create_brand(
    data: BrandCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    brand = await BrandService(db).create_brand(data)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.CATALOG_BRAND_CREATED,
        entity_type=EntityType.CATALOG_BRAND,
        entity_id=brand.id,
        details={"name": brand.name},
    )
    return brand


@router.get("/{brand_id}", response_model=BrandOut, summary="Get brand by ID")
async def get_brand(
    brand_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await BrandService(db).get_brand(brand_id)


@router.put("/{brand_id}", response_model=BrandOut, summary="Update brand")
async def update_brand(
    brand_id: int,
    data: BrandUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    brand = await BrandService(db).update_brand(brand_id, data)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.CATALOG_BRAND_UPDATED,
        entity_type=EntityType.CATALOG_BRAND,
        entity_id=brand.id,
        details={"changed_fields": list(data.model_dump(exclude_unset=True).keys())},
    )
    return brand


@router.delete("/{brand_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete brand")
async def delete_brand(
    brand_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    svc = BrandService(db)
    brand = await svc.get_brand(brand_id)
    name = brand.name
    await svc.delete_brand(brand_id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.CATALOG_BRAND_DELETED,
        entity_type=EntityType.CATALOG_BRAND,
        entity_id=brand_id,
        details={"name": name},
    )
