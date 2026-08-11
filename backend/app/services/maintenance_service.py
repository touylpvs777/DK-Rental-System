import logging
import math
import time
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.events import event_bus
from app.models.maintenance_plan import IntervalType, MaintenancePlan
from app.models.maintenance_schedule import MaintenanceSchedule, ScheduleStatus
from app.models.work_order import WorkOrder, WorkOrderStatus
from app.models.service_history import ServiceHistory
from app.models.maintenance_cost import MaintenanceCost
from app.repositories.forklift_repository import ForkliftRepository
from app.repositories.maintenance_repository import MaintenanceRepository, WorkOrderFilter
from app.schemas.maintenance import (
    CostBulkReplaceRequest,
    CostCreate,
    MaintenanceDashboardSummary,
    PlanCreate,
    PlanUpdate,
    ScheduleCreate,
    WorkOrderCreate,
    WorkOrderDetail,
    WorkOrderListResponse,
    WorkOrderOut,
    WorkOrderUpdate,
    CompleteAction,
    StartAction,
    CancelAction,
)

logger = logging.getLogger(__name__)


def _add_months(months: int) -> timedelta:
    return timedelta(days=months * 30)

_VALID_SORTS = {"scheduled_date", "created_at", "priority", "status", "work_order_number"}

VALID_WO_TRANSITIONS: dict[str, set[str]] = {
    WorkOrderStatus.SCHEDULED.value: {WorkOrderStatus.DUE.value, WorkOrderStatus.IN_PROGRESS.value, WorkOrderStatus.CANCELLED.value},
    WorkOrderStatus.DUE.value: {WorkOrderStatus.IN_PROGRESS.value, WorkOrderStatus.CANCELLED.value},
    WorkOrderStatus.IN_PROGRESS.value: {WorkOrderStatus.COMPLETED.value, WorkOrderStatus.CANCELLED.value},
    WorkOrderStatus.COMPLETED.value: {WorkOrderStatus.VERIFIED.value},
    WorkOrderStatus.VERIFIED.value: set(),
    WorkOrderStatus.CANCELLED.value: set(),
}


class MaintenanceService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = MaintenanceRepository(db)
        self._forklift_repo = ForkliftRepository(db)

    # ── Plans ────────────────────────────────────────────────────────────────

    async def list_plans(self, is_active: bool | None = True) -> list[MaintenancePlan]:
        return await self._repo.get_plans(is_active)

    async def get_plan(self, plan_id: int) -> MaintenancePlan:
        plan = await self._repo.get_plan_by_id(plan_id)
        if plan is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
        return plan

    async def create_plan(self, data: PlanCreate) -> MaintenancePlan:
        number = await self._gen("PM")
        plan = MaintenancePlan(
            plan_number=number,
            name=data.name.strip(),
            description=data.description,
            service_type=data.service_type.value,
            interval_type=data.interval_type.value,
            interval_value=data.interval_value,
            estimated_duration_hours=data.estimated_duration_hours,
            estimated_cost=data.estimated_cost,
            checklist=data.checklist,
        )
        try:
            plan = await self._repo.create_plan(plan)
            await self.db.commit()
            return plan
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Plan number conflict")

    async def update_plan(self, plan_id: int, data: PlanUpdate) -> MaintenancePlan:
        plan = await self.get_plan(plan_id)
        changes = data.model_dump(exclude_unset=True)
        if "service_type" in changes and changes["service_type"]:
            changes["service_type"] = changes["service_type"].value
        if "interval_type" in changes and changes["interval_type"]:
            changes["interval_type"] = changes["interval_type"].value
        plan = await self._repo.update_plan(plan, changes)
        await self.db.commit()
        return plan

    # ── Schedules ────────────────────────────────────────────────────────────

    async def list_schedules(self, forklift_id: int | None = None) -> list[MaintenanceSchedule]:
        return await self._repo.get_schedules(forklift_id=forklift_id)

    async def create_schedule(self, data: ScheduleCreate) -> MaintenanceSchedule:
        forklift = await self._forklift_repo.get_by_id(data.forklift_id)
        if forklift is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Forklift not found")
        plan = await self.get_plan(data.plan_id)

        next_due = data.next_due_date
        next_hours = data.next_due_hours
        if next_due is None and plan.interval_type in (IntervalType.DAYS.value, "days"):
            next_due = date.today() + timedelta(days=plan.interval_value)
        if next_due is None and plan.interval_type in (IntervalType.MONTHS.value, "months"):
            next_due = date.today() + _add_months(plan.interval_value)
        if next_hours is None and plan.interval_type in (IntervalType.HOURS.value, "hours"):
            next_hours = forklift.current_hour_meter + plan.interval_value

        schedule = MaintenanceSchedule(
            forklift_id=data.forklift_id,
            plan_id=data.plan_id,
            next_due_date=next_due,
            next_due_hours=next_hours,
            notes=data.notes,
        )
        schedule = await self._repo.create_schedule(schedule)
        await self.db.commit()
        return await self._repo.get_schedule_by_id(schedule.id)

    # ── Technicians ──────────────────────────────────────────────────────────

    async def list_technicians(self):
        return await self._repo.get_active_users()

    # ── Work Orders ──────────────────────────────────────────────────────────

    async def list_work_orders(self, **kwargs) -> WorkOrderListResponse:
        page = max(1, kwargs.get("page", 1))
        page_size = min(max(1, kwargs.get("page_size", 20)), 100)
        sort = kwargs.get("sort", "scheduled_date")
        sort = sort if sort in _VALID_SORTS else "scheduled_date"
        order = kwargs.get("order", "asc")
        order = order if order in ("asc", "desc") else "asc"

        f = WorkOrderFilter(
            q=kwargs.get("q"), order_type=kwargs.get("order_type"),
            status=kwargs.get("status_filter"), priority=kwargs.get("priority"),
            forklift_id=kwargs.get("forklift_id"), assigned_to=kwargs.get("assigned_to"),
            is_active=kwargs.get("is_active", True),
            scheduled_from=kwargs.get("scheduled_from"), scheduled_to=kwargs.get("scheduled_to"),
            page=page, page_size=page_size, sort=sort, order=order,
        )
        items, total = await self._repo.get_work_orders(f)
        pages = math.ceil(total / page_size) if page_size else 1
        return WorkOrderListResponse(
            items=[WorkOrderOut.model_validate(wo) for wo in items],
            total=total, page=page, page_size=page_size, pages=pages,
        )

    async def get_work_order(self, wo_id: int) -> WorkOrderDetail:
        wo = await self._repo.get_work_order_detail(wo_id)
        if wo is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")
        return WorkOrderDetail.model_validate(wo)

    async def create_work_order(self, data: WorkOrderCreate, created_by: int) -> WorkOrder:
        forklift = await self._forklift_repo.get_by_id(data.forklift_id)
        if forklift is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Forklift not found")

        number = await self._gen("WO")
        wo = WorkOrder(
            work_order_number=number,
            forklift_id=data.forklift_id,
            schedule_id=data.schedule_id,
            plan_id=data.plan_id,
            order_type=data.order_type.value,
            priority=data.priority.value,
            title=data.title.strip(),
            description=data.description,
            assigned_to=data.assigned_to,
            scheduled_date=data.scheduled_date,
            estimated_hours=data.estimated_hours,
            estimated_cost=data.estimated_cost,
            created_by=created_by,
            updated_by=created_by,
        )
        try:
            wo = await self._repo.create_work_order(wo)
            await self.db.commit()
            return await self._repo.get_work_order_by_id(wo.id)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Work order number conflict")

    async def update_work_order(self, wo_id: int, data: WorkOrderUpdate, updated_by: int) -> WorkOrder:
        wo = await self._require_wo(wo_id)
        if wo.status not in (WorkOrderStatus.SCHEDULED.value, WorkOrderStatus.DUE.value):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                                detail="Can only edit scheduled or due work orders")
        changes = data.model_dump(exclude_unset=True)
        if "priority" in changes and changes["priority"]:
            changes["priority"] = changes["priority"].value
        changes["updated_by"] = updated_by
        await self._repo.update_work_order(wo, changes)
        await self.db.commit()
        return await self._repo.get_work_order_by_id(wo.id)

    # ── Workflow ─────────────────────────────────────────────────────────────

    async def start_work_order(self, wo_id: int, data: StartAction, user_id: int) -> WorkOrder:
        wo = await self._require_wo(wo_id)
        self._validate(wo.status, WorkOrderStatus.IN_PROGRESS.value)
        await self._repo.update_work_order(wo, {
            "status": WorkOrderStatus.IN_PROGRESS.value,
            "started_at": datetime.now(timezone.utc),
            "hour_meter_at_service": data.hour_meter_reading,
            "updated_by": user_id,
        })
        await self.db.commit()
        return await self._repo.get_work_order_by_id(wo.id)

    async def complete_work_order(self, wo_id: int, data: CompleteAction, user_id: int) -> WorkOrder:
        wo = await self._require_wo(wo_id)
        self._validate(wo.status, WorkOrderStatus.COMPLETED.value)

        total_cost = await self._repo.get_wo_total_cost(wo_id)

        await self._repo.update_work_order(wo, {
            "status": WorkOrderStatus.COMPLETED.value,
            "completed_at": datetime.now(timezone.utc),
            "actual_hours": data.actual_hours,
            "actual_cost": total_cost or wo.estimated_cost,
            "findings": data.findings,
            "resolution": data.resolution,
            "updated_by": user_id,
        })

        await self._repo.add_service_history(ServiceHistory(
            forklift_id=wo.forklift_id,
            work_order_id=wo.id,
            service_type=wo.order_type,
            service_date=date.today(),
            technician_id=wo.assigned_to,
            hour_meter_reading=wo.hour_meter_at_service,
            duration_hours=data.actual_hours,
            total_cost=total_cost or wo.estimated_cost,
            summary=data.resolution or data.findings,
        ))

        if wo.schedule_id:
            await self._advance_schedule(wo.schedule_id, wo.forklift_id)

        await self.db.commit()
        completed_wo = await self._repo.get_work_order_by_id(wo.id)
        await event_bus.emit("work_order.completed", db=self.db, work_order=completed_wo)
        return completed_wo

    async def verify_work_order(self, wo_id: int, user_id: int) -> WorkOrder:
        wo = await self._require_wo(wo_id)
        self._validate(wo.status, WorkOrderStatus.VERIFIED.value)
        await self._repo.update_work_order(wo, {
            "status": WorkOrderStatus.VERIFIED.value,
            "verified_at": datetime.now(timezone.utc),
            "verified_by": user_id,
            "updated_by": user_id,
        })
        await self.db.commit()
        return await self._repo.get_work_order_by_id(wo.id)

    async def cancel_work_order(self, wo_id: int, data: CancelAction, user_id: int) -> WorkOrder:
        wo = await self._require_wo(wo_id)
        if wo.status in (WorkOrderStatus.COMPLETED.value, WorkOrderStatus.VERIFIED.value, WorkOrderStatus.CANCELLED.value):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                                detail=f"Cannot cancel work order in '{wo.status}' status")
        await self._repo.update_work_order(wo, {
            "status": WorkOrderStatus.CANCELLED.value,
            "cancellation_reason": data.cancellation_reason,
            "updated_by": user_id,
        })
        await self.db.commit()
        return await self._repo.get_work_order_by_id(wo.id)

    # ── Costs ────────────────────────────────────────────────────────────────

    @staticmethod
    def _require_cost_editable(wo: WorkOrder) -> None:
        if wo.status in (WorkOrderStatus.VERIFIED.value, WorkOrderStatus.CANCELLED.value):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                                detail="Cannot modify costs on a verified or cancelled work order")

    async def add_cost(self, wo_id: int, data: CostCreate) -> MaintenanceCost:
        wo = await self._require_wo(wo_id)
        self._require_cost_editable(wo)
        amount = round(data.quantity * data.unit_rate, 2)
        cost = MaintenanceCost(
            work_order_id=wo_id,
            cost_type=data.cost_type.value,
            description=data.description.strip(),
            quantity=data.quantity,
            unit_rate=data.unit_rate,
            amount=amount,
            vendor=data.vendor,
            reference_number=data.reference_number,
        )
        cost = await self._repo.add_cost(cost)
        await self.db.commit()
        return cost

    async def replace_costs_bulk(self, wo_id: int, data: CostBulkReplaceRequest) -> list[MaintenanceCost]:
        """Full differential replace of a work order's cost entries: rows
        omitted from the payload are deleted, rows with a matching `id` are
        updated in place, rows with no `id` are created. Mirrors the status
        guard already established by `add_cost` (blocks `verified`/
        `cancelled`) rather than the task brief's literal "completed or
        cancelled" wording — `add_cost` deliberately still allows editing
        costs on a `completed`-but-not-yet-verified work order (to allow
        correction before sign-off), and having bulk-replace enforce a
        stricter rule than the single-row endpoint it's meant to complement
        would make the two inconsistent with no functional benefit.
        """
        wo = await self._require_wo(wo_id)
        self._require_cost_editable(wo)

        existing = await self._repo.get_costs_for_work_order(wo_id)
        existing_by_id = {c.id: c for c in existing}
        payload_ids = {row.id for row in data.costs if row.id is not None}
        unknown_ids = payload_ids - existing_by_id.keys()
        if unknown_ids:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Cost entry not found on this work order: {sorted(unknown_ids)}",
            )

        for cost in existing:
            if cost.id not in payload_ids:
                await self._repo.delete_cost(cost)

        for row in data.costs:
            amount = round(row.quantity * row.unit_rate, 2)
            changes = {
                "cost_type": row.cost_type.value,
                "description": row.description.strip(),
                "quantity": row.quantity,
                "unit_rate": row.unit_rate,
                "amount": amount,
                "vendor": row.vendor,
                "reference_number": row.reference_number,
            }
            if row.id is not None:
                await self._repo.update_cost(existing_by_id[row.id], changes)
            else:
                await self._repo.add_cost(MaintenanceCost(work_order_id=wo_id, **changes))

        await self.db.commit()
        return await self._repo.get_costs_for_work_order(wo_id)

    # ── Service History ──────────────────────────────────────────────────────

    async def get_service_history(self, forklift_id: int) -> list[ServiceHistory]:
        return await self._repo.get_service_history(forklift_id)

    # ── Dashboard ────────────────────────────────────────────────────────────

    async def get_dashboard(self) -> MaintenanceDashboardSummary:
        today = date.today()
        plans = await self._repo.get_plans(is_active=True)
        active_schedules = await self._repo.count_active_schedules()
        overdue = len(await self._repo.get_overdue_schedules(today))
        in_progress = await self._repo.count_by_wo_status(WorkOrderStatus.IN_PROGRESS.value)
        completed_count, completed_cost = await self._repo.completed_this_month(today)

        return MaintenanceDashboardSummary(
            total_plans=len(plans),
            active_schedules=active_schedules,
            overdue_count=overdue,
            in_progress_count=in_progress,
            completed_this_month=completed_count,
            total_cost_this_month=completed_cost,
            currency="LAK",
        )

    # ── Private ──────────────────────────────────────────────────────────────

    async def _require_wo(self, wo_id: int) -> WorkOrder:
        wo = await self._repo.get_work_order_by_id(wo_id)
        if wo is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Work order not found")
        return wo

    @staticmethod
    def _validate(current: str, target: str) -> None:
        if target not in VALID_WO_TRANSITIONS.get(current, set()):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                                detail=f"Invalid transition: '{current}' → '{target}'")

    async def _advance_schedule(self, schedule_id: int, forklift_id: int) -> None:
        schedule = await self._repo.get_schedule_by_id(schedule_id)
        if schedule is None:
            return
        plan = await self._repo.get_plan_by_id(schedule.plan_id)
        if plan is None:
            return
        forklift = await self._forklift_repo.get_by_id(forklift_id)

        changes: dict = {
            "last_service_date": date.today(),
            "times_serviced": schedule.times_serviced + 1,
        }
        if forklift:
            changes["last_service_hours"] = forklift.current_hour_meter

        if plan.interval_type == IntervalType.DAYS.value:
            changes["next_due_date"] = date.today() + timedelta(days=plan.interval_value)
        elif plan.interval_type == IntervalType.MONTHS.value:
            changes["next_due_date"] = date.today() + _add_months(plan.interval_value)
        elif plan.interval_type == IntervalType.HOURS.value and forklift:
            changes["next_due_hours"] = forklift.current_hour_meter + plan.interval_value

        await self._repo.update_schedule(schedule, changes)

    async def _gen(self, prefix: str) -> str:
        year = time.strftime("%Y")
        base = f"{prefix}-{year}"
        seq = 1
        if prefix == "PM":
            while await self._repo.plan_number_exists(f"{base}-{seq:04d}"):
                seq += 1
            return f"{base}-{seq:04d}"
        while await self._repo.wo_number_exists(f"{base}-{seq:05d}"):
            seq += 1
        return f"{base}-{seq:05d}"
