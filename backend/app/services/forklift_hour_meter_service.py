import logging
from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.forklift import Forklift, ForkliftStatus
from app.models.forklift_hour_meter_log import ForkliftHourMeterLog
from app.repositories.forklift_hour_meter_repository import ForkliftHourMeterRepository
from app.repositories.forklift_repository import ForkliftRepository
from app.repositories.maintenance_repository import MaintenanceRepository
from app.schemas.forklift import HourMeterLogCreate
from app.services.notification_service import ADMIN_ROLE, NotificationService

logger = logging.getLogger(__name__)

_BLOCKED_STATUSES = {ForkliftStatus.DECOMMISSIONED.value, ForkliftStatus.SOLD.value}


class ForkliftHourMeterService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = ForkliftHourMeterRepository(db)
        self._forklift_repo = ForkliftRepository(db)
        self._maintenance_repo = MaintenanceRepository(db)

    async def list_logs(
        self,
        forklift_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> list[ForkliftHourMeterLog]:
        await self._require_forklift(forklift_id)
        return await self._repo.get_by_forklift(forklift_id, skip=skip, limit=limit)

    async def create_log(
        self,
        forklift_id: int,
        data: HourMeterLogCreate,
        recorded_by: int,
    ) -> tuple[ForkliftHourMeterLog, bool]:
        """Returns (log_entry, has_warning). Warning = reading < previous."""
        forklift = await self._require_forklift(forklift_id)

        if forklift.status in _BLOCKED_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Cannot log hours for {forklift.status} forklift.",
            )

        warning = False
        previous = await self._repo.get_latest(forklift_id)
        if previous is not None and data.reading < previous.reading:
            warning = True
            logger.warning(
                "Hour meter decrease: forklift=%s previous=%.1f new=%.1f (meter reset?)",
                forklift_id, previous.reading, data.reading,
            )

        log = ForkliftHourMeterLog(
            forklift_id=forklift_id,
            reading=data.reading,
            source=data.source,
            notes=data.notes,
            recorded_by=recorded_by,
        )
        if data.recorded_at is not None:
            log.recorded_at = data.recorded_at

        log = await self._repo.create(log)

        await self._forklift_repo.update(forklift, {"current_hour_meter": data.reading})

        # Commit is the caller's responsibility — lets this compose into a
        # larger transaction (e.g. work-order completion) instead of forcing
        # an early, out-of-band commit partway through the caller's own unit
        # of work. The standalone hour-meter-log route commits after calling
        # this; so does anything else that calls it directly.
        return log, warning

    async def process_iot_telemetry(
        self,
        device_id: str,
        engine_hours: float,
        geo_location: dict[str, float] | None = None,
    ) -> tuple[Forklift, ForkliftHourMeterLog, int]:
        """
        Entry point for the IoT webhook (see routes/iot_telemetry.py). Records
        a new hour-meter reading reported by a forklift's telemetry device,
        refreshes its last-seen timestamp, and — since this can silently push
        a forklift past a PM interval with no human involved — checks every
        active maintenance schedule for that forklift and raises an admin
        notification for any schedule that just crossed its hours threshold.

        Returns (forklift, log_entry, pm_thresholds_crossed_count).
        """
        forklift = await self._forklift_repo.get_by_iot_device_id(device_id)
        if forklift is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No forklift registered for IoT device '{device_id}'",
            )

        previous_hours = forklift.current_hour_meter
        now = datetime.now(UTC)

        notes = None
        if geo_location and geo_location.get("lat") is not None and geo_location.get("lng") is not None:
            notes = f"IoT ping @ {geo_location['lat']:.5f},{geo_location['lng']:.5f}"

        log = ForkliftHourMeterLog(
            forklift_id=forklift.id,
            reading=engine_hours,
            source="iot",
            notes=notes,
        )
        log = await self._repo.create(log)

        forklift_updates = {
            "current_hour_meter": engine_hours,
            "last_telemetry_ping": now,
        }
        if geo_location and geo_location.get("lat") is not None and geo_location.get("lng") is not None:
            forklift_updates["current_latitude"] = geo_location["lat"]
            forklift_updates["current_longitude"] = geo_location["lng"]
            forklift_updates["last_location_update"] = now

        await self._forklift_repo.update(forklift, forklift_updates)

        crossed_count = await self._notify_pm_thresholds_crossed(forklift, previous_hours, engine_hours)

        await self.db.commit()
        return forklift, log, crossed_count

    async def _notify_pm_thresholds_crossed(
        self, forklift: Forklift, previous_hours: float, new_hours: float,
    ) -> int:
        if new_hours <= previous_hours:
            return 0

        schedules = await self._maintenance_repo.get_schedules(forklift_id=forklift.id, is_active=True)
        crossed = 0
        for schedule in schedules:
            if schedule.next_due_hours is None:
                continue
            if not (previous_hours < schedule.next_due_hours <= new_hours):
                continue
            crossed += 1
            try:
                await NotificationService(self.db).notify_role(
                    role=ADMIN_ROLE,
                    message=(
                        f"{forklift.name_en} ({forklift.serial_number}) crossed its PM threshold "
                        f"of {schedule.next_due_hours:.0f}h via IoT telemetry (now at {new_hours:.1f}h)."
                    ),
                    subject="PM threshold reached (IoT)",
                    event_type="iot_pm_threshold_crossed",
                    entity_type="forklift",
                    entity_id=forklift.id,
                )
            except Exception:
                # A notification failure must never break telemetry ingestion.
                logger.exception(
                    "Failed to send PM-threshold notification: forklift=%s schedule=%s",
                    forklift.id, schedule.id,
                )
        return crossed

    async def _require_forklift(self, forklift_id: int):
        forklift = await self._forklift_repo.get_by_id(forklift_id)
        if forklift is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Forklift not found",
            )
        return forklift
