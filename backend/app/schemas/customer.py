from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.customer import CustomerStatus


class CustomerBase(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    email: EmailStr | None = None
    phone: str | None = None
    company: str | None = None
    status: CustomerStatus = CustomerStatus.PROSPECT
    notes: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    assigned_to: int | None = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    company: str | None = None
    status: CustomerStatus | None = None
    notes: str | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    assigned_to: int | None = None


class CustomerOut(CustomerBase):
    model_config = {"from_attributes": True}

    id: int
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime | None = None


# ── Customer 360 overview ─────────────────────────────────────────────────────


class Customer360Forklift(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    serial_number: str
    name_en: str
    status: str
    current_hour_meter: float


class Customer360RentalContract(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    contract_number: str
    status: str
    start_date: date
    end_date: date
    total_value: float
    currency: str


class Customer360WorkOrderForklift(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    serial_number: str
    name_en: str


class Customer360WorkOrder(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    work_order_number: str
    status: str
    priority: str
    title: str
    scheduled_date: date
    completed_at: datetime | None = None
    forklift: Customer360WorkOrderForklift


class Customer360Invoice(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    invoice_number: str
    status: str
    total_amount: float
    balance_due: float
    currency: str
    due_date: date | None = None


class Customer360Summary(BaseModel):
    forklift_count: int
    active_rental_count: int
    open_work_order_count: int
    total_outstanding: float
    currency: str = "LAK"


class Customer360Out(BaseModel):
    customer: CustomerOut
    summary: Customer360Summary
    forklifts: list[Customer360Forklift]
    rental_contracts: list[Customer360RentalContract]
    work_orders: list[Customer360WorkOrder]
    invoices: list[Customer360Invoice]
