import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.request_context import get_current_ip
from app.models.activity_log import ActionType, ActivityLog, EntityType

logger = logging.getLogger("app.activity_log")


class ActivityLogService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def log(
        self,
        user_id: int | None,
        action: ActionType,
        entity_type: EntityType | None = None,
        entity_id: int | None = None,
        details: dict | None = None,
    ) -> ActivityLog:
        entry = ActivityLog(
            user_id=user_id,
            action=action.value,
            entity_type=entity_type.value if entity_type else None,
            entity_id=entity_id,
            details=details,
            ip_address=get_current_ip(),
        )
        self.db.add(entry)
        await self.db.commit()

        # Smart Audit & Notification Preferences (Step 3): every tracked activity
        # automatically runs a notification-preference check. Must never break
        # the caller — a failed alert fan-out is logged and swallowed.
        try:
            from app.services.alert_service import check_and_notify

            await check_and_notify(
                self.db,
                event_type=entry.action,
                entity_type=entry.entity_type,
                entity_id=entry.entity_id,
                actor_user_id=user_id,
            )
        except Exception:
            logger.exception("Notification-preference check failed for action %r", entry.action)

        return entry

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        user_id: int | None = None,
        action: ActionType | None = None,
        entity_type: EntityType | None = None,
        entity_id: int | None = None,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
    ) -> list[ActivityLog]:
        stmt = (
            select(ActivityLog)
            .options(selectinload(ActivityLog.user))
            .order_by(ActivityLog.created_at.desc())
        )
        if user_id is not None:
            stmt = stmt.where(ActivityLog.user_id == user_id)
        if action is not None:
            stmt = stmt.where(ActivityLog.action == action.value)
        if entity_type is not None:
            stmt = stmt.where(ActivityLog.entity_type == entity_type.value)
        if entity_id is not None:
            stmt = stmt.where(ActivityLog.entity_id == entity_id)
        if from_date is not None:
            stmt = stmt.where(ActivityLog.created_at >= from_date)
        if to_date is not None:
            stmt = stmt.where(ActivityLog.created_at <= to_date)
        stmt = stmt.offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_entity(
        self,
        entity_type: EntityType,
        entity_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> list[ActivityLog]:
        result = await self.db.execute(
            select(ActivityLog)
            .options(selectinload(ActivityLog.user))
            .where(
                ActivityLog.entity_type == entity_type.value,
                ActivityLog.entity_id == entity_id,
            )
            .order_by(ActivityLog.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_by_user(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> list[ActivityLog]:
        return await self.get_all(skip=skip, limit=limit, user_id=user_id)
