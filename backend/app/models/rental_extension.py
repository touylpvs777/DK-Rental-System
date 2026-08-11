import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class ExtensionStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class RentalExtension(Base):
    __tablename__ = "rental_extensions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    contract_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("rental_contracts.id", ondelete="CASCADE"), nullable=False, index=True,
    )

    extension_number: Mapped[int] = mapped_column(Integer, nullable=False)
    original_end_date: Mapped[date] = mapped_column(Date, nullable=False)
    new_end_date: Mapped[date] = mapped_column(Date, nullable=False)
    rate_adjustment_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    new_monthly_rate: Mapped[float | None] = mapped_column(Float, nullable=True)

    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default=ExtensionStatus.PENDING.value, nullable=False,
    )
    conditions: Mapped[str | None] = mapped_column(Text, nullable=True)

    requested_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    approved_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    decided_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    contract: Mapped["RentalContract"] = relationship("RentalContract", back_populates="extensions")
    requester: Mapped["User | None"] = relationship(
        "User", foreign_keys="[RentalExtension.requested_by]",
    )
    approver: Mapped["User | None"] = relationship(
        "User", foreign_keys="[RentalExtension.approved_by]",
    )
