from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.models.notification import NotificationChannel


class NotificationCreate(BaseModel):
    recipient_phone: str | None = Field(default=None, max_length=50)
    recipient_email: str | None = Field(default=None, max_length=255)
    channel: NotificationChannel = NotificationChannel.WHATSAPP
    subject: str | None = Field(default=None, max_length=300)
    message: str = Field(..., min_length=1)

    # Optional domain-event linkage (used when triggered internally by Step 3's event bus).
    event_type: str | None = Field(default=None, max_length=100)
    entity_type: str | None = Field(default=None, max_length=50)
    entity_id: int | None = None

    # Set when this is a staff-facing alert for a subscribed User (Smart Audit).
    recipient_user_id: int | None = None

    # Enterprise Audit & Alert: set instead of recipient_user_id to broadcast
    # to everyone holding a role (e.g. "admin") rather than one user.
    target_role: str | None = None

    @model_validator(mode="after")
    def require_at_least_one_recipient(self) -> "NotificationCreate":
        if not (self.recipient_phone or self.recipient_email or self.recipient_user_id or self.target_role):
            raise ValueError(
                "At least one of recipient_phone, recipient_email, recipient_user_id, "
                "or target_role is required"
            )
        return self


class NotificationOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    channel: str
    status: str
    recipient: str
    subject: str | None = None
    message: str
    provider_message_id: str | None = None
    error_message: str | None = None
    event_type: str | None = None
    entity_type: str | None = None
    entity_id: int | None = None
    recipient_user_id: int | None = None
    target_role: str | None = None
    is_read: bool = False
    created_at: datetime
    sent_at: datetime | None = None


class NotificationListResponse(BaseModel):
    items: list[NotificationOut]
    total: int


class UnreadCountOut(BaseModel):
    count: int
