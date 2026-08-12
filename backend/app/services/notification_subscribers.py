"""
Notification subscribers for domain events (Phase 1, Step 3).

Each handler formats a customer-facing message from the event payload and
hands it to `NotificationService.send()`, which handles the WhatsApp→Email
fallback and persists the delivery record. Handlers never raise — a missing
contact detail just means the notification is skipped and logged, not a
failure of the domain action that triggered the event.
"""
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.events import event_bus
from app.models.rental_contract import RentalContract
from app.models.work_order import WorkOrder
from app.schemas.notification import NotificationCreate
from app.services.notification_service import NotificationService

logger = logging.getLogger("app.events.notifications")


async def _notify(
    db: AsyncSession,
    *,
    phone: str | None,
    email: str | None,
    subject: str,
    message: str,
    event_type: str,
    entity_type: str,
    entity_id: int,
) -> None:
    if not phone and not email:
        logger.info(
            "Skipping %s notification for %s #%s — no contact info on file",
            event_type, entity_type, entity_id,
        )
        return
    await NotificationService(db).send(
        NotificationCreate(
            recipient_phone=phone,
            recipient_email=email,
            subject=subject,
            message=message,
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
        )
    )


async def on_rental_activated(db: AsyncSession, contract: RentalContract, **_: object) -> None:
    customer = contract.customer
    start = contract.actual_start_date or contract.start_date
    message = (
        f"Hi {customer.first_name}, your rental contract {contract.contract_number} "
        f"is now active. Rental period: {start} to {contract.end_date}. "
        f"Total value: {contract.total_value:,.0f} {contract.currency}."
    )
    await _notify(
        db,
        phone=customer.phone,
        email=customer.email,
        subject=f"Rental Contract {contract.contract_number} Activated",
        message=message,
        event_type="rental.activated",
        entity_type="rental_contract",
        entity_id=contract.id,
    )


async def on_work_order_completed(db: AsyncSession, work_order: WorkOrder, **_: object) -> None:
    forklift = work_order.forklift
    customer = forklift.customer if forklift else None
    if customer is None:
        logger.info(
            "Skipping work_order.completed notification for WO #%s — no linked customer",
            work_order.id,
        )
        return

    message = (
        f"Hi {customer.first_name}, work order {work_order.work_order_number} "
        f'"{work_order.title}" for {forklift.serial_number} has been completed.'
    )
    await _notify(
        db,
        phone=customer.phone,
        email=customer.email,
        subject=f"Work Order {work_order.work_order_number} Completed",
        message=message,
        event_type="work_order.completed",
        entity_type="work_order",
        entity_id=work_order.id,
    )


def register_notification_subscribers() -> None:
    event_bus.subscribe("rental.activated", on_rental_activated)
    event_bus.subscribe("work_order.completed", on_work_order_completed)
