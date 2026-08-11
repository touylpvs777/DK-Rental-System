import json

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.dependencies import get_current_superuser, get_current_user
from app.models.activity_log import ActionType, EntityType
from app.models.user import User
from app.schemas.setting import SettingOut, SettingUpdate
from app.services.activity_log_service import ActivityLogService
from app.services.setting_service import SettingService

router = APIRouter(prefix="/settings", tags=["Settings"])


def _serialize_setting(setting: object) -> dict:
    payload = SettingOut.model_validate(setting).model_dump()
    if isinstance(payload.get("value"), str):
        try:
            payload["value"] = json.loads(payload["value"])
        except json.JSONDecodeError:
            payload["value"] = payload["value"]
    return payload


@router.get("/company-profile", response_model=dict)
async def get_company_profile(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Public-to-any-logged-in-user read of the company profile (name/logo), so the
    sidebar and print headers can render branding without requiring superuser
    access. Editing still goes through the superuser-only PUT /settings/{key}.
    """
    setting = await SettingService(db).get_by_key("company_profile")
    if setting is None:
        return {}
    value = setting.value
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return {}
    return value if isinstance(value, dict) else {}


@router.get("", response_model=list[SettingOut])
async def list_settings(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    settings = await SettingService(db).get_all()
    return [_serialize_setting(setting) for setting in settings]


@router.put("/{key}", response_model=SettingOut)
async def upsert_setting(
    key: str,
    data: SettingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_superuser),
):
    setting, created = await SettingService(db).upsert(key, data)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.SETTING_UPDATED,
        entity_type=EntityType.SETTING,
        entity_id=setting.id,
        details={"key": setting.key, "value": setting.value, "created": created},
    )
    return _serialize_setting(setting)
