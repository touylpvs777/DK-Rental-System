from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator


# ── Brief models ─────────────────────────────────────────────────────────────

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


class SalesOrderBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    so_number: str
    title: str


# ── Delivery Note schemas ────────────────────────────────────────────────────

class DeliveryNoteCreate(BaseModel):
    sales_order_id: int
    customer_id: int | None = None
    assigned_to: int | None = None
    delivery_date: date | None = None
    delivery_address: str | None = None
    warehouse: str | None = Field(default=None, max_length=200)
    driver_name: str | None = Field(default=None, max_length=200)
    vehicle_plate: str | None = Field(default=None, max_length=50)
    customer_reference: str | None = Field(default=None, max_length=100)
    terms_conditions: str | None = None
    notes: str | None = None
    internal_notes: str | None = None

    @field_validator("sales_order_id")
    @classmethod
    def sales_order_required(cls, v: int) -> int:
        if not v:
            raise ValueError("sales_order_id is required")
        return v


class DeliveryNoteUpdate(BaseModel):
    customer_id: int | None = None
    assigned_to: int | None = None
    delivery_date: date | None = None
    delivery_address: str | None = None
    warehouse: str | None = None
    driver_name: str | None = None
    vehicle_plate: str | None = None
    customer_reference: str | None = None
    terms_conditions: str | None = None
    notes: str | None = None
    internal_notes: str | None = None


class DeliveryNoteOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    dn_number: str
    status: str
    sales_order: SalesOrderBrief | None = None
    customer: CustomerBrief | None = None
    assigned_user: UserBrief | None = None
    delivery_date: date
    warehouse: str | None = None
    item_count: int = 0
    created_at: datetime
    updated_at: datetime | None = None
    is_active: bool


class DeliveryNoteDetail(DeliveryNoteOut):
    delivery_address: str | None = None
    driver_name: str | None = None
    vehicle_plate: str | None = None
    customer_reference: str | None = None
    notes: str | None = None
    internal_notes: str | None = None
    terms_conditions: str | None = None
    created_by: int | None = None
    updated_by: int | None = None
    items: list["DeliveryNoteItemOut"] = []
    recent_status_history: list["DeliveryNoteStatusHistoryOut"] = []
    available_actions: list[str] = []


class DeliveryNoteListResponse(BaseModel):
    items: list[DeliveryNoteOut]
    total: int
    page: int
    page_size: int
    pages: int


# ── Item schemas ─────────────────────────────────────────────────────────────

class DeliveryNoteItemCreate(BaseModel):
    item_code: str | None = Field(default=None, max_length=100)
    description: str = Field(..., min_length=1, max_length=1000)
    quantity_ordered: float | None = Field(default=None, ge=0)
    quantity_delivered: float = Field(default=0.0, ge=0)
    unit: str = Field(default="unit", max_length=50)
    notes: str | None = Field(default=None, max_length=500)
    sort_order: int = 0


class DeliveryNoteItemBulkItem(DeliveryNoteItemCreate):
    """One row in a bulk `PUT /delivery-notes/{id}/items/bulk` replace payload —
    same Excel-grid-editor Save pattern as Quotation/Sales Order."""
    id: int | None = None


class DeliveryNoteItemOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    delivery_note_id: int
    line_number: int
    item_code: str | None = None
    description: str
    quantity_ordered: float | None = None
    quantity_delivered: float
    unit: str
    notes: str | None = None
    sort_order: int
    created_at: datetime


# ── Status History ───────────────────────────────────────────────────────────

class DeliveryNoteStatusHistoryOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    delivery_note_id: int
    from_status: str | None = None
    to_status: str
    reason: str | None = None
    user: UserBrief | None = None
    changed_at: datetime


# ── Workflow actions ─────────────────────────────────────────────────────────

class WorkflowAction(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


# ── Forward ref rebuild ──────────────────────────────────────────────────────

DeliveryNoteDetail.model_rebuild()
