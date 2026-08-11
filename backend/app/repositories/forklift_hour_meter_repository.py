import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.forklift_hour_meter_log import ForkliftHourMeterLog

logger = logging.getLogger(__name__)


class ForkliftHourMeterRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, log_id: int) -> ForkliftHourMeterLog | None:
        return await self.db.get(ForkliftHourMeterLog, log_id)

    async def get_latest(self, forklift_id: int) -> ForkliftHourMeterLog | None:
        result = await self.db.execute(
            select(ForkliftHourMeterLog)
            .where(ForkliftHourMeterLog.forklift_id == forklift_id)
            .order_by(ForkliftHourMeterLog.recorded_at.desc(), ForkliftHourMeterLog.id.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_by_forklift(
        self,
        forklift_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> list[ForkliftHourMeterLog]:
        result = await self.db.execute(
            select(ForkliftHourMeterLog)
            .where(ForkliftHourMeterLog.forklift_id == forklift_id)
            .order_by(ForkliftHourMeterLog.recorded_at.desc(), ForkliftHourMeterLog.id.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count_by_forklift(self, forklift_id: int) -> int:
        result = await self.db.execute(
            select(func.count(ForkliftHourMeterLog.id))
            .where(ForkliftHourMeterLog.forklift_id == forklift_id)
        )
        return result.scalar_one()

    async def create(self, log: ForkliftHourMeterLog) -> ForkliftHourMeterLog:
        self.db.add(log)
        await self.db.flush()
        await self.db.refresh(log)
        logger.info(
            "Hour meter logged: forklift=%s reading=%s source=%s",
            log.forklift_id, log.reading, log.source,
        )
        return log
