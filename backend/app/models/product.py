from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sku: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    name_lo: Mapped[str | None] = mapped_column(String(300), nullable=True)
    name_en: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(300), nullable=False, unique=True, index=True)
    model_number: Mapped[str | None] = mapped_column(String(150), nullable=True, index=True)
    brand_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("brands.id", ondelete="SET NULL"), nullable=True, index=True
    )
    category_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("product_categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    description_lo: Mapped[str | None] = mapped_column(Text, nullable=True)
    description_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_sale: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_rental: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_used_available: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_service_item: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    updated_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    brand: Mapped["Brand | None"] = relationship("Brand", back_populates="products")
    category: Mapped["ProductCategory | None"] = relationship(
        "ProductCategory", back_populates="products"
    )
    specs: Mapped[list["ProductSpec"]] = relationship(
        "ProductSpec",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductSpec.sort_order",
    )
    images: Mapped[list["ProductImage"]] = relationship(
        "ProductImage",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductImage.sort_order",
    )
    compat_brands: Mapped[list["ProductCompatBrand"]] = relationship(
        "ProductCompatBrand", back_populates="product", cascade="all, delete-orphan"
    )


class ProductSpec(Base):
    """EAV table for flexible product specifications grouped by section."""

    __tablename__ = "product_specs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    spec_group: Mapped[str] = mapped_column(String(100), nullable=False)
    spec_key: Mapped[str] = mapped_column(String(100), nullable=False)
    spec_label: Mapped[str] = mapped_column(String(150), nullable=False)
    spec_value: Mapped[str] = mapped_column(String(500), nullable=False)
    spec_unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    product: Mapped["Product"] = relationship("Product", back_populates="specs")


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    alt_text: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    product: Mapped["Product"] = relationship("Product", back_populates="images")


class ProductCompatBrand(Base):
    """Spare-parts compatibility — brands that a product is compatible with."""

    __tablename__ = "product_compat_brands"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    brand_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("brands.id", ondelete="CASCADE"), nullable=False, index=True
    )
    notes: Mapped[str | None] = mapped_column(String(300), nullable=True)

    product: Mapped["Product"] = relationship("Product", back_populates="compat_brands")
    brand: Mapped["Brand"] = relationship("Brand", back_populates="compat_entries")
