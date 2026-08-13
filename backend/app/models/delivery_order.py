import enum
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class DeliveryOrderStatus(str, enum.Enum):
    PENDING = "pending"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class DeliveryOrderType(str, enum.Enum):
    DELIVERY = "delivery"
    RETURN = "return"


class DeliveryOrder(Base):
    __tablename__ = "delivery_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    do_no: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    order_type: Mapped[str] = mapped_column(
        String(20), default=DeliveryOrderType.DELIVERY.value, nullable=False, index=True,
    )

    contract_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("rental_contracts.id", ondelete="RESTRICT"), nullable=False, index=True,
    )

    delivery_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    delivery_address: Mapped[str] = mapped_column(Text, nullable=False)
    driver_name: Mapped[str] = mapped_column(String(200), nullable=False)

    status: Mapped[str] = mapped_column(
        String(20), default=DeliveryOrderStatus.PENDING.value, nullable=False, index=True,
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

    contract: Mapped["RentalContract"] = relationship("RentalContract", back_populates="delivery_orders")
    creator: Mapped["User | None"] = relationship("User")
    checklist_items: Mapped[list["DeliveryChecklist"]] = relationship(
        "DeliveryChecklist",
        back_populates="delivery_order",
        cascade="all, delete-orphan",
        order_by="DeliveryChecklist.id",
    )
