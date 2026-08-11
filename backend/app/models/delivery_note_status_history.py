from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class DeliveryNoteStatusHistory(Base):
    __tablename__ = "delivery_note_status_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    delivery_note_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("delivery_notes.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    from_status: Mapped[str | None] = mapped_column(String(30), nullable=True)
    to_status: Mapped[str] = mapped_column(String(30), nullable=False)
    reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    changed_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True,
    )

    delivery_note: Mapped["DeliveryNote"] = relationship("DeliveryNote", back_populates="status_history")
    user: Mapped["User | None"] = relationship("User")
