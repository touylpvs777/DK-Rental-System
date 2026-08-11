from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class InventoryBalance(Base):
    __tablename__ = "inventory_balances"
    __table_args__ = (
        UniqueConstraint("spare_part_id", "warehouse_id", name="uq_part_warehouse"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    spare_part_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("spare_parts.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    warehouse_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    quantity_on_hand: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    quantity_reserved: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    quantity_available: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    last_count_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    spare_part: Mapped["SparePart"] = relationship("SparePart")
    warehouse: Mapped["Warehouse"] = relationship("Warehouse")
