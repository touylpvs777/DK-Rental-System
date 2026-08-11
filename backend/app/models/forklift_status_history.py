from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class ForkliftStatusHistory(Base):
    __tablename__ = "forklift_status_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    forklift_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("forklifts.id", ondelete="CASCADE"), nullable=False, index=True,
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

    forklift: Mapped["Forklift"] = relationship("Forklift", back_populates="status_history")
    user: Mapped["User | None"] = relationship("User")
