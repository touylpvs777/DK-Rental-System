import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.forklift_location import ForkliftLocation

logger = logging.getLogger(__name__)


class ForkliftLocationRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, location_id: int) -> ForkliftLocation | None:
        return await self.db.get(ForkliftLocation, location_id)

    async def get_current(self, forklift_id: int) -> ForkliftLocation | None:
        result = await self.db.execute(
            select(ForkliftLocation)
            .options(selectinload(ForkliftLocation.customer))
            .where(ForkliftLocation.forklift_id == forklift_id)
            .order_by(ForkliftLocation.effective_date.desc(), ForkliftLocation.id.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_by_forklift(
        self,
        forklift_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> list[ForkliftLocation]:
        result = await self.db.execute(
            select(ForkliftLocation)
            .options(selectinload(ForkliftLocation.customer))
            .where(ForkliftLocation.forklift_id == forklift_id)
            .order_by(ForkliftLocation.effective_date.desc(), ForkliftLocation.id.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count_by_forklift(self, forklift_id: int) -> int:
        result = await self.db.execute(
            select(func.count(ForkliftLocation.id))
            .where(ForkliftLocation.forklift_id == forklift_id)
        )
        return result.scalar_one()

    async def create(self, location: ForkliftLocation) -> ForkliftLocation:
        self.db.add(location)
        await self.db.flush()
        await self.db.refresh(location)
        logger.info(
            "Location recorded: forklift=%s location=%s",
            location.forklift_id, location.location_name,
        )
        return location

    async def delete(self, location: ForkliftLocation) -> None:
        await self.db.delete(location)
        await self.db.flush()
        logger.info("Location deleted: id=%s forklift=%s", location.id, location.forklift_id)
