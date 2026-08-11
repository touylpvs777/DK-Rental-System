import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


class TermCategory(str, enum.Enum):
    PAYMENT = "payment"
    PENALTY = "penalty"
    MAINTENANCE = "maintenance"
    INSURANCE = "insurance"
    DELIVERY = "delivery"
    LIABILITY = "liability"
    CUSTOM = "custom"


class TermDataType(str, enum.Enum):
    TEXT = "text"
    NUMBER = "number"
    PERCENTAGE = "percentage"
    DATE = "date"
    BOOLEAN = "boolean"
    CURRENCY = "currency"


class RentalContractTerm(Base):
    __tablename__ = "rental_contract_terms"
    __table_args__ = (
        UniqueConstraint("contract_id", "term_key", name="uq_rental_contract_terms_key"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    contract_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("rental_contracts.id", ondelete="CASCADE"), nullable=False, index=True,
    )

    term_category: Mapped[str] = mapped_column(String(30), nullable=False)
    term_key: Mapped[str] = mapped_column(String(100), nullable=False)
    term_label: Mapped[str] = mapped_column(String(300), nullable=False)
    term_value: Mapped[str] = mapped_column(Text, nullable=False)
    data_type: Mapped[str] = mapped_column(
        String(20), default=TermDataType.TEXT.value, nullable=False,
    )
    numeric_value: Mapped[float | None] = mapped_column(Float, nullable=True)

    is_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_visible_to_customer: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True,
    )

    contract: Mapped["RentalContract"] = relationship("RentalContract")
