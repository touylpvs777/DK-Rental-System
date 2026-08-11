from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.asset_movement import MovementPriority, MovementStatus, MovementType


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
    status: str
    current_hour_meter: float


class UserBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    username: str
    full_name: str | None = None


class ContractBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    contract_number: str
    status: str


# ── Create / Update ─────────────────────────────────────────────────────────

class MovementCreate(BaseModel):
    movement_type: MovementType
    forklift_id: int
    customer_id: int | None = None
    rental_contract_id: int | None = None
    from_location: str = Field(..., min_length=1, max_length=200)
    from_address: str | None = None
    to_location: str = Field(..., min_length=1, max_length=200)
    to_address: str | None = None
    scheduled_date: date
    priority: MovementPriority = MovementPriority.NORMAL
    assigned_driver_id: int | None = None
    tracking_code: str | None = Field(default=None, max_length=100)
    notes: str | None = None
    internal_notes: str | None = None


class MovementUpdate(BaseModel):
    from_location: str | None = Field(default=None, min_length=1, max_length=200)
    from_address: str | None = None
    to_location: str | None = Field(default=None, min_length=1, max_length=200)
    to_address: str | None = None
    scheduled_date: date | None = None
    priority: MovementPriority | None = None
    assigned_driver_id: int | None = None
    tracking_code: str | None = None
    notes: str | None = None
    internal_notes: str | None = None


# ── Workflow actions ─────────────────────────────────────────────────────────

class PrepareAction(BaseModel):
    notes: str | None = Field(default=None, max_length=500)


class DepartAction(BaseModel):
    departure_hour_meter: float = Field(..., ge=0)
    notes: str | None = Field(default=None, max_length=500)


class ArriveAction(BaseModel):
    arrival_hour_meter: float = Field(..., ge=0)
    notes: str | None = Field(default=None, max_length=500)


class CompleteAction(BaseModel):
    notes: str | None = Field(default=None, max_length=500)


class CancelAction(BaseModel):
    cancellation_reason: str = Field(..., min_length=1)


class CheckpointAction(BaseModel):
    location: str | None = Field(default=None, max_length=200)
    latitude: float | None = None
    longitude: float | None = None
    notes: str | None = Field(default=None, max_length=500)


# ── Output schemas ──────────────────────────────────────────────────────────

class MovementHistoryOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    movement_id: int
    from_status: str | None = None
    to_status: str
    location: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    notes: str | None = None
    user: UserBrief | None = None
    recorded_at: datetime


class MovementOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    movement_number: str
    movement_type: str
    status: str
    priority: str
    forklift: ForkliftBrief
    customer: CustomerBrief | None = None
    rental_contract: ContractBrief | None = None
    assigned_driver: UserBrief | None = None
    from_location: str
    to_location: str
    scheduled_date: date
    actual_departure: datetime | None = None
    actual_arrival: datetime | None = None
    tracking_code: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None


class MovementDetail(MovementOut):
    from_address: str | None = None
    to_address: str | None = None
    departure_hour_meter: float | None = None
    arrival_hour_meter: float | None = None
    notes: str | None = None
    internal_notes: str | None = None
    cancellation_reason: str | None = None
    created_by: int | None = None
    updated_by: int | None = None
    checkpoints: list[MovementHistoryOut] = []


class MovementListResponse(BaseModel):
    items: list[MovementOut]
    total: int
    page: int
    page_size: int
    pages: int


MovementDetail.model_rebuild()
