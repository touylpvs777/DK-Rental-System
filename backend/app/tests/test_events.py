from datetime import date, datetime

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.events import EventBus, event_bus
from app.models.customer import Customer
from app.models.forklift import Forklift
from app.models.notification import Notification
from app.models.quotation import Quotation
from app.models.rental_contract import RentalContract
from app.models.work_order import WorkOrder
from app.services.maintenance_service import MaintenanceService
from app.services.notification_service import WhatsAppAdapter
from app.schemas.maintenance import CompleteAction
from app.schemas.rental import ActivateContractAction
from app.services.quotation_workflow_service import QuotationWorkflowService
from app.services.rental_workflow_service import RentalWorkflowService

pytestmark = pytest.mark.anyio


@pytest.fixture(autouse=True)
def _mock_whatsapp_success(monkeypatch):
    """All event-driven notifications in this file go through WhatsApp — mock it to succeed."""
    async def fake_send(self, recipient, message, subject=None):
        return "wamid.EVENTTEST"

    monkeypatch.setattr(WhatsAppAdapter, "send", fake_send)


async def _notifications_for(db: AsyncSession, event_type: str) -> list[Notification]:
    result = await db.execute(select(Notification).where(Notification.event_type == event_type))
    return list(result.scalars().all())


# ── EventBus unit behavior ───────────────────────────────────────────────────


async def test_event_bus_invokes_subscribed_handler():
    bus = EventBus()
    received = {}

    async def handler(**payload):
        received.update(payload)

    bus.subscribe("test.event", handler)
    await bus.emit("test.event", foo="bar")

    assert received == {"foo": "bar"}


async def test_event_bus_swallows_handler_errors_and_still_calls_others():
    bus = EventBus()
    calls = []

    async def failing_handler(**_):
        raise RuntimeError("boom")

    async def other_handler(**_):
        calls.append("other")

    bus.subscribe("test.event", failing_handler)
    bus.subscribe("test.event", other_handler)

    await bus.emit("test.event")  # must not raise

    assert calls == ["other"]


# ── rental.activated ─────────────────────────────────────────────────────────


async def test_activating_rental_contract_triggers_notification(db_session: AsyncSession):
    customer = Customer(first_name="Somchai", last_name="Vong", phone="+8562099999999")
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)

    contract = RentalContract(
        contract_number="RC-EVT-001",
        customer_id=customer.id,
        status="approved",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
        total_value=5000.0,
        currency="LAK",
    )
    db_session.add(contract)
    await db_session.commit()
    await db_session.refresh(contract)

    await RentalWorkflowService(db_session).activate(
        contract.id, ActivateContractAction(), user_id=1,
    )

    notifications = await _notifications_for(db_session, "rental.activated")
    assert len(notifications) == 1
    assert notifications[0].status == "sent"
    assert notifications[0].channel == "whatsapp"
    assert notifications[0].recipient == "+8562099999999"
    assert notifications[0].entity_type == "rental_contract"
    assert notifications[0].entity_id == contract.id


# ── work_order.completed ─────────────────────────────────────────────────────


async def test_completing_work_order_triggers_notification(db_session: AsyncSession):
    customer = Customer(first_name="Bounmy", last_name="Sisavath", phone="+8562088888888")
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)

    forklift = Forklift(
        serial_number="FL-EVT-001", slug="fl-evt-001", name_en="Toyota 8FG25",
        customer_id=customer.id,
    )
    db_session.add(forklift)
    await db_session.commit()
    await db_session.refresh(forklift)

    work_order = WorkOrder(
        work_order_number="WO-EVT-001",
        forklift_id=forklift.id,
        order_type="preventive",
        status="in_progress",
        title="500-hour service",
        scheduled_date=datetime(2026, 3, 1),
    )
    db_session.add(work_order)
    await db_session.commit()
    await db_session.refresh(work_order)

    await MaintenanceService(db_session).complete_work_order(
        work_order.id, CompleteAction(actual_hours=2.5), user_id=1,
    )

    notifications = await _notifications_for(db_session, "work_order.completed")
    assert len(notifications) == 1
    assert notifications[0].status == "sent"
    assert notifications[0].recipient == "+8562088888888"
    assert notifications[0].entity_type == "work_order"
    assert notifications[0].entity_id == work_order.id


async def test_completing_work_order_without_customer_skips_notification(db_session: AsyncSession):
    forklift = Forklift(
        serial_number="FL-EVT-002", slug="fl-evt-002", name_en="Company-owned forklift",
        customer_id=None,
    )
    db_session.add(forklift)
    await db_session.commit()
    await db_session.refresh(forklift)

    work_order = WorkOrder(
        work_order_number="WO-EVT-002",
        forklift_id=forklift.id,
        order_type="preventive",
        status="in_progress",
        title="Internal check",
        scheduled_date=datetime(2026, 3, 1),
    )
    db_session.add(work_order)
    await db_session.commit()
    await db_session.refresh(work_order)

    await MaintenanceService(db_session).complete_work_order(
        work_order.id, CompleteAction(actual_hours=1.0), user_id=1,
    )

    notifications = await _notifications_for(db_session, "work_order.completed")
    assert notifications == []


# ── quotation.sent ────────────────────────────────────────────────────────────


async def test_sending_quotation_triggers_notification(db_session: AsyncSession):
    customer = Customer(
        first_name="Khamla", last_name="Phommachanh",
        phone="+8562077777777", email="khamla@example.com",
    )
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)

    quotation = Quotation(
        quotation_number="QT-EVT-001",
        quotation_type="rental",
        status="approved",
        title="Forklift rental quotation",
        customer_id=customer.id,
        total_amount=1200.0,
        currency="LAK",
    )
    db_session.add(quotation)
    await db_session.commit()
    await db_session.refresh(quotation)

    await QuotationWorkflowService(db_session).send(quotation.id, reason=None, user_id=1)

    notifications = await _notifications_for(db_session, "quotation.sent")
    assert len(notifications) == 1
    assert notifications[0].status == "sent"
    assert notifications[0].recipient == "+8562077777777"
    assert notifications[0].entity_type == "quotation"
    assert notifications[0].entity_id == quotation.id


async def test_notification_subscribers_registered_on_shared_event_bus():
    # The app registers subscribers at import time (app.main); verify they're on the shared bus.
    assert len(event_bus._subscribers["rental.activated"]) >= 1
    assert len(event_bus._subscribers["work_order.completed"]) >= 1
    assert len(event_bus._subscribers["quotation.sent"]) >= 1
