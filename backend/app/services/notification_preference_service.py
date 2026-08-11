from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification_preference import NotificationPreference
from app.models.user import User
from app.schemas.notification_preference import (
    NotificationPreferenceCreate,
    NotificationPreferenceUpdate,
)


class NotificationPreferenceService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_for_user(self, user_id: int) -> list[NotificationPreference]:
        result = await self.db.execute(
            select(NotificationPreference)
            .where(NotificationPreference.user_id == user_id)
            .order_by(NotificationPreference.event_type)
        )
        return list(result.scalars().all())

    async def create(
        self, user_id: int, data: NotificationPreferenceCreate
    ) -> NotificationPreference:
        pref = NotificationPreference(
            user_id=user_id, event_type=data.event_type, is_enabled=data.is_enabled
        )
        self.db.add(pref)
        try:
            await self.db.commit()
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Already subscribed to '{data.event_type}'",
            )
        await self.db.refresh(pref)
        return pref

    async def _get_owned(self, pref_id: int, user_id: int) -> NotificationPreference:
        pref = await self.db.get(NotificationPreference, pref_id)
        if pref is None or pref.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Notification preference not found"
            )
        return pref

    async def update(
        self, pref_id: int, user_id: int, data: NotificationPreferenceUpdate
    ) -> NotificationPreference:
        pref = await self._get_owned(pref_id, user_id)
        pref.is_enabled = data.is_enabled
        await self.db.commit()
        await self.db.refresh(pref)
        return pref

    async def delete(self, pref_id: int, user_id: int) -> None:
        pref = await self._get_owned(pref_id, user_id)
        await self.db.delete(pref)
        await self.db.commit()

    async def get_subscribed_users(self, event_type: str) -> list[tuple[NotificationPreference, User]]:
        """Active subscribers for an event type, joined with their User row."""
        result = await self.db.execute(
            select(NotificationPreference, User)
            .join(User, NotificationPreference.user_id == User.id)
            .where(
                NotificationPreference.event_type == event_type,
                NotificationPreference.is_enabled == True,  # noqa: E712
                User.is_active == True,  # noqa: E712
            )
        )
        return list(result.all())
