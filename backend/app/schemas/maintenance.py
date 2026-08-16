from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.maintenance_plan import IntervalType, ServiceType
from app.models.work_order import OrderType, WorkOrderPriority
from app.models.maintenance_cost import MaintenanceCostType


# ── Brief models ─────────────────────────────────────────────────────────────

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


class PlanBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    plan_number: str
    name: str
    service_type: str
    interval_type: str
    interval_value: int


class ScheduleOutBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    status: str
    next_due_date: date | None = None


class WorkOrderBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    work_order_number: str
    status: str


# ── Plan schemas ─────────────────────────────────────────────────────────────

class PlanCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    service_type: ServiceType
    interval_type: IntervalType
    interval_value: int = Field(..., gt=0)
    estimated_duration_hours: float = Field(default=1.0, gt=0)
    estimated_cost: float = Field(default=0.0, ge=0)
    checklist: list[str] | None = None


class PlanUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    service_type: ServiceType | None = None
    interval_type: IntervalType | None = None
    interval_value: int | None = Field(default=None, gt=0)
    estimated_duration_hours: float | None = Field(default=None, gt=0)
    estimated_cost: float | None = Field(default=None, ge=0)
    checklist: list[str] | None = None
    is_active: bool | None = None


class PlanOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    plan_number: str
    name: str
    description: str | None = None
    service_type: str
    interval_type: str
    interval_value: int
    estimated_duration_hours: float
    estimated_cost: float
    checklist: list[str] | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None


# ── Schedule schemas ─────────────────────────────────────────────────────────

class ScheduleCreate(BaseModel):
    forklift_id: int
    plan_id: int
    next_due_date: date | None = None
    next_due_hours: float | None = Field(default=None, ge=0)
    notes: str | None = None


class ScheduleOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    forklift: ForkliftBrief
    plan: PlanBrief
    status: str
    next_due_date: date | None = None
    next_due_hours: float | None = None
    last_service_date: date | None = None
    last_service_hours: float | None = None
    times_serviced: int
    notes: str | None = None
    is_active: bool
    created_at: datetime


# ── Cost schemas ─────────────────────────────────────────────────────────────

class CostCreate(BaseModel):
    cost_type: MaintenanceCostType
    description: str = Field(..., min_length=1, max_length=300)
    quantity: float = Field(default=1.0, gt=0)
    unit_rate: float = Field(..., ge=0)
    vendor: str | None = Field(default=None, max_length=200)
    reference_number: str | None = Field(default=None, max_length=100)


class CostOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    work_order_id: int
    cost_type: str
    description: str
    quantity: float
    unit_rate: float
    amount: float
    vendor: str | None = None
    reference_number: str | None = None
    currency: str
    created_at: datetime


class CostBulkItem(BaseModel):
    # `id` distinguishes an existing row to update (id set, must belong to
    # this work order) from a new row to create (id omitted/None). Any
    # existing row whose id is absent from the payload is deleted.
    id: int | None = None
    cost_type: MaintenanceCostType
    description: str = Field(..., min_length=1, max_length=300)
    quantity: float = Field(default=1.0, gt=0)
    unit_rate: float = Field(..., ge=0)
    vendor: str | None = Field(default=None, max_length=200)
    reference_number: str | None = Field(default=None, max_length=100)


class CostBulkReplaceRequest(BaseModel):
    costs: list[CostBulkItem]


# ── Work Order schemas ───────────────────────────────────────────────────────

class WorkOrderCreate(BaseModel):
    forklift_id: int
    schedule_id: int | None = None
    plan_id: int | None = None
    order_type: OrderType
    priority: WorkOrderPriority = WorkOrderPriority.NORMAL
    title: str = Field(..., min_length=1, max_length=300)
    description: str | None = None
    assigned_to: int | None = None
    scheduled_date: datetime
    estimated_hours: float = Field(default=1.0, gt=0)
    estimated_cost: float = Field(default=0.0, ge=0)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class WorkOrderUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = None
    priority: WorkOrderPriority | None = None
    assigned_to: int | None = None
    scheduled_date: datetime | None = None
    estimated_hours: float | None = Field(default=None, gt=0)
    estimated_cost: float | None = Field(default=None, ge=0)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class StartAction(BaseModel):
    hour_meter_reading: float = Field(..., ge=0)
    notes: str | None = Field(default=None, max_length=500)


class CompleteAction(BaseModel):
    actual_hours: float = Field(..., gt=0)
    findings: str | None = None
    resolution: str | None = None
    # Closing hour-meter reading. Optional — some jobs (e.g. off-machine
    # inspections) have nothing new to report. When given, it's recorded
    # through ForkliftHourMeterLog (source="work_order") and becomes the
    # forklift's new current_hour_meter, same as a manual or IoT reading.
    hour_meter_reading: float | None = Field(default=None, ge=0)


class VerifyAction(BaseModel):
    notes: str | None = Field(default=None, max_length=500)


class CancelAction(BaseModel):
    cancellation_reason: str = Field(..., min_length=1)


class WorkOrderOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    work_order_number: str
    forklift: ForkliftBrief
    schedule: ScheduleOutBrief | None = None
    plan: PlanBrief | None = None
    technician: UserBrief | None = None
    order_type: str
    status: str
    priority: str
    title: str
    scheduled_date: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    estimated_hours: float
    actual_hours: float | None = None
    estimated_cost: float
    actual_cost: float | None = None
    latitude: float | None = None
    longitude: float | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None


class WorkOrderDetail(WorkOrderOut):
    description: str | None = None
    hour_meter_at_service: float | None = None
    findings: str | None = None
    resolution: str | None = None
    cancellation_reason: str | None = None
    verifier: UserBrief | None = None
    verified_at: datetime | None = None
    created_by: int | None = None
    updated_by: int | None = None
    costs: list[CostOut] = []


class WorkOrderListResponse(BaseModel):
    items: list[WorkOrderOut]
    total: int
    page: int
    page_size: int
    pages: int


# ── Service History ──────────────────────────────────────────────────────────

class ServiceHistoryOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    forklift: ForkliftBrief
    work_order: WorkOrderBrief | None = None
    service_type: str
    service_date: date
    technician: UserBrief | None = None
    hour_meter_reading: float | None = None
    duration_hours: float | None = None
    total_cost: float
    currency: str
    summary: str | None = None
    created_at: datetime


# ── Dashboard ────────────────────────────────────────────────────────────────

class MaintenanceDashboardSummary(BaseModel):
    total_plans: int
    active_schedules: int
    overdue_count: int
    in_progress_count: int
    completed_this_month: int
    total_cost_this_month: float
    currency: str
