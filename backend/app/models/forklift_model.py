from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class ForkliftModel(Base):
    __tablename__ = "forklift_models"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    brand_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("brands.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, index=True)
    series: Mapped[str | None] = mapped_column(String(100), nullable=True)
    fuel_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    capacity_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_lift_height_mm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True,
    )

    brand: Mapped["Brand | None"] = relationship("Brand", back_populates="forklift_models")
    forklifts: Mapped[list["Forklift"]] = relationship(
        "Forklift", back_populates="forklift_model", passive_deletes=True,
    )
