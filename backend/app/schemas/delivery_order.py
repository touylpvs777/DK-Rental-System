from datetime import datetime

from pydantic import BaseModel, Field

from app.models.delivery_order import DeliveryOrderStatus, DeliveryOrderType


# ── Brief models ─────────────────────────────────────────────────────────────

class CustomerBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    first_name: str
    last_name: str
    company: str | None = None


class ContractBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    contract_number: str
    status: str
    customer: CustomerBrief


class UserBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    username: str
    full_name: str | None = None


# ── Checklist item schemas ──────────────────────────────────────────────────

class DeliveryChecklistItemCreate(BaseModel):
    item_group: str = Field(..., min_length=1, max_length=50)
    item_name: str = Field(..., min_length=1, max_length=200)
    is_passed: bool = True
    remark: str | None = None


class DeliveryChecklistItemOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    item_group: str
    item_name: str
    is_passed: bool
    remark: str | None = None
    created_at: datetime
    updated_at: datetime | None = None


# ── Delivery order schemas ──────────────────────────────────────────────────

class DeliveryOrderCreate(BaseModel):
    contract_id: int
    order_type: DeliveryOrderType = DeliveryOrderType.DELIVERY
    delivery_date: datetime
    delivery_address: str = Field(..., min_length=1)
    driver_name: str = Field(..., min_length=1, max_length=200)
    status: DeliveryOrderStatus = DeliveryOrderStatus.PENDING
    notes: str | None = None
    checklist_items: list[DeliveryChecklistItemCreate] | None = None


class DeliveryOrderUpdate(BaseModel):
    order_type: DeliveryOrderType | None = None
    delivery_date: datetime | None = None
    delivery_address: str | None = Field(default=None, min_length=1)
    driver_name: str | None = Field(default=None, min_length=1, max_length=200)
    status: DeliveryOrderStatus | None = None
    notes: str | None = None
    # When provided, fully replaces the existing checklist (delete + recreate)
    # — the checklist section on the form always resubmits its whole state.
    checklist_items: list[DeliveryChecklistItemCreate] | None = None


class DeliveryOrderResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    do_no: str
    order_type: str
    contract: ContractBrief
    delivery_date: datetime
    delivery_address: str
    driver_name: str
    status: str
    notes: str | None = None
    checklist_items: list[DeliveryChecklistItemOut] = []
    creator: UserBrief | None = None
    created_at: datetime
    updated_at: datetime | None = None


class DeliveryOrderListResponse(BaseModel):
    items: list[DeliveryOrderResponse]
    total: int
    page: int
    page_size: int
    pages: int
