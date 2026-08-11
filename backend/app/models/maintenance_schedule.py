import enum
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class ScheduleStatus(str, enum.Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


class MaintenanceSchedule(Base):
    __tablename__ = "maintenance_schedules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    forklift_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("forklifts.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    plan_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("maintenance_plans.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    status: Mapped[str] = mapped_column(String(20), default=ScheduleStatus.ACTIVE.value, nullable=False, index=True)
    next_due_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    next_due_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_service_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    last_service_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    times_serviced: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    forklift: Mapped["Forklift"] = relationship("Forklift")
    plan: Mapped["MaintenancePlan"] = relationship("MaintenancePlan", back_populates="schedules")
