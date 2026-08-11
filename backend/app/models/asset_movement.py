import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class MovementType(str, enum.Enum):
    WAREHOUSE_TRANSFER = "warehouse_transfer"
    CUSTOMER_DEPLOYMENT = "customer_deployment"
    CUSTOMER_RETURN = "customer_return"
    INTERNAL_RELOCATION = "internal_relocation"


class MovementStatus(str, enum.Enum):
    DRAFT = "draft"
    PREPARING = "preparing"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class MovementPriority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class AssetMovement(Base):
    __tablename__ = "asset_movements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    movement_number: Mapped[str] = mapped_column(
        String(50), nullable=False, unique=True, index=True,
    )

    movement_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(20), default=MovementStatus.DRAFT.value, nullable=False, index=True,
    )
    priority: Mapped[str] = mapped_column(
        String(10), default=MovementPriority.NORMAL.value, nullable=False,
    )

    forklift_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("forklifts.id", ondelete="RESTRICT"), nullable=False, index=True,
    )
    rental_contract_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("rental_contracts.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    customer_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True,
    )

    from_location: Mapped[str] = mapped_column(String(200), nullable=False)
    from_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    to_location: Mapped[str] = mapped_column(String(200), nullable=False)
    to_address: Mapped[str | None] = mapped_column(Text, nullable=True)

    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    actual_departure: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    actual_arrival: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    departure_hour_meter: Mapped[float | None] = mapped_column(Float, nullable=True)
    arrival_hour_meter: Mapped[float | None] = mapped_column(Float, nullable=True)

    assigned_driver_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True,
    )

    tracking_code: Mapped[str | None] = mapped_column(String(100), nullable=True, unique=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    internal_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    updated_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    forklift: Mapped["Forklift"] = relationship("Forklift")
    customer: Mapped["Customer | None"] = relationship("Customer")
    rental_contract: Mapped["RentalContract | None"] = relationship("RentalContract")
    assigned_driver: Mapped["User | None"] = relationship(
        "User", foreign_keys="[AssetMovement.assigned_driver_id]",
    )
    checkpoints: Mapped[list["MovementHistory"]] = relationship(
        "MovementHistory",
        back_populates="movement",
        cascade="all, delete-orphan",
        order_by="MovementHistory.recorded_at.desc()",
    )
