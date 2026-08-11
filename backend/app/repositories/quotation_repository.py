import logging
from dataclasses import dataclass
from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.quotation import Quotation
from app.models.quotation_approval import QuotationApproval
from app.models.quotation_item import QuotationItem
from app.models.quotation_status_history import QuotationStatusHistory

logger = logging.getLogger(__name__)


@dataclass
class QuotationFilter:
    q: str | None = None
    status: str | None = None
    quotation_type: str | None = None
    customer_id: int | None = None
    lead_id: int | None = None
    assigned_to: int | None = None
    is_active: bool | None = True
    created_from: date | None = None
    created_to: date | None = None
    page: int = 1
    page_size: int = 20
    sort: str = "created_at"
    order: str = "desc"


class QuotationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, quotation_id: int) -> Quotation | None:
        result = await self.db.execute(
            select(Quotation)
            .options(
                selectinload(Quotation.customer),
                selectinload(Quotation.lead),
                selectinload(Quotation.assigned_user),
                selectinload(Quotation.items),
            )
            .where(Quotation.id == quotation_id)
        )
        return result.scalar_one_or_none()

    async def get_detail(self, quotation_id: int) -> Quotation | None:
        result = await self.db.execute(
            select(Quotation)
            .options(
                selectinload(Quotation.customer),
                selectinload(Quotation.lead),
                selectinload(Quotation.assigned_user),
                selectinload(Quotation.items).selectinload(QuotationItem.forklift),
                selectinload(Quotation.items).selectinload(QuotationItem.product),
                selectinload(Quotation.status_history).selectinload(QuotationStatusHistory.user),
                selectinload(Quotation.approvals).selectinload(QuotationApproval.user),
            )
            .where(Quotation.id == quotation_id)
        )
        return result.scalar_one_or_none()

    async def get_list(self, f: QuotationFilter) -> tuple[list[Quotation], int]:
        stmt = (
            select(Quotation)
            .options(
                selectinload(Quotation.customer),
                selectinload(Quotation.lead),
                selectinload(Quotation.assigned_user),
            )
        )
        stmt = self._apply_filters(stmt, f)

        count_stmt = select(func.count(Quotation.id))
        count_stmt = self._apply_filters(count_stmt, f)
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()

        sort_col = {
            "created_at": Quotation.created_at,
            "updated_at": Quotation.updated_at,
            "total_amount": Quotation.total_amount,
            "valid_until": Quotation.valid_until,
            "quotation_number": Quotation.quotation_number,
            "status": Quotation.status,
        }.get(f.sort, Quotation.created_at)

        if f.order == "asc":
            stmt = stmt.order_by(sort_col.asc())
        else:
            stmt = stmt.order_by(sort_col.desc())

        offset = (f.page - 1) * f.page_size
        stmt = stmt.offset(offset).limit(f.page_size)

        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    def _apply_filters(self, stmt, f: QuotationFilter):
        if f.is_active is not None:
            stmt = stmt.where(Quotation.is_active == f.is_active)
        if f.status is not None:
            stmt = stmt.where(Quotation.status == f.status)
        if f.quotation_type is not None:
            stmt = stmt.where(Quotation.quotation_type == f.quotation_type)
        if f.customer_id is not None:
            stmt = stmt.where(Quotation.customer_id == f.customer_id)
        if f.lead_id is not None:
            stmt = stmt.where(Quotation.lead_id == f.lead_id)
        if f.assigned_to is not None:
            stmt = stmt.where(Quotation.assigned_to == f.assigned_to)
        if f.created_from is not None:
            stmt = stmt.where(Quotation.created_at >= f.created_from)
        if f.created_to is not None:
            stmt = stmt.where(Quotation.created_at <= f.created_to)
        if f.q:
            pattern = f"%{f.q}%"
            stmt = stmt.where(
                or_(
                    Quotation.quotation_number.ilike(pattern),
                    Quotation.title.ilike(pattern),
                )
            )
        return stmt

    async def number_exists(self, number: str) -> bool:
        result = await self.db.execute(
            select(Quotation.id).where(Quotation.quotation_number == number)
        )
        return result.scalar_one_or_none() is not None

    async def create(self, quotation: Quotation) -> Quotation:
        self.db.add(quotation)
        try:
            await self.db.flush()
            await self.db.refresh(quotation)
            logger.info("Quotation created: id=%s number=%s", quotation.id, quotation.quotation_number)
            return quotation
        except IntegrityError:
            await self.db.rollback()
            raise

    async def update(self, quotation: Quotation, changes: dict) -> Quotation:
        for key, value in changes.items():
            setattr(quotation, key, value)
        try:
            await self.db.flush()
            # Scope the refresh to just the changed columns so already-loaded
            # relationships (e.g. .customer) aren't expired out from under callers.
            await self.db.refresh(quotation, attribute_names=list(changes.keys()))
            logger.info("Quotation updated: id=%s", quotation.id)
            return quotation
        except IntegrityError:
            await self.db.rollback()
            raise

    async def delete(self, quotation: Quotation) -> None:
        await self.db.delete(quotation)
        await self.db.flush()
        logger.info("Quotation deleted: id=%s number=%s", quotation.id, quotation.quotation_number)

    # ── Item helpers ─────────────────────────────────────────────────────────

    async def get_item_by_id(self, item_id: int) -> QuotationItem | None:
        return await self.db.get(QuotationItem, item_id)

    async def next_line_number(self, quotation_id: int) -> int:
        result = await self.db.execute(
            select(func.coalesce(func.max(QuotationItem.line_number), 0))
            .where(QuotationItem.quotation_id == quotation_id)
        )
        return result.scalar_one() + 1

    async def add_item(self, item: QuotationItem) -> QuotationItem:
        self.db.add(item)
        await self.db.flush()
        await self.db.refresh(item)
        return item

    async def update_item(self, item: QuotationItem, changes: dict) -> QuotationItem:
        for key, value in changes.items():
            setattr(item, key, value)
        await self.db.flush()
        await self.db.refresh(item)
        return item

    async def delete_item(self, item: QuotationItem) -> None:
        await self.db.delete(item)
        await self.db.flush()

    async def get_items_subtotal(self, quotation_id: int) -> float:
        result = await self.db.execute(
            select(func.coalesce(func.sum(QuotationItem.line_total), 0.0))
            .where(QuotationItem.quotation_id == quotation_id)
        )
        return float(result.scalar_one())

    async def get_items_tax_total(self, quotation_id: int) -> float:
        result = await self.db.execute(
            select(func.coalesce(
                func.sum(QuotationItem.line_total * QuotationItem.tax_percent / 100.0), 0.0,
            ))
            .where(QuotationItem.quotation_id == quotation_id)
        )
        return float(result.scalar_one())

    async def get_item_count(self, quotation_id: int) -> int:
        result = await self.db.execute(
            select(func.count(QuotationItem.id))
            .where(QuotationItem.quotation_id == quotation_id)
        )
        return result.scalar_one()

    # ── Status history ───────────────────────────────────────────────────────

    async def add_status_history(self, entry: QuotationStatusHistory) -> QuotationStatusHistory:
        self.db.add(entry)
        await self.db.flush()
        await self.db.refresh(entry)
        return entry

    # ── Approvals ────────────────────────────────────────────────────────────

    async def add_approval(self, approval: QuotationApproval) -> QuotationApproval:
        self.db.add(approval)
        await self.db.flush()
        await self.db.refresh(approval)
        return approval
