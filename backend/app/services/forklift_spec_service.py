import logging

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.forklift import Forklift
from app.models.forklift_spec import ForkliftSpec
from app.schemas.forklift import ForkliftSpecCreate, ForkliftSpecUpdate

logger = logging.getLogger(__name__)


class ForkliftSpecService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def _require_forklift(self, forklift_id: int) -> Forklift:
        result = await self.db.execute(
            select(Forklift).where(Forklift.id == forklift_id),
        )
        forklift = result.scalar_one_or_none()
        if forklift is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Forklift not found",
            )
        return forklift

    async def _require_spec(self, forklift_id: int, spec_id: int) -> ForkliftSpec:
        result = await self.db.execute(
            select(ForkliftSpec).where(
                ForkliftSpec.id == spec_id,
                ForkliftSpec.forklift_id == forklift_id,
            ),
        )
        spec = result.scalar_one_or_none()
        if spec is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Forklift specification not found",
            )
        return spec

    async def list_specs(self, forklift_id: int) -> list[ForkliftSpec]:
        await self._require_forklift(forklift_id)
        result = await self.db.execute(
            select(ForkliftSpec)
            .where(ForkliftSpec.forklift_id == forklift_id)
            .order_by(ForkliftSpec.id),
        )
        return list(result.scalars().all())

    async def create_spec(
        self, forklift_id: int, data: ForkliftSpecCreate,
    ) -> ForkliftSpec:
        await self._require_forklift(forklift_id)
        spec = ForkliftSpec(forklift_id=forklift_id, **data.model_dump())
        self.db.add(spec)
        await self.db.flush()
        await self.db.refresh(spec)
        await self.db.commit()
        logger.info("ForkliftSpec created: id=%s forklift_id=%s", spec.id, forklift_id)
        return spec

    async def update_spec(
        self, forklift_id: int, spec_id: int, data: ForkliftSpecUpdate,
    ) -> ForkliftSpec:
        spec = await self._require_spec(forklift_id, spec_id)
        changes = data.model_dump(exclude_unset=True)
        for key, value in changes.items():
            setattr(spec, key, value)
        await self.db.flush()
        await self.db.refresh(spec)
        await self.db.commit()
        logger.info("ForkliftSpec updated: id=%s", spec_id)
        return spec

    async def delete_spec(self, forklift_id: int, spec_id: int) -> None:
        spec = await self._require_spec(forklift_id, spec_id)
        await self.db.delete(spec)
        await self.db.commit()
        logger.info("ForkliftSpec deleted: id=%s", spec_id)
