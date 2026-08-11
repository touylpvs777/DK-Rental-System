import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    SENT = "sent"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"
    VOIDED = "voided"


class ReferenceType(str, enum.Enum):
    """What kind of thing this invoice bills for, when it isn't tied to a
    rental contract (see `contract_id`/`reference_id` below)."""
    WORK_ORDER = "work_order"
    RENTAL = "rental"
    SALES = "sales"


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    invoice_number: Mapped[str] = mapped_column(
        String(50), nullable=False, unique=True, index=True,
    )
    # Nullable: only rental-billing-cycle invoices (the original design) are
    # tied to a contract. Invoices billing a work order or a plain sale have
    # no rental contract at all — see `reference_type`/`reference_id` below.
    contract_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("rental_contracts.id", ondelete="RESTRICT"),
        nullable=True, index=True,
    )
    customer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )

    # Generic source tag for non-rental invoices (mirrors the entity_type/
    # entity_id polymorphic-association pattern already used by ActivityLog).
    # Not a FK: reference_id can point into work_orders, rental_contracts, or
    # nowhere (a plain sale), so no single table could constrain it.
    reference_type: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    reference_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    status: Mapped[str] = mapped_column(
        String(30), default=InvoiceStatus.DRAFT.value, nullable=False, index=True,
    )

    issue_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    paid_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    subtotal: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    tax_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    tax_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    discount_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    amount_paid: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    balance_due: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="LAK", nullable=False)
    # Rate to convert `currency` into the org's base currency (LAK) at time of
    # issue — 1.0 when currency is already LAK.
    exchange_rate: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    # Freeform per-invoice bank details (staff-entered, printed on the PDF) —
    # distinct from the org-wide bank details in Settings.
    bank_details: Mapped[str | None] = mapped_column(Text, nullable=True)

    billing_period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    billing_period_end: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Free-text details of the customer-owned vehicle/equipment this invoice
    # is for (e.g. a repair job) — not linked to the internal Forklift fleet
    # model, since the vehicle may not be one of DK's own assets.
    vehicle_make: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vehicle_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vehicle_vin: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vehicle_engine_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vehicle_reg_no: Mapped[str | None] = mapped_column(String(50), nullable=True)
    job_number: Mapped[str | None] = mapped_column(String(50), nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    internal_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

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
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False, index=True,
    )

    customer: Mapped["Customer"] = relationship("Customer")
    contract: Mapped["RentalContract | None"] = relationship("RentalContract")
    items: Mapped[list["InvoiceItem"]] = relationship(
        "InvoiceItem", back_populates="invoice",
        cascade="all, delete-orphan", order_by="InvoiceItem.sort_order",
    )
    allocations: Mapped[list["PaymentAllocation"]] = relationship(
        "PaymentAllocation", back_populates="invoice", cascade="all, delete-orphan",
    )
    creator: Mapped["User | None"] = relationship(
        "User", foreign_keys="[Invoice.created_by]",
    )
