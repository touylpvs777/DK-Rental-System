from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator

from app.schemas.brand import BrandBrief
from app.schemas.category import CategoryBrief


# ── Spec schemas ─────────────────────────────────────────────────────────────

class SpecCreate(BaseModel):
    spec_group: str = Field(..., min_length=1, max_length=100)
    spec_key: str = Field(..., min_length=1, max_length=100)
    spec_label: str = Field(..., min_length=1, max_length=150)
    spec_value: str = Field(..., min_length=1, max_length=500)
    spec_unit: str | None = Field(default=None, max_length=50)
    sort_order: int = 0

    @field_validator("spec_key")
    @classmethod
    def key_safe(cls, v: str) -> str:
        import re
        if not re.match(r"^[a-z][a-z0-9_]*$", v):
            raise ValueError("spec_key must match [a-z][a-z0-9_]* (lowercase, no spaces)")
        return v


class SpecUpdate(BaseModel):
    spec_group: str | None = Field(default=None, max_length=100)
    spec_key: str | None = Field(default=None, max_length=100)
    spec_label: str | None = Field(default=None, max_length=150)
    spec_value: str | None = Field(default=None, max_length=500)
    spec_unit: str | None = None
    sort_order: int | None = None


class SpecOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    product_id: int
    spec_group: str
    spec_key: str
    spec_label: str
    spec_value: str
    spec_unit: str | None = None
    sort_order: int


# ── Image schemas ─────────────────────────────────────────────────────────────

class ImageCreate(BaseModel):
    image_url: str = Field(..., min_length=1, max_length=500)
    alt_text: str | None = Field(default=None, max_length=255)
    is_primary: bool = False
    sort_order: int = 0


class ImageUpdate(BaseModel):
    alt_text: str | None = None
    is_primary: bool | None = None
    sort_order: int | None = None


class ImageOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    product_id: int
    image_url: str
    alt_text: str | None = None
    is_primary: bool
    sort_order: int
    created_at: datetime


# ── Compat-brand schemas ──────────────────────────────────────────────────────

class CompatBrandAdd(BaseModel):
    brand_id: int
    notes: str | None = Field(default=None, max_length=300)


class CompatBrandOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    brand_id: int
    brand: BrandBrief
    notes: str | None = None


# ── Product schemas ───────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    name_en: str = Field(..., min_length=1, max_length=300)
    name_lo: str | None = Field(default=None, max_length=300)
    sku: str | None = Field(default=None, max_length=100)
    model_number: str | None = Field(default=None, max_length=150)
    brand_id: int | None = None
    category_id: int | None = None
    description_en: str | None = None
    description_lo: str | None = None
    is_active: bool = True
    is_featured: bool = False
    is_sale: bool = True
    is_rental: bool = False
    is_used_available: bool = False
    is_service_item: bool = False
    sort_order: int = 0

    @field_validator("name_en")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name_en must not be blank")
        return v.strip()


class ProductUpdate(BaseModel):
    name_en: str | None = Field(default=None, min_length=1, max_length=300)
    name_lo: str | None = None
    model_number: str | None = None
    brand_id: int | None = None
    category_id: int | None = None
    description_en: str | None = None
    description_lo: str | None = None
    is_active: bool | None = None
    is_featured: bool | None = None
    is_sale: bool | None = None
    is_rental: bool | None = None
    is_used_available: bool | None = None
    is_service_item: bool | None = None
    sort_order: int | None = None


class ProductOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    sku: str
    name_en: str
    name_lo: str | None = None
    slug: str
    model_number: str | None = None
    brand: BrandBrief | None = None
    category: CategoryBrief | None = None
    is_active: bool
    is_featured: bool
    is_sale: bool
    is_rental: bool
    is_used_available: bool
    is_service_item: bool
    sort_order: int
    primary_image_url: str | None = None
    created_at: datetime
    updated_at: datetime | None = None

    @classmethod
    def from_orm_with_image(cls, product: Any) -> "ProductOut":
        obj = cls.model_validate(product)
        primary = next(
            (img.image_url for img in product.images if img.is_primary),
            product.images[0].image_url if product.images else None,
        )
        obj.primary_image_url = primary
        return obj


class ProductDetail(ProductOut):
    description_en: str | None = None
    description_lo: str | None = None
    specs_grouped: dict[str, list[SpecOut]] = {}
    images: list[ImageOut] = []
    compat_brands: list[CompatBrandOut] = []
    created_by: int | None = None
    updated_by: int | None = None


# ── List / search response ────────────────────────────────────────────────────

class ProductListResponse(BaseModel):
    items: list[ProductOut]
    total: int
    page: int
    page_size: int
    pages: int
