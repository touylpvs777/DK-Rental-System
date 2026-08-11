"""Standalone IoT hardware simulator — pings the DK CRM IoT webhook with fake
forklift telemetry (engine hours + GPS) so the /iot/webhook flow and the IoT
Management screen's Live indicators can be demoed without real devices.

Run from anywhere:  python backend/scripts/simulate_iot_ping.py
Stop with Ctrl+C.
"""

import os
import random
import sys
import time
from datetime import datetime, timezone

import requests

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, BACKEND_DIR)

from app.core.config import Settings  # noqa: E402

# Load settings explicitly from backend/.env regardless of the process's
# current working directory (Settings' default env_file=".env" is CWD-relative).
settings = Settings(_env_file=os.path.join(BACKEND_DIR, ".env"))

API_URL = "http://localhost:8000/api/v1/iot/webhook"
PING_INTERVAL_SECONDS = 5

# Vientiane baseline coordinates — small random jitter simulates a forklift
# moving around a yard/warehouse rather than sitting perfectly still.
BASE_LAT = 17.9757
BASE_LNG = 102.6331
GPS_JITTER = 0.0015  # roughly +/-150m

# device_id -> starting engine_hours. Pair these IDs to real forklifts in the
# IoT Management screen (/iot-management -> Pair Device) BEFORE running this,
# otherwise the webhook returns 404 ("No forklift registered for IoT device").
DEVICES = {
    "DK-IOT-101": 5000.0,
    "DK-IOT-102": 3200.0,
}


def jittered_coords() -> tuple[float, float]:
    return (
        round(BASE_LAT + random.uniform(-GPS_JITTER, GPS_JITTER), 6),
        round(BASE_LNG + random.uniform(-GPS_JITTER, GPS_JITTER), 6),
    )


def print_banner() -> None:
    print("=" * 64)
    print(" DK Service — IoT Hardware Simulator")
    print("=" * 64)
    print(f" Target endpoint : {API_URL}")
    print(f" Devices         : {', '.join(DEVICES)}")
    print(f" Ping interval   : {PING_INTERVAL_SECONDS}s")
    print("-" * 64)
    print(" BEFORE YOU START:")
    print("   Open the IoT Management screen (/iot-management) and use")
    print("   'Pair Device' to attach each device ID above to a real")
    print("   forklift. Unpaired device IDs get rejected with HTTP 404.")
    print("=" * 64)
    print()


def main() -> None:
    if not settings.IOT_WEBHOOK_API_KEY:
        print("!! IOT_WEBHOOK_API_KEY is not set in backend/.env.")
        print("   The webhook will reject every ping with HTTP 503 until it's configured.")
        sys.exit(1)

    print_banner()

    headers = {"X-API-Key": settings.IOT_WEBHOOK_API_KEY, "Content-Type": "application/json"}
    engine_hours = dict(DEVICES)

    try:
        while True:
            for device_id in DEVICES:
                engine_hours[device_id] = round(engine_hours[device_id] + random.uniform(0.08, 0.12), 2)
                lat, lng = jittered_coords()
                payload = {
                    "device_id": device_id,
                    "engine_hours": engine_hours[device_id],
                    "lat": lat,
                    "lng": lng,
                }
                timestamp = datetime.now(timezone.utc).strftime("%H:%M:%S")

                print(f"[{timestamp}] >> Ping sent   | device={device_id}")
                print(f"           payload    : {payload}")

                try:
                    resp = requests.post(API_URL, json=payload, headers=headers, timeout=5)
                except requests.exceptions.ConnectionError:
                    print("           << response  : CONNECTION REFUSED — is the backend running on localhost:8000?")
                    print()
                    continue
                except requests.exceptions.RequestException as exc:
                    print(f"           << response  : REQUEST FAILED — {exc}")
                    print()
                    continue

                print(f"           << response  : HTTP {resp.status_code} {resp.reason}")
                if resp.ok:
                    body = resp.json()
                    crossed = body.get("pm_thresholds_crossed", 0)
                    note = f"  *** PM THRESHOLD CROSSED x{crossed} — notification sent! ***" if crossed else ""
                    print(f"           engine_hours now: {body.get('engine_hours')}h{note}")
                else:
                    print(f"           error        : {resp.text}")
                print()

            time.sleep(PING_INTERVAL_SECONDS)
    except KeyboardInterrupt:
        print("\nSimulator stopped.")


if __name__ == "__main__":
    main()
