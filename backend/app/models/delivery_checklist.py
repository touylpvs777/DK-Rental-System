from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class DeliveryChecklist(Base):
    __tablename__ = "delivery_checklists"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    delivery_order_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("delivery_orders.id", ondelete="CASCADE"), nullable=False, index=True,
    )

    item_group: Mapped[str] = mapped_column(String(50), nullable=False)
    item_name: Mapped[str] = mapped_column(String(200), nullable=False)
    is_passed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    remark: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True,
    )

    delivery_order: Mapped["DeliveryOrder"] = relationship("DeliveryOrder", back_populates="checklist_items")
