import logging
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.events import event_bus
from app.models.quotation import Quotation, QuotationStatus
from app.models.quotation_approval import QuotationApproval
from app.models.quotation_status_history import QuotationStatusHistory
from app.repositories.quotation_repository import QuotationRepository

logger = logging.getLogger(__name__)

VALID_TRANSITIONS: dict[str, set[str]] = {
    QuotationStatus.DRAFT.value: {
        QuotationStatus.UNDER_REVIEW.value,
        QuotationStatus.CANCELLED.value,
    },
    QuotationStatus.UNDER_REVIEW.value: {
        QuotationStatus.APPROVED.value,
        QuotationStatus.REVISION.value,
        QuotationStatus.CANCELLED.value,
    },
    QuotationStatus.APPROVED.value: {
        QuotationStatus.SENT.value,
        QuotationStatus.CANCELLED.value,
    },
    QuotationStatus.REVISION.value: {
        QuotationStatus.DRAFT.value,
        QuotationStatus.CANCELLED.value,
    },
    QuotationStatus.SENT.value: {
        QuotationStatus.ACCEPTED.value,
        QuotationStatus.REJECTED.value,
        QuotationStatus.EXPIRED.value,
        QuotationStatus.CANCELLED.value,
    },
    QuotationStatus.ACCEPTED.value: {
        QuotationStatus.CONVERTED.value,
    },
    QuotationStatus.EXPIRED.value: {
        QuotationStatus.DRAFT.value,
    },
    QuotationStatus.REJECTED.value: set(),
    QuotationStatus.CONVERTED.value: set(),
    QuotationStatus.CANCELLED.value: set(),
}


class QuotationWorkflowService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = QuotationRepository(db)

    async def submit(self, quotation_id: int, reason: str | None, user_id: int) -> Quotation:
        quotation = await self._require(quotation_id)
        self._validate_transition(quotation.status, QuotationStatus.UNDER_REVIEW.value)

        item_count = await self._repo.get_item_count(quotation_id)
        if item_count == 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Cannot submit quotation with no line items.",
            )

        return await self._transition(
            quotation, QuotationStatus.UNDER_REVIEW.value, reason, user_id,
        )

    async def approve(
        self, quotation_id: int, reason: str | None, conditions: str | None, user_id: int,
    ) -> Quotation:
        quotation = await self._require(quotation_id)
        self._validate_transition(quotation.status, QuotationStatus.APPROVED.value)

        await self._repo.add_approval(QuotationApproval(
            quotation_id=quotation_id,
            revision_number=quotation.revision_number,
            decision="approved",
            reason=reason,
            conditions=conditions,
            decided_by=user_id,
        ))

        return await self._transition(
            quotation, QuotationStatus.APPROVED.value, reason, user_id,
        )

    async def reject(self, quotation_id: int, reason: str | None, user_id: int) -> Quotation:
        quotation = await self._require(quotation_id)
        self._validate_transition(quotation.status, QuotationStatus.REVISION.value)

        await self._repo.add_approval(QuotationApproval(
            quotation_id=quotation_id,
            revision_number=quotation.revision_number,
            decision="rejected",
            reason=reason,
            decided_by=user_id,
        ))

        quotation = await self._transition(
            quotation, QuotationStatus.REVISION.value, reason, user_id,
        )
        await self._repo.update(quotation, {
            "status": QuotationStatus.DRAFT.value,
            "revision_number": quotation.revision_number + 1,
        })
        await self._repo.add_status_history(QuotationStatusHistory(
            quotation_id=quotation_id,
            from_status=QuotationStatus.REVISION.value,
            to_status=QuotationStatus.DRAFT.value,
            reason="Auto-reverted to draft for revision",
            changed_by=user_id,
        ))

        await self.db.commit()
        return await self._repo.get_by_id(quotation_id)

    async def send(self, quotation_id: int, reason: str | None, user_id: int) -> Quotation:
        quotation = await self._require(quotation_id)
        self._validate_transition(quotation.status, QuotationStatus.SENT.value)

        if quotation.customer_id is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Customer is required before sending.",
            )

        if quotation.valid_until is None:
            from datetime import timedelta
            await self._repo.update(quotation, {
                "valid_from": quotation.valid_from or date.today(),
                "valid_until": date.today() + timedelta(days=30),
            })

        quotation = await self._transition(
            quotation, QuotationStatus.SENT.value, reason, user_id,
        )
        await event_bus.emit("quotation.sent", db=self.db, quotation=quotation)
        return quotation

    async def accept(self, quotation_id: int, reason: str | None, user_id: int) -> Quotation:
        quotation = await self._require(quotation_id)
        self._validate_transition(quotation.status, QuotationStatus.ACCEPTED.value)
        return await self._transition(
            quotation, QuotationStatus.ACCEPTED.value, reason, user_id,
        )

    async def decline(self, quotation_id: int, reason: str | None, user_id: int) -> Quotation:
        quotation = await self._require(quotation_id)
        self._validate_transition(quotation.status, QuotationStatus.REJECTED.value)
        return await self._transition(
            quotation, QuotationStatus.REJECTED.value, reason, user_id,
        )

    async def convert(
        self, quotation_id: int, converted_to_type: str, notes: str | None, user_id: int,
    ) -> Quotation:
        quotation = await self._require(quotation_id)
        self._validate_transition(quotation.status, QuotationStatus.CONVERTED.value)

        await self._repo.update(quotation, {
            "converted_to_type": converted_to_type,
        })

        return await self._transition(
            quotation, QuotationStatus.CONVERTED.value, notes, user_id,
        )

    async def cancel(self, quotation_id: int, reason: str | None, user_id: int) -> Quotation:
        quotation = await self._require(quotation_id)
        self._validate_transition(quotation.status, QuotationStatus.CANCELLED.value)
        return await self._transition(
            quotation, QuotationStatus.CANCELLED.value, reason, user_id,
        )

    async def reactivate(self, quotation_id: int, reason: str | None, user_id: int) -> Quotation:
        quotation = await self._require(quotation_id)
        self._validate_transition(quotation.status, QuotationStatus.DRAFT.value)

        await self._repo.update(quotation, {
            "status": QuotationStatus.DRAFT.value,
            "revision_number": quotation.revision_number + 1,
        })
        await self._repo.add_status_history(QuotationStatusHistory(
            quotation_id=quotation_id,
            from_status=QuotationStatus.EXPIRED.value,
            to_status=QuotationStatus.DRAFT.value,
            reason=reason or "Reactivated",
            changed_by=user_id,
        ))
        await self.db.commit()
        return await self._repo.get_by_id(quotation_id)

    # ── Internal ─────────────────────────────────────────────────────────────

    async def _transition(
        self, quotation: Quotation, to_status: str, reason: str | None, user_id: int,
    ) -> Quotation:
        old_status = quotation.status
        await self._repo.update(quotation, {
            "status": to_status,
            "updated_by": user_id,
        })
        await self._repo.add_status_history(QuotationStatusHistory(
            quotation_id=quotation.id,
            from_status=old_status,
            to_status=to_status,
            reason=reason,
            changed_by=user_id,
        ))
        await self.db.commit()
        # `_repo.update()`'s partial `db.refresh(..., attribute_names=[...])`
        # expires every OTHER attribute/relationship on the object — re-fetch
        # with full eager-loading so callers can safely serialize the result
        # (e.g. `QuotationOut.model_validate(...)`) without an implicit
        # lazy-load outside the async greenlet context (MissingGreenlet).
        return await self._repo.get_by_id(quotation.id)

    async def _require(self, quotation_id: int) -> Quotation:
        quotation = await self._repo.get_by_id(quotation_id)
        if quotation is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found")
        return quotation

    @staticmethod
    def _validate_transition(from_status: str, to_status: str) -> None:
        allowed = VALID_TRANSITIONS.get(from_status, set())
        if to_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Invalid action: cannot transition from '{from_status}' to '{to_status}'.",
            )
