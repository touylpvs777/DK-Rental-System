import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class WorkOrderStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    DUE = "due"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    VERIFIED = "verified"
    CANCELLED = "cancelled"


class WorkOrderPriority(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class OrderType(str, enum.Enum):
    PREVENTIVE = "preventive"
    CORRECTIVE = "corrective"
    EMERGENCY = "emergency"
    INSPECTION = "inspection"
    INSTALL = "install"


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    work_order_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)

    forklift_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("forklifts.id", ondelete="RESTRICT"), nullable=False, index=True,
    )
    schedule_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("maintenance_schedules.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    plan_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("maintenance_plans.id", ondelete="SET NULL"), nullable=True,
    )

    order_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(20), default=WorkOrderStatus.SCHEDULED.value, nullable=False, index=True,
    )
    priority: Mapped[str] = mapped_column(
        String(10), default=WorkOrderPriority.NORMAL.value, nullable=False, index=True,
    )

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    assigned_to: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    # Full timestamp (not just a calendar date) so a work order can be scheduled
    # to a specific time of day, per the Asset Registry M6 spec's `scheduled_at`.
    scheduled_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )

    hour_meter_at_service: Mapped[float | None] = mapped_column(Float, nullable=True)
    estimated_hours: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    actual_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    estimated_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    actual_cost: Mapped[float | None] = mapped_column(Float, nullable=True)

    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)

    findings: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolution: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    forklift: Mapped["Forklift"] = relationship("Forklift")
    schedule: Mapped["MaintenanceSchedule | None"] = relationship("MaintenanceSchedule")
    plan: Mapped["MaintenancePlan | None"] = relationship("MaintenancePlan")
    technician: Mapped["User | None"] = relationship("User", foreign_keys="[WorkOrder.assigned_to]")
    verifier: Mapped["User | None"] = relationship("User", foreign_keys="[WorkOrder.verified_by]")
    costs: Mapped[list["MaintenanceCost"]] = relationship(
        "MaintenanceCost", back_populates="work_order", cascade="all, delete-orphan",
    )
