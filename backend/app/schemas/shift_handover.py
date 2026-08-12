from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ── Brief models ─────────────────────────────────────────────────────────────

class ForkliftBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    serial_number: str
    name_en: str


class RentalContractBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    contract_number: str
    status: str


class UserBrief(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    username: str
    full_name: str | None = None


# ── ShiftHandover schemas ────────────────────────────────────────────────────

class ShiftHandoverCreate(BaseModel):
    rental_contract_id: int
    forklift_id: int
    handover_datetime: datetime
    shift_name: str = Field(..., min_length=1, max_length=50)
    handover_person: str = Field(..., min_length=1, max_length=200)
    receiver_person: str = Field(..., min_length=1, max_length=200)
    hour_meter: float = Field(..., ge=0)
    checklist_status: str = Field(default="normal", min_length=1, max_length=30)
    issues_description: str | None = None
    issue_photos: list[str] | None = None
    signatures: dict[str, Any] | None = None


class ShiftHandoverUpdate(BaseModel):
    handover_datetime: datetime | None = None
    shift_name: str | None = Field(default=None, min_length=1, max_length=50)
    handover_person: str | None = Field(default=None, min_length=1, max_length=200)
    receiver_person: str | None = Field(default=None, min_length=1, max_length=200)
    hour_meter: float | None = Field(default=None, ge=0)
    checklist_status: str | None = Field(default=None, min_length=1, max_length=30)
    issues_description: str | None = None
    issue_photos: list[str] | None = None
    signatures: dict[str, Any] | None = None


class ShiftHandoverResponse(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    rental_contract: RentalContractBrief
    forklift: ForkliftBrief
    handover_datetime: datetime
    shift_name: str
    handover_person: str
    receiver_person: str
    hour_meter: float
    checklist_status: str
    issues_description: str | None = None
    issue_photos: list[str] | None = None
    signatures: dict[str, Any] | None = None
    creator: UserBrief | None = None
    created_at: datetime
    updated_at: datetime | None = None


class ShiftHandoverListResponse(BaseModel):
    items: list[ShiftHandoverResponse]
    total: int
