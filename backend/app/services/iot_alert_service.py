from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.forklift import Forklift
from app.models.notification import Notification
from app.schemas.iot_telemetry import IoTAlertForkliftBrief, IoTAlertOut

# A paired device that hasn't pinged in this long is flagged "offline"; past
# the longer threshold it escalates to "critical" instead of "warning".
_OFFLINE_WARNING_AFTER = timedelta(hours=24)
_OFFLINE_CRITICAL_AFTER = timedelta(hours=72)

# event_type values (see ForkliftHourMeterService._notify_pm_thresholds_crossed)
# that represent an IoT-sourced alert worth surfacing on the dashboard.
_IOT_ALERT_EVENT_TYPES = ("iot_pm_threshold_crossed",)

_DEFAULT_LIMIT = 20


class IoTAlertService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_alerts(self, limit: int = _DEFAULT_LIMIT) -> list[IoTAlertOut]:
        now = datetime.now(timezone.utc)
        alerts = [
            *await self._offline_alerts(now),
            *await self._maintenance_due_alerts(limit),
        ]
        alerts.sort(key=lambda a: a.occurred_at, reverse=True)
        return alerts[:limit]

    async def _offline_alerts(self, now: datetime) -> list[IoTAlertOut]:
        stmt = select(Forklift).where(
            Forklift.is_active.is_(True),
            Forklift.iot_device_id.is_not(None),
            (Forklift.last_telemetry_ping.is_(None))
            | (Forklift.last_telemetry_ping < now - _OFFLINE_WARNING_AFTER),
        )
        forklifts = (await self.db.execute(stmt)).scalars().all()

        alerts = []
        for fk in forklifts:
            last_ping = fk.last_telemetry_ping
            severity = "warning"
            if last_ping is None or now - last_ping >= _OFFLINE_CRITICAL_AFTER:
                severity = "critical"
            message = (
                "Device has never reported telemetry."
                if last_ping is None
                else f"No telemetry since {last_ping:%b %d, %H:%M} UTC."
            )
            alerts.append(IoTAlertOut(
                id=f"offline-{fk.id}",
                type="offline",
                severity=severity,
                forklift=IoTAlertForkliftBrief(id=fk.id, serial_number=fk.serial_number, name_en=fk.name_en),
                message=message,
                occurred_at=last_ping or fk.created_at,
            ))
        return alerts

    async def _maintenance_due_alerts(self, limit: int) -> list[IoTAlertOut]:
        stmt = (
            select(Notification)
            .where(Notification.event_type.in_(_IOT_ALERT_EVENT_TYPES))
            .order_by(Notification.created_at.desc())
            .limit(limit)
        )
        notifications = (await self.db.execute(stmt)).scalars().all()
        if not notifications:
            return []

        forklift_ids = {n.entity_id for n in notifications if n.entity_id is not None}
        forklift_rows = (
            await self.db.execute(select(Forklift).where(Forklift.id.in_(forklift_ids)))
        ).scalars().all()
        forklifts_by_id = {fk.id: fk for fk in forklift_rows}

        alerts = []
        for n in notifications:
            fk = forklifts_by_id.get(n.entity_id)
            if fk is None:
                continue  # forklift since deleted — nothing sensible to show
            alerts.append(IoTAlertOut(
                id=f"notif-{n.id}",
                type="maintenance_due",
                severity="warning",
                forklift=IoTAlertForkliftBrief(id=fk.id, serial_number=fk.serial_number, name_en=fk.name_en),
                message=n.message,
                occurred_at=n.created_at,
            ))
        return alerts
