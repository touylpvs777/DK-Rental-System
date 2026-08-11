from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.events import event_bus
from app.models.forklift import Forklift
from app.models.maintenance_plan import MaintenancePlan
from app.models.maintenance_schedule import MaintenanceSchedule
from app.models.scheduler_lock import SchedulerLock
from app.models.work_order import WorkOrder
from app.scheduler import LOCK_STALE_AFTER, PM_SCAN_JOB, pm_scan

pytestmark = pytest.mark.anyio


async def _make_plan(db: AsyncSession, **overrides) -> MaintenancePlan:
    plan = MaintenancePlan(
        plan_number=overrides.pop("plan_number", "PM-TEST-0001"),
        name=overrides.pop("name", "500-Hour Service"),
        service_type="preventive",
        interval_type=overrides.pop("interval_type", "hours"),
        interval_value=overrides.pop("interval_value", 500),
        estimated_duration_hours=2.0,
        estimated_cost=150.0,
        **overrides,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


async def _make_forklift(db: AsyncSession, *, serial: str, hour_meter: float = 0.0) -> Forklift:
    forklift = Forklift(
        serial_number=serial, slug=serial.lower(), name_en="Toyota 8FG25",
        current_hour_meter=hour_meter,
    )
    db.add(forklift)
    await db.commit()
    await db.refresh(forklift)
    return forklift


async def _make_schedule(
    db: AsyncSession, *, forklift: Forklift, plan: MaintenancePlan,
    next_due_date: date | None = None, next_due_hours: float | None = None,
    status: str = "active", is_active: bool = True,
) -> MaintenanceSchedule:
    schedule = MaintenanceSchedule(
        forklift_id=forklift.id, plan_id=plan.id,
        status=status, is_active=is_active,
        next_due_date=next_due_date, next_due_hours=next_due_hours,
    )
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)
    return schedule


async def _work_orders_for_schedule(db: AsyncSession, schedule_id: int) -> list[WorkOrder]:
    result = await db.execute(select(WorkOrder).where(WorkOrder.schedule_id == schedule_id))
    return list(result.scalars().all())


# ── Due detection ─────────────────────────────────────────────────────────────


async def test_pm_scan_creates_work_order_for_date_due_schedule(db_session: AsyncSession):
    forklift = await _make_forklift(db_session, serial="FL-PM-001")
    plan = await _make_plan(db_session, plan_number="PM-TEST-0001")
    schedule = await _make_schedule(
        db_session, forklift=forklift, plan=plan,
        next_due_date=date.today() - timedelta(days=1),
    )

    created = await pm_scan(db_session)

    assert created == 1
    work_orders = await _work_orders_for_schedule(db_session, schedule.id)
    assert len(work_orders) == 1
    wo = work_orders[0]
    assert wo.order_type == "preventive"
    assert wo.status == "scheduled"
    assert wo.forklift_id == forklift.id
    assert wo.plan_id == plan.id


async def test_pm_scan_creates_work_order_for_hours_due_schedule(db_session: AsyncSession):
    forklift = await _make_forklift(db_session, serial="FL-PM-002", hour_meter=600.0)
    plan = await _make_plan(db_session, plan_number="PM-TEST-0002")
    schedule = await _make_schedule(
        db_session, forklift=forklift, plan=plan,
        next_due_date=None, next_due_hours=500.0,
    )

    created = await pm_scan(db_session)

    assert created == 1
    work_orders = await _work_orders_for_schedule(db_session, schedule.id)
    assert len(work_orders) == 1


async def test_pm_scan_skips_schedule_not_yet_due(db_session: AsyncSession):
    forklift = await _make_forklift(db_session, serial="FL-PM-003", hour_meter=100.0)
    plan = await _make_plan(db_session, plan_number="PM-TEST-0003")
    schedule = await _make_schedule(
        db_session, forklift=forklift, plan=plan,
        next_due_date=date.today() + timedelta(days=30),
        next_due_hours=500.0,  # not reached (forklift at 100)
    )

    created = await pm_scan(db_session)

    assert created == 0
    assert await _work_orders_for_schedule(db_session, schedule.id) == []


async def test_pm_scan_skips_inactive_and_non_active_status_schedules(db_session: AsyncSession):
    forklift = await _make_forklift(db_session, serial="FL-PM-004")
    plan = await _make_plan(db_session, plan_number="PM-TEST-0004")
    await _make_schedule(
        db_session, forklift=forklift, plan=plan,
        next_due_date=date.today() - timedelta(days=1), is_active=False,
    )

    forklift2 = await _make_forklift(db_session, serial="FL-PM-005")
    plan2 = await _make_plan(db_session, plan_number="PM-TEST-0005")
    await _make_schedule(
        db_session, forklift=forklift2, plan=plan2,
        next_due_date=date.today() - timedelta(days=1), status="paused",
    )

    created = await pm_scan(db_session)

    assert created == 0


async def test_pm_scan_skips_schedule_with_existing_open_work_order(db_session: AsyncSession):
    forklift = await _make_forklift(db_session, serial="FL-PM-006")
    plan = await _make_plan(db_session, plan_number="PM-TEST-0006")
    schedule = await _make_schedule(
        db_session, forklift=forklift, plan=plan,
        next_due_date=date.today() - timedelta(days=1),
    )
    db_session.add(WorkOrder(
        work_order_number="WO-EXISTING-001",
        forklift_id=forklift.id, schedule_id=schedule.id,
        order_type="preventive", status="in_progress",
        title="Already in progress", scheduled_date=datetime.now(),
    ))
    await db_session.commit()

    created = await pm_scan(db_session)

    assert created == 0
    work_orders = await _work_orders_for_schedule(db_session, schedule.id)
    assert len(work_orders) == 1  # still just the pre-existing one, no duplicate


# ── Event emission ────────────────────────────────────────────────────────────


async def test_pm_scan_emits_work_order_created_event(db_session: AsyncSession):
    forklift = await _make_forklift(db_session, serial="FL-PM-007")
    plan = await _make_plan(db_session, plan_number="PM-TEST-0007")
    schedule = await _make_schedule(
        db_session, forklift=forklift, plan=plan,
        next_due_date=date.today() - timedelta(days=1),
    )

    received = []

    async def capture(**payload):
        received.append(payload)

    event_bus.subscribe("work_order.created", capture)
    try:
        await pm_scan(db_session)
    finally:
        event_bus._subscribers["work_order.created"].remove(capture)

    assert len(received) == 1
    assert received[0]["schedule"].id == schedule.id
    assert received[0]["work_order"].schedule_id == schedule.id


# ── Concurrency / locking ─────────────────────────────────────────────────────


async def test_pm_scan_skips_run_when_lock_already_held(db_session: AsyncSession):
    forklift = await _make_forklift(db_session, serial="FL-PM-008")
    plan = await _make_plan(db_session, plan_number="PM-TEST-0008")
    schedule = await _make_schedule(
        db_session, forklift=forklift, plan=plan,
        next_due_date=date.today() - timedelta(days=1),
    )
    db_session.add(SchedulerLock(job_name=PM_SCAN_JOB, locked_at=datetime.now(UTC)))
    await db_session.commit()

    created = await pm_scan(db_session)

    assert created == 0
    assert await _work_orders_for_schedule(db_session, schedule.id) == []


async def test_pm_scan_reclaims_stale_lock(db_session: AsyncSession):
    forklift = await _make_forklift(db_session, serial="FL-PM-009")
    plan = await _make_plan(db_session, plan_number="PM-TEST-0009")
    schedule = await _make_schedule(
        db_session, forklift=forklift, plan=plan,
        next_due_date=date.today() - timedelta(days=1),
    )
    stale_time = datetime.now(UTC) - LOCK_STALE_AFTER - timedelta(minutes=1)
    db_session.add(SchedulerLock(job_name=PM_SCAN_JOB, locked_at=stale_time))
    await db_session.commit()

    created = await pm_scan(db_session)

    assert created == 1
    assert len(await _work_orders_for_schedule(db_session, schedule.id)) == 1


async def test_pm_scan_releases_lock_after_completion(db_session: AsyncSession):
    await pm_scan(db_session)

    lock = await db_session.get(SchedulerLock, PM_SCAN_JOB)
    assert lock is not None
    assert lock.locked_at is None  # released, ready for the next scheduled run

    # A second run immediately after should be able to acquire the lock again.
    second_run_created = await pm_scan(db_session)
    assert second_run_created == 0  # nothing due, but proves the lock wasn't stuck
