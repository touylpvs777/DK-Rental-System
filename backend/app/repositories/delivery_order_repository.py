import logging
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.delivery_checklist import DeliveryChecklist
from app.models.delivery_order import DeliveryOrder
from app.models.rental_contract import RentalContract

logger = logging.getLogger(__name__)


@dataclass
class DeliveryOrderFilter:
    q: str | None = None
    status: str | None = None
    contract_id: int | None = None
    page: int = 1
    page_size: int = 20


class DeliveryOrderRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def _with_relations(stmt):
        return stmt.options(
            selectinload(DeliveryOrder.contract).selectinload(RentalContract.customer),
            selectinload(DeliveryOrder.creator),
            selectinload(DeliveryOrder.checklist_items),
        )

    async def get_by_id(self, delivery_order_id: int) -> DeliveryOrder | None:
        result = await self.db.execute(
            self._with_relations(select(DeliveryOrder)).where(DeliveryOrder.id == delivery_order_id)
        )
        return result.scalar_one_or_none()

    async def number_exists(self, do_no: str) -> bool:
        result = await self.db.execute(
            select(DeliveryOrder.id).where(DeliveryOrder.do_no == do_no)
        )
        return result.scalar_one_or_none() is not None

    async def get_all(self, f: DeliveryOrderFilter) -> tuple[list[DeliveryOrder], int]:
        stmt = self._with_relations(select(DeliveryOrder))
        count_stmt = select(func.count(DeliveryOrder.id))

        if f.q:
            like = f"%{f.q}%"
            stmt = stmt.where(DeliveryOrder.do_no.ilike(like))
            count_stmt = count_stmt.where(DeliveryOrder.do_no.ilike(like))
        if f.status:
            stmt = stmt.where(DeliveryOrder.status == f.status)
            count_stmt = count_stmt.where(DeliveryOrder.status == f.status)
        if f.contract_id:
            stmt = stmt.where(DeliveryOrder.contract_id == f.contract_id)
            count_stmt = count_stmt.where(DeliveryOrder.contract_id == f.contract_id)

        total = (await self.db.execute(count_stmt)).scalar_one()

        stmt = (
            stmt.order_by(DeliveryOrder.created_at.desc())
            .offset((f.page - 1) * f.page_size)
            .limit(f.page_size)
        )
        items = list((await self.db.execute(stmt)).scalars().all())
        return items, total

    async def create(self, delivery_order: DeliveryOrder) -> DeliveryOrder:
        self.db.add(delivery_order)
        try:
            await self.db.flush()
            await self.db.refresh(delivery_order)
            logger.info("Delivery order created: id=%s number=%s", delivery_order.id, delivery_order.do_no)
            return delivery_order
        except IntegrityError:
            await self.db.rollback()
            raise

    async def update(self, delivery_order: DeliveryOrder, changes: dict) -> DeliveryOrder:
        for key, value in changes.items():
            setattr(delivery_order, key, value)
        await self.db.flush()
        await self.db.refresh(delivery_order)
        logger.info("Delivery order updated: id=%s", delivery_order.id)
        return delivery_order

    async def delete(self, delivery_order: DeliveryOrder) -> None:
        await self.db.delete(delivery_order)
        await self.db.flush()
        logger.info("Delivery order deleted: id=%s", delivery_order.id)

    async def replace_checklist_items(self, delivery_order: DeliveryOrder, items: list[DeliveryChecklist]) -> None:
        # Mutate the relationship collection itself rather than calling
        # session.delete() on each child directly — the collection has
        # cascade="all, delete-orphan", so clearing it queues the deletes,
        # and appending the replacements keeps the in-memory collection (and
        # anything re-reading `delivery_order.checklist_items` afterward,
        # including the identity-mapped object this same request returns)
        # consistent with the DB. Deleting children out-of-band leaves the
        # parent's already-loaded collection stale in the session's identity
        # map, which a later selectinload query won't overwrite.
        delivery_order.checklist_items.clear()
        await self.db.flush()
        delivery_order.checklist_items.extend(items)
        await self.db.flush()
