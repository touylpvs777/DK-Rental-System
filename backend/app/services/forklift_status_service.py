import logging

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.forklift_status_history import ForkliftStatusHistory
from app.repositories.forklift_repository import ForkliftRepository
from app.repositories.forklift_status_repository import ForkliftStatusRepository

logger = logging.getLogger(__name__)


class ForkliftStatusService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = ForkliftStatusRepository(db)
        self._forklift_repo = ForkliftRepository(db)

    async def get_history(
        self,
        forklift_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> list[ForkliftStatusHistory]:
        await self._require_forklift(forklift_id)
        return await self._repo.get_by_forklift(forklift_id, skip=skip, limit=limit)

    async def count(self, forklift_id: int) -> int:
        return await self._repo.count_by_forklift(forklift_id)

    async def _require_forklift(self, forklift_id: int) -> None:
        forklift = await self._forklift_repo.get_by_id(forklift_id)
        if forklift is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Forklift not found",
            )
