from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

_VALID_PAYMENT_METHODS = {"cash", "transfer", "cheque"}


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


class InvoiceBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    invoice_number: str
    total_amount: float
    balance_due: float
    currency: str


# ── Receipt schemas ──────────────────────────────────────────────────────────

class ReceiptCreate(BaseModel):
    invoice_id: int
    customer_id: int | None = None
    assigned_to: int | None = None
    payment_date: date | None = None
    payment_method: str = "cash"
    bank_account: str | None = Field(default=None, max_length=50)
    reference_number: str | None = Field(default=None, max_length=100)
    amount_received: float = Field(..., gt=0)
    currency: str | None = None
    exchange_rate: float | None = None
    customer_reference: str | None = Field(default=None, max_length=100)
    vehicle_make: str | None = Field(default=None, max_length=100)
    vehicle_model: str | None = Field(default=None, max_length=100)
    vehicle_vin: str | None = Field(default=None, max_length=100)
    vehicle_engine_no: str | None = Field(default=None, max_length=100)
    vehicle_reg_no: str | None = Field(default=None, max_length=50)
    job_number: str | None = Field(default=None, max_length=50)
    terms_conditions: str | None = None
    notes: str | None = None
    internal_notes: str | None = None

    @field_validator("invoice_id")
    @classmethod
    def invoice_required(cls, v: int) -> int:
        if not v:
            raise ValueError("invoice_id is required")
        return v

    @field_validator("payment_method")
    @classmethod
    def valid_payment_method(cls, v: str) -> str:
        if v not in _VALID_PAYMENT_METHODS:
            raise ValueError(f"payment_method must be one of {sorted(_VALID_PAYMENT_METHODS)}")
        return v


class ReceiptUpdate(BaseModel):
    customer_id: int | None = None
    assigned_to: int | None = None
    payment_date: date | None = None
    payment_method: str | None = None
    bank_account: str | None = None
    reference_number: str | None = None
    amount_received: float | None = Field(default=None, gt=0)
    customer_reference: str | None = None
    vehicle_make: str | None = None
    vehicle_model: str | None = None
    vehicle_vin: str | None = None
    vehicle_engine_no: str | None = None
    vehicle_reg_no: str | None = None
    job_number: str | None = None
    terms_conditions: str | None = None
    notes: str | None = None
    internal_notes: str | None = None

    @field_validator("payment_method")
    @classmethod
    def valid_payment_method(cls, v: str | None) -> str | None:
        if v is not None and v not in _VALID_PAYMENT_METHODS:
            raise ValueError(f"payment_method must be one of {sorted(_VALID_PAYMENT_METHODS)}")
        return v


class ReceiptOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    receipt_number: str
    status: str
    invoice: InvoiceBrief | None = None
    customer: CustomerBrief | None = None
    assigned_user: UserBrief | None = None
    payment_date: date
    payment_method: str
    amount_received: float
    currency: str
    created_at: datetime
    updated_at: datetime | None = None
    is_active: bool


class ReceiptDetail(ReceiptOut):
    bank_account: str | None = None
    reference_number: str | None = None
    exchange_rate: float
    customer_reference: str | None = None
    vehicle_make: str | None = None
    vehicle_model: str | None = None
    vehicle_vin: str | None = None
    vehicle_engine_no: str | None = None
    vehicle_reg_no: str | None = None
    job_number: str | None = None
    notes: str | None = None
    internal_notes: str | None = None
    terms_conditions: str | None = None
    created_by: int | None = None
    updated_by: int | None = None
    recent_status_history: list["ReceiptStatusHistoryOut"] = []
    available_actions: list[str] = []


class ReceiptListResponse(BaseModel):
    items: list[ReceiptOut]
    total: int
    page: int
    page_size: int
    pages: int


# ── Status History ───────────────────────────────────────────────────────────

class ReceiptStatusHistoryOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    receipt_id: int
    from_status: str | None = None
    to_status: str
    reason: str | None = None
    user: UserBrief | None = None
    changed_at: datetime


# ── Workflow actions ─────────────────────────────────────────────────────────

class WorkflowAction(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


# ── Forward ref rebuild ──────────────────────────────────────────────────────

ReceiptDetail.model_rebuild()
