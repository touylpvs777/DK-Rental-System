from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class ForkliftSpec(Base):
    __tablename__ = "forklift_specs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    forklift_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("forklifts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    mast_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    max_lift_height_mm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    front_tire: Mapped[str | None] = mapped_column(String(50), nullable=True)
    rear_tire: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tire_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    fork_length_mm: Mapped[int | None] = mapped_column(Integer, nullable=True)
    battery_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    attachment_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True,
    )

    forklift: Mapped["Forklift"] = relationship(
        "Forklift", back_populates="specs",
    )
