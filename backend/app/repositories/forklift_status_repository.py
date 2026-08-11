import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.forklift_status_history import ForkliftStatusHistory

logger = logging.getLogger(__name__)


class ForkliftStatusRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_forklift(
        self,
        forklift_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> list[ForkliftStatusHistory]:
        result = await self.db.execute(
            select(ForkliftStatusHistory)
            .options(selectinload(ForkliftStatusHistory.user))
            .where(ForkliftStatusHistory.forklift_id == forklift_id)
            .order_by(ForkliftStatusHistory.id.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count_by_forklift(self, forklift_id: int) -> int:
        result = await self.db.execute(
            select(func.count(ForkliftStatusHistory.id))
            .where(ForkliftStatusHistory.forklift_id == forklift_id)
        )
        return result.scalar_one()

    async def create(self, entry: ForkliftStatusHistory) -> ForkliftStatusHistory:
        self.db.add(entry)
        await self.db.flush()
        await self.db.refresh(entry)
        logger.info(
            "Status history: forklift=%s %s→%s",
            entry.forklift_id, entry.from_status, entry.to_status,
        )
        return entry
