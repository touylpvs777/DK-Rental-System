import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class RecognitionType(str, enum.Enum):
    RENTAL_INCOME = "rental_income"
    SERVICE_FEE = "service_fee"
    PENALTY_FEE = "penalty_fee"
    DAMAGE_RECOVERY = "damage_recovery"
    DEPOSIT_FORFEITURE = "deposit_forfeiture"


class RecognitionStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    RECOGNIZED = "recognized"
    REVERSED = "reversed"


class RevenueRecognition(Base):
    __tablename__ = "revenue_recognitions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    recognition_number: Mapped[str] = mapped_column(
        String(50), nullable=False, unique=True, index=True,
    )
    invoice_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("invoices.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    invoice_item_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("invoice_items.id", ondelete="SET NULL"),
        nullable=True,
    )
    contract_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("rental_contracts.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )

    recognition_type: Mapped[str] = mapped_column(String(30), nullable=False)
    recognition_status: Mapped[str] = mapped_column(
        String(20), default=RecognitionStatus.SCHEDULED.value,
        nullable=False, index=True,
    )

    recognition_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="LAK", nullable=False)

    period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True)

    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

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

    invoice: Mapped["Invoice | None"] = relationship("Invoice")
    invoice_item: Mapped["InvoiceItem | None"] = relationship("InvoiceItem")
    contract: Mapped["RentalContract"] = relationship("RentalContract")
    creator: Mapped["User | None"] = relationship(
        "User", foreign_keys="[RevenueRecognition.created_by]",
    )
