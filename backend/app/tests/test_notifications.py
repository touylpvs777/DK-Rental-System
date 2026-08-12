import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.notification import Notification
from app.models.user import User
from app.services.notification_service import (
    ADMIN_ROLE,
    EmailAdapter,
    NotificationDeliveryError,
    NotificationService,
    WhatsAppAdapter,
)

pytestmark = pytest.mark.anyio


async def _login(client: AsyncClient, db_session: AsyncSession) -> str:
    user = User(
        email="agent@example.com",
        username="agent",
        hashed_password=hash_password("Test@1234"),
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    response = await client.post(
        "/api/v1/auth/login",
        json={"username": "agent", "password": "Test@1234"},
    )
    return response.json()["access_token"]


async def _login_as(client: AsyncClient, db_session: AsyncSession, *, username: str, is_superuser: bool) -> tuple[str, User]:
    user = User(
        email=f"{username}@example.com",
        username=username,
        hashed_password=hash_password("Test@1234"),
        is_active=True,
        is_superuser=is_superuser,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    response = await client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": "Test@1234"},
    )
    assert response.status_code == 200
    return response.json()["access_token"], user


async def test_send_notification_via_whatsapp_success(
    client: AsyncClient, db_session: AsyncSession, monkeypatch,
):
    async def fake_send(self, recipient, message, subject=None):
        return "wamid.FAKE123"

    monkeypatch.setattr(WhatsAppAdapter, "send", fake_send)
    token = await _login(client, db_session)

    response = await client.post(
        "/api/v1/notifications/",
        json={"recipient_phone": "+8562012345678", "message": "Your rental is now active."},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "sent"
    assert data["channel"] == "whatsapp"
    assert data["recipient"] == "+8562012345678"
    assert data["provider_message_id"] == "wamid.FAKE123"
    assert data["sent_at"] is not None


async def test_send_notification_falls_back_to_email_on_whatsapp_failure(
    client: AsyncClient, db_session: AsyncSession, monkeypatch,
):
    async def failing_whatsapp(self, recipient, message, subject=None):
        raise NotificationDeliveryError("WhatsApp is not configured")

    async def fake_email(self, recipient, message, subject=None):
        return "smtp-FAKE456"

    monkeypatch.setattr(WhatsAppAdapter, "send", failing_whatsapp)
    monkeypatch.setattr(EmailAdapter, "send", fake_email)
    token = await _login(client, db_session)

    response = await client.post(
        "/api/v1/notifications/",
        json={
            "recipient_phone": "+8562012345678",
            "recipient_email": "customer@example.com",
            "message": "Your rental is now active.",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "sent"
    assert data["channel"] == "email"
    assert data["recipient"] == "customer@example.com"
    assert data["provider_message_id"] == "smtp-FAKE456"


async def test_send_notification_both_channels_fail_records_failed_status(
    client: AsyncClient, db_session: AsyncSession, monkeypatch,
):
    async def failing_whatsapp(self, recipient, message, subject=None):
        raise NotificationDeliveryError("WhatsApp is not configured")

    async def failing_email(self, recipient, message, subject=None):
        raise NotificationDeliveryError("Email is not configured")

    monkeypatch.setattr(WhatsAppAdapter, "send", failing_whatsapp)
    monkeypatch.setattr(EmailAdapter, "send", failing_email)
    token = await _login(client, db_session)

    response = await client.post(
        "/api/v1/notifications/",
        json={
            "recipient_phone": "+8562012345678",
            "recipient_email": "customer@example.com",
            "message": "Your rental is now active.",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "failed"
    assert data["provider_message_id"] is None
    assert "whatsapp" in data["error_message"]
    assert "email" in data["error_message"]
    assert data["sent_at"] is None


async def test_send_notification_requires_a_recipient(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)

    response = await client.post(
        "/api/v1/notifications/",
        json={"message": "No recipient provided"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 422


async def test_list_and_get_notifications(
    client: AsyncClient, db_session: AsyncSession, monkeypatch,
):
    async def fake_send(self, recipient, message, subject=None):
        return "wamid.FAKE789"

    monkeypatch.setattr(WhatsAppAdapter, "send", fake_send)
    token = await _login(client, db_session)
    headers = {"Authorization": f"Bearer {token}"}

    create_response = await client.post(
        "/api/v1/notifications/",
        json={"recipient_phone": "+8562012345678", "message": "Hello"},
        headers=headers,
    )
    notification_id = create_response.json()["id"]

    list_response = await client.get("/api/v1/notifications/", headers=headers)
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    get_response = await client.get(f"/api/v1/notifications/{notification_id}", headers=headers)
    assert get_response.status_code == 200
    assert get_response.json()["id"] == notification_id

    missing_response = await client.get("/api/v1/notifications/999999", headers=headers)
    assert missing_response.status_code == 404


# ── Enterprise Audit & Alert: role-targeted admin broadcast ────────────────────

async def test_notify_role_creates_in_app_admin_notification(db_session: AsyncSession):
    notification = await NotificationService(db_session).notify_role(
        role=ADMIN_ROLE,
        subject="Test Alert",
        message="Something important happened.",
        event_type="test.event",
    )
    assert notification.channel == "in_app"
    assert notification.status == "sent"
    assert notification.target_role == ADMIN_ROLE
    assert notification.recipient_user_id is None
    assert notification.sent_at is not None


async def test_admin_sees_role_targeted_feed_but_regular_user_does_not(
    client: AsyncClient, db_session: AsyncSession,
):
    admin_token, admin = await _login_as(client, db_session, username="admin1", is_superuser=True)
    user_token, _ = await _login_as(client, db_session, username="staff1", is_superuser=False)

    await NotificationService(db_session).notify_role(
        role=ADMIN_ROLE, message="Global activity feed entry.", event_type="test.broadcast",
    )

    admin_resp = await client.get("/api/v1/notifications/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_resp.status_code == 200
    admin_items = admin_resp.json()
    assert any(n["target_role"] == ADMIN_ROLE for n in admin_items)

    user_resp = await client.get("/api/v1/notifications/me", headers={"Authorization": f"Bearer {user_token}"})
    assert user_resp.status_code == 200
    user_items = user_resp.json()
    assert not any(n["target_role"] == ADMIN_ROLE for n in user_items)

    admin_count = await client.get("/api/v1/notifications/me/unread-count", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_count.json()["count"] >= 1
    user_count = await client.get("/api/v1/notifications/me/unread-count", headers={"Authorization": f"Bearer {user_token}"})
    assert user_count.json()["count"] == 0


async def test_admin_mark_all_read_clears_role_targeted_feed(
    client: AsyncClient, db_session: AsyncSession,
):
    admin_token, _ = await _login_as(client, db_session, username="admin2", is_superuser=True)
    await NotificationService(db_session).notify_role(role=ADMIN_ROLE, message="Broadcast.", event_type="test.broadcast")

    headers = {"Authorization": f"Bearer {admin_token}"}
    before = await client.get("/api/v1/notifications/me/unread-count", headers=headers)
    assert before.json()["count"] >= 1

    mark_response = await client.post("/api/v1/notifications/read-all", headers=headers)
    assert mark_response.status_code == 200

    after = await client.get("/api/v1/notifications/me/unread-count", headers=headers)
    assert after.json()["count"] == 0
