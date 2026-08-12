import enum
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class ContractItemStatus(str, enum.Enum):
    RESERVED = "reserved"
    ACTIVE = "active"
    RETURNING = "returning"
    INSPECTING = "inspecting"
    SETTLED = "settled"
    CANCELLED = "cancelled"


class RentalContractItem(Base):
    __tablename__ = "rental_contract_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    contract_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("rental_contracts.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    forklift_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("forklifts.id", ondelete="SET NULL"), nullable=True, index=True,
    )

    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(String(1000), nullable=False)

    monthly_rate: Mapped[float] = mapped_column(Float, nullable=False)
    daily_rate: Mapped[float] = mapped_column(Float, nullable=False)
    hourly_rate: Mapped[float | None] = mapped_column(Float, nullable=True)

    contracted_hours_limit: Mapped[float | None] = mapped_column(Float, nullable=True)
    maintenance_interval_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    departure_hour_meter: Mapped[float | None] = mapped_column(Float, nullable=True)
    return_hour_meter: Mapped[float | None] = mapped_column(Float, nullable=True)
    hours_used: Mapped[float | None] = mapped_column(Float, nullable=True)

    line_status: Mapped[str] = mapped_column(
        String(20), default=ContractItemStatus.RESERVED.value, nullable=False,
    )
    line_total: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True,
    )

    contract: Mapped["RentalContract"] = relationship("RentalContract", back_populates="items")
    forklift: Mapped["Forklift | None"] = relationship("Forklift")
