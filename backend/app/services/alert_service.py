"""
Smart Audit & Notification Preferences (Phase, Step 3).

`check_and_notify()` is the "notification check" that runs whenever a tracked
activity occurs: it looks up which users have subscribed (via
NotificationPreference) to a given event_type and fans out a Notification to
each of them, skipping the user who performed the action.

Called two ways:
  1. Automatically from ActivityLogService.log() after every activity entry.
  2. Manually via POST /notifications/alert, for external/system-triggered
     alerts that don't go through the ActivityLog pathway.

Never raises — a broken alert must not break the business action or the
activity-log write that triggered it (same philosophy as app.events.EventBus).
"""
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification, NotificationChannel
from app.schemas.notification import NotificationCreate
from app.services.notification_preference_service import NotificationPreferenceService
from app.services.notification_service import NotificationService

logger = logging.getLogger("app.alerts")


async def check_and_notify(
    db: AsyncSession,
    event_type: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
    actor_user_id: int | None = None,
    message: str | None = None,
) -> list[Notification]:
    subscribers = await NotificationPreferenceService(db).get_subscribed_users(event_type)

    sent: list[Notification] = []
    for pref, user in subscribers:
        if actor_user_id is not None and user.id == actor_user_id:
            continue  # don't notify a user of their own action

        body = message or _default_message(event_type, entity_type, entity_id)
        try:
            notification = await NotificationService(db).send(
                NotificationCreate(
                    recipient_email=user.email,
                    recipient_user_id=user.id,
                    channel=NotificationChannel.EMAIL,
                    subject=f"Alert: {event_type}",
                    message=body,
                    event_type=event_type,
                    entity_type=entity_type,
                    entity_id=entity_id,
                )
            )
            sent.append(notification)
        except Exception:
            logger.exception(
                "Failed to notify user %s for event %r (pref #%s)", user.id, event_type, pref.id
            )

    return sent


def _default_message(event_type: str, entity_type: str | None, entity_id: int | None) -> str:
    target = f" ({entity_type} #{entity_id})" if entity_type and entity_id else ""
    return f"A subscribed event occurred: {event_type}{target}."
