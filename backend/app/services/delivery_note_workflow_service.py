import logging

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.delivery_note import DeliveryNote, DeliveryNoteStatus
from app.models.delivery_note_status_history import DeliveryNoteStatusHistory
from app.repositories.delivery_note_repository import DeliveryNoteRepository

logger = logging.getLogger(__name__)

VALID_TRANSITIONS: dict[str, set[str]] = {
    DeliveryNoteStatus.DRAFT.value: {
        DeliveryNoteStatus.DISPATCHED.value,
        DeliveryNoteStatus.CANCELLED.value,
    },
    DeliveryNoteStatus.DISPATCHED.value: {
        DeliveryNoteStatus.DELIVERED.value,
        DeliveryNoteStatus.CANCELLED.value,
    },
    DeliveryNoteStatus.DELIVERED.value: set(),
    DeliveryNoteStatus.CANCELLED.value: set(),
}


class DeliveryNoteWorkflowService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = DeliveryNoteRepository(db)

    async def dispatch(self, delivery_note_id: int, reason: str | None, user_id: int) -> DeliveryNote:
        delivery_note = await self._require(delivery_note_id)
        self._validate_transition(delivery_note.status, DeliveryNoteStatus.DISPATCHED.value)

        if len(delivery_note.items) == 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Cannot dispatch a delivery note with no line items.",
            )

        return await self._transition(delivery_note, DeliveryNoteStatus.DISPATCHED.value, reason, user_id)

    async def deliver(self, delivery_note_id: int, reason: str | None, user_id: int) -> DeliveryNote:
        delivery_note = await self._require(delivery_note_id)
        self._validate_transition(delivery_note.status, DeliveryNoteStatus.DELIVERED.value)
        return await self._transition(delivery_note, DeliveryNoteStatus.DELIVERED.value, reason, user_id)

    async def cancel(self, delivery_note_id: int, reason: str | None, user_id: int) -> DeliveryNote:
        delivery_note = await self._require(delivery_note_id)
        self._validate_transition(delivery_note.status, DeliveryNoteStatus.CANCELLED.value)
        return await self._transition(delivery_note, DeliveryNoteStatus.CANCELLED.value, reason, user_id)

    # ── Internal ─────────────────────────────────────────────────────────────

    async def _transition(
        self, delivery_note: DeliveryNote, to_status: str, reason: str | None, user_id: int,
    ) -> DeliveryNote:
        old_status = delivery_note.status
        await self._repo.update(delivery_note, {
            "status": to_status,
            "updated_by": user_id,
        })
        await self._repo.add_status_history(DeliveryNoteStatusHistory(
            delivery_note_id=delivery_note.id,
            from_status=old_status,
            to_status=to_status,
            reason=reason,
            changed_by=user_id,
        ))
        await self.db.commit()
        return await self._repo.get_by_id(delivery_note.id)

    async def _require(self, delivery_note_id: int) -> DeliveryNote:
        delivery_note = await self._repo.get_by_id(delivery_note_id)
        if delivery_note is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery note not found")
        return delivery_note

    @staticmethod
    def _validate_transition(from_status: str, to_status: str) -> None:
        allowed = VALID_TRANSITIONS.get(from_status, set())
        if to_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Invalid action: cannot transition from '{from_status}' to '{to_status}'.",
            )
