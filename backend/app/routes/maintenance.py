import logging
from datetime import datetime

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.models.user import User
from app.schemas.maintenance import (
    CancelAction,
    CompleteAction,
    CostBulkReplaceRequest,
    CostCreate,
    CostOut,
    MaintenanceDashboardSummary,
    PlanCreate,
    PlanOut,
    PlanUpdate,
    ScheduleCreate,
    ScheduleOut,
    ServiceHistoryOut,
    StartAction,
    UserBrief,
    VerifyAction,
    WorkOrderCreate,
    WorkOrderDetail,
    WorkOrderListResponse,
    WorkOrderOut,
    WorkOrderUpdate,
)
from app.services.maintenance_service import MaintenanceService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/maintenance", tags=["Maintenance & PM"])


# ── Dashboard ────────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=MaintenanceDashboardSummary, summary="PM dashboard summary")
async def dashboard(
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_READ),
):
    return await MaintenanceService(db).get_dashboard()


# ── Technicians (assignee picker) ───────────────────────────────────────────
# A lightweight, non-PII brief list for the work-order assignee dropdown.
# Deliberately separate from GET /users (which is superuser-only and returns
# full account details) so anyone with FORKLIFT_READ can populate the picker.

@router.get("/technicians", response_model=list[UserBrief], summary="List assignable technicians")
async def list_technicians(
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_READ),
):
    users = await MaintenanceService(db).list_technicians()
    return [UserBrief.model_validate(u) for u in users]


# ── Plans ────────────────────────────────────────────────────────────────────

@router.get("/plans", response_model=list[PlanOut], summary="List maintenance plans")
async def list_plans(
    is_active: bool | None = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_READ),
):
    plans = await MaintenanceService(db).list_plans(is_active)
    return [PlanOut.model_validate(p) for p in plans]


@router.post("/plans", response_model=PlanOut, status_code=status.HTTP_201_CREATED, summary="Create plan")
async def create_plan(
    data: PlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    plan = await MaintenanceService(db).create_plan(data)
    return PlanOut.model_validate(plan)


@router.get("/plans/{plan_id}", response_model=PlanOut, summary="Get plan")
async def get_plan(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_READ),
):
    plan = await MaintenanceService(db).get_plan(plan_id)
    return PlanOut.model_validate(plan)


@router.put("/plans/{plan_id}", response_model=PlanOut, summary="Update plan")
async def update_plan(
    plan_id: int,
    data: PlanUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    plan = await MaintenanceService(db).update_plan(plan_id, data)
    return PlanOut.model_validate(plan)


# ── Schedules ────────────────────────────────────────────────────────────────

@router.get("/schedules", response_model=list[ScheduleOut], summary="List schedules")
async def list_schedules(
    forklift_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_READ),
):
    schedules = await MaintenanceService(db).list_schedules(forklift_id)
    return [ScheduleOut.model_validate(s) for s in schedules]


@router.post("/schedules", response_model=ScheduleOut, status_code=status.HTTP_201_CREATED, summary="Create schedule")
async def create_schedule(
    data: ScheduleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    schedule = await MaintenanceService(db).create_schedule(data)
    return ScheduleOut.model_validate(schedule)


# ── Work Orders ──────────────────────────────────────────────────────────────

@router.get("/work-orders", response_model=WorkOrderListResponse, summary="List work orders")
async def list_work_orders(
    q: str | None = Query(default=None),
    order_type: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    priority: str | None = None,
    forklift_id: int | None = None,
    assigned_to: int | None = None,
    is_active: bool | None = True,
    scheduled_from: datetime | None = None,
    scheduled_to: datetime | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort: str = Query(default="scheduled_date", pattern="^(scheduled_date|created_at|priority|status|work_order_number)$"),
    order: str = Query(default="asc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_READ),
):
    return await MaintenanceService(db).list_work_orders(
        q=q, order_type=order_type, status_filter=status_filter, priority=priority,
        forklift_id=forklift_id, assigned_to=assigned_to, is_active=is_active,
        scheduled_from=scheduled_from, scheduled_to=scheduled_to,
        page=page, page_size=page_size, sort=sort, order=order,
    )


@router.get("/work-orders/{wo_id}", response_model=WorkOrderDetail, summary="Get work order detail")
async def get_work_order(
    wo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_READ),
):
    return await MaintenanceService(db).get_work_order(wo_id)


@router.post("/work-orders", response_model=WorkOrderOut, status_code=status.HTTP_201_CREATED, summary="Create work order")
async def create_work_order(
    data: WorkOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    wo = await MaintenanceService(db).create_work_order(data, created_by=current_user.id)
    return WorkOrderOut.model_validate(wo)


@router.put("/work-orders/{wo_id}", response_model=WorkOrderOut, summary="Update work order")
async def update_work_order(
    wo_id: int,
    data: WorkOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    wo = await MaintenanceService(db).update_work_order(wo_id, data, updated_by=current_user.id)
    return WorkOrderOut.model_validate(wo)


# ── Workflow ─────────────────────────────────────────────────────────────────

@router.post("/work-orders/{wo_id}/start", response_model=WorkOrderOut, summary="Start work order")
async def start_work_order(
    wo_id: int,
    body: StartAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    wo = await MaintenanceService(db).start_work_order(wo_id, body, current_user.id)
    return WorkOrderOut.model_validate(wo)


@router.post("/work-orders/{wo_id}/complete", response_model=WorkOrderOut, summary="Complete work order")
async def complete_work_order(
    wo_id: int,
    body: CompleteAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    wo = await MaintenanceService(db).complete_work_order(wo_id, body, current_user.id)
    return WorkOrderOut.model_validate(wo)


@router.post("/work-orders/{wo_id}/verify", response_model=WorkOrderOut, summary="Verify completed work")
async def verify_work_order(
    wo_id: int,
    body: VerifyAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    wo = await MaintenanceService(db).verify_work_order(wo_id, current_user.id)
    return WorkOrderOut.model_validate(wo)


@router.post("/work-orders/{wo_id}/cancel", response_model=WorkOrderOut, summary="Cancel work order")
async def cancel_work_order(
    wo_id: int,
    body: CancelAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    wo = await MaintenanceService(db).cancel_work_order(wo_id, body, current_user.id)
    return WorkOrderOut.model_validate(wo)


# ── Costs ────────────────────────────────────────────────────────────────────

@router.post("/work-orders/{wo_id}/costs", response_model=CostOut, status_code=status.HTTP_201_CREATED, summary="Add cost entry")
async def add_cost(
    wo_id: int,
    data: CostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    cost = await MaintenanceService(db).add_cost(wo_id, data)
    return CostOut.model_validate(cost)


@router.put(
    "/work-orders/{wo_id}/items/bulk",
    response_model=list[CostOut],
    summary="Bulk replace cost entries (line items)",
)
async def replace_costs_bulk(
    wo_id: int,
    data: CostBulkReplaceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    costs = await MaintenanceService(db).replace_costs_bulk(wo_id, data)
    return [CostOut.model_validate(c) for c in costs]


# ── Service History ──────────────────────────────────────────────────────────

@router.get("/service-history/{forklift_id}", response_model=list[ServiceHistoryOut], summary="Equipment service history")
async def service_history(
    forklift_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_READ),
):
    entries = await MaintenanceService(db).get_service_history(forklift_id)
    return [ServiceHistoryOut.model_validate(e) for e in entries]
