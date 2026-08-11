import logging
from dataclasses import dataclass
from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.sales_order import SalesOrder
from app.models.sales_order_item import SalesOrderItem
from app.models.sales_order_status_history import SalesOrderStatusHistory

logger = logging.getLogger(__name__)


@dataclass
class SalesOrderFilter:
    q: str | None = None
    status: str | None = None
    customer_id: int | None = None
    quotation_id: int | None = None
    assigned_to: int | None = None
    is_active: bool | None = True
    created_from: date | None = None
    created_to: date | None = None
    page: int = 1
    page_size: int = 20
    sort: str = "created_at"
    order: str = "desc"


class SalesOrderRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, sales_order_id: int) -> SalesOrder | None:
        result = await self.db.execute(
            select(SalesOrder)
            .options(
                selectinload(SalesOrder.customer),
                selectinload(SalesOrder.quotation),
                selectinload(SalesOrder.assigned_user),
                selectinload(SalesOrder.items),
            )
            .where(SalesOrder.id == sales_order_id)
        )
        return result.scalar_one_or_none()

    async def get_detail(self, sales_order_id: int) -> SalesOrder | None:
        result = await self.db.execute(
            select(SalesOrder)
            .options(
                selectinload(SalesOrder.customer),
                selectinload(SalesOrder.quotation),
                selectinload(SalesOrder.assigned_user),
                selectinload(SalesOrder.items),
                selectinload(SalesOrder.status_history).selectinload(SalesOrderStatusHistory.user),
            )
            .where(SalesOrder.id == sales_order_id)
        )
        return result.scalar_one_or_none()

    async def get_list(self, f: SalesOrderFilter) -> tuple[list[SalesOrder], int]:
        stmt = (
            select(SalesOrder)
            .options(
                selectinload(SalesOrder.customer),
                selectinload(SalesOrder.quotation),
                selectinload(SalesOrder.assigned_user),
            )
        )
        stmt = self._apply_filters(stmt, f)

        count_stmt = select(func.count(SalesOrder.id))
        count_stmt = self._apply_filters(count_stmt, f)
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()

        sort_col = {
            "created_at": SalesOrder.created_at,
            "updated_at": SalesOrder.updated_at,
            "total_amount": SalesOrder.total_amount,
            "order_date": SalesOrder.order_date,
            "so_number": SalesOrder.so_number,
            "status": SalesOrder.status,
        }.get(f.sort, SalesOrder.created_at)

        stmt = stmt.order_by(sort_col.asc() if f.order == "asc" else sort_col.desc())

        offset = (f.page - 1) * f.page_size
        stmt = stmt.offset(offset).limit(f.page_size)

        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    def _apply_filters(self, stmt, f: SalesOrderFilter):
        if f.is_active is not None:
            stmt = stmt.where(SalesOrder.is_active == f.is_active)
        if f.status is not None:
            stmt = stmt.where(SalesOrder.status == f.status)
        if f.customer_id is not None:
            stmt = stmt.where(SalesOrder.customer_id == f.customer_id)
        if f.quotation_id is not None:
            stmt = stmt.where(SalesOrder.quotation_id == f.quotation_id)
        if f.assigned_to is not None:
            stmt = stmt.where(SalesOrder.assigned_to == f.assigned_to)
        if f.created_from is not None:
            stmt = stmt.where(SalesOrder.created_at >= f.created_from)
        if f.created_to is not None:
            stmt = stmt.where(SalesOrder.created_at <= f.created_to)
        if f.q:
            pattern = f"%{f.q}%"
            stmt = stmt.where(
                or_(
                    SalesOrder.so_number.ilike(pattern),
                    SalesOrder.title.ilike(pattern),
                )
            )
        return stmt

    async def number_exists(self, number: str) -> bool:
        result = await self.db.execute(
            select(SalesOrder.id).where(SalesOrder.so_number == number)
        )
        return result.scalar_one_or_none() is not None

    async def create(self, sales_order: SalesOrder) -> SalesOrder:
        self.db.add(sales_order)
        try:
            await self.db.flush()
            await self.db.refresh(sales_order)
            logger.info("Sales order created: id=%s number=%s", sales_order.id, sales_order.so_number)
            return sales_order
        except IntegrityError:
            await self.db.rollback()
            raise

    async def update(self, sales_order: SalesOrder, changes: dict) -> SalesOrder:
        for key, value in changes.items():
            setattr(sales_order, key, value)
        try:
            await self.db.flush()
            await self.db.refresh(sales_order, attribute_names=list(changes.keys()))
            logger.info("Sales order updated: id=%s", sales_order.id)
            return sales_order
        except IntegrityError:
            await self.db.rollback()
            raise

    async def delete(self, sales_order: SalesOrder) -> None:
        await self.db.delete(sales_order)
        await self.db.flush()
        logger.info("Sales order deleted: id=%s number=%s", sales_order.id, sales_order.so_number)

    # ── Item helpers ─────────────────────────────────────────────────────────

    async def get_item_by_id(self, item_id: int) -> SalesOrderItem | None:
        return await self.db.get(SalesOrderItem, item_id)

    async def add_item(self, item: SalesOrderItem) -> SalesOrderItem:
        self.db.add(item)
        await self.db.flush()
        await self.db.refresh(item)
        return item

    async def update_item(self, item: SalesOrderItem, changes: dict) -> SalesOrderItem:
        for key, value in changes.items():
            setattr(item, key, value)
        await self.db.flush()
        await self.db.refresh(item)
        return item

    async def delete_item(self, item: SalesOrderItem) -> None:
        await self.db.delete(item)
        await self.db.flush()

    async def get_items_subtotal(self, sales_order_id: int) -> float:
        result = await self.db.execute(
            select(func.coalesce(func.sum(SalesOrderItem.line_total), 0.0))
            .where(SalesOrderItem.sales_order_id == sales_order_id)
        )
        return float(result.scalar_one())

    async def get_items_tax_total(self, sales_order_id: int) -> float:
        result = await self.db.execute(
            select(func.coalesce(
                func.sum(SalesOrderItem.line_total * SalesOrderItem.tax_percent / 100.0), 0.0,
            ))
            .where(SalesOrderItem.sales_order_id == sales_order_id)
        )
        return float(result.scalar_one())

    async def get_item_count(self, sales_order_id: int) -> int:
        result = await self.db.execute(
            select(func.count(SalesOrderItem.id))
            .where(SalesOrderItem.sales_order_id == sales_order_id)
        )
        return result.scalar_one()

    # ── Status history ───────────────────────────────────────────────────────

    async def add_status_history(self, entry: SalesOrderStatusHistory) -> SalesOrderStatusHistory:
        self.db.add(entry)
        await self.db.flush()
        await self.db.refresh(entry)
        return entry
