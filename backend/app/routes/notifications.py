from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.dependencies import get_current_user
from app.models.activity_log import ActionType, EntityType
from app.models.user import User
from app.schemas.notification import NotificationCreate, NotificationOut, UnreadCountOut
from app.schemas.notification_preference import (
    AlertTriggerRequest,
    AlertTriggerResult,
    NotificationPreferenceCreate,
    NotificationPreferenceOut,
    NotificationPreferenceUpdate,
)
from app.services.activity_log_service import ActivityLogService
from app.services.alert_service import check_and_notify
from app.services.notification_preference_service import NotificationPreferenceService
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.post("/", response_model=NotificationOut, status_code=status.HTTP_201_CREATED)
async def send_notification(
    data: NotificationCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await NotificationService(db).send(data)


@router.get("/", response_model=list[NotificationOut])
async def list_notifications(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return await NotificationService(db).get_all(skip=skip, limit=limit)


@router.get("/me", response_model=list[NotificationOut], summary="My alerts (Smart Audit bell)")
async def my_notifications(
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Administrators additionally see the global ADMIN_ROLE activity feed
    # (Enterprise Audit & Alert) merged in alongside their own personal alerts.
    return await NotificationService(db).get_for_user(
        current_user.id, skip=skip, limit=limit, unread_only=unread_only,
        include_admin_feed=current_user.is_superuser,
    )


@router.get("/me/unread-count", response_model=UnreadCountOut)
async def my_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = await NotificationService(db).get_unread_count(
        current_user.id, include_admin_feed=current_user.is_superuser,
    )
    return UnreadCountOut(count=count)


@router.post("/{notification_id}/read", response_model=NotificationOut)
async def mark_notification_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = await NotificationService(db).mark_read(
        notification_id, current_user.id, include_admin_feed=current_user.is_superuser,
    )
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return notification


@router.post("/read-all", response_model=UnreadCountOut)
async def mark_all_notifications_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    updated = await NotificationService(db).mark_all_read(
        current_user.id, include_admin_feed=current_user.is_superuser,
    )
    return UnreadCountOut(count=updated)


@router.get("/{notification_id}", response_model=NotificationOut)
async def get_notification(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    notification = await NotificationService(db).get_by_id(notification_id)
    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return notification


# ── Notification Preferences (Step 3) ─────────────────────────────────────────
# A user subscribes themselves to alerts for tracked event types (ActivityLog
# ActionType values, e.g. "forklift_deleted", "rental_contract_activated").
# Gated to Admin/Manager roles via MANAGE_NOTIFICATION_PREFERENCES.

@router.get("/preferences/", response_model=list[NotificationPreferenceOut])
async def list_my_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.MANAGE_NOTIFICATION_PREFERENCES),
):
    return await NotificationPreferenceService(db).list_for_user(current_user.id)


@router.post(
    "/preferences/",
    response_model=NotificationPreferenceOut,
    status_code=status.HTTP_201_CREATED,
)
async def subscribe(
    data: NotificationPreferenceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.MANAGE_NOTIFICATION_PREFERENCES),
):
    pref = await NotificationPreferenceService(db).create(current_user.id, data)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.NOTIFICATION_PREFERENCE_CREATED,
        entity_type=EntityType.NOTIFICATION_PREFERENCE,
        entity_id=pref.id,
        details={"event_type": pref.event_type},
    )
    return pref


@router.patch("/preferences/{pref_id}", response_model=NotificationPreferenceOut)
async def update_preference(
    pref_id: int,
    data: NotificationPreferenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.MANAGE_NOTIFICATION_PREFERENCES),
):
    pref = await NotificationPreferenceService(db).update(pref_id, current_user.id, data)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.NOTIFICATION_PREFERENCE_UPDATED,
        entity_type=EntityType.NOTIFICATION_PREFERENCE,
        entity_id=pref.id,
        details={"event_type": pref.event_type, "is_enabled": pref.is_enabled},
    )
    return pref


@router.delete("/preferences/{pref_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe(
    pref_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.MANAGE_NOTIFICATION_PREFERENCES),
):
    await NotificationPreferenceService(db).delete(pref_id, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.NOTIFICATION_PREFERENCE_DELETED,
        entity_type=EntityType.NOTIFICATION_PREFERENCE,
        entity_id=pref_id,
    )


# ── Alert trigger (Step 3) ─────────────────────────────────────────────────────
# Runs a notification-preference check for an arbitrary event_type. This same
# check also runs automatically from ActivityLogService.log() for every
# tracked activity; this endpoint exists for external systems / manual testing.

@router.post("/alert", response_model=AlertTriggerResult)
async def trigger_alert(
    data: AlertTriggerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subscribers = await NotificationPreferenceService(db).get_subscribed_users(data.event_type)
    sent = await check_and_notify(
        db,
        event_type=data.event_type,
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        actor_user_id=current_user.id,
        message=data.message,
    )
    return AlertTriggerResult(
        event_type=data.event_type,
        subscriber_count=len(subscribers),
        notified_count=len(sent),
    )
