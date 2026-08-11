import logging

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.brand import Brand

logger = logging.getLogger(__name__)


class BrandRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, brand_id: int) -> Brand | None:
        return await self.db.get(Brand, brand_id)

    async def get_by_slug(self, slug: str) -> Brand | None:
        result = await self.db.execute(select(Brand).where(Brand.slug == slug))
        return result.scalar_one_or_none()

    async def get_by_name(self, name: str) -> Brand | None:
        result = await self.db.execute(
            select(Brand).where(func.lower(Brand.name) == name.lower())
        )
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        is_active: bool | None = None,
    ) -> list[Brand]:
        stmt = select(Brand).order_by(Brand.sort_order, Brand.name)
        if is_active is not None:
            stmt = stmt.where(Brand.is_active == is_active)
        stmt = stmt.offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count(self, is_active: bool | None = None) -> int:
        stmt = select(func.count(Brand.id))
        if is_active is not None:
            stmt = stmt.where(Brand.is_active == is_active)
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def slug_exists(self, slug: str, exclude_id: int | None = None) -> bool:
        stmt = select(Brand.id).where(Brand.slug == slug)
        if exclude_id is not None:
            stmt = stmt.where(Brand.id != exclude_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def create(self, brand: Brand) -> Brand:
        self.db.add(brand)
        try:
            await self.db.flush()
            await self.db.refresh(brand)
            logger.info("Brand created: id=%s name=%s", brand.id, brand.name)
            return brand
        except IntegrityError:
            await self.db.rollback()
            raise

    async def update(self, brand: Brand, changes: dict) -> Brand:
        for key, value in changes.items():
            setattr(brand, key, value)
        try:
            await self.db.flush()
            await self.db.refresh(brand)
            logger.info("Brand updated: id=%s", brand.id)
            return brand
        except IntegrityError:
            await self.db.rollback()
            raise

    async def delete(self, brand: Brand) -> None:
        await self.db.delete(brand)
        await self.db.flush()
        logger.info("Brand deleted: id=%s name=%s", brand.id, brand.name)
