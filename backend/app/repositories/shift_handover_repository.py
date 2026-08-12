import logging

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.shift_handover import ShiftHandover

logger = logging.getLogger(__name__)


class ShiftHandoverRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    @staticmethod
    def _with_relations(stmt):
        return stmt.options(
            selectinload(ShiftHandover.rental_contract),
            selectinload(ShiftHandover.forklift),
            selectinload(ShiftHandover.creator),
        )

    async def get_by_id(self, handover_id: int) -> ShiftHandover | None:
        result = await self.db.execute(
            self._with_relations(select(ShiftHandover)).where(ShiftHandover.id == handover_id)
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        rental_contract_id: int | None = None,
        forklift_id: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[ShiftHandover]:
        stmt = self._with_relations(select(ShiftHandover)).order_by(ShiftHandover.handover_datetime.desc())
        if rental_contract_id is not None:
            stmt = stmt.where(ShiftHandover.rental_contract_id == rental_contract_id)
        if forklift_id is not None:
            stmt = stmt.where(ShiftHandover.forklift_id == forklift_id)
        stmt = stmt.offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count(
        self,
        rental_contract_id: int | None = None,
        forklift_id: int | None = None,
    ) -> int:
        stmt = select(func.count(ShiftHandover.id))
        if rental_contract_id is not None:
            stmt = stmt.where(ShiftHandover.rental_contract_id == rental_contract_id)
        if forklift_id is not None:
            stmt = stmt.where(ShiftHandover.forklift_id == forklift_id)
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def create(self, handover: ShiftHandover) -> ShiftHandover:
        self.db.add(handover)
        try:
            await self.db.flush()
            await self.db.refresh(handover)
            logger.info("Shift handover created: id=%s forklift=%s", handover.id, handover.forklift_id)
            return handover
        except IntegrityError:
            await self.db.rollback()
            raise

    async def update(self, handover: ShiftHandover, changes: dict) -> ShiftHandover:
        for key, value in changes.items():
            setattr(handover, key, value)
        try:
            await self.db.flush()
            await self.db.refresh(handover)
            logger.info("Shift handover updated: id=%s", handover.id)
            return handover
        except IntegrityError:
            await self.db.rollback()
            raise

    async def delete(self, handover: ShiftHandover) -> None:
        await self.db.delete(handover)
        await self.db.flush()
        logger.info("Shift handover deleted: id=%s", handover.id)
