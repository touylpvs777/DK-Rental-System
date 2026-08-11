import logging
from datetime import date, timedelta

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.forklift import ForkliftStatus
from app.models.forklift_location import ForkliftLocation
from app.repositories.forklift_location_repository import ForkliftLocationRepository
from app.repositories.forklift_repository import ForkliftRepository
from app.schemas.forklift import ForkliftLocationCreate

logger = logging.getLogger(__name__)

_BLOCKED_STATUSES = {ForkliftStatus.DECOMMISSIONED.value, ForkliftStatus.SOLD.value}


class ForkliftLocationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = ForkliftLocationRepository(db)
        self._forklift_repo = ForkliftRepository(db)

    async def list_locations(
        self,
        forklift_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> list[ForkliftLocation]:
        await self._require_forklift(forklift_id)
        return await self._repo.get_by_forklift(forklift_id, skip=skip, limit=limit)

    async def get_current(self, forklift_id: int) -> ForkliftLocation | None:
        await self._require_forklift(forklift_id)
        return await self._repo.get_current(forklift_id)

    async def create_location(
        self,
        forklift_id: int,
        data: ForkliftLocationCreate,
        recorded_by: int,
    ) -> ForkliftLocation:
        forklift = await self._require_forklift(forklift_id)

        if forklift.status in _BLOCKED_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Cannot record location for {forklift.status} forklift.",
            )

        max_future = date.today() + timedelta(days=30)
        if data.effective_date > max_future:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Effective date cannot be more than 30 days in the future.",
            )

        location = ForkliftLocation(
            forklift_id=forklift_id,
            location_name=data.location_name,
            warehouse_zone=data.warehouse_zone,
            address=data.address,
            customer_id=data.customer_id,
            effective_date=data.effective_date,
            notes=data.notes,
            recorded_by=recorded_by,
        )
        location = await self._repo.create(location)
        await self.db.commit()
        return location

    async def delete_location(self, forklift_id: int, location_id: int) -> None:
        location = await self._require_owned(location_id, forklift_id)
        await self._repo.delete(location)
        await self.db.commit()

    async def _require_forklift(self, forklift_id: int):
        forklift = await self._forklift_repo.get_by_id(forklift_id)
        if forklift is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Forklift not found",
            )
        return forklift

    async def _require_owned(self, location_id: int, forklift_id: int) -> ForkliftLocation:
        location = await self._repo.get_by_id(location_id)
        if location is None or location.forklift_id != forklift_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Location not found",
            )
        return location
