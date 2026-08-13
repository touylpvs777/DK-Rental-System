from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.quotation import QuotationStatus


# ── Brief models ─────────────────────────────────────────────────────────────

class CustomerBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    first_name: str
    last_name: str
    company: str | None = None


class ForkliftBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    serial_number: str
    name_en: str


class UserBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    username: str
    full_name: str | None = None


# ── Quotation schemas ────────────────────────────────────────────────────────

class QuotationCreate(BaseModel):
    customer_id: int
    forklift_id: int | None = None
    expected_start_date: date
    expected_end_date: date
    rental_price: float = Field(..., ge=0)
    daily_hours_quota: int = Field(default=8, gt=0, le=24)
    status: QuotationStatus = QuotationStatus.DRAFT
    notes: str | None = None


class QuotationUpdate(BaseModel):
    customer_id: int | None = None
    forklift_id: int | None = None
    expected_start_date: date | None = None
    expected_end_date: date | None = None
    rental_price: float | None = Field(default=None, ge=0)
    daily_hours_quota: int | None = Field(default=None, gt=0, le=24)
    status: QuotationStatus | None = None
    notes: str | None = None


class QuotationResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    quotation_no: str
    customer: CustomerBrief
    forklift: ForkliftBrief | None = None
    expected_start_date: date
    expected_end_date: date
    rental_price: float
    daily_hours_quota: int
    status: str
    notes: str | None = None
    creator: UserBrief | None = None
    created_at: datetime
    updated_at: datetime | None = None


class QuotationListResponse(BaseModel):
    items: list[QuotationResponse]
    total: int
    page: int
    page_size: int
    pages: int
