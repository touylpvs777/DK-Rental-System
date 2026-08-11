import logging
import math

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product, ProductCompatBrand, ProductImage, ProductSpec
from app.repositories.product_repository import ProductFilter, ProductRepository
from app.schemas.product import (
    CompatBrandAdd,
    ImageCreate,
    ImageUpdate,
    ProductCreate,
    ProductDetail,
    ProductListResponse,
    ProductOut,
    ProductUpdate,
    SpecCreate,
    SpecUpdate,
)
from app.utils.slugify import slugify

logger = logging.getLogger(__name__)

_VALID_SORTS = {"sort_order", "name_en", "created_at", "updated_at"}
_VALID_ORDERS = {"asc", "desc"}


class ProductService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = ProductRepository(db)

    # ── List ──────────────────────────────────────────────────────────────────

    async def list_products(
        self,
        q: str | None = None,
        category_id: int | None = None,
        brand_id: int | None = None,
        is_active: bool | None = True,
        is_rental: bool | None = None,
        is_sale: bool | None = None,
        is_featured: bool | None = None,
        page: int = 1,
        page_size: int = 20,
        sort: str = "sort_order",
        order: str = "asc",
    ) -> ProductListResponse:
        page = max(1, page)
        page_size = min(max(1, page_size), 100)
        sort = sort if sort in _VALID_SORTS else "sort_order"
        order = order if order in _VALID_ORDERS else "asc"

        f = ProductFilter(
            q=q,
            category_id=category_id,
            brand_id=brand_id,
            is_active=is_active,
            is_rental=is_rental,
            is_sale=is_sale,
            is_featured=is_featured,
            page=page,
            page_size=page_size,
            sort=sort,
            order=order,
        )
        products, total = await self._repo.get_list(f)
        pages = math.ceil(total / page_size) if page_size else 1

        items = [ProductOut.from_orm_with_image(p) for p in products]
        return ProductListResponse(
            items=items, total=total, page=page, page_size=page_size, pages=pages
        )

    # ── Single item ───────────────────────────────────────────────────────────

    async def get_product(self, product_id: int) -> ProductDetail:
        product = await self._repo.get_detail(product_id)
        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
            )
        return self._to_detail(product)

    async def get_product_by_slug(self, slug: str) -> ProductDetail:
        product = await self._repo.get_by_slug(slug)
        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
            )
        return self._to_detail(product)

    # ── Create ────────────────────────────────────────────────────────────────

    async def create_product(self, data: ProductCreate, created_by: int) -> Product:
        slug = slugify(data.name_en)
        if await self._repo.slug_exists(slug):
            base = slug
            counter = 2
            while await self._repo.slug_exists(f"{base}-{counter}"):
                counter += 1
            slug = f"{base}-{counter}"

        sku = data.sku or self._generate_sku(data)
        if await self._repo.sku_exists(sku):
            counter = 2
            while await self._repo.sku_exists(f"{sku}-{counter}"):
                counter += 1
            sku = f"{sku}-{counter}"

        product = Product(
            sku=sku,
            slug=slug,
            name_en=data.name_en.strip(),
            name_lo=data.name_lo,
            model_number=data.model_number,
            brand_id=data.brand_id,
            category_id=data.category_id,
            description_en=data.description_en,
            description_lo=data.description_lo,
            is_active=data.is_active,
            is_featured=data.is_featured,
            is_sale=data.is_sale,
            is_rental=data.is_rental,
            is_used_available=data.is_used_available,
            is_service_item=data.is_service_item,
            sort_order=data.sort_order,
            created_by=created_by,
            updated_by=created_by,
        )
        try:
            product = await self._repo.create(product)
            await self.db.commit()
            return product
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A product with this SKU or slug already exists.",
            )

    # ── Update ────────────────────────────────────────────────────────────────

    async def update_product(
        self, product_id: int, data: ProductUpdate, updated_by: int
    ) -> Product:
        product = await self._require_product(product_id)
        changes = data.model_dump(exclude_unset=True)

        if "name_en" in changes:
            new_slug = slugify(changes["name_en"])
            if await self._repo.slug_exists(new_slug, exclude_id=product_id):
                base = new_slug
                counter = 2
                while await self._repo.slug_exists(f"{base}-{counter}", exclude_id=product_id):
                    counter += 1
                new_slug = f"{base}-{counter}"
            changes["slug"] = new_slug

        changes["updated_by"] = updated_by
        try:
            product = await self._repo.update(product, changes)
            await self.db.commit()
            return product
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Update conflicts with an existing product.",
            )

    # ── Delete ────────────────────────────────────────────────────────────────

    async def delete_product(self, product_id: int) -> None:
        product = await self._require_product(product_id)
        await self._repo.delete(product)
        await self.db.commit()

    # ── Specs ─────────────────────────────────────────────────────────────────

    async def add_spec(self, product_id: int, data: SpecCreate) -> ProductSpec:
        await self._require_product(product_id)
        spec = ProductSpec(
            product_id=product_id,
            spec_group=data.spec_group,
            spec_key=data.spec_key,
            spec_label=data.spec_label,
            spec_value=data.spec_value,
            spec_unit=data.spec_unit,
            sort_order=data.sort_order,
        )
        spec = await self._repo.add_spec(spec)
        await self.db.commit()
        return spec

    async def update_spec(
        self, product_id: int, spec_id: int, data: SpecUpdate
    ) -> ProductSpec:
        spec = await self._require_spec(spec_id, product_id)
        spec = await self._repo.update_spec(spec, data.model_dump(exclude_unset=True))
        await self.db.commit()
        return spec

    async def delete_spec(self, product_id: int, spec_id: int) -> None:
        spec = await self._require_spec(spec_id, product_id)
        await self._repo.delete_spec(spec)
        await self.db.commit()

    # ── Images ────────────────────────────────────────────────────────────────

    async def add_image(self, product_id: int, data: ImageCreate) -> ProductImage:
        await self._require_product(product_id)
        image = ProductImage(
            product_id=product_id,
            image_url=data.image_url,
            alt_text=data.alt_text,
            is_primary=data.is_primary,
            sort_order=data.sort_order,
        )
        image = await self._repo.add_image(image)
        await self.db.commit()
        return image

    async def update_image(
        self, product_id: int, image_id: int, data: ImageUpdate
    ) -> ProductImage:
        image = await self._require_image(image_id, product_id)
        image = await self._repo.update_image(image, data.model_dump(exclude_unset=True))
        await self.db.commit()
        return image

    async def delete_image(self, product_id: int, image_id: int) -> None:
        image = await self._require_image(image_id, product_id)
        await self._repo.delete_image(image)
        await self.db.commit()

    # ── Compat brands ─────────────────────────────────────────────────────────

    async def add_compat_brand(
        self, product_id: int, data: CompatBrandAdd
    ) -> ProductCompatBrand:
        await self._require_product(product_id)
        entry = ProductCompatBrand(
            product_id=product_id,
            brand_id=data.brand_id,
            notes=data.notes,
        )
        self.db.add(entry)
        await self.db.flush()
        await self.db.refresh(entry)
        await self.db.commit()
        return entry

    async def remove_compat_brand(self, product_id: int, compat_id: int) -> None:
        entry = await self.db.get(ProductCompatBrand, compat_id)
        if entry is None or entry.product_id != product_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Compatibility entry not found",
            )
        await self.db.delete(entry)
        await self.db.commit()

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _require_product(self, product_id: int) -> Product:
        product = await self._repo.get_by_id(product_id)
        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Product not found"
            )
        return product

    async def _require_spec(self, spec_id: int, product_id: int) -> ProductSpec:
        spec = await self._repo.get_spec_by_id(spec_id)
        if spec is None or spec.product_id != product_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Spec not found"
            )
        return spec

    async def _require_image(self, image_id: int, product_id: int) -> ProductImage:
        image = await self._repo.get_image_by_id(image_id)
        if image is None or image.product_id != product_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Image not found"
            )
        return image

    @staticmethod
    def _generate_sku(data: ProductCreate) -> str:
        parts = []
        if data.brand_id:
            parts.append(f"B{data.brand_id}")
        name_part = slugify(data.name_en)[:12].upper().replace("-", "")
        parts.append(name_part)
        import time
        parts.append(str(int(time.time()))[-5:])
        return "-".join(parts)

    @staticmethod
    def _to_detail(product: Product) -> ProductDetail:
        specs_grouped: dict[str, list] = {}
        for spec in product.specs:
            specs_grouped.setdefault(spec.spec_group, []).append(spec)

        obj = ProductDetail.model_validate(product)
        obj.specs_grouped = specs_grouped  # type: ignore[assignment]

        primary = next(
            (img.image_url for img in product.images if img.is_primary),
            product.images[0].image_url if product.images else None,
        )
        obj.primary_image_url = primary
        return obj
