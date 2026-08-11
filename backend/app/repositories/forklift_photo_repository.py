import logging

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.forklift_photo import ForkliftPhoto

logger = logging.getLogger(__name__)


class ForkliftPhotoRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, photo_id: int) -> ForkliftPhoto | None:
        return await self.db.get(ForkliftPhoto, photo_id)

    async def get_by_forklift(
        self,
        forklift_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> list[ForkliftPhoto]:
        result = await self.db.execute(
            select(ForkliftPhoto)
            .where(ForkliftPhoto.forklift_id == forklift_id)
            .order_by(ForkliftPhoto.sort_order.asc(), ForkliftPhoto.id.asc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count_by_forklift(self, forklift_id: int) -> int:
        result = await self.db.execute(
            select(func.count(ForkliftPhoto.id))
            .where(ForkliftPhoto.forklift_id == forklift_id)
        )
        return result.scalar_one()

    async def clear_primary(self, forklift_id: int) -> None:
        await self.db.execute(
            update(ForkliftPhoto)
            .where(
                ForkliftPhoto.forklift_id == forklift_id,
                ForkliftPhoto.is_primary.is_(True),
            )
            .values(is_primary=False)
        )

    async def create(self, photo: ForkliftPhoto) -> ForkliftPhoto:
        if photo.is_primary:
            await self.clear_primary(photo.forklift_id)
        self.db.add(photo)
        await self.db.flush()
        await self.db.refresh(photo)
        logger.info("Photo added: forklift=%s id=%s", photo.forklift_id, photo.id)
        return photo

    async def update(self, photo: ForkliftPhoto, changes: dict) -> ForkliftPhoto:
        if changes.get("is_primary") is True:
            await self.clear_primary(photo.forklift_id)
        for key, value in changes.items():
            setattr(photo, key, value)
        await self.db.flush()
        await self.db.refresh(photo)
        logger.info("Photo updated: id=%s", photo.id)
        return photo

    async def delete(self, photo: ForkliftPhoto) -> None:
        await self.db.delete(photo)
        await self.db.flush()
        logger.info("Photo deleted: id=%s forklift=%s", photo.id, photo.forklift_id)
