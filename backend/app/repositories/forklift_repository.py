import logging
from dataclasses import dataclass

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.forklift import Forklift
from app.models.forklift_model import ForkliftModel
from app.models.forklift_status_history import ForkliftStatusHistory

logger = logging.getLogger(__name__)


@dataclass
class ForkliftFilter:
    q: str | None = None
    brand_id: int | None = None
    model_id: int | None = None
    customer_id: int | None = None
    status: str | None = None
    ownership_state: str | None = None
    condition: str | None = None
    fuel_type: str | None = None
    is_active: bool | None = True
    page: int = 1
    page_size: int = 20
    sort: str = "created_at"
    order: str = "desc"


class ForkliftRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Single-item lookups ──────────────────────────────────────────────────

    async def get_by_id(self, forklift_id: int) -> Forklift | None:
        result = await self.db.execute(
            select(Forklift)
            .options(
                selectinload(Forklift.forklift_model),
                selectinload(Forklift.brand),
                selectinload(Forklift.customer),
                selectinload(Forklift.photos),
            )
            .where(Forklift.id == forklift_id)
        )
        return result.scalar_one_or_none()

    async def get_by_iot_device_id(self, iot_device_id: str) -> Forklift | None:
        result = await self.db.execute(
            select(Forklift).where(Forklift.iot_device_id == iot_device_id)
        )
        return result.scalar_one_or_none()

    async def get_detail(self, forklift_id: int) -> Forklift | None:
        result = await self.db.execute(
            select(Forklift)
            .options(
                selectinload(Forklift.forklift_model).selectinload(ForkliftModel.brand),
                selectinload(Forklift.brand),
                selectinload(Forklift.customer),
                selectinload(Forklift.photos),
                selectinload(Forklift.documents),
                selectinload(Forklift.status_history).selectinload(ForkliftStatusHistory.user),
                selectinload(Forklift.locations),
                selectinload(Forklift.ownership_costs),
                selectinload(Forklift.hour_meter_logs),
                selectinload(Forklift.specs),
            )
            .where(Forklift.id == forklift_id)
        )
        return result.scalar_one_or_none()

    async def get_by_serial(self, serial_number: str) -> Forklift | None:
        result = await self.db.execute(
            select(Forklift).where(Forklift.serial_number == serial_number)
        )
        return result.scalar_one_or_none()

    # ── List / search ────────────────────────────────────────────────────────

    async def get_list(self, f: ForkliftFilter) -> tuple[list[Forklift], int]:
        stmt = (
            select(Forklift)
            .options(
                selectinload(Forklift.forklift_model),
                selectinload(Forklift.brand),
                selectinload(Forklift.customer),
                selectinload(Forklift.photos),
            )
        )
        stmt = self._apply_filters(stmt, f)

        count_stmt = select(func.count(Forklift.id))
        count_stmt = self._apply_filters(count_stmt, f)
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()

        sort_col = {
            "name_en": Forklift.name_en,
            "serial_number": Forklift.serial_number,
            "status": Forklift.status,
            "created_at": Forklift.created_at,
            "updated_at": Forklift.updated_at,
            "current_hour_meter": Forklift.current_hour_meter,
        }.get(f.sort, Forklift.created_at)

        if f.order == "asc":
            stmt = stmt.order_by(sort_col.asc())
        else:
            stmt = stmt.order_by(sort_col.desc())

        offset = (f.page - 1) * f.page_size
        stmt = stmt.offset(offset).limit(f.page_size)

        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    def _apply_filters(self, stmt, f: ForkliftFilter):
        if f.is_active is not None:
            stmt = stmt.where(Forklift.is_active == f.is_active)
        if f.brand_id is not None:
            stmt = stmt.where(Forklift.brand_id == f.brand_id)
        if f.model_id is not None:
            stmt = stmt.where(Forklift.model_id == f.model_id)
        if f.customer_id is not None:
            stmt = stmt.where(Forklift.customer_id == f.customer_id)
        if f.status is not None:
            stmt = stmt.where(Forklift.status == f.status)
        if f.ownership_state is not None:
            stmt = stmt.where(Forklift.ownership_state == f.ownership_state)
        if f.condition is not None:
            stmt = stmt.where(Forklift.condition == f.condition)
        if f.fuel_type is not None:
            stmt = stmt.where(Forklift.fuel_type == f.fuel_type)
        if f.q:
            pattern = f"%{f.q}%"
            stmt = stmt.where(
                or_(
                    Forklift.name_en.ilike(pattern),
                    Forklift.serial_number.ilike(pattern),
                    Forklift.model_number.ilike(pattern),
                    Forklift.internal_code.ilike(pattern),
                )
            )
        return stmt

    # ── Slug / serial helpers ────────────────────────────────────────────────

    async def slug_exists(self, slug: str, exclude_id: int | None = None) -> bool:
        stmt = select(Forklift.id).where(Forklift.slug == slug)
        if exclude_id is not None:
            stmt = stmt.where(Forklift.id != exclude_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def serial_exists(self, serial_number: str, exclude_id: int | None = None) -> bool:
        stmt = select(Forklift.id).where(Forklift.serial_number == serial_number)
        if exclude_id is not None:
            stmt = stmt.where(Forklift.id != exclude_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none() is not None

    # ── Mutations ────────────────────────────────────────────────────────────

    async def create(self, forklift: Forklift) -> Forklift:
        self.db.add(forklift)
        try:
            await self.db.flush()
            await self.db.refresh(forklift)
            logger.info("Forklift created: id=%s serial=%s", forklift.id, forklift.serial_number)
            return forklift
        except IntegrityError:
            await self.db.rollback()
            raise

    async def update(self, forklift: Forklift, changes: dict) -> Forklift:
        for key, value in changes.items():
            setattr(forklift, key, value)
        try:
            await self.db.flush()
            await self.db.refresh(forklift)
            logger.info("Forklift updated: id=%s", forklift.id)
            return forklift
        except IntegrityError:
            await self.db.rollback()
            raise

    async def delete(self, forklift: Forklift) -> None:
        await self.db.delete(forklift)
        await self.db.flush()
        logger.info("Forklift deleted: id=%s serial=%s", forklift.id, forklift.serial_number)
