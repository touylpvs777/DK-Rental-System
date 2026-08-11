from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class ServiceHistory(Base):
    __tablename__ = "service_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    forklift_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("forklifts.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    work_order_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("work_orders.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    service_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    service_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    technician_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    hour_meter_reading: Mapped[float | None] = mapped_column(Float, nullable=True)
    duration_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="LAK", nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    forklift: Mapped["Forklift"] = relationship("Forklift")
    work_order: Mapped["WorkOrder | None"] = relationship("WorkOrder")
    technician: Mapped["User | None"] = relationship("User")
