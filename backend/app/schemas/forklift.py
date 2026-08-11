from __future__ import annotations

from datetime import date, datetime

from pydantic import AliasChoices, BaseModel, Field, field_validator

from app.models.forklift import (
    CostType,
    DocumentType,
    ForkliftCondition,
    ForkliftStatus,
    FuelType,
    OwnershipState,
)
from app.schemas.brand import BrandBrief


# ── ForkliftModel schemas ────────────────────────────────────────────────────


class ForkliftModelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    slug: str | None = Field(default=None, max_length=200)
    brand_id: int | None = None
    series: str | None = Field(default=None, max_length=100)
    fuel_type: FuelType | None = None
    capacity_kg: float | None = Field(default=None, ge=0)
    max_lift_height_mm: int | None = Field(default=None, ge=0)
    description: str | None = None
    sort_order: int = 0

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name must not be blank")
        return v.strip()


class ForkliftModelUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    slug: str | None = Field(default=None, max_length=200)
    brand_id: int | None = None
    series: str | None = None
    fuel_type: FuelType | None = None
    capacity_kg: float | None = None
    max_lift_height_mm: int | None = None
    description: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class ForkliftModelBrief(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    slug: str
    series: str | None = None
    fuel_type: str | None = None
    capacity_kg: float | None = None


class ForkliftModelOut(ForkliftModelBrief):
    brand: BrandBrief | None = None
    max_lift_height_mm: int | None = None
    description: str | None = None
    is_active: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime | None = None


# ── Customer brief (avoid circular import from customer schemas) ─────────────


class CustomerBrief(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    first_name: str
    last_name: str
    company: str | None = None


class UserBrief(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    username: str
    full_name: str | None = None


# ── Forklift schemas ─────────────────────────────────────────────────────────


class ForkliftCreate(BaseModel):
    serial_number: str = Field(..., min_length=1, max_length=100)
    name_en: str = Field(..., min_length=1, max_length=300)
    name_lo: str | None = Field(default=None, max_length=300)
    model_number: str | None = Field(default=None, max_length=150)
    internal_code: str | None = Field(default=None, max_length=50)
    model_id: int | None = None
    brand_id: int | None = None
    customer_id: int | None = None
    status: ForkliftStatus = ForkliftStatus.IN_STOCK
    ownership_state: OwnershipState = OwnershipState.FOR_SALE
    condition: ForkliftCondition = ForkliftCondition.NEW
    fuel_type: FuelType | None = None
    capacity_kg: float | None = Field(default=None, ge=0)
    year_manufactured: int | None = Field(default=None, ge=1900, le=2100)
    purchase_date: date | None = None
    warranty_expiry: date | None = None
    initial_hour_meter: float = Field(default=0.0, ge=0)
    current_hour_meter: float = Field(default=0.0, ge=0)
    notes: str | None = None
    specs: list[ForkliftSpecCreate] | None = None

    @field_validator("serial_number")
    @classmethod
    def serial_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("serial_number must not be blank")
        return v.strip()

    @field_validator("name_en")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name_en must not be blank")
        return v.strip()


class ForkliftUpdate(BaseModel):
    serial_number: str | None = Field(default=None, min_length=1, max_length=100)
    name_en: str | None = Field(default=None, min_length=1, max_length=300)
    name_lo: str | None = None
    model_number: str | None = None
    internal_code: str | None = None
    model_id: int | None = None
    brand_id: int | None = None
    customer_id: int | None = None
    status: ForkliftStatus | None = None
    ownership_state: OwnershipState | None = None
    condition: ForkliftCondition | None = None
    fuel_type: FuelType | None = None
    capacity_kg: float | None = None
    year_manufactured: int | None = None
    purchase_date: date | None = None
    warranty_expiry: date | None = None
    current_hour_meter: float | None = Field(default=None, ge=0)
    notes: str | None = None
    is_active: bool | None = None
    iot_device_id: str | None = Field(default=None, max_length=100)
    current_latitude: float | None = Field(default=None, ge=-90, le=90)
    current_longitude: float | None = Field(default=None, ge=-180, le=180)


class ForkliftOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    serial_number: str
    slug: str
    internal_code: str | None = None
    name_en: str
    name_lo: str | None = None
    model_number: str | None = None
    model: ForkliftModelBrief | None = Field(
        default=None,
        validation_alias=AliasChoices("forklift_model", "model"),
    )
    brand: BrandBrief | None = None
    customer: CustomerBrief | None = None
    status: str
    ownership_state: str
    condition: str
    fuel_type: str | None = None
    capacity_kg: float | None = None
    year_manufactured: int | None = None
    current_hour_meter: float
    meter_hours: int
    is_active: bool
    primary_photo_url: str | None = None
    iot_device_id: str | None = None
    last_telemetry_ping: datetime | None = None
    current_latitude: float | None = None
    current_longitude: float | None = None
    last_location_update: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None


class ForkliftDetail(ForkliftOut):
    mast_type: str | None = None
    max_lift_height_mm: int | None = None
    purchase_date: date | None = None
    warranty_expiry: date | None = None
    initial_hour_meter: float
    notes: str | None = None
    specs: list[ForkliftSpecOut] = []
    photos: list["ForkliftPhotoOut"] = []
    documents: list["ForkliftDocumentOut"] = []
    recent_status_history: list["ForkliftStatusHistoryOut"] = []
    current_location: "ForkliftLocationOut | None" = None
    created_by: int | None = None
    updated_by: int | None = None


class ForkliftListResponse(BaseModel):
    items: list[ForkliftOut]
    total: int
    page: int
    page_size: int
    pages: int


# ── Forklift Spec schemas ────────────────────────────────────────────────────


class ForkliftSpecCreate(BaseModel):
    mast_type: str | None = Field(default=None, max_length=50)
    max_lift_height_mm: int | None = Field(default=None, ge=0)
    front_tire: str | None = Field(default=None, max_length=50)
    rear_tire: str | None = Field(default=None, max_length=50)
    tire_type: str | None = Field(default=None, max_length=50)
    fork_length_mm: int | None = Field(default=None, ge=0)
    battery_type: str | None = Field(default=None, max_length=100)
    attachment_type: str | None = Field(default=None, max_length=100)
    notes: str | None = None


class ForkliftSpecUpdate(BaseModel):
    mast_type: str | None = Field(default=None, max_length=50)
    max_lift_height_mm: int | None = Field(default=None, ge=0)
    front_tire: str | None = Field(default=None, max_length=50)
    rear_tire: str | None = Field(default=None, max_length=50)
    tire_type: str | None = Field(default=None, max_length=50)
    fork_length_mm: int | None = Field(default=None, ge=0)
    battery_type: str | None = Field(default=None, max_length=100)
    attachment_type: str | None = Field(default=None, max_length=100)
    notes: str | None = None


class ForkliftSpecOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    forklift_id: int
    mast_type: str | None = None
    max_lift_height_mm: int | None = None
    front_tire: str | None = None
    rear_tire: str | None = None
    tire_type: str | None = None
    fork_length_mm: int | None = None
    battery_type: str | None = None
    attachment_type: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime | None = None


# ── Status History schemas ───────────────────────────────────────────────────


class StatusHistoryCreate(BaseModel):
    to_status: ForkliftStatus
    reason: str | None = Field(default=None, max_length=500)


class ForkliftStatusHistoryOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    forklift_id: int
    from_status: str | None = None
    to_status: str
    reason: str | None = None
    user: UserBrief | None = None
    changed_at: datetime


# ── Location schemas ─────────────────────────────────────────────────────────


class ForkliftLocationCreate(BaseModel):
    location_name: str = Field(..., min_length=1, max_length=200)
    warehouse_zone: str | None = Field(default=None, max_length=100)
    address: str | None = None
    customer_id: int | None = None
    effective_date: date
    notes: str | None = Field(default=None, max_length=500)


class ForkliftLocationUpdate(BaseModel):
    location_name: str | None = Field(default=None, min_length=1, max_length=200)
    warehouse_zone: str | None = None
    address: str | None = None
    customer_id: int | None = None
    effective_date: date | None = None
    notes: str | None = None


class ForkliftLocationOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    forklift_id: int
    location_name: str
    warehouse_zone: str | None = None
    address: str | None = None
    customer_id: int | None = None
    effective_date: date
    notes: str | None = None
    recorded_by: int | None = None
    created_at: datetime


# ── Hour-Meter Log schemas ───────────────────────────────────────────────────


class HourMeterLogCreate(BaseModel):
    reading: float = Field(..., ge=0)
    recorded_at: datetime | None = None
    source: str = Field(default="manual", max_length=30)
    notes: str | None = Field(default=None, max_length=500)


class ForkliftHourMeterLogOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    forklift_id: int
    reading: float
    recorded_at: datetime
    source: str
    notes: str | None = None
    recorded_by: int | None = None


# ── Document schemas ─────────────────────────────────────────────────────────


class ForkliftDocumentCreate(BaseModel):
    document_type: DocumentType
    title: str = Field(..., min_length=1, max_length=300)
    file_url: str = Field(..., min_length=1, max_length=500)
    file_size_bytes: int | None = Field(default=None, ge=0)
    mime_type: str | None = Field(default=None, max_length=100)
    expiry_date: date | None = None
    notes: str | None = Field(default=None, max_length=500)


class ForkliftDocumentUpdate(BaseModel):
    document_type: DocumentType | None = None
    title: str | None = Field(default=None, min_length=1, max_length=300)
    expiry_date: date | None = None
    notes: str | None = None


class ForkliftDocumentOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    forklift_id: int
    document_type: str
    title: str
    file_url: str
    file_size_bytes: int | None = None
    mime_type: str | None = None
    expiry_date: date | None = None
    notes: str | None = None
    uploaded_by: int | None = None
    created_at: datetime


# ── Photo schemas ────────────────────────────────────────────────────────────


class ForkliftPhotoCreate(BaseModel):
    image_url: str = Field(..., min_length=1, max_length=500)
    thumbnail_url: str | None = Field(default=None, max_length=500)
    alt_text: str | None = Field(default=None, max_length=255)
    caption: str | None = Field(default=None, max_length=500)
    is_primary: bool = False
    sort_order: int = 0
    taken_at: date | None = None


class ForkliftPhotoUpdate(BaseModel):
    alt_text: str | None = None
    caption: str | None = None
    is_primary: bool | None = None
    sort_order: int | None = None


class ForkliftPhotoOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    forklift_id: int
    image_url: str
    thumbnail_url: str | None = None
    alt_text: str | None = None
    caption: str | None = None
    is_primary: bool
    sort_order: int
    taken_at: date | None = None
    uploaded_by: int | None = None
    created_at: datetime


# ── Ownership Cost schemas ───────────────────────────────────────────────────


class OwnershipCostCreate(BaseModel):
    cost_type: CostType
    amount: float = Field(..., gt=0)
    currency: str = Field(default="LAK", max_length=3)
    cost_date: date
    description: str | None = Field(default=None, max_length=500)
    vendor: str | None = Field(default=None, max_length=200)
    reference_number: str | None = Field(default=None, max_length=100)


class OwnershipCostUpdate(BaseModel):
    cost_type: CostType | None = None
    amount: float | None = Field(default=None, gt=0)
    currency: str | None = Field(default=None, max_length=3)
    cost_date: date | None = None
    description: str | None = None
    vendor: str | None = None
    reference_number: str | None = None


class ForkliftOwnershipCostOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    forklift_id: int
    cost_type: str
    amount: float
    currency: str
    cost_date: date
    description: str | None = None
    vendor: str | None = None
    reference_number: str | None = None
    recorded_by: int | None = None
    created_at: datetime


class CostSummary(BaseModel):
    total_cost: float
    by_type: dict[str, float]
    currency: str
    entry_count: int


# ── Rebuild forward refs ─────────────────────────────────────────────────────

ForkliftDetail.model_rebuild()
