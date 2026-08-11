import logging
from dataclasses import dataclass
from datetime import date, datetime

from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.forklift import Forklift
from app.models.maintenance_plan import MaintenancePlan
from app.models.maintenance_schedule import MaintenanceSchedule
from app.models.work_order import WorkOrder
from app.models.service_history import ServiceHistory
from app.models.maintenance_cost import MaintenanceCost
from app.models.user import User

logger = logging.getLogger(__name__)


@dataclass
class WorkOrderFilter:
    q: str | None = None
    order_type: str | None = None
    status: str | None = None
    priority: str | None = None
    forklift_id: int | None = None
    assigned_to: int | None = None
    is_active: bool | None = True
    scheduled_from: datetime | None = None
    scheduled_to: datetime | None = None
    page: int = 1
    page_size: int = 20
    sort: str = "scheduled_date"
    order: str = "asc"


class MaintenanceRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Plans ────────────────────────────────────────────────────────────────

    async def get_plans(self, is_active: bool | None = True) -> list[MaintenancePlan]:
        stmt = select(MaintenancePlan).order_by(MaintenancePlan.name)
        if is_active is not None:
            stmt = stmt.where(MaintenancePlan.is_active == is_active)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_plan_by_id(self, plan_id: int) -> MaintenancePlan | None:
        return await self.db.get(MaintenancePlan, plan_id)

    async def plan_number_exists(self, number: str) -> bool:
        result = await self.db.execute(
            select(MaintenancePlan.id).where(MaintenancePlan.plan_number == number)
        )
        return result.scalar_one_or_none() is not None

    async def create_plan(self, plan: MaintenancePlan) -> MaintenancePlan:
        self.db.add(plan)
        try:
            await self.db.flush()
            await self.db.refresh(plan)
            return plan
        except IntegrityError:
            await self.db.rollback()
            raise

    async def update_plan(self, plan: MaintenancePlan, changes: dict) -> MaintenancePlan:
        for k, v in changes.items():
            setattr(plan, k, v)
        await self.db.flush()
        await self.db.refresh(plan)
        return plan

    # ── Schedules ────────────────────────────────────────────────────────────

    async def get_schedules(self, forklift_id: int | None = None, is_active: bool | None = True) -> list[MaintenanceSchedule]:
        stmt = (
            select(MaintenanceSchedule)
            .options(
                selectinload(MaintenanceSchedule.forklift),
                selectinload(MaintenanceSchedule.plan),
            )
            .order_by(MaintenanceSchedule.next_due_date.asc())
        )
        if forklift_id is not None:
            stmt = stmt.where(MaintenanceSchedule.forklift_id == forklift_id)
        if is_active is not None:
            stmt = stmt.where(MaintenanceSchedule.is_active == is_active)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_schedule_by_id(self, schedule_id: int) -> MaintenanceSchedule | None:
        result = await self.db.execute(
            select(MaintenanceSchedule)
            .options(
                selectinload(MaintenanceSchedule.forklift),
                selectinload(MaintenanceSchedule.plan),
            )
            .where(MaintenanceSchedule.id == schedule_id)
        )
        return result.scalar_one_or_none()

    async def create_schedule(self, schedule: MaintenanceSchedule) -> MaintenanceSchedule:
        self.db.add(schedule)
        await self.db.flush()
        await self.db.refresh(schedule)
        return schedule

    async def update_schedule(self, schedule: MaintenanceSchedule, changes: dict) -> MaintenanceSchedule:
        for k, v in changes.items():
            setattr(schedule, k, v)
        await self.db.flush()
        await self.db.refresh(schedule)
        return schedule

    async def get_overdue_schedules(self, today: date) -> list[MaintenanceSchedule]:
        result = await self.db.execute(
            select(MaintenanceSchedule)
            .options(selectinload(MaintenanceSchedule.forklift), selectinload(MaintenanceSchedule.plan))
            .where(
                and_(
                    MaintenanceSchedule.is_active == True,  # noqa: E712
                    MaintenanceSchedule.status == "active",
                    MaintenanceSchedule.next_due_date <= today,
                )
            )
            .order_by(MaintenanceSchedule.next_due_date.asc())
        )
        return list(result.scalars().all())

    # ── Technicians ──────────────────────────────────────────────────────────

    async def get_active_users(self) -> list[User]:
        result = await self.db.execute(
            select(User).where(User.is_active == True).order_by(User.full_name, User.username)  # noqa: E712
        )
        return list(result.scalars().all())

    # ── Work Orders ──────────────────────────────────────────────────────────

    async def get_work_order_by_id(self, wo_id: int) -> WorkOrder | None:
        result = await self.db.execute(
            select(WorkOrder)
            .options(
                selectinload(WorkOrder.forklift).selectinload(Forklift.customer),
                selectinload(WorkOrder.schedule),
                selectinload(WorkOrder.plan),
                selectinload(WorkOrder.technician),
            )
            .where(WorkOrder.id == wo_id)
        )
        return result.scalar_one_or_none()

    async def get_work_order_detail(self, wo_id: int) -> WorkOrder | None:
        result = await self.db.execute(
            select(WorkOrder)
            .options(
                selectinload(WorkOrder.forklift),
                selectinload(WorkOrder.schedule),
                selectinload(WorkOrder.plan),
                selectinload(WorkOrder.technician),
                selectinload(WorkOrder.verifier),
                selectinload(WorkOrder.costs),
            )
            .where(WorkOrder.id == wo_id)
        )
        return result.scalar_one_or_none()

    async def get_work_orders(self, f: WorkOrderFilter) -> tuple[list[WorkOrder], int]:
        stmt = (
            select(WorkOrder)
            .options(
                selectinload(WorkOrder.forklift),
                selectinload(WorkOrder.schedule),
                selectinload(WorkOrder.plan),
                selectinload(WorkOrder.technician),
            )
        )
        stmt = self._apply_wo_filters(stmt, f)

        count_stmt = select(func.count(WorkOrder.id))
        count_stmt = self._apply_wo_filters(count_stmt, f)
        total = (await self.db.execute(count_stmt)).scalar_one()

        sort_col = {
            "scheduled_date": WorkOrder.scheduled_date,
            "created_at": WorkOrder.created_at,
            "priority": WorkOrder.priority,
            "status": WorkOrder.status,
            "work_order_number": WorkOrder.work_order_number,
        }.get(f.sort, WorkOrder.scheduled_date)
        stmt = stmt.order_by(sort_col.asc() if f.order == "asc" else sort_col.desc())
        stmt = stmt.offset((f.page - 1) * f.page_size).limit(f.page_size)

        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    def _apply_wo_filters(self, stmt, f: WorkOrderFilter):
        if f.is_active is not None:
            stmt = stmt.where(WorkOrder.is_active == f.is_active)
        if f.order_type:
            stmt = stmt.where(WorkOrder.order_type == f.order_type)
        if f.status:
            stmt = stmt.where(WorkOrder.status == f.status)
        if f.priority:
            stmt = stmt.where(WorkOrder.priority == f.priority)
        if f.forklift_id:
            stmt = stmt.where(WorkOrder.forklift_id == f.forklift_id)
        if f.assigned_to:
            stmt = stmt.where(WorkOrder.assigned_to == f.assigned_to)
        if f.scheduled_from:
            stmt = stmt.where(WorkOrder.scheduled_date >= f.scheduled_from)
        if f.scheduled_to:
            stmt = stmt.where(WorkOrder.scheduled_date <= f.scheduled_to)
        if f.q:
            pattern = f"%{f.q}%"
            stmt = stmt.where(or_(
                WorkOrder.work_order_number.ilike(pattern),
                WorkOrder.title.ilike(pattern),
            ))
        return stmt

    async def wo_number_exists(self, number: str) -> bool:
        result = await self.db.execute(
            select(WorkOrder.id).where(WorkOrder.work_order_number == number)
        )
        return result.scalar_one_or_none() is not None

    async def create_work_order(self, wo: WorkOrder) -> WorkOrder:
        self.db.add(wo)
        try:
            await self.db.flush()
            await self.db.refresh(wo)
            return wo
        except IntegrityError:
            await self.db.rollback()
            raise

    async def update_work_order(self, wo: WorkOrder, changes: dict) -> WorkOrder:
        for k, v in changes.items():
            setattr(wo, k, v)
        await self.db.flush()
        # Scope the refresh to just the changed columns so already-loaded
        # relationships (e.g. .forklift) aren't expired out from under callers.
        await self.db.refresh(wo, attribute_names=list(changes.keys()))
        return wo

    # ── Costs ────────────────────────────────────────────────────────────────

    async def add_cost(self, cost: MaintenanceCost) -> MaintenanceCost:
        self.db.add(cost)
        await self.db.flush()
        await self.db.refresh(cost)
        return cost

    async def get_costs_for_work_order(self, wo_id: int) -> list[MaintenanceCost]:
        result = await self.db.execute(
            select(MaintenanceCost)
            .where(MaintenanceCost.work_order_id == wo_id)
            .order_by(MaintenanceCost.id)
        )
        return list(result.scalars().all())

    async def update_cost(self, cost: MaintenanceCost, changes: dict) -> MaintenanceCost:
        # No refresh needed: MaintenanceCost has no relationships to expire
        # and no onupdate=func.now() column, unlike RentalContractItem.
        for key, value in changes.items():
            setattr(cost, key, value)
        await self.db.flush()
        return cost

    async def delete_cost(self, cost: MaintenanceCost) -> None:
        await self.db.delete(cost)
        await self.db.flush()

    async def get_wo_total_cost(self, wo_id: int) -> float:
        result = await self.db.execute(
            select(func.coalesce(func.sum(MaintenanceCost.amount), 0.0))
            .where(MaintenanceCost.work_order_id == wo_id)
        )
        return float(result.scalar_one())

    # ── Service History ──────────────────────────────────────────────────────

    async def add_service_history(self, entry: ServiceHistory) -> ServiceHistory:
        self.db.add(entry)
        await self.db.flush()
        await self.db.refresh(entry)
        return entry

    async def get_service_history(self, forklift_id: int, limit: int = 20) -> list[ServiceHistory]:
        result = await self.db.execute(
            select(ServiceHistory)
            .options(
                selectinload(ServiceHistory.forklift),
                selectinload(ServiceHistory.work_order),
                selectinload(ServiceHistory.technician),
            )
            .where(ServiceHistory.forklift_id == forklift_id)
            .order_by(ServiceHistory.service_date.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    # ── Dashboard queries ────────────────────────────────────────────────────

    async def count_active_schedules(self) -> int:
        result = await self.db.execute(
            select(func.count(MaintenanceSchedule.id))
            .where(and_(MaintenanceSchedule.is_active == True, MaintenanceSchedule.status == "active"))  # noqa: E712
        )
        return result.scalar_one()

    async def count_by_wo_status(self, status: str) -> int:
        result = await self.db.execute(
            select(func.count(WorkOrder.id))
            .where(and_(WorkOrder.is_active == True, WorkOrder.status == status))  # noqa: E712
        )
        return result.scalar_one()

    async def completed_this_month(self, today: date) -> tuple[int, float]:
        first = today.replace(day=1)
        base = and_(
            WorkOrder.is_active == True,  # noqa: E712
            WorkOrder.status.in_(["completed", "verified"]),
            WorkOrder.completed_at >= first,
        )
        count_result = await self.db.execute(select(func.count(WorkOrder.id)).where(base))
        cost_result = await self.db.execute(
            select(func.coalesce(func.sum(WorkOrder.actual_cost), 0.0)).where(base)
        )
        return count_result.scalar_one(), float(cost_result.scalar_one())
