import logging
from dataclasses import dataclass
from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.asset_movement import AssetMovement
from app.models.movement_history import MovementHistory

logger = logging.getLogger(__name__)


@dataclass
class MovementFilter:
    q: str | None = None
    movement_type: str | None = None
    status: str | None = None
    forklift_id: int | None = None
    customer_id: int | None = None
    assigned_driver_id: int | None = None
    priority: str | None = None
    is_active: bool | None = True
    scheduled_from: date | None = None
    scheduled_to: date | None = None
    page: int = 1
    page_size: int = 20
    sort: str = "created_at"
    order: str = "desc"


class MovementRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, movement_id: int) -> AssetMovement | None:
        result = await self.db.execute(
            select(AssetMovement)
            .options(
                selectinload(AssetMovement.forklift),
                selectinload(AssetMovement.customer),
                selectinload(AssetMovement.rental_contract),
                selectinload(AssetMovement.assigned_driver),
            )
            .where(AssetMovement.id == movement_id)
        )
        return result.scalar_one_or_none()

    async def get_detail(self, movement_id: int) -> AssetMovement | None:
        result = await self.db.execute(
            select(AssetMovement)
            .options(
                selectinload(AssetMovement.forklift),
                selectinload(AssetMovement.customer),
                selectinload(AssetMovement.rental_contract),
                selectinload(AssetMovement.assigned_driver),
                selectinload(AssetMovement.checkpoints).selectinload(MovementHistory.user),
            )
            .where(AssetMovement.id == movement_id)
        )
        return result.scalar_one_or_none()

    async def get_list(self, f: MovementFilter) -> tuple[list[AssetMovement], int]:
        stmt = (
            select(AssetMovement)
            .options(
                selectinload(AssetMovement.forklift),
                selectinload(AssetMovement.customer),
                selectinload(AssetMovement.rental_contract),
                selectinload(AssetMovement.assigned_driver),
            )
        )
        stmt = self._apply_filters(stmt, f)

        count_stmt = select(func.count(AssetMovement.id))
        count_stmt = self._apply_filters(count_stmt, f)
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()

        sort_col = {
            "created_at": AssetMovement.created_at,
            "scheduled_date": AssetMovement.scheduled_date,
            "movement_number": AssetMovement.movement_number,
            "status": AssetMovement.status,
            "priority": AssetMovement.priority,
        }.get(f.sort, AssetMovement.created_at)

        if f.order == "asc":
            stmt = stmt.order_by(sort_col.asc())
        else:
            stmt = stmt.order_by(sort_col.desc())

        offset = (f.page - 1) * f.page_size
        stmt = stmt.offset(offset).limit(f.page_size)

        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    def _apply_filters(self, stmt, f: MovementFilter):
        if f.is_active is not None:
            stmt = stmt.where(AssetMovement.is_active == f.is_active)
        if f.movement_type is not None:
            stmt = stmt.where(AssetMovement.movement_type == f.movement_type)
        if f.status is not None:
            stmt = stmt.where(AssetMovement.status == f.status)
        if f.forklift_id is not None:
            stmt = stmt.where(AssetMovement.forklift_id == f.forklift_id)
        if f.customer_id is not None:
            stmt = stmt.where(AssetMovement.customer_id == f.customer_id)
        if f.assigned_driver_id is not None:
            stmt = stmt.where(AssetMovement.assigned_driver_id == f.assigned_driver_id)
        if f.priority is not None:
            stmt = stmt.where(AssetMovement.priority == f.priority)
        if f.scheduled_from is not None:
            stmt = stmt.where(AssetMovement.scheduled_date >= f.scheduled_from)
        if f.scheduled_to is not None:
            stmt = stmt.where(AssetMovement.scheduled_date <= f.scheduled_to)
        if f.q:
            pattern = f"%{f.q}%"
            stmt = stmt.where(
                or_(
                    AssetMovement.movement_number.ilike(pattern),
                    AssetMovement.from_location.ilike(pattern),
                    AssetMovement.to_location.ilike(pattern),
                    AssetMovement.tracking_code.ilike(pattern),
                )
            )
        return stmt

    async def number_exists(self, number: str) -> bool:
        result = await self.db.execute(
            select(AssetMovement.id).where(AssetMovement.movement_number == number)
        )
        return result.scalar_one_or_none() is not None

    async def create(self, movement: AssetMovement) -> AssetMovement:
        self.db.add(movement)
        try:
            await self.db.flush()
            await self.db.refresh(movement)
            logger.info("Movement created: id=%s number=%s", movement.id, movement.movement_number)
            return movement
        except IntegrityError:
            await self.db.rollback()
            raise

    async def update(self, movement: AssetMovement, changes: dict) -> AssetMovement:
        for key, value in changes.items():
            setattr(movement, key, value)
        try:
            await self.db.flush()
            await self.db.refresh(movement)
            return movement
        except IntegrityError:
            await self.db.rollback()
            raise

    async def add_checkpoint(self, checkpoint: MovementHistory) -> MovementHistory:
        self.db.add(checkpoint)
        await self.db.flush()
        await self.db.refresh(checkpoint)
        return checkpoint
