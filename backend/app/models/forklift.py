import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database.base import Base


# ── Enums ────────────────────────────────────────────────────────────────────


class ForkliftStatus(str, enum.Enum):
    IN_STOCK = "in_stock"
    SOLD = "sold"
    RENTED = "rented"
    IN_SERVICE = "in_service"
    RESERVED = "reserved"
    DECOMMISSIONED = "decommissioned"


class ForkliftCondition(str, enum.Enum):
    NEW = "new"
    USED = "used"
    REFURBISHED = "refurbished"


class OwnershipState(str, enum.Enum):
    """
    Who holds the asset, independent of its day-to-day operational status
    (`ForkliftStatus`). Kept as a separate dimension per the Asset Registry
    spec (M3) rather than folded into `ForkliftStatus`, since ownership and
    operations change independently (a rental-fleet unit cycles through
    IN_STOCK/RENTED/IN_SERVICE while its ownership_state stays `rental`).
    """
    FOR_SALE = "for_sale"
    RENTAL = "rental"
    CUSTOMER_OWNED = "customer_owned"
    RETIRED = "retired"


class FuelType(str, enum.Enum):
    ELECTRIC = "electric"
    DIESEL = "diesel"
    LPG = "lpg"
    DUAL_FUEL = "dual_fuel"


class DocumentType(str, enum.Enum):
    WARRANTY = "warranty"
    INSPECTION = "inspection"
    INSURANCE = "insurance"
    REGISTRATION = "registration"
    SERVICE_CONTRACT = "service_contract"
    MANUAL = "manual"
    CERTIFICATE = "certificate"
    OTHER = "other"


class CostType(str, enum.Enum):
    PURCHASE = "purchase"
    MAINTENANCE = "maintenance"
    REPAIR = "repair"
    INSURANCE = "insurance"
    PARTS = "parts"
    INSPECTION = "inspection"
    OTHER = "other"


# ── Forklift (the core asset) ───────────────────────────────────────────────


class Forklift(Base):
    __tablename__ = "forklifts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    serial_number: Mapped[str] = mapped_column(
        String(100), nullable=False, unique=True, index=True,
    )
    slug: Mapped[str] = mapped_column(String(300), nullable=False, unique=True, index=True)
    internal_code: Mapped[str | None] = mapped_column(String(50), nullable=True, unique=True)

    model_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("forklift_models.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    brand_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("brands.id", ondelete="SET NULL"), nullable=True, index=True,
    )
    customer_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True,
    )

    name_en: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    name_lo: Mapped[str | None] = mapped_column(String(300), nullable=True)
    model_number: Mapped[str | None] = mapped_column(String(150), nullable=True, index=True)

    status: Mapped[str] = mapped_column(
        String(30), default=ForkliftStatus.IN_STOCK.value, nullable=False, index=True,
    )
    ownership_state: Mapped[str] = mapped_column(
        String(20), default=OwnershipState.FOR_SALE.value, nullable=False, index=True,
    )
    condition: Mapped[str] = mapped_column(
        String(20), default=ForkliftCondition.NEW.value, nullable=False,
    )
    fuel_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    capacity_kg: Mapped[float | None] = mapped_column(Float, nullable=True)

    year_manufactured: Mapped[int | None] = mapped_column(Integer, nullable=True)
    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    warranty_expiry: Mapped[date | None] = mapped_column(Date, nullable=True)

    initial_hour_meter: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    current_hour_meter: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # ── IoT Telemetry (GPS/hour-meter devices) ────────────────────────────
    iot_device_id: Mapped[str | None] = mapped_column(
        String(100), nullable=True, unique=True, index=True,
    )
    last_telemetry_ping: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )
    current_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    current_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_location_update: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
    )

    @property
    def meter_hours(self) -> int:
        """Integer engine-hours view for the Asset Registry API. `current_hour_meter`
        (float, with its own audit log via ForkliftHourMeterLog) stays the single
        source of truth — this is a read-only rounded projection, not a second
        writable field that could drift out of sync."""
        return round(self.current_hour_meter)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    created_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    updated_by: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True,
    )

    forklift_model: Mapped["ForkliftModel | None"] = relationship(
        "ForkliftModel", back_populates="forklifts",
    )
    brand: Mapped["Brand | None"] = relationship("Brand")
    customer: Mapped["Customer | None"] = relationship("Customer")

    status_history: Mapped[list["ForkliftStatusHistory"]] = relationship(
        "ForkliftStatusHistory",
        back_populates="forklift",
        cascade="all, delete-orphan",
        order_by="ForkliftStatusHistory.id.desc()",
    )
    locations: Mapped[list["ForkliftLocation"]] = relationship(
        "ForkliftLocation",
        back_populates="forklift",
        cascade="all, delete-orphan",
        order_by="ForkliftLocation.effective_date.desc()",
    )
    hour_meter_logs: Mapped[list["ForkliftHourMeterLog"]] = relationship(
        "ForkliftHourMeterLog",
        back_populates="forklift",
        cascade="all, delete-orphan",
        order_by="ForkliftHourMeterLog.recorded_at.desc()",
    )
    documents: Mapped[list["ForkliftDocument"]] = relationship(
        "ForkliftDocument",
        back_populates="forklift",
        cascade="all, delete-orphan",
        order_by="ForkliftDocument.created_at.desc()",
    )
    photos: Mapped[list["ForkliftPhoto"]] = relationship(
        "ForkliftPhoto",
        back_populates="forklift",
        cascade="all, delete-orphan",
        order_by="ForkliftPhoto.sort_order",
    )
    ownership_costs: Mapped[list["ForkliftOwnershipCost"]] = relationship(
        "ForkliftOwnershipCost",
        back_populates="forklift",
        cascade="all, delete-orphan",
        order_by="ForkliftOwnershipCost.cost_date.desc()",
    )
    specs: Mapped[list["ForkliftSpec"]] = relationship(
        "ForkliftSpec",
        back_populates="forklift",
        cascade="all, delete-orphan",
        order_by="ForkliftSpec.id",
    )
