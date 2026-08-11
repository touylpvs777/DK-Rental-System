import logging

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.brand import Brand
from app.repositories.brand_repository import BrandRepository
from app.schemas.brand import BrandCreate, BrandOut, BrandUpdate
from app.utils.slugify import slugify, unique_slug

logger = logging.getLogger(__name__)


class BrandService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = BrandRepository(db)

    async def list_brands(
        self,
        skip: int = 0,
        limit: int = 100,
        is_active: bool | None = None,
    ) -> list[Brand]:
        return await self._repo.get_all(skip=skip, limit=limit, is_active=is_active)

    async def get_brand(self, brand_id: int) -> Brand:
        brand = await self._repo.get_by_id(brand_id)
        if brand is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
        return brand

    async def get_brand_by_slug(self, slug: str) -> Brand:
        brand = await self._repo.get_by_slug(slug)
        if brand is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Brand not found")
        return brand

    async def get_or_create_by_name(self, name: str) -> Brand:
        """Used by the import service to resolve brand names."""
        existing = await self._repo.get_by_name(name)
        if existing:
            return existing
        return await self.create_brand(
            BrandCreate(name=name, brand_role="parts_only")
        )

    async def create_brand(self, data: BrandCreate) -> Brand:
        slug = data.slug or slugify(data.name)
        if await self._repo.slug_exists(slug):
            existing_slugs: set[str] = set()
            base = slug
            counter = 2
            candidate = base
            while await self._repo.slug_exists(candidate):
                candidate = f"{base}-{counter}"
                counter += 1
            slug = candidate

        brand = Brand(
            name=data.name.strip(),
            slug=slug,
            brand_role=data.brand_role.value,
            logo_url=data.logo_url,
            country=data.country,
            website=data.website,
            description=data.description,
            sort_order=data.sort_order,
        )
        try:
            brand = await self._repo.create(brand)
            await self.db.commit()
            return brand
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A brand named '{data.name}' already exists.",
            )

    async def update_brand(self, brand_id: int, data: BrandUpdate) -> Brand:
        brand = await self.get_brand(brand_id)
        changes = data.model_dump(exclude_unset=True)

        if "slug" in changes and changes["slug"]:
            if await self._repo.slug_exists(changes["slug"], exclude_id=brand_id):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Slug already in use by another brand.",
                )
        elif "name" in changes:
            new_slug = slugify(changes["name"])
            if await self._repo.slug_exists(new_slug, exclude_id=brand_id):
                counter = 2
                while await self._repo.slug_exists(f"{new_slug}-{counter}", exclude_id=brand_id):
                    counter += 1
                new_slug = f"{new_slug}-{counter}"
            changes["slug"] = new_slug

        if "brand_role" in changes and changes["brand_role"]:
            changes["brand_role"] = changes["brand_role"].value

        try:
            brand = await self._repo.update(brand, changes)
            await self.db.commit()
            return brand
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Brand name or slug conflicts with an existing brand.",
            )

    async def delete_brand(self, brand_id: int) -> None:
        brand = await self.get_brand(brand_id)
        await self._repo.delete(brand)
        await self.db.commit()
