from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class MovementHistory(Base):
    __tablename__ = "movement_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    movement_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("asset_movements.id", ondelete="CASCADE"), nullable=False, index=True,
    )

    from_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    to_status: Mapped[str] = mapped_column(String(20), nullable=False)

    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    recorded_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True,
    )

    movement: Mapped["AssetMovement"] = relationship("AssetMovement", back_populates="checkpoints")
    user: Mapped["User | None"] = relationship("User")
