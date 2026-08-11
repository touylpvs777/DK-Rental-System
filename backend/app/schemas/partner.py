from datetime import datetime

from pydantic import BaseModel, Field

from app.models.partner import PartnerType


class PartnerBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int; name: str; partner_type: str


class PartnerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    partner_type: PartnerType = PartnerType.VENDOR
    address: str | None = None
    phone: str | None = Field(default=None, max_length=50)
    email: str | None = Field(default=None, max_length=200)


class PartnerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    partner_type: PartnerType | None = None
    address: str | None = None
    phone: str | None = Field(default=None, max_length=50)
    email: str | None = Field(default=None, max_length=200)
    is_active: bool | None = None


class PartnerOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    name: str
    partner_type: str
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None


class PartnerListResponse(BaseModel):
    items: list[PartnerOut]
    total: int
    page: int
    page_size: int
    pages: int
