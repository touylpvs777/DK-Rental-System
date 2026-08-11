import logging

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.receipt import Receipt, ReceiptStatus
from app.models.receipt_status_history import ReceiptStatusHistory
from app.repositories.receipt_repository import ReceiptRepository

logger = logging.getLogger(__name__)

VALID_TRANSITIONS: dict[str, set[str]] = {
    ReceiptStatus.DRAFT.value: {
        ReceiptStatus.CONFIRMED.value,
        ReceiptStatus.CANCELLED.value,
    },
    ReceiptStatus.CONFIRMED.value: {
        ReceiptStatus.CANCELLED.value,
    },
    ReceiptStatus.CANCELLED.value: set(),
}


class ReceiptWorkflowService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = ReceiptRepository(db)

    async def confirm(self, receipt_id: int, reason: str | None, user_id: int) -> Receipt:
        receipt = await self._require(receipt_id)
        self._validate_transition(receipt.status, ReceiptStatus.CONFIRMED.value)
        return await self._transition(receipt, ReceiptStatus.CONFIRMED.value, reason, user_id)

    async def cancel(self, receipt_id: int, reason: str | None, user_id: int) -> Receipt:
        receipt = await self._require(receipt_id)
        self._validate_transition(receipt.status, ReceiptStatus.CANCELLED.value)
        return await self._transition(receipt, ReceiptStatus.CANCELLED.value, reason, user_id)

    # ── Internal ─────────────────────────────────────────────────────────────

    async def _transition(
        self, receipt: Receipt, to_status: str, reason: str | None, user_id: int,
    ) -> Receipt:
        old_status = receipt.status
        await self._repo.update(receipt, {
            "status": to_status,
            "updated_by": user_id,
        })
        await self._repo.add_status_history(ReceiptStatusHistory(
            receipt_id=receipt.id,
            from_status=old_status,
            to_status=to_status,
            reason=reason,
            changed_by=user_id,
        ))
        await self.db.commit()
        return await self._repo.get_by_id(receipt.id)

    async def _require(self, receipt_id: int) -> Receipt:
        receipt = await self._repo.get_by_id(receipt_id)
        if receipt is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
        return receipt

    @staticmethod
    def _validate_transition(from_status: str, to_status: str) -> None:
        allowed = VALID_TRANSITIONS.get(from_status, set())
        if to_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Invalid action: cannot transition from '{from_status}' to '{to_status}'.",
            )
