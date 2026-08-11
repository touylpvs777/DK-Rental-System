import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.database.base import Base


class PartnerType(str, enum.Enum):
    VENDOR = "vendor"
    CUSTOMER = "customer"


class Partner(Base):
    """
    A vendor or client an enterprise financial document (Purchase Order,
    Invoice, Quotation) is issued to/from. Distinct from `Customer`
    (CRM-System/backend/app/models/customer.py), which already covers the
    sales-side "client" relationship for Invoices/Quotations/Rentals — this
    table fills the gap on the vendor side, where Purchase Orders today only
    store a vendor as plain free-text fields.
    """

    __tablename__ = "partners"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    partner_type: Mapped[str] = mapped_column(String(20), default=PartnerType.VENDOR.value, nullable=False, index=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
