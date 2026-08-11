from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator

from app.models.spare_part import PartCategory
from app.models.inventory_transaction import TransactionType
from app.models.purchase_order import POStatus
from app.schemas.partner import PartnerBrief


# ── Brief models ─────────────────────────────────────────────────────────────

class BrandBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int; name: str; slug: str

class WarehouseBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int; code: str; name: str

class SparePartBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int; part_number: str; name: str; unit: str; unit_price: float

class UserBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int; username: str; full_name: str | None = None


# ── Spare Part ───────────────────────────────────────────────────────────────

class SparePartCreate(BaseModel):
    part_number: str = Field(..., min_length=1, max_length=100)
    name: str = Field(..., min_length=1, max_length=300)
    description: str | None = None
    part_category: PartCategory = PartCategory.GENERAL
    brand_id: int | None = None
    unit: str = Field(default="piece", max_length=30)
    unit_price: float = Field(default=0.0, ge=0)
    currency: str = Field(default="LAK", max_length=3)
    min_stock_level: int = Field(default=5, ge=0)
    reorder_quantity: int = Field(default=10, ge=1)
    lead_time_days: int = Field(default=7, ge=0)
    image_url: str | None = Field(default=None, max_length=500)

class SparePartUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=300)
    description: str | None = None
    part_category: PartCategory | None = None
    brand_id: int | None = None
    unit: str | None = None
    unit_price: float | None = Field(default=None, ge=0)
    min_stock_level: int | None = Field(default=None, ge=0)
    reorder_quantity: int | None = Field(default=None, ge=1)
    lead_time_days: int | None = Field(default=None, ge=0)
    image_url: str | None = None
    is_active: bool | None = None

class SparePartOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int; part_number: str; name: str; description: str | None = None
    part_category: str; brand: BrandBrief | None = None
    unit: str; unit_price: float; currency: str
    min_stock_level: int; reorder_quantity: int; lead_time_days: int
    image_url: str | None = None; is_active: bool
    created_at: datetime; updated_at: datetime | None = None

class SparePartListResponse(BaseModel):
    items: list[SparePartOut]; total: int; page: int; page_size: int; pages: int


# ── Warehouse ────────────────────────────────────────────────────────────────

class WarehouseCreate(BaseModel):
    code: str = Field(..., min_length=1, max_length=20)
    name: str = Field(..., min_length=1, max_length=200)
    address: str | None = None
    contact_name: str | None = Field(default=None, max_length=200)
    contact_phone: str | None = Field(default=None, max_length=50)

class WarehouseOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int; code: str; name: str; address: str | None = None
    contact_name: str | None = None; contact_phone: str | None = None
    is_active: bool; created_at: datetime; updated_at: datetime | None = None


# ── Inventory Balance ────────────────────────────────────────────────────────

class BalanceOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int; spare_part: SparePartBrief; warehouse: WarehouseBrief
    quantity_on_hand: float; quantity_reserved: float; quantity_available: float
    last_count_date: datetime | None = None; updated_at: datetime | None = None


# ── Transaction ──────────────────────────────────────────────────────────────

class TransactionCreate(BaseModel):
    transaction_type: TransactionType
    spare_part_id: int
    warehouse_id: int
    quantity: float = Field(..., gt=0)
    unit_cost: float = Field(default=0.0, ge=0)
    reference_type: str | None = Field(default=None, max_length=30)
    reference_id: int | None = None
    notes: str | None = None

class TransactionOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int; transaction_number: str; transaction_type: str
    spare_part: SparePartBrief; warehouse: WarehouseBrief
    quantity: float; unit_cost: float; total_cost: float
    reference_type: str | None = None; reference_id: int | None = None
    notes: str | None = None; user: UserBrief | None = None; created_at: datetime


# ── Purchase Order ───────────────────────────────────────────────────────────

class POItemCreate(BaseModel):
    spare_part_id: int | None = None
    item_code: str | None = Field(default=None, max_length=100)
    description: str | None = Field(default=None, max_length=500)
    unit: str | None = Field(default=None, max_length=50)
    quantity_ordered: float = Field(..., gt=0)
    unit_cost: float = Field(..., ge=0)
    notes: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def _require_identity(self):
        if self.spare_part_id is None and not (self.description or "").strip():
            raise ValueError("Each line needs either spare_part_id or a description.")
        return self

class POCreate(BaseModel):
    vendor: str = Field(..., min_length=1, max_length=200)
    vendor_address: str | None = None
    vendor_contact: str | None = Field(default=None, max_length=200)
    partner_id: int | None = None
    warehouse_id: int
    order_date: date
    expected_date: date | None = None
    tax_rate: float = Field(default=0.0, ge=0, le=100)
    notes: str | None = None
    items: list[POItemCreate] = Field(..., min_length=1)

class POUpdate(BaseModel):
    vendor: str | None = Field(default=None, min_length=1, max_length=200)
    vendor_address: str | None = None
    vendor_contact: str | None = Field(default=None, max_length=200)
    partner_id: int | None = None
    warehouse_id: int | None = None
    order_date: date | None = None
    expected_date: date | None = None
    tax_rate: float | None = Field(default=None, ge=0, le=100)
    notes: str | None = None

class POItemOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int; spare_part: SparePartBrief | None = None
    item_code: str | None = None; description: str | None = None; unit: str | None = None
    quantity_ordered: float; quantity_received: float
    unit_cost: float; line_total: float; notes: str | None = None

class POOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int; po_number: str; status: str; vendor: str
    vendor_address: str | None = None; vendor_contact: str | None = None
    partner: PartnerBrief | None = None
    warehouse: WarehouseBrief; order_date: date
    expected_date: date | None = None; received_date: date | None = None
    subtotal: float; tax_rate: float; tax_amount: float; total_amount: float; currency: str
    notes: str | None = None; is_active: bool
    cancellation_reason: str | None = None
    created_at: datetime; updated_at: datetime | None = None
    items: list[POItemOut] = []

class POListResponse(BaseModel):
    items: list["POListOut"]; total: int; page: int; page_size: int; pages: int

class POListOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int; po_number: str; status: str; vendor: str
    warehouse: WarehouseBrief; order_date: date
    expected_date: date | None = None
    subtotal: float; total_amount: float; currency: str
    is_active: bool; created_at: datetime

class ReceiveItemAction(BaseModel):
    item_id: int
    quantity_received: float = Field(..., gt=0)

class CancelPOAction(BaseModel):
    cancellation_reason: str | None = Field(default=None, max_length=1000)


# ── Consumption ──────────────────────────────────────────────────────────────

class ConsumeAction(BaseModel):
    spare_part_id: int
    warehouse_id: int
    quantity: float = Field(..., gt=0)
    work_order_id: int | None = None
    forklift_id: int | None = None
    notes: str | None = None

class ConsumptionOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int; spare_part: SparePartBrief; warehouse: WarehouseBrief
    work_order: "WOBrief | None" = None; forklift: "ForkliftBrief | None" = None
    quantity: float; unit_cost: float; total_cost: float
    notes: str | None = None; user: UserBrief | None = None; consumed_at: datetime

class WOBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int; work_order_number: str; status: str

class ForkliftBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int; serial_number: str; name_en: str


# ── Dashboard ────────────────────────────────────────────────────────────────

class ReorderAlertItem(BaseModel):
    spare_part_id: int; part_number: str; name: str
    warehouse_id: int; warehouse_code: str; warehouse_name: str
    quantity_available: float; min_stock_level: int; reorder_quantity: int

class InventoryDashboardSummary(BaseModel):
    total_parts: int; total_warehouses: int
    total_stock_value: float; currency: str
    low_stock_count: int; pending_po_count: int
    reorder_alerts: list[ReorderAlertItem]


# ── Rebuild ──────────────────────────────────────────────────────────────────

POOut.model_rebuild()
POListResponse.model_rebuild()
ConsumptionOut.model_rebuild()
