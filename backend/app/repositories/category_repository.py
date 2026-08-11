import logging

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.category import ProductCategory

logger = logging.getLogger(__name__)


class CategoryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, category_id: int) -> ProductCategory | None:
        return await self.db.get(ProductCategory, category_id)

    async def get_by_slug(self, slug: str) -> ProductCategory | None:
        result = await self.db.execute(
            select(ProductCategory).where(ProductCategory.slug == slug)
        )
        return result.scalar_one_or_none()

    async def get_by_name_en(self, name_en: str) -> ProductCategory | None:
        result = await self.db.execute(
            select(ProductCategory).where(
                func.lower(ProductCategory.name_en) == name_en.lower()
            )
        )
        return result.scalar_one_or_none()

    async def get_all(self) -> list[ProductCategory]:
        result = await self.db.execute(
            select(ProductCategory).order_by(
                ProductCategory.level, ProductCategory.sort_order, ProductCategory.name_en
            )
        )
        return list(result.scalars().all())

    async def get_roots_with_tree(self) -> list[ProductCategory]:
        """Load the full category tree (roots + nested children) efficiently."""
        result = await self.db.execute(
            select(ProductCategory)
            .options(
                selectinload(ProductCategory.children)
                .selectinload(ProductCategory.children)
                .selectinload(ProductCategory.children)
            )
            .where(ProductCategory.parent_id.is_(None))
            .order_by(ProductCategory.sort_order, ProductCategory.name_en)
        )
        return list(result.scalars().all())

    async def get_children(self, parent_id: int) -> list[ProductCategory]:
        result = await self.db.execute(
            select(ProductCategory)
            .where(ProductCategory.parent_id == parent_id)
            .order_by(ProductCategory.sort_order, ProductCategory.name_en)
        )
        return list(result.scalars().all())

    async def slug_exists(self, slug: str, exclude_id: int | None = None) -> bool:
        stmt = select(ProductCategory.id).where(ProductCategory.slug == slug)
        if exclude_id is not None:
            stmt = stmt.where(ProductCategory.id != exclude_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def has_children(self, category_id: int) -> bool:
        result = await self.db.execute(
            select(func.count(ProductCategory.id)).where(
                ProductCategory.parent_id == category_id
            )
        )
        return (result.scalar_one() or 0) > 0

    async def has_products(self, category_id: int) -> bool:
        from app.models.product import Product
        result = await self.db.execute(
            select(func.count(Product.id)).where(Product.category_id == category_id)
        )
        return (result.scalar_one() or 0) > 0

    async def create(self, category: ProductCategory) -> ProductCategory:
        self.db.add(category)
        try:
            await self.db.flush()
            await self.db.refresh(category)
            logger.info("Category created: id=%s name=%s", category.id, category.name_en)
            return category
        except IntegrityError:
            await self.db.rollback()
            raise

    async def update(self, category: ProductCategory, changes: dict) -> ProductCategory:
        for key, value in changes.items():
            setattr(category, key, value)
        try:
            await self.db.flush()
            await self.db.refresh(category)
            logger.info("Category updated: id=%s", category.id)
            return category
        except IntegrityError:
            await self.db.rollback()
            raise

    async def delete(self, category: ProductCategory) -> None:
        await self.db.delete(category)
        await self.db.flush()
        logger.info("Category deleted: id=%s name=%s", category.id, category.name_en)
