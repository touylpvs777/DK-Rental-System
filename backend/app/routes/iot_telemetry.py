from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.dependencies import verify_iot_api_key
from app.schemas.iot_telemetry import IoTTelemetryWebhookPayload, IoTTelemetryWebhookResult
from app.services.forklift_hour_meter_service import ForkliftHourMeterService

router = APIRouter(prefix="/iot", tags=["IoT Telemetry"])


@router.post(
    "/webhook",
    response_model=IoTTelemetryWebhookResult,
    summary="Receive a telemetry ping from a forklift GPS/IoT device",
)
async def receive_iot_webhook(
    payload: IoTTelemetryWebhookPayload,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(verify_iot_api_key),
):
    geo_location = None
    if payload.lat is not None and payload.lng is not None:
        geo_location = {"lat": payload.lat, "lng": payload.lng}

    forklift, _log, crossed_count = await ForkliftHourMeterService(db).process_iot_telemetry(
        device_id=payload.device_id,
        engine_hours=payload.engine_hours,
        geo_location=geo_location,
    )
    return IoTTelemetryWebhookResult(
        forklift_id=forklift.id,
        iot_device_id=payload.device_id,
        engine_hours=payload.engine_hours,
        pm_thresholds_crossed=crossed_count,
    )
