import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class QuotationType(str, enum.Enum):
    RENTAL = "rental"
    SALES = "sales"
    SERVICE = "service"
    SPARE_PARTS = "spare_parts"


class QuotationStatus(str, enum.Enum):
    DRAFT = "draft"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REVISION = "revision"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CONVERTED = "converted"
    CANCELLED = "cancelled"


class ItemType(str, enum.Enum):
    FORKLIFT_RENTAL = "forklift_rental"
    FORKLIFT_SALE = "forklift_sale"
    SERVICE = "service"
    SPARE_PART = "spare_part"
    DELIVERY = "delivery"
    INSURANCE = "insurance"
    CUSTOM = "custom"


class Quotation(Base):
    __tablename__ = "quotations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    quotation_number: Mapped[str] = mapped_column(
        String(50), nullable=False, unique=True, index=True,
    )
    revision_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    parent_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("quotations.id", ondelete="SET NULL"), nullable=True, index=True,
    )

    quotation_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(30), default=QuotationStatus.DRAFT.value, nullable=False, index=True,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)

    customer_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    lead_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    assigned_to: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True,
    )

    contact_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    subtotal: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    tax_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    tax_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    discount_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    round_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="LAK", nullable=False)
    # Rate to convert `currency` into the org's base currency (LAK) — 1.0 when
    # currency is already LAK.
    exchange_rate: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    # Freeform per-quotation bank details (staff-entered, printed on the PDF).
    bank_details: Mapped[str | None] = mapped_column(Text, nullable=True)

    valid_from: Mapped[date | None] = mapped_column(Date, nullable=True)
    valid_until: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    # Customer's own PO/reference number for this quotation — distinct from
    # our internal quotation_number, shown as "Reference" on the document header.
    customer_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Free-text details of the customer-owned vehicle/equipment this quote is
    # for — not linked to the internal Forklift fleet model (see Invoice for
    # the identical rationale).
    vehicle_make: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vehicle_model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vehicle_vin: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vehicle_engine_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vehicle_reg_no: Mapped[str | None] = mapped_column(String(50), nullable=True)
    job_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    machine_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    hour_meter: Mapped[float | None] = mapped_column(Float, nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    internal_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    terms_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)

    converted_to_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    converted_to_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

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

    customer: Mapped["Customer | None"] = relationship("Customer")
    lead: Mapped["Lead | None"] = relationship("Lead")
    assigned_user: Mapped["User | None"] = relationship(
        "User", foreign_keys="[Quotation.assigned_to]",
    )

    items: Mapped[list["QuotationItem"]] = relationship(
        "QuotationItem",
        back_populates="quotation",
        cascade="all, delete-orphan",
        order_by="QuotationItem.sort_order",
    )
    status_history: Mapped[list["QuotationStatusHistory"]] = relationship(
        "QuotationStatusHistory",
        back_populates="quotation",
        cascade="all, delete-orphan",
        order_by="QuotationStatusHistory.id.desc()",
    )
    approvals: Mapped[list["QuotationApproval"]] = relationship(
        "QuotationApproval",
        back_populates="quotation",
        cascade="all, delete-orphan",
        order_by="QuotationApproval.id.desc()",
    )
