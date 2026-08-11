from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class ForkliftLocation(Base):
    __tablename__ = "forklift_locations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    forklift_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("forklifts.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    location_name: Mapped[str] = mapped_column(String(200), nullable=False)
    warehouse_zone: Mapped[str | None] = mapped_column(String(100), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    customer_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True,
    )
    effective_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    recorded_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    forklift: Mapped["Forklift"] = relationship("Forklift", back_populates="locations")
    customer: Mapped["Customer | None"] = relationship("Customer")
    user: Mapped["User | None"] = relationship("User")
