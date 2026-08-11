from datetime import date, datetime

from pydantic import BaseModel, Field, computed_field, field_validator


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


class QuotationBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    quotation_number: str
    title: str


# ── Sales Order schemas ──────────────────────────────────────────────────────

class SalesOrderCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    quotation_id: int | None = None
    customer_id: int | None = None
    assigned_to: int | None = None
    contact_name: str | None = Field(default=None, max_length=200)
    contact_email: str | None = Field(default=None, max_length=255)
    contact_phone: str | None = Field(default=None, max_length=50)
    tax_rate: float = Field(default=0.0, ge=0, le=100)
    currency: str = Field(default="LAK", max_length=3)
    exchange_rate: float = Field(default=1.0, gt=0)
    bank_details: str | None = None
    order_date: date | None = None
    expected_delivery_date: date | None = None
    customer_reference: str | None = Field(default=None, max_length=100)
    vehicle_make: str | None = Field(default=None, max_length=100)
    vehicle_model: str | None = Field(default=None, max_length=100)
    vehicle_vin: str | None = Field(default=None, max_length=100)
    vehicle_engine_no: str | None = Field(default=None, max_length=100)
    vehicle_reg_no: str | None = Field(default=None, max_length=50)
    job_number: str | None = Field(default=None, max_length=50)
    machine_type: str | None = Field(default=None, max_length=100)
    hour_meter: float | None = Field(default=None, ge=0)
    location: str | None = Field(default=None, max_length=200)
    round_amount: float = Field(default=0.0)
    terms_conditions: str | None = None
    notes: str | None = None
    internal_notes: str | None = None

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("title must not be blank")
        return v.strip()


class SalesOrderUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    quotation_id: int | None = None
    customer_id: int | None = None
    assigned_to: int | None = None
    contact_name: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    tax_rate: float | None = Field(default=None, ge=0, le=100)
    discount_amount: float | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, max_length=3)
    exchange_rate: float | None = Field(default=None, gt=0)
    bank_details: str | None = None
    order_date: date | None = None
    expected_delivery_date: date | None = None
    customer_reference: str | None = None
    vehicle_make: str | None = None
    vehicle_model: str | None = None
    vehicle_vin: str | None = None
    vehicle_engine_no: str | None = None
    vehicle_reg_no: str | None = None
    job_number: str | None = None
    machine_type: str | None = None
    hour_meter: float | None = Field(default=None, ge=0)
    location: str | None = None
    round_amount: float | None = None
    terms_conditions: str | None = None
    notes: str | None = None
    internal_notes: str | None = None


class SalesOrderOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    so_number: str
    status: str
    title: str
    customer: CustomerBrief | None = None
    quotation: QuotationBrief | None = None
    assigned_user: UserBrief | None = None
    subtotal: float
    total_amount: float
    currency: str
    order_date: date
    expected_delivery_date: date | None = None
    item_count: int = 0
    created_at: datetime
    updated_at: datetime | None = None
    is_active: bool


class SalesOrderDetail(SalesOrderOut):
    contact_name: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    tax_rate: float
    tax_amount: float
    discount_amount: float
    round_amount: float
    exchange_rate: float
    bank_details: str | None = None
    customer_reference: str | None = None
    vehicle_make: str | None = None
    vehicle_model: str | None = None
    vehicle_vin: str | None = None
    vehicle_engine_no: str | None = None
    vehicle_reg_no: str | None = None
    job_number: str | None = None
    machine_type: str | None = None
    hour_meter: float | None = None
    location: str | None = None
    notes: str | None = None
    internal_notes: str | None = None
    terms_conditions: str | None = None
    created_by: int | None = None
    updated_by: int | None = None
    items: list["SalesOrderItemOut"] = []
    recent_status_history: list["SalesOrderStatusHistoryOut"] = []
    available_actions: list[str] = []


class SalesOrderListResponse(BaseModel):
    items: list[SalesOrderOut]
    total: int
    page: int
    page_size: int
    pages: int


# ── Item schemas ─────────────────────────────────────────────────────────────

class SalesOrderItemCreate(BaseModel):
    item_code: str | None = Field(default=None, max_length=100)
    description: str = Field(..., min_length=1, max_length=1000)
    quantity: float = Field(default=1.0, gt=0)
    unit: str = Field(default="unit", max_length=50)
    unit_price: float = Field(..., ge=0)
    discount_percent: float = Field(default=0.0, ge=0, le=100)
    tax_percent: float = Field(default=0.0, ge=0, le=100)
    notes: str | None = Field(default=None, max_length=500)
    sort_order: int = 0


class SalesOrderItemBulkItem(SalesOrderItemCreate):
    """One row in a bulk `PUT /sales-orders/{id}/items/bulk` replace payload —
    same rationale as QuotationItemBulkItem: the Excel-grid editor's Save
    action replaces the whole item set in one transaction/recalculation."""
    id: int | None = None


class SalesOrderItemOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    sales_order_id: int
    line_number: int
    item_code: str | None = None
    description: str
    quantity: float
    unit: str
    unit_price: float
    discount_percent: float
    tax_percent: float
    line_total: float
    notes: str | None = None
    sort_order: int
    created_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def discount_amount(self) -> float:
        return round(self.quantity * self.unit_price * self.discount_percent / 100, 2)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def tax_amount(self) -> float:
        return round(self.line_total * self.tax_percent / 100, 2)

    @computed_field  # type: ignore[prop-decorator]
    @property
    def total(self) -> float:
        return round(self.line_total + self.tax_amount, 2)


# ── Status History ───────────────────────────────────────────────────────────

class SalesOrderStatusHistoryOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    sales_order_id: int
    from_status: str | None = None
    to_status: str
    reason: str | None = None
    user: UserBrief | None = None
    changed_at: datetime


# ── Workflow actions ─────────────────────────────────────────────────────────

class WorkflowAction(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


# ── Forward ref rebuild ──────────────────────────────────────────────────────

SalesOrderDetail.model_rebuild()
