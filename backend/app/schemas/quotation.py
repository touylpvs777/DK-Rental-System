from datetime import date, datetime

from pydantic import BaseModel, Field, computed_field, field_validator

from app.models.quotation import ItemType, QuotationStatus, QuotationType


# ── Brief models ─────────────────────────────────────────────────────────────

class CustomerBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    first_name: str
    last_name: str
    company: str | None = None


class LeadBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    title: str


class UserBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    username: str
    full_name: str | None = None


class ForkliftBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    serial_number: str
    name_en: str
    status: str


class ProductBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    sku: str
    name_en: str


# ── Quotation schemas ────────────────────────────────────────────────────────

class QuotationCreate(BaseModel):
    quotation_type: QuotationType
    title: str = Field(..., min_length=1, max_length=500)
    customer_id: int | None = None
    lead_id: int | None = None
    assigned_to: int | None = None
    contact_name: str | None = Field(default=None, max_length=200)
    contact_email: str | None = Field(default=None, max_length=255)
    contact_phone: str | None = Field(default=None, max_length=50)
    tax_rate: float = Field(default=0.0, ge=0, le=100)
    currency: str = Field(default="LAK", max_length=3)
    exchange_rate: float = Field(default=1.0, gt=0)
    bank_details: str | None = None
    valid_from: date | None = None
    valid_until: date | None = None
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


class QuotationUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    customer_id: int | None = None
    lead_id: int | None = None
    assigned_to: int | None = None
    contact_name: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    tax_rate: float | None = Field(default=None, ge=0, le=100)
    discount_amount: float | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, max_length=3)
    exchange_rate: float | None = Field(default=None, gt=0)
    bank_details: str | None = None
    valid_from: date | None = None
    valid_until: date | None = None
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


class QuotationOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    quotation_number: str
    revision_number: int
    quotation_type: str
    status: str
    title: str
    customer: CustomerBrief | None = None
    lead: LeadBrief | None = None
    assigned_user: UserBrief | None = None
    subtotal: float
    total_amount: float
    currency: str
    valid_from: date | None = None
    valid_until: date | None = None
    item_count: int = 0
    created_at: datetime
    updated_at: datetime | None = None
    is_active: bool


class QuotationDetail(QuotationOut):
    parent_id: int | None = None
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
    converted_to_type: str | None = None
    converted_to_id: int | None = None
    created_by: int | None = None
    updated_by: int | None = None
    items: list["QuotationItemOut"] = []
    recent_status_history: list["QuotationStatusHistoryOut"] = []
    recent_approvals: list["QuotationApprovalOut"] = []
    available_actions: list[str] = []


class QuotationListResponse(BaseModel):
    items: list[QuotationOut]
    total: int
    page: int
    page_size: int
    pages: int


# ── Item schemas ─────────────────────────────────────────────────────────────

class QuotationItemCreate(BaseModel):
    item_type: ItemType
    forklift_id: int | None = None
    product_id: int | None = None
    item_code: str | None = Field(default=None, max_length=100)
    description: str = Field(..., min_length=1, max_length=1000)
    quantity: float = Field(default=1.0, gt=0)
    unit: str = Field(default="unit", max_length=50)
    unit_price: float = Field(..., ge=0)
    discount_percent: float = Field(default=0.0, ge=0, le=100)
    tax_percent: float = Field(default=0.0, ge=0, le=100)
    rental_duration_days: int | None = Field(default=None, ge=1)
    rental_rate_period: str | None = None
    notes: str | None = Field(default=None, max_length=500)
    sort_order: int = 0


class QuotationItemUpdate(BaseModel):
    item_code: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, min_length=1, max_length=1000)
    quantity: float | None = Field(default=None, gt=0)
    unit: str | None = Field(default=None, max_length=50)
    unit_price: float | None = Field(default=None, ge=0)
    discount_percent: float | None = Field(default=None, ge=0, le=100)
    tax_percent: float | None = Field(default=None, ge=0, le=100)
    rental_duration_days: int | None = Field(default=None, ge=1)
    rental_rate_period: str | None = None
    notes: str | None = None
    sort_order: int | None = None


class QuotationItemBulkItem(QuotationItemCreate):
    """One row in a bulk `PUT /quotations/{id}/items/bulk` replace payload.

    `id` matches against an existing line item to update it in place;
    omitted/`None` means "insert as a new row". Any existing row whose id
    isn't present in the payload is deleted — the whole item set is
    replaced in one transaction/one total recalculation.
    """
    id: int | None = None


class QuotationItemOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    quotation_id: int
    line_number: int
    item_type: str
    forklift: ForkliftBrief | None = None
    product: ProductBrief | None = None
    item_code: str | None = None
    description: str
    quantity: float
    unit: str
    unit_price: float
    discount_percent: float
    tax_percent: float
    line_total: float
    rental_duration_days: int | None = None
    rental_rate_period: str | None = None
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

class QuotationStatusHistoryOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    quotation_id: int
    from_status: str | None = None
    to_status: str
    reason: str | None = None
    user: UserBrief | None = None
    changed_at: datetime


# ── Approval ─────────────────────────────────────────────────────────────────

class QuotationApprovalOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    quotation_id: int
    revision_number: int
    decision: str
    reason: str | None = None
    conditions: str | None = None
    user: UserBrief | None = None
    decided_at: datetime


# ── Workflow actions ─────────────────────────────────────────────────────────

class WorkflowAction(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class ApproveAction(WorkflowAction):
    conditions: str | None = Field(default=None, max_length=1000)


class ConvertAction(BaseModel):
    converted_to_type: str = Field(..., max_length=30)
    notes: str | None = Field(default=None, max_length=500)


# ── Forward ref rebuild ──────────────────────────────────────────────────────

QuotationDetail.model_rebuild()
