from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class ShiftHandover(Base):
    __tablename__ = "shift_handovers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    rental_contract_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("rental_contracts.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    forklift_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("forklifts.id", ondelete="CASCADE"), nullable=False, index=True,
    )

    handover_datetime: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True,
    )
    shift_name: Mapped[str] = mapped_column(String(50), nullable=False)
    handover_person: Mapped[str] = mapped_column(String(200), nullable=False)
    receiver_person: Mapped[str] = mapped_column(String(200), nullable=False)
    hour_meter: Mapped[float] = mapped_column(Float, nullable=False)
    checklist_status: Mapped[str] = mapped_column(String(30), default="normal", nullable=False, index=True)
    issues_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    issue_photos: Mapped[list | None] = mapped_column(JSON, nullable=True)
    signatures: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True,
    )

    rental_contract: Mapped["RentalContract"] = relationship("RentalContract")
    forklift: Mapped["Forklift"] = relationship("Forklift")
    creator: Mapped["User | None"] = relationship("User")
