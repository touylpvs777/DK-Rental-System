import logging

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import ProductCategory
from app.repositories.category_repository import CategoryRepository
from app.schemas.category import CategoryCreate, CategoryTree, CategoryUpdate
from app.utils.slugify import slugify

logger = logging.getLogger(__name__)


class CategoryService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = CategoryRepository(db)

    async def get_tree(self) -> list[CategoryTree]:
        """Return the full category tree as nested CategoryTree objects."""
        roots = await self._repo.get_roots_with_tree()
        return [CategoryTree.model_validate(r) for r in roots]

    async def get_flat(self) -> list[ProductCategory]:
        return await self._repo.get_all()

    async def get_category(self, category_id: int) -> ProductCategory:
        cat = await self._repo.get_by_id(category_id)
        if cat is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
            )
        return cat

    async def get_by_slug(self, slug: str) -> ProductCategory:
        cat = await self._repo.get_by_slug(slug)
        if cat is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
            )
        return cat

    async def get_or_create_by_path(
        self,
        l1: str | None,
        l2: str | None = None,
        l3: str | None = None,
    ) -> ProductCategory | None:
        """
        Resolve or create a category by its 3-level path.
        Returns the leaf node (deepest specified level).
        """
        parent: ProductCategory | None = None

        for level, name in enumerate([l1, l2, l3], start=1):
            if not name:
                break
            existing = await self._repo.get_by_name_en(name)
            if existing:
                parent = existing
            else:
                cat = await self._create_raw(
                    name_en=name,
                    parent_id=parent.id if parent else None,
                    level=level,
                )
                parent = cat

        return parent

    async def create_category(self, data: CategoryCreate) -> ProductCategory:
        parent_level = 0
        if data.parent_id is not None:
            parent = await self._repo.get_by_id(data.parent_id)
            if parent is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail=f"Parent category id={data.parent_id} not found",
                )
            parent_level = parent.level
            if parent_level >= 3:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Maximum category depth is 3 levels",
                )

        slug = data.slug or slugify(data.name_en)
        if await self._repo.slug_exists(slug):
            counter = 2
            while await self._repo.slug_exists(f"{slug}-{counter}"):
                counter += 1
            slug = f"{slug}-{counter}"

        cat = ProductCategory(
            name_en=data.name_en.strip(),
            name_lo=data.name_lo,
            slug=slug,
            parent_id=data.parent_id,
            level=parent_level + 1,
            description=data.description,
            icon=data.icon,
            sort_order=data.sort_order,
        )
        try:
            cat = await self._repo.create(cat)
            await self.db.commit()
            return cat
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A category with this slug already exists.",
            )

    async def update_category(
        self, category_id: int, data: CategoryUpdate
    ) -> ProductCategory:
        cat = await self.get_category(category_id)
        changes = data.model_dump(exclude_unset=True)

        if "slug" in changes and changes["slug"]:
            if await self._repo.slug_exists(changes["slug"], exclude_id=category_id):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Slug already in use by another category.",
                )
        elif "name_en" in changes:
            new_slug = slugify(changes["name_en"])
            if await self._repo.slug_exists(new_slug, exclude_id=category_id):
                counter = 2
                while await self._repo.slug_exists(
                    f"{new_slug}-{counter}", exclude_id=category_id
                ):
                    counter += 1
                new_slug = f"{new_slug}-{counter}"
            changes["slug"] = new_slug

        if "parent_id" in changes:
            if changes["parent_id"] == category_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="A category cannot be its own parent.",
                )

        try:
            cat = await self._repo.update(cat, changes)
            await self.db.commit()
            return cat
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Slug conflicts with an existing category.",
            )

    async def delete_category(self, category_id: int) -> None:
        cat = await self.get_category(category_id)
        if await self._repo.has_children(category_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot delete a category that has sub-categories.",
            )
        if await self._repo.has_products(category_id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot delete a category that has products assigned to it.",
            )
        await self._repo.delete(cat)
        await self.db.commit()

    # ── Internal helpers ──────────────────────────────────────────────────────

    async def _create_raw(
        self, name_en: str, parent_id: int | None, level: int
    ) -> ProductCategory:
        slug = slugify(name_en)
        if await self._repo.slug_exists(slug):
            counter = 2
            while await self._repo.slug_exists(f"{slug}-{counter}"):
                counter += 1
            slug = f"{slug}-{counter}"

        cat = ProductCategory(
            name_en=name_en,
            slug=slug,
            parent_id=parent_id,
            level=level,
        )
        cat = await self._repo.create(cat)
        await self.db.commit()
        logger.info("Auto-created category: %s (level %s)", name_en, level)
        return cat
