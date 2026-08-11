import logging
from dataclasses import dataclass
from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.delivery_note import DeliveryNote
from app.models.delivery_note_item import DeliveryNoteItem
from app.models.delivery_note_status_history import DeliveryNoteStatusHistory

logger = logging.getLogger(__name__)


@dataclass
class DeliveryNoteFilter:
    q: str | None = None
    status: str | None = None
    customer_id: int | None = None
    sales_order_id: int | None = None
    assigned_to: int | None = None
    is_active: bool | None = True
    created_from: date | None = None
    created_to: date | None = None
    page: int = 1
    page_size: int = 20
    sort: str = "created_at"
    order: str = "desc"


class DeliveryNoteRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, delivery_note_id: int) -> DeliveryNote | None:
        result = await self.db.execute(
            select(DeliveryNote)
            .options(
                selectinload(DeliveryNote.customer),
                selectinload(DeliveryNote.sales_order),
                selectinload(DeliveryNote.assigned_user),
                selectinload(DeliveryNote.items),
            )
            .where(DeliveryNote.id == delivery_note_id)
        )
        return result.scalar_one_or_none()

    async def get_detail(self, delivery_note_id: int) -> DeliveryNote | None:
        result = await self.db.execute(
            select(DeliveryNote)
            .options(
                selectinload(DeliveryNote.customer),
                selectinload(DeliveryNote.sales_order),
                selectinload(DeliveryNote.assigned_user),
                selectinload(DeliveryNote.items),
                selectinload(DeliveryNote.status_history).selectinload(DeliveryNoteStatusHistory.user),
            )
            .where(DeliveryNote.id == delivery_note_id)
        )
        return result.scalar_one_or_none()

    async def get_list(self, f: DeliveryNoteFilter) -> tuple[list[DeliveryNote], int]:
        stmt = (
            select(DeliveryNote)
            .options(
                selectinload(DeliveryNote.customer),
                selectinload(DeliveryNote.sales_order),
                selectinload(DeliveryNote.assigned_user),
            )
        )
        stmt = self._apply_filters(stmt, f)

        count_stmt = select(func.count(DeliveryNote.id))
        count_stmt = self._apply_filters(count_stmt, f)
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()

        sort_col = {
            "created_at": DeliveryNote.created_at,
            "updated_at": DeliveryNote.updated_at,
            "delivery_date": DeliveryNote.delivery_date,
            "dn_number": DeliveryNote.dn_number,
            "status": DeliveryNote.status,
        }.get(f.sort, DeliveryNote.created_at)

        stmt = stmt.order_by(sort_col.asc() if f.order == "asc" else sort_col.desc())

        offset = (f.page - 1) * f.page_size
        stmt = stmt.offset(offset).limit(f.page_size)

        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    def _apply_filters(self, stmt, f: DeliveryNoteFilter):
        if f.is_active is not None:
            stmt = stmt.where(DeliveryNote.is_active == f.is_active)
        if f.status is not None:
            stmt = stmt.where(DeliveryNote.status == f.status)
        if f.customer_id is not None:
            stmt = stmt.where(DeliveryNote.customer_id == f.customer_id)
        if f.sales_order_id is not None:
            stmt = stmt.where(DeliveryNote.sales_order_id == f.sales_order_id)
        if f.assigned_to is not None:
            stmt = stmt.where(DeliveryNote.assigned_to == f.assigned_to)
        if f.created_from is not None:
            stmt = stmt.where(DeliveryNote.created_at >= f.created_from)
        if f.created_to is not None:
            stmt = stmt.where(DeliveryNote.created_at <= f.created_to)
        if f.q:
            pattern = f"%{f.q}%"
            stmt = stmt.where(DeliveryNote.dn_number.ilike(pattern))
        return stmt

    async def number_exists(self, number: str) -> bool:
        result = await self.db.execute(
            select(DeliveryNote.id).where(DeliveryNote.dn_number == number)
        )
        return result.scalar_one_or_none() is not None

    async def create(self, delivery_note: DeliveryNote) -> DeliveryNote:
        self.db.add(delivery_note)
        try:
            await self.db.flush()
            await self.db.refresh(delivery_note)
            logger.info("Delivery note created: id=%s number=%s", delivery_note.id, delivery_note.dn_number)
            return delivery_note
        except IntegrityError:
            await self.db.rollback()
            raise

    async def update(self, delivery_note: DeliveryNote, changes: dict) -> DeliveryNote:
        for key, value in changes.items():
            setattr(delivery_note, key, value)
        try:
            await self.db.flush()
            await self.db.refresh(delivery_note, attribute_names=list(changes.keys()))
            logger.info("Delivery note updated: id=%s", delivery_note.id)
            return delivery_note
        except IntegrityError:
            await self.db.rollback()
            raise

    async def delete(self, delivery_note: DeliveryNote) -> None:
        await self.db.delete(delivery_note)
        await self.db.flush()
        logger.info("Delivery note deleted: id=%s number=%s", delivery_note.id, delivery_note.dn_number)

    # ── Item helpers ─────────────────────────────────────────────────────────

    async def get_item_by_id(self, item_id: int) -> DeliveryNoteItem | None:
        return await self.db.get(DeliveryNoteItem, item_id)

    async def add_item(self, item: DeliveryNoteItem) -> DeliveryNoteItem:
        self.db.add(item)
        await self.db.flush()
        await self.db.refresh(item)
        return item

    async def update_item(self, item: DeliveryNoteItem, changes: dict) -> DeliveryNoteItem:
        for key, value in changes.items():
            setattr(item, key, value)
        await self.db.flush()
        await self.db.refresh(item)
        return item

    async def delete_item(self, item: DeliveryNoteItem) -> None:
        await self.db.delete(item)
        await self.db.flush()

    async def get_item_count(self, delivery_note_id: int) -> int:
        result = await self.db.execute(
            select(func.count(DeliveryNoteItem.id))
            .where(DeliveryNoteItem.delivery_note_id == delivery_note_id)
        )
        return result.scalar_one()

    # ── Status history ───────────────────────────────────────────────────────

    async def add_status_history(self, entry: DeliveryNoteStatusHistory) -> DeliveryNoteStatusHistory:
        self.db.add(entry)
        await self.db.flush()
        await self.db.refresh(entry)
        return entry
