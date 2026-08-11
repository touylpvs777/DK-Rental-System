import logging

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.forklift_photo import ForkliftPhoto
from app.repositories.forklift_photo_repository import ForkliftPhotoRepository
from app.repositories.forklift_repository import ForkliftRepository
from app.schemas.forklift import ForkliftPhotoCreate, ForkliftPhotoUpdate

logger = logging.getLogger(__name__)


class ForkliftPhotoService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = ForkliftPhotoRepository(db)
        self._forklift_repo = ForkliftRepository(db)

    async def list_photos(
        self,
        forklift_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> list[ForkliftPhoto]:
        await self._require_forklift(forklift_id)
        return await self._repo.get_by_forklift(forklift_id, skip=skip, limit=limit)

    async def create_photo(
        self,
        forklift_id: int,
        data: ForkliftPhotoCreate,
        uploaded_by: int,
    ) -> ForkliftPhoto:
        await self._require_forklift(forklift_id)

        photo = ForkliftPhoto(
            forklift_id=forklift_id,
            image_url=data.image_url,
            thumbnail_url=data.thumbnail_url,
            alt_text=data.alt_text,
            caption=data.caption,
            is_primary=data.is_primary,
            sort_order=data.sort_order,
            taken_at=data.taken_at,
            uploaded_by=uploaded_by,
        )
        photo = await self._repo.create(photo)
        await self.db.commit()
        return photo

    async def update_photo(
        self,
        forklift_id: int,
        photo_id: int,
        data: ForkliftPhotoUpdate,
    ) -> ForkliftPhoto:
        photo = await self._require_owned(photo_id, forklift_id)
        changes = data.model_dump(exclude_unset=True)
        photo = await self._repo.update(photo, changes)
        await self.db.commit()
        return photo

    async def delete_photo(self, forklift_id: int, photo_id: int) -> None:
        photo = await self._require_owned(photo_id, forklift_id)
        await self._repo.delete(photo)
        await self.db.commit()

    async def _require_forklift(self, forklift_id: int) -> None:
        forklift = await self._forklift_repo.get_by_id(forklift_id)
        if forklift is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Forklift not found",
            )

    async def _require_owned(self, photo_id: int, forklift_id: int) -> ForkliftPhoto:
        photo = await self._repo.get_by_id(photo_id)
        if photo is None or photo.forklift_id != forklift_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Photo not found",
            )
        return photo
