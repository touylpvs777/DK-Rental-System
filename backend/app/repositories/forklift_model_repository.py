import logging
from dataclasses import dataclass

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.forklift_model import ForkliftModel

logger = logging.getLogger(__name__)


@dataclass
class ForkliftModelFilter:
    q: str | None = None
    brand_id: int | None = None
    is_active: bool | None = True
    page: int = 1
    page_size: int = 50
    sort: str = "sort_order"
    order: str = "asc"


class ForkliftModelRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Lookups ──────────────────────────────────────────────────────────────

    async def get_by_id(self, model_id: int) -> ForkliftModel | None:
        result = await self.db.execute(
            select(ForkliftModel)
            .options(selectinload(ForkliftModel.brand))
            .where(ForkliftModel.id == model_id)
        )
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> ForkliftModel | None:
        result = await self.db.execute(
            select(ForkliftModel)
            .options(selectinload(ForkliftModel.brand))
            .where(ForkliftModel.slug == slug)
        )
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> ForkliftModel | None:
        result = await self.db.execute(
            select(ForkliftModel).where(func.lower(ForkliftModel.name) == name.lower())
        )
        return result.scalar_one_or_none()

    # ── List / search ────────────────────────────────────────────────────────

    async def get_list(self, f: ForkliftModelFilter) -> tuple[list[ForkliftModel], int]:
        stmt = select(ForkliftModel).options(selectinload(ForkliftModel.brand))
        stmt = self._apply_filters(stmt, f)

        count_stmt = select(func.count(ForkliftModel.id))
        count_stmt = self._apply_filters(count_stmt, f)
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()

        sort_col = {
            "name": ForkliftModel.name,
            "sort_order": ForkliftModel.sort_order,
            "created_at": ForkliftModel.created_at,
        }.get(f.sort, ForkliftModel.sort_order)

        if f.order == "desc":
            stmt = stmt.order_by(sort_col.desc())
        else:
            stmt = stmt.order_by(sort_col.asc())

        offset = (f.page - 1) * f.page_size
        stmt = stmt.offset(offset).limit(f.page_size)

        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    def _apply_filters(self, stmt, f: ForkliftModelFilter):
        if f.is_active is not None:
            stmt = stmt.where(ForkliftModel.is_active == f.is_active)
        if f.brand_id is not None:
            stmt = stmt.where(ForkliftModel.brand_id == f.brand_id)
        if f.q:
            pattern = f"%{f.q}%"
            stmt = stmt.where(
                or_(
                    ForkliftModel.name.ilike(pattern),
                    ForkliftModel.series.ilike(pattern),
                )
            )
        return stmt

    # ── Slug helpers ─────────────────────────────────────────────────────────

    async def slug_exists(self, slug: str, exclude_id: int | None = None) -> bool:
        stmt = select(ForkliftModel.id).where(ForkliftModel.slug == slug)
        if exclude_id is not None:
            stmt = stmt.where(ForkliftModel.id != exclude_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def has_forklifts(self, model_id: int) -> bool:
        from app.models.forklift import Forklift
        result = await self.db.execute(
            select(func.count(Forklift.id)).where(Forklift.model_id == model_id)
        )
        return (result.scalar_one() or 0) > 0

    # ── Mutations ────────────────────────────────────────────────────────────

    async def create(self, model: ForkliftModel) -> ForkliftModel:
        self.db.add(model)
        try:
            await self.db.flush()
            await self.db.refresh(model)
            logger.info("ForkliftModel created: id=%s name=%s", model.id, model.name)
            return model
        except IntegrityError:
            await self.db.rollback()
            raise

    async def update(self, model: ForkliftModel, changes: dict) -> ForkliftModel:
        for key, value in changes.items():
            setattr(model, key, value)
        try:
            await self.db.flush()
            await self.db.refresh(model)
            logger.info("ForkliftModel updated: id=%s", model.id)
            return model
        except IntegrityError:
            await self.db.rollback()
            raise

    async def delete(self, model: ForkliftModel) -> None:
        await self.db.delete(model)
        await self.db.flush()
        logger.info("ForkliftModel deleted: id=%s name=%s", model.id, model.name)
