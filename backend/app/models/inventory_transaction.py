import enum
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class TransactionType(str, enum.Enum):
    RECEIVE = "receive"
    ISSUE = "issue"
    ADJUST = "adjust"
    TRANSFER = "transfer"
    RETURN = "return"
    CONSUME = "consume"


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    transaction_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    spare_part_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("spare_parts.id", ondelete="RESTRICT"), nullable=False, index=True,
    )
    warehouse_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False, index=True,
    )
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    reference_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    reference_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    spare_part: Mapped["SparePart"] = relationship("SparePart")
    warehouse: Mapped["Warehouse"] = relationship("Warehouse")
    user: Mapped["User | None"] = relationship("User")
