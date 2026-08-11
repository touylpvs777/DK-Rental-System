import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class SalesOrderStatus(str, enum.Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class SalesOrder(Base):
    __tablename__ = "sales_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    so_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(
        String(30), default=SalesOrderStatus.DRAFT.value, nullable=False, index=True,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)

    # Optional link back to the quotation this order was confirmed from —
    # a Sales Order may also be entered directly with no prior quotation.
    quotation_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("quotations.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    customer_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True,
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
    exchange_rate: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    bank_details: Mapped[str | None] = mapped_column(Text, nullable=True)

    order_date: Mapped[date] = mapped_column(Date, nullable=False)
    expected_delivery_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    customer_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Free-text vehicle/equipment details this order is for — same rationale
    # as Quotation: not linked to the internal Forklift fleet model.
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

    quotation: Mapped["Quotation | None"] = relationship("Quotation")
    customer: Mapped["Customer | None"] = relationship("Customer")
    assigned_user: Mapped["User | None"] = relationship(
        "User", foreign_keys="[SalesOrder.assigned_to]",
    )

    items: Mapped[list["SalesOrderItem"]] = relationship(
        "SalesOrderItem",
        back_populates="sales_order",
        cascade="all, delete-orphan",
        order_by="SalesOrderItem.sort_order",
    )
    status_history: Mapped[list["SalesOrderStatusHistory"]] = relationship(
        "SalesOrderStatusHistory",
        back_populates="sales_order",
        cascade="all, delete-orphan",
        order_by="SalesOrderStatusHistory.id.desc()",
    )
    delivery_notes: Mapped[list["DeliveryNote"]] = relationship(
        "DeliveryNote", back_populates="sales_order",
    )
