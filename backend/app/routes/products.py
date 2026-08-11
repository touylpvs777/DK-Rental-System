import logging

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.dependencies import get_current_user
from app.models.activity_log import ActionType, EntityType
from app.models.user import User
from app.schemas.product import (
    CompatBrandAdd,
    CompatBrandOut,
    ImageCreate,
    ImageOut,
    ImageUpdate,
    ProductCreate,
    ProductDetail,
    ProductListResponse,
    ProductOut,
    ProductUpdate,
    SpecCreate,
    SpecOut,
    SpecUpdate,
)
from app.services.activity_log_service import ActivityLogService
from app.services.product_service import ProductService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/products", tags=["Catalog – Products"])


# ── List / search ─────────────────────────────────────────────────────────────

@router.get("/", response_model=ProductListResponse, summary="List products with filters")
async def list_products(
    q: str | None = Query(default=None, description="Full-text search"),
    category_id: int | None = None,
    brand_id: int | None = None,
    is_active: bool | None = True,
    is_rental: bool | None = None,
    is_sale: bool | None = None,
    is_featured: bool | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort: str = Query(default="sort_order", pattern="^(sort_order|name_en|created_at|updated_at)$"),
    order: str = Query(default="asc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await ProductService(db).list_products(
        q=q,
        category_id=category_id,
        brand_id=brand_id,
        is_active=is_active,
        is_rental=is_rental,
        is_sale=is_sale,
        is_featured=is_featured,
        page=page,
        page_size=page_size,
        sort=sort,
        order=order,
    )


# ── Single product ────────────────────────────────────────────────────────────

@router.get("/{product_id}", response_model=ProductDetail, summary="Get product detail")
async def get_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await ProductService(db).get_product(product_id)


# ── Create ────────────────────────────────────────────────────────────────────

@router.post(
    "/",
    response_model=ProductOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create product",
)
async def create_product(
    data: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    svc = ProductService(db)
    product = await svc.create_product(data, created_by=current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.CATALOG_PRODUCT_CREATED,
        entity_type=EntityType.CATALOG_PRODUCT,
        entity_id=product.id,
        details={"name_en": product.name_en, "sku": product.sku},
    )
    return ProductOut.model_validate(product)


# ── Update ────────────────────────────────────────────────────────────────────

@router.put("/{product_id}", response_model=ProductOut, summary="Update product")
async def update_product(
    product_id: int,
    data: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    svc = ProductService(db)
    product = await svc.update_product(product_id, data, updated_by=current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.CATALOG_PRODUCT_UPDATED,
        entity_type=EntityType.CATALOG_PRODUCT,
        entity_id=product.id,
        details={"changed_fields": list(data.model_dump(exclude_unset=True).keys())},
    )
    return ProductOut.model_validate(product)


# ── Delete ────────────────────────────────────────────────────────────────────

@router.delete(
    "/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete product",
)
async def delete_product(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    svc = ProductService(db)
    detail = await svc.get_product(product_id)
    name = detail.name_en
    await svc.delete_product(product_id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.CATALOG_PRODUCT_DELETED,
        entity_type=EntityType.CATALOG_PRODUCT,
        entity_id=product_id,
        details={"name_en": name},
    )


# ── Specs ─────────────────────────────────────────────────────────────────────

@router.post(
    "/{product_id}/specs",
    response_model=SpecOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add spec to product",
)
async def add_spec(
    product_id: int,
    data: SpecCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    return await ProductService(db).add_spec(product_id, data)


@router.put(
    "/{product_id}/specs/{spec_id}",
    response_model=SpecOut,
    summary="Update a spec",
)
async def update_spec(
    product_id: int,
    spec_id: int,
    data: SpecUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    return await ProductService(db).update_spec(product_id, spec_id, data)


@router.delete(
    "/{product_id}/specs/{spec_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a spec",
)
async def delete_spec(
    product_id: int,
    spec_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    await ProductService(db).delete_spec(product_id, spec_id)


# ── Images ────────────────────────────────────────────────────────────────────

@router.post(
    "/{product_id}/images",
    response_model=ImageOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add image URL to product",
)
async def add_image(
    product_id: int,
    data: ImageCreate,
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    return await ProductService(db).add_image(product_id, data)


@router.put(
    "/{product_id}/images/{image_id}",
    response_model=ImageOut,
    summary="Update image metadata",
)
async def update_image(
    product_id: int,
    image_id: int,
    data: ImageUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    return await ProductService(db).update_image(product_id, image_id, data)


@router.delete(
    "/{product_id}/images/{image_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete product image",
)
async def delete_image(
    product_id: int,
    image_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    await ProductService(db).delete_image(product_id, image_id)


# ── Compat brands ─────────────────────────────────────────────────────────────

@router.post(
    "/{product_id}/compat-brands",
    response_model=CompatBrandOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add spare-part compatibility brand",
)
async def add_compat_brand(
    product_id: int,
    data: CompatBrandAdd,
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    return await ProductService(db).add_compat_brand(product_id, data)


@router.delete(
    "/{product_id}/compat-brands/{compat_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove compat brand entry",
)
async def remove_compat_brand(
    product_id: int,
    compat_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.MANAGE_CATALOG),
):
    await ProductService(db).remove_compat_brand(product_id, compat_id)
