import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class DamageCategory(str, enum.Enum):
    NORMAL_WEAR = "normal_wear"
    MINOR_DAMAGE = "minor_damage"
    MAJOR_DAMAGE = "major_damage"
    MISSING_PARTS = "missing_parts"
    TOTAL_LOSS = "total_loss"


class DisputeStatus(str, enum.Enum):
    NONE = "none"
    DISPUTED = "disputed"
    RESOLVED = "resolved"


class RentalDamageReport(Base):
    __tablename__ = "rental_damage_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    report_number: Mapped[str] = mapped_column(
        String(50), nullable=False, unique=True,
    )
    return_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("rental_returns.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    contract_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("rental_contracts.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    forklift_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("forklifts.id", ondelete="SET NULL"), nullable=True, index=True,
    )

    damage_category: Mapped[str] = mapped_column(String(30), nullable=False)
    component: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    photo_urls: Mapped[list | None] = mapped_column(JSON, nullable=True)

    repair_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    parts_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    downtime_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    downtime_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_charge: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    final_charge: Mapped[float | None] = mapped_column(Float, nullable=True)

    is_customer_liable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    dispute_status: Mapped[str] = mapped_column(
        String(20), default=DisputeStatus.NONE.value, nullable=False,
    )
    dispute_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    dispute_resolution: Mapped[str | None] = mapped_column(Text, nullable=True)
    dispute_resolved_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    dispute_resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )

    assessed_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    assessed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True,
    )

    rental_return: Mapped["RentalReturn"] = relationship("RentalReturn", back_populates="damage_reports")
    contract: Mapped["RentalContract"] = relationship("RentalContract", back_populates="damage_reports")
    forklift: Mapped["Forklift | None"] = relationship("Forklift")
    assessor: Mapped["User | None"] = relationship(
        "User", foreign_keys="[RentalDamageReport.assessed_by]",
    )
    dispute_resolver: Mapped["User | None"] = relationship(
        "User", foreign_keys="[RentalDamageReport.dispute_resolved_by]",
    )
