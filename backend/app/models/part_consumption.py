from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class PartConsumption(Base):
    __tablename__ = "part_consumptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    spare_part_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("spare_parts.id", ondelete="RESTRICT"), nullable=False, index=True,
    )
    warehouse_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("warehouses.id", ondelete="RESTRICT"), nullable=False, index=True,
    )
    work_order_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("work_orders.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    forklift_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("forklifts.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    unit_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    total_cost: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    consumed_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    consumed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    spare_part: Mapped["SparePart"] = relationship("SparePart")
    warehouse: Mapped["Warehouse"] = relationship("Warehouse")
    work_order: Mapped["WorkOrder | None"] = relationship("WorkOrder")
    forklift: Mapped["Forklift | None"] = relationship("Forklift")
    user: Mapped["User | None"] = relationship("User")
