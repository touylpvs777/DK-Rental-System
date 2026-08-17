from datetime import datetime

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


# ── Alerts (Dashboard-facing) ────────────────────────────────────────────────
# Synthesized on read from data that already exists — no dedicated alerts
# table. "offline" is computed live from Forklift.last_telemetry_ping;
# "maintenance_due" is sourced from the Notification rows already written
# when telemetry pushes a forklift past a PM interval. Only these two types
# are real: the webhook payload carries no temperature or battery reading,
# and there's no geofence-boundary concept anywhere in the schema, so
# overheat/battery/geofence alerts have no underlying data to synthesize from.

class IoTAlertForkliftBrief(BaseModel):
    id: int
    serial_number: str
    name_en: str


class IoTAlertOut(BaseModel):
    # Prefixed string, not a DB id — alerts come from two different sources
    # (a Notification row or a live-computed offline check) with no shared
    # id space, so this just needs to be stable and unique per alert.
    id: str
    type: str  # "offline" | "maintenance_due"
    severity: str  # "critical" | "warning"
    forklift: IoTAlertForkliftBrief
    message: str
    occurred_at: datetime
