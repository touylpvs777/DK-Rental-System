import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class BillingType(str, enum.Enum):
    RENTAL_PERIOD = "rental_period"
    DEPOSIT = "deposit"
    DEPOSIT_REFUND = "deposit_refund"
    DELIVERY_FEE = "delivery_fee"
    RETRIEVAL_FEE = "retrieval_fee"
    OVERTIME_HOURS = "overtime_hours"
    EARLY_TERMINATION = "early_termination"
    LATE_RETURN_PENALTY = "late_return_penalty"
    DAMAGE_CHARGE = "damage_charge"
    ADJUSTMENT = "adjustment"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    INVOICED = "invoiced"
    PAID = "paid"
    OVERDUE = "overdue"
    WAIVED = "waived"


class RentalBillingCycle(Base):
    __tablename__ = "rental_billing_cycles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    billing_number: Mapped[str] = mapped_column(
        String(50), nullable=False, unique=True,
    )
    contract_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("rental_contracts.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    contract_item_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("rental_contract_items.id", ondelete="SET NULL"), nullable=True, index=True,
    )

    billing_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)

    period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True)

    quantity: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    unit_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    tax_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="LAK", nullable=False)

    is_credit: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    payment_status: Mapped[str] = mapped_column(
        String(20), default=PaymentStatus.PENDING.value, nullable=False, index=True,
    )
    invoice_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    paid_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    generated_by: Mapped[str] = mapped_column(String(20), default="system", nullable=False)
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

    contract: Mapped["RentalContract"] = relationship("RentalContract", back_populates="billing_cycles")
    contract_item: Mapped["RentalContractItem | None"] = relationship("RentalContractItem")
    creator: Mapped["User | None"] = relationship(
        "User", foreign_keys="[RentalBillingCycle.created_by]",
    )
