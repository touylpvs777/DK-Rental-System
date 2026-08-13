from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator

from app.models.rental_contract import ContractType, DepositStatus, RentalContractStatus
from app.models.rental_contract_item import ContractItemStatus
from app.models.rental_contract_term import TermCategory, TermDataType
from app.models.rental_extension import ExtensionStatus
from app.models.rental_return import ReturnStatus, ReturnType
from app.models.rental_damage_report import DamageCategory, DisputeStatus
from app.models.rental_billing_cycle import BillingType, PaymentStatus


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


class ForkliftBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    serial_number: str
    name_en: str
    status: str
    current_hour_meter: float
    condition: str


# ── Contract schemas ─────────────────────────────────────────────────────────

class RentalContractCreate(BaseModel):
    customer_id: int
    contract_type: ContractType
    start_date: date
    end_date: date
    assigned_to: int | None = None
    billing_cycle_day: int = Field(default=1, ge=1, le=28)
    payment_terms_days: int = Field(default=30, gt=0)
    deposit_amount: float = Field(default=0.0, ge=0)
    early_termination_fee_pct: float = Field(default=0.0, ge=0, le=100)
    late_return_penalty_pct: float = Field(default=0.0, ge=0, le=100)
    overtime_rate_pct: float = Field(default=150.0, ge=100)
    tax_rate: float = Field(default=0.0, ge=0, le=100)
    currency: str = Field(default="LAK", max_length=3)
    delivery_address: str | None = None
    delivery_contact_name: str | None = Field(default=None, max_length=200)
    delivery_contact_phone: str | None = Field(default=None, max_length=50)
    notes: str | None = None
    internal_notes: str | None = None
    daily_hours_quota: int = Field(default=8, gt=0, le=24)
    overtime_rate_per_hour: float | None = Field(default=None, ge=0)
    rest_policy_work_hours: int = Field(default=4, gt=0, le=24)
    rest_policy_rest_minutes: int = Field(default=30, ge=0)
    job_type: str | None = Field(default=None, max_length=50)
    contract_body: str | None = Field(default=None, max_length=50_000)
    attachment_url: str | None = Field(default=None, max_length=500)


class RentalContractUpdate(BaseModel):
    contract_type: ContractType | None = None
    start_date: date | None = None
    end_date: date | None = None
    assigned_to: int | None = None
    billing_cycle_day: int | None = Field(default=None, ge=1, le=28)
    payment_terms_days: int | None = Field(default=None, gt=0)
    deposit_amount: float | None = Field(default=None, ge=0)
    deposit_status: DepositStatus | None = None
    early_termination_fee_pct: float | None = Field(default=None, ge=0, le=100)
    late_return_penalty_pct: float | None = Field(default=None, ge=0, le=100)
    overtime_rate_pct: float | None = Field(default=None, ge=100)
    tax_rate: float | None = Field(default=None, ge=0, le=100)
    discount_amount: float | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, max_length=3)
    delivery_address: str | None = None
    delivery_contact_name: str | None = None
    delivery_contact_phone: str | None = None
    notes: str | None = None
    internal_notes: str | None = None
    daily_hours_quota: int | None = Field(default=None, gt=0, le=24)
    overtime_rate_per_hour: float | None = Field(default=None, ge=0)
    rest_policy_work_hours: int | None = Field(default=None, gt=0, le=24)
    rest_policy_rest_minutes: int | None = Field(default=None, ge=0)
    job_type: str | None = Field(default=None, max_length=50)
    contract_body: str | None = Field(default=None, max_length=50_000)
    attachment_url: str | None = Field(default=None, max_length=500)


class RentalContractOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    contract_number: str
    revision_number: int
    status: str
    contract_type: str
    customer: CustomerBrief
    assigned_user: UserBrief | None = None
    start_date: date
    end_date: date
    actual_start_date: date | None = None
    actual_end_date: date | None = None
    item_count: int = 0
    subtotal: float
    total_value: float
    currency: str
    deposit_amount: float
    deposit_status: str
    created_at: datetime
    updated_at: datetime | None = None
    is_active: bool


class RentalContractDetail(RentalContractOut):
    billing_cycle_day: int
    payment_terms_days: int
    tax_rate: float
    tax_amount: float
    discount_amount: float
    early_termination_fee_pct: float
    late_return_penalty_pct: float
    overtime_rate_pct: float
    daily_hours_quota: int
    overtime_rate_per_hour: float | None = None
    rest_policy_work_hours: int
    rest_policy_rest_minutes: int
    job_type: str | None = None
    contract_body: str | None = None
    attachment_url: str | None = None
    delivery_address: str | None = None
    delivery_contact_name: str | None = None
    delivery_contact_phone: str | None = None
    notes: str | None = None
    internal_notes: str | None = None
    cancellation_reason: str | None = None
    reservation_expires_at: datetime | None = None
    approved_by_user: UserBrief | None = None
    approved_at: datetime | None = None
    created_by: int | None = None
    updated_by: int | None = None
    items: list["RentalContractItemOut"] = []
    terms: list["RentalContractTermOut"] = []
    recent_status_history: list["RentalStatusHistoryOut"] = []
    recent_extensions: list["RentalExtensionOut"] = []
    active_returns: list["RentalReturnOut"] = []
    billing_summary: "BillingSummary | None" = None
    available_actions: list[str] = []


class RentalContractListResponse(BaseModel):
    items: list[RentalContractOut]
    total: int
    page: int
    page_size: int
    pages: int


# ── Item schemas ─────────────────────────────────────────────────────────────

class RentalContractItemCreate(BaseModel):
    forklift_id: int
    description: str = Field(..., min_length=1, max_length=1000)
    monthly_rate: float = Field(..., ge=0)
    daily_rate: float = Field(..., ge=0)
    hourly_rate: float | None = Field(default=None, ge=0)
    contracted_hours_limit: float | None = Field(default=None, gt=0)
    maintenance_interval_hours: float | None = Field(default=None, gt=0)
    notes: str | None = None
    sort_order: int = 0


class RentalContractItemUpdate(BaseModel):
    description: str | None = Field(default=None, min_length=1, max_length=1000)
    monthly_rate: float | None = Field(default=None, ge=0)
    daily_rate: float | None = Field(default=None, ge=0)
    hourly_rate: float | None = Field(default=None, ge=0)
    contracted_hours_limit: float | None = Field(default=None, gt=0)
    maintenance_interval_hours: float | None = Field(default=None, gt=0)
    notes: str | None = None
    sort_order: int | None = None


class RentalContractItemBulkRow(BaseModel):
    # `id` distinguishes an existing line to update (id set, must belong to
    # this contract) from a new line to create (id omitted/None). Any
    # existing line whose id is absent from the payload is deleted.
    # `forklift_id` is required for new lines but ignored for existing ones
    # — matching RentalContractItemUpdate, which likewise doesn't allow
    # changing a line's forklift after creation (swapping equipment would
    # require re-running the reservation/conflict-check flow that only
    # add_item/delete_item currently implement).
    id: int | None = None
    forklift_id: int | None = None
    description: str = Field(..., min_length=1, max_length=1000)
    monthly_rate: float = Field(..., ge=0)
    daily_rate: float = Field(..., ge=0)
    hourly_rate: float | None = Field(default=None, ge=0)
    contracted_hours_limit: float | None = Field(default=None, gt=0)
    maintenance_interval_hours: float | None = Field(default=None, gt=0)
    notes: str | None = None
    sort_order: int = 0


class RentalContractItemBulkReplaceRequest(BaseModel):
    items: list[RentalContractItemBulkRow]


class RentalContractItemOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    contract_id: int
    line_number: int
    forklift: ForkliftBrief | None = None
    description: str
    monthly_rate: float
    daily_rate: float
    hourly_rate: float | None = None
    contracted_hours_limit: float | None = None
    maintenance_interval_hours: float | None = None
    departure_hour_meter: float | None = None
    return_hour_meter: float | None = None
    hours_used: float | None = None
    line_status: str
    line_total: float
    sort_order: int
    notes: str | None = None
    created_at: datetime
    updated_at: datetime | None = None


# ── Term schemas ─────────────────────────────────────────────────────────────

class RentalContractTermCreate(BaseModel):
    term_category: TermCategory
    term_key: str = Field(..., min_length=1, max_length=100)
    term_label: str = Field(..., min_length=1, max_length=300)
    term_value: str
    data_type: TermDataType = TermDataType.TEXT
    numeric_value: float | None = None
    is_required: bool = False
    is_visible_to_customer: bool = True
    sort_order: int = 0


class RentalContractTermOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    contract_id: int
    term_category: str
    term_key: str
    term_label: str
    term_value: str
    data_type: str
    numeric_value: float | None = None
    is_required: bool
    is_visible_to_customer: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime | None = None


# ── Extension schemas ────────────────────────────────────────────────────────

class RentalExtensionCreate(BaseModel):
    new_end_date: date
    rate_adjustment_pct: float = Field(default=0.0)
    new_monthly_rate: float | None = Field(default=None, ge=0)
    reason: str | None = Field(default=None, max_length=1000)


class ExtensionDecisionAction(BaseModel):
    reason: str | None = Field(default=None, max_length=500)
    conditions: str | None = Field(default=None, max_length=1000)


class RentalExtensionOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    contract_id: int
    extension_number: int
    original_end_date: date
    new_end_date: date
    rate_adjustment_pct: float
    new_monthly_rate: float | None = None
    reason: str | None = None
    status: str
    conditions: str | None = None
    requester: UserBrief | None = None
    approver: UserBrief | None = None
    decided_at: datetime | None = None
    created_at: datetime


# ── Return schemas ───────────────────────────────────────────────────────────

class RentalReturnCreate(BaseModel):
    return_type: ReturnType
    requested_date: date
    contract_item_id: int | None = None
    forklift_id: int | None = None
    pickup_address: str | None = None
    scheduled_pickup_date: date | None = None
    is_early_termination: bool = False
    early_termination_reason: str | None = None
    notes: str | None = None


class RentalReturnUpdate(BaseModel):
    scheduled_pickup_date: date | None = None
    pickup_address: str | None = None
    assigned_driver: int | None = None
    notes: str | None = None


class PickupAction(BaseModel):
    departure_hour_meter: float = Field(..., ge=0)
    customer_signoff_url: str | None = Field(default=None, max_length=500)
    notes: str | None = None


class ReceiveAction(BaseModel):
    arrival_hour_meter: float = Field(..., ge=0)
    condition_rating: int = Field(..., ge=1, le=5)
    overall_condition: str = Field(...)
    mechanical_pass: bool | None = None
    safety_equipment_pass: bool | None = None
    exterior_notes: str | None = None
    photo_urls: list[str] | None = None
    notes: str | None = None


class RentalReturnOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    return_number: str
    contract_id: int
    contract_item_id: int | None = None
    forklift: ForkliftBrief | None = None
    return_type: str
    status: str
    is_early_termination: bool
    early_termination_reason: str | None = None
    requested_date: date
    scheduled_pickup_date: date | None = None
    actual_pickup_date: date | None = None
    actual_received_date: date | None = None
    pickup_address: str | None = None
    departure_hour_meter: float | None = None
    arrival_hour_meter: float | None = None
    condition_rating: int | None = None
    overall_condition: str | None = None
    mechanical_pass: bool | None = None
    safety_equipment_pass: bool | None = None
    customer_signoff_url: str | None = None
    driver_user: UserBrief | None = None
    inspector_user: UserBrief | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime | None = None


# ── Damage report schemas ───────────────────────────────────────────────────

class RentalDamageReportCreate(BaseModel):
    return_id: int
    forklift_id: int
    damage_category: DamageCategory
    component: str | None = Field(default=None, max_length=100)
    description: str
    photo_urls: list[str] | None = None
    repair_cost: float = Field(default=0.0, ge=0)
    parts_cost: float = Field(default=0.0, ge=0)
    downtime_days: int = Field(default=0, ge=0)
    downtime_cost: float = Field(default=0.0, ge=0)
    is_customer_liable: bool = True


class RentalDamageReportUpdate(BaseModel):
    damage_category: DamageCategory | None = None
    component: str | None = None
    description: str | None = None
    photo_urls: list[str] | None = None
    repair_cost: float | None = Field(default=None, ge=0)
    parts_cost: float | None = Field(default=None, ge=0)
    downtime_days: int | None = Field(default=None, ge=0)
    downtime_cost: float | None = Field(default=None, ge=0)
    is_customer_liable: bool | None = None


class DisputeAction(BaseModel):
    dispute_reason: str = Field(..., min_length=1)


class ResolveDisputeAction(BaseModel):
    final_charge: float = Field(..., ge=0)
    dispute_resolution: str = Field(..., min_length=1)


class RentalDamageReportOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    report_number: str
    return_id: int
    contract_id: int
    forklift: ForkliftBrief | None = None
    damage_category: str
    component: str | None = None
    description: str
    photo_urls: list[str] | None = None
    repair_cost: float
    parts_cost: float
    downtime_days: int
    downtime_cost: float
    is_customer_liable: bool
    total_charge: float
    final_charge: float | None = None
    dispute_status: str | None = None
    dispute_reason: str | None = None
    dispute_resolution: str | None = None
    assessor: UserBrief | None = None
    dispute_resolver: UserBrief | None = None
    dispute_resolved_at: datetime | None = None
    assessed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime | None = None


# ── Billing schemas ──────────────────────────────────────────────────────────

class RentalBillingCycleCreate(BaseModel):
    billing_type: BillingType
    description: str = Field(..., max_length=500)
    contract_item_id: int | None = None
    period_start: date | None = None
    period_end: date | None = None
    quantity: float = Field(default=1.0, gt=0)
    unit_rate: float = Field(..., ge=0)
    tax_amount: float = Field(default=0.0, ge=0)
    is_credit: bool = False
    due_date: date | None = None
    notes: str | None = None


class GenerateBillingAction(BaseModel):
    period_start: date
    period_end: date
    notes: str | None = None


class RentalBillingCycleUpdate(BaseModel):
    payment_status: PaymentStatus
    paid_date: date | None = None
    notes: str | None = None


class RentalBillingCycleOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    billing_number: str
    contract_id: int
    contract_item_id: int | None = None
    billing_type: str
    description: str
    period_start: date | None = None
    period_end: date | None = None
    quantity: float
    unit_rate: float
    amount: float
    tax_amount: float
    total_amount: float
    currency: str
    is_credit: bool
    payment_status: str
    due_date: date | None = None
    paid_date: date | None = None
    generated_by: str
    notes: str | None = None
    creator: UserBrief | None = None
    created_at: datetime
    updated_at: datetime | None = None


class BillingSummary(BaseModel):
    total_billed: float
    total_paid: float
    total_outstanding: float
    total_overdue: float
    total_credits: float
    currency: str
    event_count: int


# ── Status history ───────────────────────────────────────────────────────────

class RentalStatusHistoryOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    contract_id: int
    from_status: str | None = None
    to_status: str
    reason: str | None = None
    user: UserBrief | None = None
    changed_at: datetime


# ── Workflow action schemas ──────────────────────────────────────────────────

class WorkflowAction(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class ApproveContractAction(BaseModel):
    reason: str | None = Field(default=None, max_length=500)
    conditions: str | None = Field(default=None, max_length=1000)


class ActivateContractAction(BaseModel):
    actual_start_date: date | None = None
    notes: str | None = None


class CancelContractAction(BaseModel):
    cancellation_reason: str = Field(..., min_length=1)


class RecordHoursAction(BaseModel):
    reading: float = Field(..., ge=0)
    reading_type: str = Field(...)
    notes: str | None = None


# ── Availability schemas ────────────────────────────────────────────────────

class ConflictBrief(BaseModel):
    contract_number: str
    customer: str
    start_date: date
    end_date: date


class ForkliftAvailability(BaseModel):
    forklift_id: int
    serial_number: str
    name_en: str
    current_status: str
    is_available: bool
    conflicts: list[ConflictBrief]


class AvailabilityResponse(BaseModel):
    start_date: date
    end_date: date
    results: list[ForkliftAvailability]


# ── Settlement summary ──────────────────────────────────────────────────────

class SettlementSummary(BaseModel):
    contract_number: str
    total_rental_charges: float
    total_delivery_fees: float
    total_damage_charges: float
    total_penalties: float
    total_credits: float
    subtotal: float
    tax_rate: float
    tax_amount: float
    net_settlement: float
    total_paid: float
    outstanding_balance: float
    currency: str


# ── Forward ref rebuild ──────────────────────────────────────────────────────

RentalContractDetail.model_rebuild()
RentalReturnOut.model_rebuild()
