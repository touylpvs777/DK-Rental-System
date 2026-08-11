from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.brand import BrandRole


class BrandCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    slug: str | None = Field(default=None, max_length=150)
    brand_role: BrandRole = BrandRole.PRIMARY
    logo_url: str | None = Field(default=None, max_length=500)
    country: str | None = Field(default=None, max_length=100)
    website: str | None = Field(default=None, max_length=255)
    description: str | None = None
    sort_order: int = 0

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be blank")
        return v.strip()


class BrandUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    slug: str | None = Field(default=None, max_length=150)
    brand_role: BrandRole | None = None
    logo_url: str | None = None
    country: str | None = None
    website: str | None = None
    description: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class BrandBrief(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    slug: str
    logo_url: str | None = None
    country: str | None = None


class BrandOut(BrandBrief):
    brand_role: str
    website: str | None = None
    description: str | None = None
    is_active: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime | None = None
