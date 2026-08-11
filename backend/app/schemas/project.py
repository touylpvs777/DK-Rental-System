from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models.project import MilestoneStatus, ProjectStatus


# ── Brief models ─────────────────────────────────────────────────────────────

class CustomerBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    first_name: str
    last_name: str
    company: str | None = None


class SparePartBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    part_number: str
    name: str


# ── Milestone schemas ────────────────────────────────────────────────────────

class MilestoneCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    due_date: date | None = None
    status: MilestoneStatus = MilestoneStatus.PENDING


class MilestoneUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    due_date: date | None = None


class MilestoneStatusUpdate(BaseModel):
    status: MilestoneStatus


class MilestoneOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    project_id: int
    name: str
    due_date: date | None = None
    status: str
    created_at: datetime
    updated_at: datetime | None = None


# ── BOQ item schemas ─────────────────────────────────────────────────────────

class BOQItemCreate(BaseModel):
    spare_part_id: int | None = None
    description: str = Field(..., min_length=1, max_length=500)
    quantity: float = Field(default=1.0, gt=0)
    unit_price: float = Field(default=0.0, ge=0)
    currency: str = Field(default="LAK", max_length=3)


class BOQItemUpdate(BaseModel):
    spare_part_id: int | None = None
    description: str | None = Field(default=None, min_length=1, max_length=500)
    quantity: float | None = Field(default=None, gt=0)
    unit_price: float | None = Field(default=None, ge=0)


class BOQItemOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    project_id: int
    spare_part_id: int | None = None
    description: str
    quantity: float
    unit_price: float
    total_price: float
    currency: str
    created_at: datetime
    updated_at: datetime | None = None


# ── Project schemas ──────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=300)
    customer_id: int
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=300)
    status: ProjectStatus | None = None
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None


class ProjectOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    project_number: str
    name: str
    customer_id: int
    status: str
    start_date: date | None = None
    end_date: date | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
    milestone_total: int = 0
    milestone_completed: int = 0
    customer_name: str = ""


class ProjectDetail(ProjectOut):
    customer: CustomerBrief | None = None
    milestones: list[MilestoneOut] = []
    boq_items: list[BOQItemOut] = []


class ProjectListResponse(BaseModel):
    items: list[ProjectOut]
    total: int
    page: int
    page_size: int
    pages: int
