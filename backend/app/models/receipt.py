import enum
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class ReceiptStatus(str, enum.Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


class ReceiptPaymentMethod(str, enum.Enum):
    CASH = "cash"
    TRANSFER = "transfer"
    CHEQUE = "cheque"


class Receipt(Base):
    __tablename__ = "receipts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    receipt_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(
        String(30), default=ReceiptStatus.DRAFT.value, nullable=False, index=True,
    )

    # A receipt always acknowledges payment against a specific invoice —
    # RESTRICT keeps an invoice from being deleted while receipts still
    # point to it. This is deliberately a lightweight acknowledgment
    # document only: it does NOT mutate Invoice.amount_paid/balance_due —
    # that bookkeeping is already fully owned by the Payment/PaymentAllocation
    # system in the Billing module, and duplicating it here would create two
    # sources of truth for how much has been paid on an invoice.
    invoice_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("invoices.id", ondelete="RESTRICT"), nullable=False, index=True,
    )
    customer_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    assigned_to: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True,
    )

    payment_date: Mapped[date] = mapped_column(Date, nullable=False)
    payment_method: Mapped[str] = mapped_column(
        String(20), default=ReceiptPaymentMethod.CASH.value, nullable=False,
    )
    # Free text (e.g. "LDB", "BCEL") rather than a hardcoded enum — bank
    # names vary and this only matters for transfer/cheque payments.
    bank_account: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reference_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    amount_received: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="LAK", nullable=False)
    exchange_rate: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    customer_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Free-text vehicle/equipment details carried over from the invoice, for
    # display consistency with the rest of the document suite — same
    # rationale as Quotation/SalesOrder: not linked to the internal
    # Forklift fleet model.
    vehicle_make: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vehicle_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vehicle_vin: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vehicle_engine_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vehicle_reg_no: Mapped[str | None] = mapped_column(String(50), nullable=True)
    job_number: Mapped[str | None] = mapped_column(String(50), nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    internal_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    terms_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)

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
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    invoice: Mapped["Invoice"] = relationship("Invoice")
    customer: Mapped["Customer | None"] = relationship("Customer")
    assigned_user: Mapped["User | None"] = relationship(
        "User", foreign_keys="[Receipt.assigned_to]",
    )

    status_history: Mapped[list["ReceiptStatusHistory"]] = relationship(
        "ReceiptStatusHistory",
        back_populates="receipt",
        cascade="all, delete-orphan",
        order_by="ReceiptStatusHistory.id.desc()",
    )
