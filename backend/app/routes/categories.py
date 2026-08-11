import logging

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.dependencies import get_current_user
from app.models.activity_log import ActionType, EntityType
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryOut, CategoryTree, CategoryUpdate
from app.services.activity_log_service import ActivityLogService
from app.services.category_service import CategoryService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/categories", tags=["Catalog – Categories"])


@router.get("/", response_model=list[CategoryTree], summary="Get full category tree")
async def get_tree(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await CategoryService(db).get_tree()


@router.get("/flat", response_model=list[CategoryOut], summary="Get all categories flat")
async def get_flat(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await CategoryService(db).get_flat()


@router.post(
    "/",
    response_model=CategoryOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create category",
)
async def create_category(
    data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    cat = await CategoryService(db).create_category(data)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.CATALOG_CATEGORY_CREATED,
        entity_type=EntityType.CATALOG_CATEGORY,
        entity_id=cat.id,
        details={"name_en": cat.name_en, "level": cat.level},
    )
    return cat


@router.get("/{category_id}", response_model=CategoryOut, summary="Get category by ID")
async def get_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await CategoryService(db).get_category(category_id)


@router.put("/{category_id}", response_model=CategoryOut, summary="Update category")
async def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    cat = await CategoryService(db).update_category(category_id, data)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.CATALOG_CATEGORY_UPDATED,
        entity_type=EntityType.CATALOG_CATEGORY,
        entity_id=cat.id,
        details={"changed_fields": list(data.model_dump(exclude_unset=True).keys())},
    )
    return cat


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete category",
)
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    svc = CategoryService(db)
    cat = await svc.get_category(category_id)
    name = cat.name_en
    await svc.delete_category(category_id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.CATALOG_CATEGORY_DELETED,
        entity_type=EntityType.CATALOG_CATEGORY,
        entity_id=category_id,
        details={"name_en": name},
    )
