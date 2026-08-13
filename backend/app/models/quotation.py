import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class QuotationStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    APPROVED = "approved"
    REJECTED = "rejected"


class Quotation(Base):
    __tablename__ = "quotations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    quotation_no: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)

    customer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True,
    )
    forklift_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("forklifts.id", ondelete="SET NULL"), nullable=True, index=True,
    )

    expected_start_date: Mapped[date] = mapped_column(Date, nullable=False)
    expected_end_date: Mapped[date] = mapped_column(Date, nullable=False)
    rental_price: Mapped[float] = mapped_column(Float, nullable=False)
    daily_hours_quota: Mapped[int] = mapped_column(Integer, default=8, nullable=False)

    status: Mapped[str] = mapped_column(
        String(20), default=QuotationStatus.DRAFT.value, nullable=False, index=True,
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

    customer: Mapped["Customer"] = relationship("Customer")
    forklift: Mapped["Forklift | None"] = relationship("Forklift")
    creator: Mapped["User | None"] = relationship("User")
