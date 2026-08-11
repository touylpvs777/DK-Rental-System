from datetime import datetime

from pydantic import BaseModel, Field


class NotificationPreferenceBase(BaseModel):
    event_type: str = Field(..., min_length=1, max_length=100)
    is_enabled: bool = True


class NotificationPreferenceCreate(NotificationPreferenceBase):
    pass


class NotificationPreferenceUpdate(BaseModel):
    is_enabled: bool


class NotificationPreferenceOut(NotificationPreferenceBase):
    model_config = {"from_attributes": True}

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime | None = None


# ── Alert trigger ─────────────────────────────────────────────────────────────


class AlertTriggerRequest(BaseModel):
    event_type: str = Field(..., min_length=1, max_length=100)
    entity_type: str | None = Field(default=None, max_length=50)
    entity_id: int | None = None
    message: str | None = Field(default=None, max_length=2000)


class AlertTriggerResult(BaseModel):
    event_type: str
    subscriber_count: int
    notified_count: int
