from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class PaymentAllocation(Base):
    __tablename__ = "payment_allocations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    payment_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("payments.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    invoice_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )

    allocated_amount: Mapped[float] = mapped_column(Float, nullable=False)

    allocated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    allocated_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )

    payment: Mapped["Payment"] = relationship(
        "Payment", back_populates="allocations",
    )
    invoice: Mapped["Invoice"] = relationship(
        "Invoice", back_populates="allocations",
    )
    allocator: Mapped["User | None"] = relationship("User")
