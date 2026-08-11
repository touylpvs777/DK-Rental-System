import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.setting import Setting
from app.schemas.setting import SettingUpdate


class SettingService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_all(self) -> list[Setting]:
        result = await self.db.execute(select(Setting).order_by(Setting.key))
        return list(result.scalars().all())

    async def get_by_key(self, key: str) -> Setting | None:
        result = await self.db.execute(select(Setting).where(Setting.key == key))
        return result.scalar_one_or_none()

    async def upsert(self, key: str, data: SettingUpdate) -> tuple[Setting, bool]:
        """
        PUT semantics: update the setting if it exists, otherwise create it.
        Returns (setting, created).
        """
        setting = await self.get_by_key(key)
        created = setting is None
        value_payload = data.value
        if isinstance(value_payload, (dict, list)):
            stored_value = json.dumps(value_payload)
        else:
            stored_value = value_payload if isinstance(value_payload, str) else json.dumps(value_payload)

        if setting is None:
            setting = Setting(key=key, value=stored_value, description=data.description)
            self.db.add(setting)
        else:
            setting.value = stored_value
            if data.description is not None:
                setting.description = data.description

        await self.db.commit()
        await self.db.refresh(setting)
        return setting, created
