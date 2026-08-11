import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class BrandRole(str, enum.Enum):
    PRIMARY = "primary"      # DK LAO represents this brand (sales + service)
    PARTS_ONLY = "parts_only"  # DK LAO supplies spare parts only
    BOTH = "both"            # both primary and parts supply


class Brand(Base):
    __tablename__ = "brands"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(String(150), nullable=False, unique=True, index=True)
    brand_role: Mapped[str] = mapped_column(
        String(20), default=BrandRole.PRIMARY.value, nullable=False
    )
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    website: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )

    products: Mapped[list["Product"]] = relationship(
        "Product", back_populates="brand", passive_deletes=True
    )
    compat_entries: Mapped[list["ProductCompatBrand"]] = relationship(
        "ProductCompatBrand", back_populates="brand", passive_deletes=True
    )
