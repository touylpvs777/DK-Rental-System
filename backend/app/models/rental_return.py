import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean, Date, DateTime, Float, ForeignKey, Integer, JSON, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class ReturnType(str, enum.Enum):
    SCHEDULED = "scheduled"
    EARLY = "early"
    OVERDUE = "overdue"


class ReturnStatus(str, enum.Enum):
    REQUESTED = "requested"
    SCHEDULED = "scheduled"
    PICKED_UP = "picked_up"
    RECEIVED = "received"
    INSPECTED = "inspected"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class RentalReturn(Base):
    __tablename__ = "rental_returns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    return_number: Mapped[str] = mapped_column(
        String(50), nullable=False, unique=True,
    )
    contract_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("rental_contracts.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    contract_item_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("rental_contract_items.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    forklift_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("forklifts.id", ondelete="SET NULL"), nullable=True, index=True,
    )

    return_type: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default=ReturnStatus.REQUESTED.value, nullable=False,
    )
    is_early_termination: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    early_termination_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    requested_date: Mapped[date] = mapped_column(Date, nullable=False)
    scheduled_pickup_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    actual_pickup_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    actual_received_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    pickup_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    departure_hour_meter: Mapped[float | None] = mapped_column(Float, nullable=True)
    arrival_hour_meter: Mapped[float | None] = mapped_column(Float, nullable=True)

    condition_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    overall_condition: Mapped[str | None] = mapped_column(String(20), nullable=True)
    exterior_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    mechanical_pass: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    safety_equipment_pass: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    photo_urls: Mapped[list | None] = mapped_column(JSON, nullable=True)
    customer_signoff_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    assigned_driver: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    inspected_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True,
    )

    contract: Mapped["RentalContract"] = relationship("RentalContract", back_populates="returns")
    contract_item: Mapped["RentalContractItem | None"] = relationship("RentalContractItem")
    forklift: Mapped["Forklift | None"] = relationship("Forklift")
    driver_user: Mapped["User | None"] = relationship(
        "User", foreign_keys="[RentalReturn.assigned_driver]",
    )
    inspector_user: Mapped["User | None"] = relationship(
        "User", foreign_keys="[RentalReturn.inspected_by]",
    )
    damage_reports: Mapped[list["RentalDamageReport"]] = relationship(
        "RentalDamageReport",
        back_populates="rental_return",
        cascade="all, delete-orphan",
    )
