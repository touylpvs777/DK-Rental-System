import logging
from dataclasses import dataclass
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.receipt import Receipt
from app.models.receipt_status_history import ReceiptStatusHistory

logger = logging.getLogger(__name__)


@dataclass
class ReceiptFilter:
    q: str | None = None
    status: str | None = None
    customer_id: int | None = None
    invoice_id: int | None = None
    assigned_to: int | None = None
    is_active: bool | None = True
    created_from: date | None = None
    created_to: date | None = None
    page: int = 1
    page_size: int = 20
    sort: str = "created_at"
    order: str = "desc"


class ReceiptRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, receipt_id: int) -> Receipt | None:
        result = await self.db.execute(
            select(Receipt)
            .options(
                selectinload(Receipt.customer),
                selectinload(Receipt.invoice),
                selectinload(Receipt.assigned_user),
            )
            .where(Receipt.id == receipt_id)
        )
        return result.scalar_one_or_none()

    async def get_detail(self, receipt_id: int) -> Receipt | None:
        result = await self.db.execute(
            select(Receipt)
            .options(
                selectinload(Receipt.customer),
                selectinload(Receipt.invoice),
                selectinload(Receipt.assigned_user),
                selectinload(Receipt.status_history).selectinload(ReceiptStatusHistory.user),
            )
            .where(Receipt.id == receipt_id)
        )
        return result.scalar_one_or_none()

    async def get_list(self, f: ReceiptFilter) -> tuple[list[Receipt], int]:
        stmt = (
            select(Receipt)
            .options(
                selectinload(Receipt.customer),
                selectinload(Receipt.invoice),
                selectinload(Receipt.assigned_user),
            )
        )
        stmt = self._apply_filters(stmt, f)

        count_stmt = select(func.count(Receipt.id))
        count_stmt = self._apply_filters(count_stmt, f)
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()

        sort_col = {
            "created_at": Receipt.created_at,
            "updated_at": Receipt.updated_at,
            "payment_date": Receipt.payment_date,
            "receipt_number": Receipt.receipt_number,
            "status": Receipt.status,
            "amount_received": Receipt.amount_received,
        }.get(f.sort, Receipt.created_at)

        stmt = stmt.order_by(sort_col.asc() if f.order == "asc" else sort_col.desc())

        offset = (f.page - 1) * f.page_size
        stmt = stmt.offset(offset).limit(f.page_size)

        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    def _apply_filters(self, stmt, f: ReceiptFilter):
        if f.is_active is not None:
            stmt = stmt.where(Receipt.is_active == f.is_active)
        if f.status is not None:
            stmt = stmt.where(Receipt.status == f.status)
        if f.customer_id is not None:
            stmt = stmt.where(Receipt.customer_id == f.customer_id)
        if f.invoice_id is not None:
            stmt = stmt.where(Receipt.invoice_id == f.invoice_id)
        if f.assigned_to is not None:
            stmt = stmt.where(Receipt.assigned_to == f.assigned_to)
        if f.created_from is not None:
            stmt = stmt.where(Receipt.created_at >= f.created_from)
        if f.created_to is not None:
            stmt = stmt.where(Receipt.created_at <= f.created_to)
        if f.q:
            pattern = f"%{f.q}%"
            stmt = stmt.where(Receipt.receipt_number.ilike(pattern))
        return stmt

    async def number_exists(self, number: str) -> bool:
        result = await self.db.execute(
            select(Receipt.id).where(Receipt.receipt_number == number)
        )
        return result.scalar_one_or_none() is not None

    async def create(self, receipt: Receipt) -> Receipt:
        self.db.add(receipt)
        try:
            await self.db.flush()
            await self.db.refresh(receipt)
            logger.info("Receipt created: id=%s number=%s", receipt.id, receipt.receipt_number)
            return receipt
        except IntegrityError:
            await self.db.rollback()
            raise

    async def update(self, receipt: Receipt, changes: dict) -> Receipt:
        for key, value in changes.items():
            setattr(receipt, key, value)
        try:
            await self.db.flush()
            await self.db.refresh(receipt, attribute_names=list(changes.keys()))
            logger.info("Receipt updated: id=%s", receipt.id)
            return receipt
        except IntegrityError:
            await self.db.rollback()
            raise

    async def delete(self, receipt: Receipt) -> None:
        await self.db.delete(receipt)
        await self.db.flush()
        logger.info("Receipt deleted: id=%s number=%s", receipt.id, receipt.receipt_number)

    # ── Status history ───────────────────────────────────────────────────────

    async def add_status_history(self, entry: ReceiptStatusHistory) -> ReceiptStatusHistory:
        self.db.add(entry)
        await self.db.flush()
        await self.db.refresh(entry)
        return entry
