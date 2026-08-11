from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SettingBase(BaseModel):
    key: str = Field(..., min_length=1, max_length=100)
    value: Any
    description: str | None = Field(default=None, max_length=500)


class SettingCreate(SettingBase):
    pass


class SettingUpdate(BaseModel):
    """Body for PUT /settings/{key} — value is required, description optional."""

    value: Any
    description: str | None = Field(default=None, max_length=500)


class SettingOut(SettingBase):
    model_config = {"from_attributes": True}

    id: int
    created_at: datetime
    updated_at: datetime | None = None
