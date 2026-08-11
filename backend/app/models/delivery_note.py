import enum
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class DeliveryNoteStatus(str, enum.Enum):
    DRAFT = "draft"
    DISPATCHED = "dispatched"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class DeliveryNote(Base):
    __tablename__ = "delivery_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    dn_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(
        String(30), default=DeliveryNoteStatus.DRAFT.value, nullable=False, index=True,
    )

    # A delivery note always fulfils a specific sales order — RESTRICT keeps a
    # sales order from being deleted while delivery history still points to it.
    sales_order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("sales_orders.id", ondelete="RESTRICT"), nullable=False, index=True,
    )
    customer_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    assigned_to: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True,
    )

    delivery_date: Mapped[date] = mapped_column(Date, nullable=False)
    delivery_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    warehouse: Mapped[str | None] = mapped_column(String(200), nullable=True)
    driver_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    vehicle_plate: Mapped[str | None] = mapped_column(String(50), nullable=True)
    customer_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)

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

    sales_order: Mapped["SalesOrder"] = relationship("SalesOrder", back_populates="delivery_notes")
    customer: Mapped["Customer | None"] = relationship("Customer")
    assigned_user: Mapped["User | None"] = relationship(
        "User", foreign_keys="[DeliveryNote.assigned_to]",
    )

    items: Mapped[list["DeliveryNoteItem"]] = relationship(
        "DeliveryNoteItem",
        back_populates="delivery_note",
        cascade="all, delete-orphan",
        order_by="DeliveryNoteItem.sort_order",
    )
    status_history: Mapped[list["DeliveryNoteStatusHistory"]] = relationship(
        "DeliveryNoteStatusHistory",
        back_populates="delivery_note",
        cascade="all, delete-orphan",
        order_by="DeliveryNoteStatusHistory.id.desc()",
    )
