import logging
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.quotation import Quotation

logger = logging.getLogger(__name__)


@dataclass
class QuotationFilter:
    q: str | None = None
    status: str | None = None
    customer_id: int | None = None
    page: int = 1
    page_size: int = 20


class QuotationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def _with_relations(stmt):
        return stmt.options(
            selectinload(Quotation.customer),
            selectinload(Quotation.forklift),
            selectinload(Quotation.creator),
        )

    async def get_by_id(self, quotation_id: int) -> Quotation | None:
        result = await self.db.execute(
            self._with_relations(select(Quotation)).where(Quotation.id == quotation_id)
        )
        return result.scalar_one_or_none()

    async def number_exists(self, quotation_no: str) -> bool:
        result = await self.db.execute(
            select(Quotation.id).where(Quotation.quotation_no == quotation_no)
        )
        return result.scalar_one_or_none() is not None

    async def get_all(self, f: QuotationFilter) -> tuple[list[Quotation], int]:
        stmt = self._with_relations(select(Quotation))
        count_stmt = select(func.count(Quotation.id))

        if f.q:
            like = f"%{f.q}%"
            stmt = stmt.where(Quotation.quotation_no.ilike(like))
            count_stmt = count_stmt.where(Quotation.quotation_no.ilike(like))
        if f.status:
            stmt = stmt.where(Quotation.status == f.status)
            count_stmt = count_stmt.where(Quotation.status == f.status)
        if f.customer_id:
            stmt = stmt.where(Quotation.customer_id == f.customer_id)
            count_stmt = count_stmt.where(Quotation.customer_id == f.customer_id)

        total = (await self.db.execute(count_stmt)).scalar_one()

        stmt = (
            stmt.order_by(Quotation.created_at.desc())
            .offset((f.page - 1) * f.page_size)
            .limit(f.page_size)
        )
        items = list((await self.db.execute(stmt)).scalars().all())
        return items, total

    async def create(self, quotation: Quotation) -> Quotation:
        self.db.add(quotation)
        try:
            await self.db.flush()
            await self.db.refresh(quotation)
            logger.info("Quotation created: id=%s number=%s", quotation.id, quotation.quotation_no)
            return quotation
        except IntegrityError:
            await self.db.rollback()
            raise

    async def update(self, quotation: Quotation, changes: dict) -> Quotation:
        for key, value in changes.items():
            setattr(quotation, key, value)
        await self.db.flush()
        await self.db.refresh(quotation)
        logger.info("Quotation updated: id=%s", quotation.id)
        return quotation

    async def delete(self, quotation: Quotation) -> None:
        await self.db.delete(quotation)
        await self.db.flush()
        logger.info("Quotation deleted: id=%s", quotation.id)
