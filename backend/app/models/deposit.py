import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class DepositType(str, enum.Enum):
    SECURITY = "security"
    ADVANCE = "advance"
    GUARANTEE = "guarantee"


class DepositRecordStatus(str, enum.Enum):
    PENDING = "pending"
    RECEIVED = "received"
    PARTIALLY_REFUNDED = "partially_refunded"
    REFUNDED = "refunded"
    FORFEITED = "forfeited"
    APPLIED = "applied"


class Deposit(Base):
    __tablename__ = "deposits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    deposit_number: Mapped[str] = mapped_column(
        String(50), nullable=False, unique=True, index=True,
    )
    contract_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("rental_contracts.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )
    customer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )

    deposit_type: Mapped[str] = mapped_column(String(20), nullable=False)
    deposit_status: Mapped[str] = mapped_column(
        String(30), default=DepositRecordStatus.PENDING.value,
        nullable=False, index=True,
    )

    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="LAK", nullable=False)

    received_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    refund_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    refund_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    forfeit_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    applied_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    payment_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("payments.id", ondelete="SET NULL"), nullable=True,
    )
    refund_payment_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("payments.id", ondelete="SET NULL"), nullable=True,
    )

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

    contract: Mapped["RentalContract"] = relationship("RentalContract")
    customer: Mapped["Customer"] = relationship("Customer")
    payment: Mapped["Payment | None"] = relationship(
        "Payment", foreign_keys="[Deposit.payment_id]",
    )
    refund_payment: Mapped["Payment | None"] = relationship(
        "Payment", foreign_keys="[Deposit.refund_payment_id]",
    )
    creator: Mapped["User | None"] = relationship(
        "User", foreign_keys="[Deposit.created_by]",
    )
