import logging
from dataclasses import dataclass, field

from sqlalchemy import delete, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product import Product, ProductCompatBrand, ProductImage, ProductSpec

logger = logging.getLogger(__name__)


@dataclass
class ProductFilter:
    q: str | None = None
    category_id: int | None = None
    brand_id: int | None = None
    is_active: bool | None = True
    is_rental: bool | None = None
    is_sale: bool | None = None
    is_featured: bool | None = None
    page: int = 1
    page_size: int = 20
    sort: str = "sort_order"          # sort_order | name_en | created_at | updated_at
    order: str = "asc"               # asc | desc
    category_ids: list[int] = field(default_factory=list)


class ProductRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Single-item lookups ───────────────────────────────────────────────────

    async def get_by_id(self, product_id: int) -> Product | None:
        result = await self.db.execute(
            select(Product)
            .options(
                selectinload(Product.brand),
                selectinload(Product.category),
                selectinload(Product.images),
            )
            .where(Product.id == product_id)
        )
        return result.scalar_one_or_none()

    async def get_detail(self, product_id: int) -> Product | None:
        result = await self.db.execute(
            select(Product)
            .options(
                selectinload(Product.brand),
                selectinload(Product.category),
                selectinload(Product.specs),
                selectinload(Product.images),
                selectinload(Product.compat_brands).selectinload(ProductCompatBrand.brand),
            )
            .where(Product.id == product_id)
        )
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Product | None:
        result = await self.db.execute(
            select(Product)
            .options(
                selectinload(Product.brand),
                selectinload(Product.category),
                selectinload(Product.specs),
                selectinload(Product.images),
                selectinload(Product.compat_brands).selectinload(ProductCompatBrand.brand),
            )
            .where(Product.slug == slug)
        )
        return result.scalar_one_or_none()

    async def get_by_sku(self, sku: str) -> Product | None:
        result = await self.db.execute(select(Product).where(Product.sku == sku))
        return result.scalar_one_or_none()

    async def get_by_model_and_brand(
        self, model_number: str, brand_id: int | None
    ) -> Product | None:
        stmt = select(Product).where(
            func.lower(Product.model_number) == model_number.lower()
        )
        if brand_id is not None:
            stmt = stmt.where(Product.brand_id == brand_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    # ── List / search ─────────────────────────────────────────────────────────

    async def get_list(self, f: ProductFilter) -> tuple[list[Product], int]:
        stmt = (
            select(Product)
            .options(
                selectinload(Product.brand),
                selectinload(Product.category),
                selectinload(Product.images),
            )
        )
        stmt = self._apply_filters(stmt, f)

        count_stmt = select(func.count(Product.id))
        count_stmt = self._apply_filters(count_stmt, f)
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()

        sort_col = {
            "name_en": Product.name_en,
            "created_at": Product.created_at,
            "updated_at": Product.updated_at,
            "sort_order": Product.sort_order,
        }.get(f.sort, Product.sort_order)

        if f.order == "desc":
            stmt = stmt.order_by(sort_col.desc())
        else:
            stmt = stmt.order_by(sort_col.asc())

        offset = (f.page - 1) * f.page_size
        stmt = stmt.offset(offset).limit(f.page_size)

        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    def _apply_filters(self, stmt, f: ProductFilter):
        if f.is_active is not None:
            stmt = stmt.where(Product.is_active == f.is_active)
        if f.brand_id is not None:
            stmt = stmt.where(Product.brand_id == f.brand_id)
        if f.category_ids:
            stmt = stmt.where(Product.category_id.in_(f.category_ids))
        elif f.category_id is not None:
            stmt = stmt.where(Product.category_id == f.category_id)
        if f.is_rental is not None:
            stmt = stmt.where(Product.is_rental == f.is_rental)
        if f.is_sale is not None:
            stmt = stmt.where(Product.is_sale == f.is_sale)
        if f.is_featured is not None:
            stmt = stmt.where(Product.is_featured == f.is_featured)
        if f.q:
            pattern = f"%{f.q}%"
            stmt = stmt.where(
                or_(
                    Product.name_en.ilike(pattern),
                    Product.model_number.ilike(pattern),
                    Product.description_en.ilike(pattern),
                )
            )
        return stmt

    # ── Slug helpers ──────────────────────────────────────────────────────────

    async def slug_exists(self, slug: str, exclude_id: int | None = None) -> bool:
        stmt = select(Product.id).where(Product.slug == slug)
        if exclude_id is not None:
            stmt = stmt.where(Product.id != exclude_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none() is not None

    async def sku_exists(self, sku: str, exclude_id: int | None = None) -> bool:
        stmt = select(Product.id).where(Product.sku == sku)
        if exclude_id is not None:
            stmt = stmt.where(Product.id != exclude_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none() is not None

    # ── Mutations ─────────────────────────────────────────────────────────────

    async def create(self, product: Product) -> Product:
        self.db.add(product)
        try:
            await self.db.flush()
            await self.db.refresh(product)
            logger.info("Product created: id=%s sku=%s", product.id, product.sku)
            return product
        except IntegrityError:
            await self.db.rollback()
            raise

    async def update(self, product: Product, changes: dict) -> Product:
        for key, value in changes.items():
            setattr(product, key, value)
        try:
            await self.db.flush()
            await self.db.refresh(product)
            logger.info("Product updated: id=%s", product.id)
            return product
        except IntegrityError:
            await self.db.rollback()
            raise

    async def delete(self, product: Product) -> None:
        await self.db.delete(product)
        await self.db.flush()
        logger.info("Product deleted: id=%s sku=%s", product.id, product.sku)

    # ── Specs ─────────────────────────────────────────────────────────────────

    async def get_spec_by_id(self, spec_id: int) -> ProductSpec | None:
        return await self.db.get(ProductSpec, spec_id)

    async def add_spec(self, spec: ProductSpec) -> ProductSpec:
        self.db.add(spec)
        await self.db.flush()
        await self.db.refresh(spec)
        return spec

    async def update_spec(self, spec: ProductSpec, changes: dict) -> ProductSpec:
        for key, value in changes.items():
            setattr(spec, key, value)
        await self.db.flush()
        await self.db.refresh(spec)
        return spec

    async def delete_spec(self, spec: ProductSpec) -> None:
        await self.db.delete(spec)
        await self.db.flush()

    async def clear_specs_by_group(self, product_id: int, spec_group: str) -> None:
        await self.db.execute(
            delete(ProductSpec).where(
                ProductSpec.product_id == product_id,
                ProductSpec.spec_group == spec_group,
            )
        )

    # ── Images ────────────────────────────────────────────────────────────────

    async def get_image_by_id(self, image_id: int) -> ProductImage | None:
        return await self.db.get(ProductImage, image_id)

    async def add_image(self, image: ProductImage) -> ProductImage:
        self.db.add(image)
        await self.db.flush()
        await self.db.refresh(image)
        return image

    async def update_image(self, image: ProductImage, changes: dict) -> ProductImage:
        for key, value in changes.items():
            setattr(image, key, value)
        await self.db.flush()
        await self.db.refresh(image)
        return image

    async def delete_image(self, image: ProductImage) -> None:
        await self.db.delete(image)
        await self.db.flush()
