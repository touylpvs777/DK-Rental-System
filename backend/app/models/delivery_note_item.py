from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class DeliveryNoteItem(Base):
    __tablename__ = "delivery_note_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    delivery_note_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("delivery_notes.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)

    item_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str] = mapped_column(String(1000), nullable=False)
    # Reference-only — what the sales order called for, not stored back onto it.
    quantity_ordered: Mapped[float | None] = mapped_column(Float, nullable=True)
    quantity_delivered: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    unit: Mapped[str] = mapped_column(String(50), default="unit", nullable=False)

    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )

    delivery_note: Mapped["DeliveryNote"] = relationship("DeliveryNote", back_populates="items")
