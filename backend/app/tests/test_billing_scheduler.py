from datetime import UTC, date, datetime, timedelta

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.events import event_bus
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.rental_billing_cycle import RentalBillingCycle
from app.models.rental_contract import RentalContract
from app.models.rental_contract_item import RentalContractItem
from app.models.scheduler_lock import SchedulerLock
from app.scheduler import BILLING_SCAN_JOB, LOCK_STALE_AFTER, billing_scan

pytestmark = pytest.mark.anyio


async def _make_customer(db: AsyncSession, **overrides) -> Customer:
    customer = Customer(
        first_name=overrides.pop("first_name", "Somchai"),
        last_name=overrides.pop("last_name", "Vong"),
        **overrides,
    )
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return customer


async def _make_contract(db: AsyncSession, *, customer: Customer, **overrides) -> RentalContract:
    contract = RentalContract(
        contract_number=overrides.pop("contract_number", "RC-BILL-0001"),
        customer_id=customer.id,
        status=overrides.pop("status", "active"),
        start_date=overrides.pop("start_date", date.today() - timedelta(days=40)),
        end_date=overrides.pop("end_date", date.today() + timedelta(days=365)),
        billing_cycle_day=overrides.pop("billing_cycle_day", 1),
        currency="LAK",
        **overrides,
    )
    db.add(contract)
    await db.commit()
    await db.refresh(contract)
    return contract


async def _make_item(db: AsyncSession, *, contract: RentalContract, **overrides) -> RentalContractItem:
    item = RentalContractItem(
        contract_id=contract.id,
        line_number=overrides.pop("line_number", 1),
        description=overrides.pop("description", "Toyota 8FG25 forklift rental"),
        monthly_rate=overrides.pop("monthly_rate", 3000.0),
        daily_rate=overrides.pop("daily_rate", 150.0),
        **overrides,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


async def _billing_cycles_for_contract(db: AsyncSession, contract_id: int) -> list[RentalBillingCycle]:
    result = await db.execute(
        select(RentalBillingCycle).where(RentalBillingCycle.contract_id == contract_id)
    )
    return list(result.scalars().all())


async def _invoices_for_contract(db: AsyncSession, contract_id: int) -> list[Invoice]:
    result = await db.execute(select(Invoice).where(Invoice.contract_id == contract_id))
    return list(result.scalars().all())


# ── Due detection ─────────────────────────────────────────────────────────────


async def test_billing_scan_creates_cycle_and_invoice_for_due_contract(db_session: AsyncSession):
    customer = await _make_customer(db_session)
    contract = await _make_contract(db_session, customer=customer)
    await _make_item(db_session, contract=contract)

    created = await billing_scan(db_session)

    assert created == 1
    cycles = await _billing_cycles_for_contract(db_session, contract.id)
    assert len(cycles) == 1
    assert cycles[0].payment_status == "invoiced"
    assert cycles[0].invoice_id is not None

    invoices = await _invoices_for_contract(db_session, contract.id)
    assert len(invoices) == 1
    assert invoices[0].customer_id == customer.id


async def test_billing_scan_skips_contract_with_no_items(db_session: AsyncSession):
    customer = await _make_customer(db_session)
    contract = await _make_contract(db_session, customer=customer, contract_number="RC-BILL-0002")

    created = await billing_scan(db_session)

    assert created == 0
    assert await _billing_cycles_for_contract(db_session, contract.id) == []


async def test_billing_scan_skips_non_active_contracts(db_session: AsyncSession):
    customer = await _make_customer(db_session)
    contract = await _make_contract(
        db_session, customer=customer, contract_number="RC-BILL-0003", status="draft",
    )
    await _make_item(db_session, contract=contract)

    created = await billing_scan(db_session)

    assert created == 0
    assert await _billing_cycles_for_contract(db_session, contract.id) == []


async def test_billing_scan_skips_contract_not_yet_started(db_session: AsyncSession):
    customer = await _make_customer(db_session)
    contract = await _make_contract(
        db_session, customer=customer, contract_number="RC-BILL-0004",
        start_date=date.today() + timedelta(days=10),
        end_date=date.today() + timedelta(days=400),
    )
    await _make_item(db_session, contract=contract)

    created = await billing_scan(db_session)

    assert created == 0
    assert await _billing_cycles_for_contract(db_session, contract.id) == []


async def test_billing_scan_does_not_double_bill_same_period(db_session: AsyncSession):
    customer = await _make_customer(db_session)
    # Started a few days ago, so the first monthly period's window still
    # extends well past "today" — the second run must find nothing newly due.
    contract = await _make_contract(
        db_session, customer=customer, contract_number="RC-BILL-0005",
        start_date=date.today() - timedelta(days=3),
    )
    await _make_item(db_session, contract=contract)

    first_run = await billing_scan(db_session)
    second_run = await billing_scan(db_session)

    assert first_run == 1
    # The next period's start is in the future relative to "today" in this
    # test, so the second run finds nothing newly due.
    assert second_run == 0
    assert len(await _billing_cycles_for_contract(db_session, contract.id)) == 1


# ── Event emission ────────────────────────────────────────────────────────────


async def test_billing_scan_emits_invoice_created_event(db_session: AsyncSession):
    customer = await _make_customer(db_session)
    contract = await _make_contract(db_session, customer=customer, contract_number="RC-BILL-0006")
    await _make_item(db_session, contract=contract)

    received = []

    async def capture(**payload):
        received.append(payload)

    event_bus.subscribe("invoice.created", capture)
    try:
        await billing_scan(db_session)
    finally:
        event_bus._subscribers["invoice.created"].remove(capture)

    assert len(received) == 1
    assert received[0]["contract"].id == contract.id
    assert received[0]["invoice"].contract_id == contract.id


# ── Concurrency / locking ─────────────────────────────────────────────────────


async def test_billing_scan_skips_run_when_lock_already_held(db_session: AsyncSession):
    customer = await _make_customer(db_session)
    contract = await _make_contract(db_session, customer=customer, contract_number="RC-BILL-0007")
    await _make_item(db_session, contract=contract)
    db_session.add(SchedulerLock(job_name=BILLING_SCAN_JOB, locked_at=datetime.now(UTC)))
    await db_session.commit()

    created = await billing_scan(db_session)

    assert created == 0
    assert await _billing_cycles_for_contract(db_session, contract.id) == []


async def test_billing_scan_reclaims_stale_lock(db_session: AsyncSession):
    customer = await _make_customer(db_session)
    contract = await _make_contract(db_session, customer=customer, contract_number="RC-BILL-0008")
    await _make_item(db_session, contract=contract)
    stale_time = datetime.now(UTC) - LOCK_STALE_AFTER - timedelta(minutes=1)
    db_session.add(SchedulerLock(job_name=BILLING_SCAN_JOB, locked_at=stale_time))
    await db_session.commit()

    created = await billing_scan(db_session)

    assert created == 1
    assert len(await _billing_cycles_for_contract(db_session, contract.id)) == 1


async def test_billing_scan_releases_lock_after_completion(db_session: AsyncSession):
    await billing_scan(db_session)

    lock = await db_session.get(SchedulerLock, BILLING_SCAN_JOB)
    assert lock is not None
    assert lock.locked_at is None  # released, ready for the next scheduled run

    second_run_created = await billing_scan(db_session)
    assert second_run_created == 0  # nothing due, but proves the lock wasn't stuck
