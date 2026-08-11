import logging

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sales_order import SalesOrder, SalesOrderStatus
from app.models.sales_order_status_history import SalesOrderStatusHistory
from app.repositories.sales_order_repository import SalesOrderRepository

logger = logging.getLogger(__name__)

VALID_TRANSITIONS: dict[str, set[str]] = {
    SalesOrderStatus.DRAFT.value: {
        SalesOrderStatus.CONFIRMED.value,
        SalesOrderStatus.CANCELLED.value,
    },
    SalesOrderStatus.CONFIRMED.value: {
        SalesOrderStatus.COMPLETED.value,
        SalesOrderStatus.CANCELLED.value,
    },
    SalesOrderStatus.COMPLETED.value: set(),
    SalesOrderStatus.CANCELLED.value: set(),
}


class SalesOrderWorkflowService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = SalesOrderRepository(db)

    async def confirm(self, sales_order_id: int, reason: str | None, user_id: int) -> SalesOrder:
        sales_order = await self._require(sales_order_id)
        self._validate_transition(sales_order.status, SalesOrderStatus.CONFIRMED.value)

        item_count = len(sales_order.items)
        if item_count == 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Cannot confirm a sales order with no line items.",
            )

        return await self._transition(sales_order, SalesOrderStatus.CONFIRMED.value, reason, user_id)

    async def complete(self, sales_order_id: int, reason: str | None, user_id: int) -> SalesOrder:
        sales_order = await self._require(sales_order_id)
        self._validate_transition(sales_order.status, SalesOrderStatus.COMPLETED.value)
        return await self._transition(sales_order, SalesOrderStatus.COMPLETED.value, reason, user_id)

    async def cancel(self, sales_order_id: int, reason: str | None, user_id: int) -> SalesOrder:
        sales_order = await self._require(sales_order_id)
        self._validate_transition(sales_order.status, SalesOrderStatus.CANCELLED.value)
        return await self._transition(sales_order, SalesOrderStatus.CANCELLED.value, reason, user_id)

    # ── Internal ─────────────────────────────────────────────────────────────

    async def _transition(
        self, sales_order: SalesOrder, to_status: str, reason: str | None, user_id: int,
    ) -> SalesOrder:
        old_status = sales_order.status
        await self._repo.update(sales_order, {
            "status": to_status,
            "updated_by": user_id,
        })
        await self._repo.add_status_history(SalesOrderStatusHistory(
            sales_order_id=sales_order.id,
            from_status=old_status,
            to_status=to_status,
            reason=reason,
            changed_by=user_id,
        ))
        await self.db.commit()
        # See quotation_workflow_service._transition: a partial db.refresh()
        # expires every other attribute/relationship — re-fetch with full
        # eager loading so the route's serialization never lazy-loads outside
        # the async greenlet context (MissingGreenlet).
        return await self._repo.get_by_id(sales_order.id)

    async def _require(self, sales_order_id: int) -> SalesOrder:
        sales_order = await self._repo.get_by_id(sales_order_id)
        if sales_order is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales order not found")
        return sales_order

    @staticmethod
    def _validate_transition(from_status: str, to_status: str) -> None:
        allowed = VALID_TRANSITIONS.get(from_status, set())
        if to_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Invalid action: cannot transition from '{from_status}' to '{to_status}'.",
            )
