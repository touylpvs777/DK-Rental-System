from datetime import datetime

from pydantic import BaseModel, Field

from app.models.lead import LeadSource, LeadStatus


class UserBrief(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    username: str
    full_name: str | None = None


class CustomerBrief(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    first_name: str
    last_name: str
    company: str | None = None


class LeadNoteCreate(BaseModel):
    content: str = Field(..., min_length=1)


class LeadNoteOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    lead_id: int
    content: str
    created_at: datetime
    author: UserBrief | None = None


class LeadBase(BaseModel):
    title: str = Field(..., min_length=1)
    description: str | None = None
    value: float | None = Field(default=None, ge=0)
    source: LeadSource | None = None
    status: LeadStatus = LeadStatus.NEW
    customer_id: int | None = None
    assigned_to: int | None = None


class LeadCreate(LeadBase):
    pass


class LeadUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    value: float | None = Field(default=None, ge=0)
    source: LeadSource | None = None
    status: LeadStatus | None = None
    customer_id: int | None = None
    assigned_to: int | None = None


class LeadOut(LeadBase):
    model_config = {"from_attributes": True}

    id: int
    created_by: int | None = None
    created_at: datetime
    updated_at: datetime | None = None


class LeadDetail(LeadOut):
    """Single-lead view with nested objects and note history."""

    assigned_user: UserBrief | None = None
    customer: CustomerBrief | None = None
    lead_notes: list[LeadNoteOut] = []
