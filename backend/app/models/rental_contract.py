import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


# ── Enums ────────────────────────────────────────────────────────────────────


class RentalContractStatus(str, enum.Enum):
    RESERVATION = "reservation"
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REVISION = "revision"
    DELIVERING = "delivering"
    ACTIVE = "active"
    OVERDUE = "overdue"
    RETURNING = "returning"
    INSPECTING = "inspecting"
    SETTLING = "settling"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class ContractType(str, enum.Enum):
    SHORT_TERM = "short_term"
    LONG_TERM = "long_term"
    PROJECT = "project"


class DepositStatus(str, enum.Enum):
    PENDING = "pending"
    RECEIVED = "received"
    REFUNDED = "refunded"
    FORFEITED = "forfeited"


# ── Model ────────────────────────────────────────────────────────────────────


class RentalContract(Base):
    __tablename__ = "rental_contracts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    contract_number: Mapped[str] = mapped_column(
        String(50), nullable=False, unique=True, index=True,
    )

    customer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True,
    )
    # Data lineage back to the approved Quotation this contract was created
    # from, if any — SET NULL (not RESTRICT) since a signed contract must
    # stand on its own even if the source quotation is later deleted.
    quotation_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("quotations.id", ondelete="SET NULL"), nullable=True, index=True,
    )

    status: Mapped[str] = mapped_column(
        String(30), default=RentalContractStatus.RESERVATION.value, nullable=False, index=True,
    )
    contract_type: Mapped[str] = mapped_column(
        String(20), default=ContractType.SHORT_TERM.value, nullable=False,
    )
    revision_number: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    actual_start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    actual_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    billing_cycle_day: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    payment_terms_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)

    deposit_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    deposit_status: Mapped[str] = mapped_column(
        String(20), default=DepositStatus.PENDING.value, nullable=False,
    )

    early_termination_fee_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    late_return_penalty_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    overtime_rate_pct: Mapped[float] = mapped_column(Float, default=150.0, nullable=False)

    # ── Contract Quotas & Rest Policy ───────────────────────────────────────
    daily_hours_quota: Mapped[int] = mapped_column(Integer, default=8, nullable=False)
    overtime_rate_per_hour: Mapped[float | None] = mapped_column(Float, nullable=True)
    rest_policy_work_hours: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    rest_policy_rest_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    job_type: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # ── Legal Document ───────────────────────────────────────────────────────
    contract_body: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachment_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    subtotal: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    tax_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    tax_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    discount_amount: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="LAK", nullable=False)

    delivery_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    delivery_contact_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    delivery_contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    internal_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    reservation_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )

    assigned_to: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    approved_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )
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

    # ── Relationships ────────────────────────────────────────────────────────

    customer: Mapped["Customer"] = relationship("Customer")
    assigned_user: Mapped["User | None"] = relationship(
        "User", foreign_keys="[RentalContract.assigned_to]",
    )
    approved_by_user: Mapped["User | None"] = relationship(
        "User", foreign_keys="[RentalContract.approved_by]",
    )

    items: Mapped[list["RentalContractItem"]] = relationship(
        "RentalContractItem",
        back_populates="contract",
        cascade="all, delete-orphan",
        order_by="RentalContractItem.sort_order",
    )
    status_history: Mapped[list["RentalContractStatusHistory"]] = relationship(
        "RentalContractStatusHistory",
        back_populates="contract",
        cascade="all, delete-orphan",
        order_by="RentalContractStatusHistory.id.desc()",
    )
    extensions: Mapped[list["RentalExtension"]] = relationship(
        "RentalExtension",
        back_populates="contract",
        cascade="all, delete-orphan",
        order_by="RentalExtension.id.desc()",
    )
    returns: Mapped[list["RentalReturn"]] = relationship(
        "RentalReturn",
        back_populates="contract",
        cascade="all, delete-orphan",
        order_by="RentalReturn.id.desc()",
    )
    billing_cycles: Mapped[list["RentalBillingCycle"]] = relationship(
        "RentalBillingCycle",
        back_populates="contract",
        cascade="all, delete-orphan",
        order_by="RentalBillingCycle.id.desc()",
    )
    damage_reports: Mapped[list["RentalDamageReport"]] = relationship(
        "RentalDamageReport",
        back_populates="contract",
        cascade="all, delete-orphan",
        order_by="RentalDamageReport.id.desc()",
    )
    delivery_orders: Mapped[list["DeliveryOrder"]] = relationship(
        "DeliveryOrder",
        back_populates="contract",
        order_by="DeliveryOrder.id.desc()",
    )
