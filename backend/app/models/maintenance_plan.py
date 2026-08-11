import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class ServiceType(str, enum.Enum):
    PREVENTIVE = "preventive"
    CORRECTIVE = "corrective"
    INSPECTION = "inspection"
    CERTIFICATION = "certification"


class IntervalType(str, enum.Enum):
    HOURS = "hours"
    DAYS = "days"
    MONTHS = "months"


class MaintenancePlan(Base):
    __tablename__ = "maintenance_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    plan_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    service_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    interval_type: Mapped[str] = mapped_column(String(10), nullable=False)
    interval_value: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_duration_hours: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    estimated_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    checklist: Mapped[list | None] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    schedules: Mapped[list["MaintenanceSchedule"]] = relationship(
        "MaintenanceSchedule", back_populates="plan", cascade="all, delete-orphan",
    )
