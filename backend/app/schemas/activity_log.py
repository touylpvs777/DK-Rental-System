from datetime import datetime

from pydantic import BaseModel

from app.models.activity_log import ActionType, EntityType


class UserBrief(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    username: str
    full_name: str | None = None


class ActivityLogOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    user_id: int | None
    user: UserBrief | None = None
    action: ActionType
    entity_type: EntityType | None
    entity_id: int | None
    details: dict | None = None
    ip_address: str | None = None
    created_at: datetime
