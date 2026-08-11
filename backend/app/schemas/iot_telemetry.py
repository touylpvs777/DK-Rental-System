from pydantic import BaseModel, Field


class GeoLocation(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class IoTTelemetryWebhookPayload(BaseModel):
    """Body of POST /api/v1/iot/webhook, as sent by a forklift's GPS/IoT device."""

    device_id: str = Field(..., min_length=1, max_length=100)
    engine_hours: float = Field(..., ge=0)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)


class IoTTelemetryWebhookResult(BaseModel):
    forklift_id: int
    iot_device_id: str
    engine_hours: float
    pm_thresholds_crossed: int
