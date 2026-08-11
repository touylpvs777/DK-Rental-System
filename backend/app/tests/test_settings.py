import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.user import User

pytestmark = pytest.mark.anyio

TEST_PASSWORD = "Test@1234"


async def _create_user(
    db_session: AsyncSession,
    *,
    username: str,
    password: str = TEST_PASSWORD,
    is_superuser: bool = False,
) -> User:
    user = User(
        email=f"{username}@example.com",
        username=username,
        hashed_password=hash_password(password),
        is_active=True,
        is_superuser=is_superuser,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def test_admin_can_read_and_update_settings(client: AsyncClient, db_session: AsyncSession):
    await _create_user(db_session, username="admin", is_superuser=True)

    login_response = await client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": TEST_PASSWORD},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    list_response = await client.get(
        "/api/v1/settings",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert list_response.status_code == 200
    assert list_response.json() == []

    update_response = await client.put(
        "/api/v1/settings/company_profile",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "value": {
                "company_name": "DK Service",
                "address": "Vientiane",
                "phone": "+856 20 000 000",
                "logo_url": "https://example.com/logo.png",
            },
            "description": "Company profile defaults",
        },
    )
    assert update_response.status_code == 200
    payload = update_response.json()
    assert payload["key"] == "company_profile"
    assert payload["value"]["company_name"] == "DK Service"


async def test_non_admin_cannot_access_settings(client: AsyncClient, db_session: AsyncSession):
    await _create_user(db_session, username="manager", is_superuser=False)

    login_response = await client.post(
        "/api/v1/auth/login",
        json={"username": "manager", "password": TEST_PASSWORD},
    )
    token = login_response.json()["access_token"]

    response = await client.get(
        "/api/v1/settings",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 403
