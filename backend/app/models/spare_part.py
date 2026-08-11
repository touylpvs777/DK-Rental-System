import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class PartCategory(str, enum.Enum):
    FILTER = "filter"
    BELT = "belt"
    BRAKE = "brake"
    HYDRAULIC = "hydraulic"
    ELECTRICAL = "electrical"
    ENGINE = "engine"
    TIRE = "tire"
    CHAIN = "chain"
    BATTERY = "battery"
    LUBRICANT = "lubricant"
    GENERAL = "general"


class SparePart(Base):
    __tablename__ = "spare_parts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    part_number: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    part_category: Mapped[str] = mapped_column(String(20), default=PartCategory.GENERAL.value, nullable=False, index=True)
    brand_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("brands.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    unit: Mapped[str] = mapped_column(String(30), default="piece", nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="LAK", nullable=False)
    min_stock_level: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    reorder_quantity: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    lead_time_days: Mapped[int] = mapped_column(Integer, default=7, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    brand: Mapped["Brand | None"] = relationship("Brand")
