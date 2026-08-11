from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class CategoryCreate(BaseModel):
    name_en: str = Field(..., min_length=1, max_length=200)
    name_lo: str | None = Field(default=None, max_length=200)
    slug: str | None = Field(default=None, max_length=200)
    parent_id: int | None = None
    description: str | None = None
    icon: str | None = Field(default=None, max_length=100)
    sort_order: int = 0

    @field_validator("name_en")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name_en must not be blank")
        return v.strip()


class CategoryUpdate(BaseModel):
    name_en: str | None = Field(default=None, min_length=1, max_length=200)
    name_lo: str | None = None
    slug: str | None = None
    parent_id: int | None = None
    description: str | None = None
    icon: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class CategoryBrief(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name_en: str
    name_lo: str | None = None
    slug: str
    level: int


class CategoryOut(CategoryBrief):
    parent_id: int | None = None
    description: str | None = None
    icon: str | None = None
    sort_order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None


class CategoryTree(CategoryOut):
    """CategoryOut with recursively nested children."""

    children: list["CategoryTree"] = []

    model_config = {"from_attributes": True}


CategoryTree.model_rebuild()
