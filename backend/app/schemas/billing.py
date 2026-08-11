from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.deposit import DepositRecordStatus, DepositType
from app.models.invoice import InvoiceStatus, ReferenceType
from app.models.payment import PaymentMethod, PaymentRecordStatus
from app.models.revenue_recognition import RecognitionStatus, RecognitionType


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


class ContractBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    contract_number: str
    status: str


# ── Invoice schemas ──────────────────────────────────────────────────────────

class InvoiceItemOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    invoice_id: int
    billing_cycle_id: int | None = None
    line_number: int
    item_code: str | None = None
    description: str
    unit: str | None = None
    quantity: float
    unit_rate: float
    amount: float
    tax_amount: float
    line_total: float
    sort_order: int
    created_at: datetime
    updated_at: datetime | None = None


class InvoiceItemCreate(BaseModel):
    item_code: str | None = Field(default=None, max_length=100)
    description: str = Field(..., min_length=1, max_length=500)
    unit: str | None = Field(default=None, max_length=50)
    quantity: float = Field(default=1.0, gt=0)
    unit_rate: float = Field(..., ge=0)


class InvoiceCreate(BaseModel):
    contract_id: int | None = None
    customer_id: int
    reference_type: ReferenceType | None = None
    reference_id: int | None = None
    issue_date: date | None = None
    due_date: date | None = None
    billing_period_start: date | None = None
    billing_period_end: date | None = None
    tax_rate: float = Field(default=0.0, ge=0, le=100)
    discount_amount: float = Field(default=0.0, ge=0)
    currency: str = Field(default="LAK", max_length=3)
    exchange_rate: float = Field(default=1.0, gt=0)
    bank_details: str | None = None
    vehicle_make: str | None = Field(default=None, max_length=100)
    vehicle_model: str | None = Field(default=None, max_length=100)
    vehicle_vin: str | None = Field(default=None, max_length=100)
    vehicle_engine_no: str | None = Field(default=None, max_length=100)
    vehicle_reg_no: str | None = Field(default=None, max_length=50)
    job_number: str | None = Field(default=None, max_length=50)
    notes: str | None = None
    internal_notes: str | None = None
    billing_cycle_ids: list[int] = Field(default_factory=list)
    items: list[InvoiceItemCreate] = Field(default_factory=list)


class InvoiceUpdate(BaseModel):
    due_date: date | None = None
    tax_rate: float | None = Field(default=None, ge=0, le=100)
    discount_amount: float | None = Field(default=None, ge=0)
    exchange_rate: float | None = Field(default=None, gt=0)
    bank_details: str | None = None
    notes: str | None = None
    internal_notes: str | None = None


class InvoiceOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    invoice_number: str
    contract_id: int | None = None
    customer_id: int
    reference_type: str | None = None
    reference_id: int | None = None
    status: str
    issue_date: date | None = None
    due_date: date | None = None
    paid_date: date | None = None
    subtotal: float
    tax_rate: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    amount_paid: float
    balance_due: float
    currency: str
    billing_period_start: date | None = None
    billing_period_end: date | None = None
    customer: CustomerBrief
    contract: ContractBrief | None = None
    creator: UserBrief | None = None
    created_at: datetime
    updated_at: datetime | None = None
    is_active: bool


class InvoiceDetail(InvoiceOut):
    items: list[InvoiceItemOut] = []
    allocations: list["PaymentAllocationOut"] = []
    notes: str | None = None
    internal_notes: str | None = None
    sent_at: datetime | None = None
    cancelled_at: datetime | None = None
    cancellation_reason: str | None = None
    vehicle_make: str | None = None
    vehicle_model: str | None = None
    vehicle_vin: str | None = None
    vehicle_engine_no: str | None = None
    vehicle_reg_no: str | None = None
    job_number: str | None = None
    exchange_rate: float
    bank_details: str | None = None


class InvoiceListResponse(BaseModel):
    items: list[InvoiceOut]
    total: int
    page: int
    page_size: int
    pages: int


# ── Invoice workflow actions ─────────────────────────────────────────────────

class InvoiceIssueAction(BaseModel):
    issue_date: date | None = None
    due_date: date | None = None


class InvoiceSendAction(BaseModel):
    notes: str | None = None


class InvoiceCancelAction(BaseModel):
    cancellation_reason: str = Field(..., min_length=1)


class InvoiceFromCyclesRequest(BaseModel):
    contract_id: int
    billing_cycle_ids: list[int] = Field(..., min_length=1)
    tax_rate: float = Field(default=0.0, ge=0, le=100)
    discount_amount: float = Field(default=0.0, ge=0)
    currency: str = Field(default="LAK", max_length=3)
    notes: str | None = None


# ── Payment schemas ──────────────────────────────────────────────────────────

class PaymentCreate(BaseModel):
    customer_id: int
    contract_id: int | None = None
    payment_method: PaymentMethod
    amount: float = Field(..., gt=0)
    currency: str = Field(default="LAK", max_length=3)
    payment_date: date
    received_date: date | None = None
    reference_number: str | None = Field(default=None, max_length=100)
    notes: str | None = None


class PaymentUpdate(BaseModel):
    payment_method: PaymentMethod | None = None
    amount: float | None = Field(default=None, gt=0)
    payment_date: date | None = None
    received_date: date | None = None
    reference_number: str | None = Field(default=None, max_length=100)
    notes: str | None = None


class PaymentOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    payment_number: str
    customer_id: int
    contract_id: int | None = None
    payment_method: str
    payment_status: str
    amount: float
    currency: str
    payment_date: date
    received_date: date | None = None
    reference_number: str | None = None
    notes: str | None = None
    confirmed_by: int | None = None
    confirmed_at: datetime | None = None
    customer: CustomerBrief
    contract: ContractBrief | None = None
    confirmer: UserBrief | None = None
    creator: UserBrief | None = None
    created_at: datetime
    updated_at: datetime | None = None


class PaymentListResponse(BaseModel):
    items: list[PaymentOut]
    total: int
    page: int
    page_size: int
    pages: int


class PaymentConfirmAction(BaseModel):
    notes: str | None = None


class PaymentRejectAction(BaseModel):
    reason: str | None = None


# ── Payment Allocation schemas ───────────────────────────────────────────────

class PaymentAllocationCreate(BaseModel):
    payment_id: int
    invoice_id: int
    allocated_amount: float = Field(..., gt=0)


class PaymentAllocationOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    payment_id: int
    invoice_id: int
    allocated_amount: float
    allocated_at: datetime
    allocated_by: int | None = None


# ── Deposit schemas ──────────────────────────────────────────────────────────

class DepositCreate(BaseModel):
    contract_id: int
    customer_id: int
    deposit_type: DepositType
    amount: float = Field(..., gt=0)
    currency: str = Field(default="LAK", max_length=3)
    notes: str | None = None


class DepositUpdate(BaseModel):
    notes: str | None = None


class DepositOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    deposit_number: str
    contract_id: int
    customer_id: int
    deposit_type: str
    deposit_status: str
    amount: float
    currency: str
    received_date: date | None = None
    refund_date: date | None = None
    refund_amount: float
    forfeit_amount: float
    applied_amount: float
    payment_id: int | None = None
    refund_payment_id: int | None = None
    notes: str | None = None
    contract: ContractBrief
    customer: CustomerBrief
    creator: UserBrief | None = None
    created_at: datetime
    updated_at: datetime | None = None


class DepositListResponse(BaseModel):
    items: list[DepositOut]
    total: int
    page: int
    page_size: int
    pages: int


class DepositReceiveAction(BaseModel):
    received_date: date
    payment_id: int | None = None


class DepositRefundAction(BaseModel):
    refund_amount: float = Field(..., gt=0)
    refund_date: date
    refund_payment_id: int | None = None
    notes: str | None = None


class DepositForfeitAction(BaseModel):
    forfeit_amount: float = Field(..., gt=0)
    reason: str | None = None


class DepositApplyAction(BaseModel):
    apply_amount: float = Field(..., gt=0)
    invoice_id: int


# ── Revenue Recognition schemas ─────────────────────────────────────────────

class RevenueRecognitionCreate(BaseModel):
    contract_id: int
    invoice_id: int | None = None
    invoice_item_id: int | None = None
    recognition_type: RecognitionType
    recognition_date: date
    amount: float
    currency: str = Field(default="LAK", max_length=3)
    period_start: date | None = None
    period_end: date | None = None
    description: str | None = Field(default=None, max_length=500)
    notes: str | None = None


class RevenueRecognitionOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    recognition_number: str
    invoice_id: int | None = None
    invoice_item_id: int | None = None
    contract_id: int
    recognition_type: str
    recognition_status: str
    recognition_date: date
    amount: float
    currency: str
    period_start: date | None = None
    period_end: date | None = None
    description: str | None = None
    notes: str | None = None
    creator: UserBrief | None = None
    created_at: datetime
    updated_at: datetime | None = None


class RevenueRecognitionListResponse(BaseModel):
    items: list[RevenueRecognitionOut]
    total: int
    page: int
    page_size: int
    pages: int


# ── Dashboard ────────────────────────────────────────────────────────────────

class BillingDashboardSummary(BaseModel):
    total_invoiced: float
    total_paid: float
    total_outstanding: float
    total_overdue: float
    invoice_count: int
    payment_count: int
    currency: str = "LAK"


# Forward reference rebuild
InvoiceDetail.model_rebuild()
