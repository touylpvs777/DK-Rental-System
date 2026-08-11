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
    username: str = "testuser",
    email: str = "testuser@example.com",
    password: str = TEST_PASSWORD,
    is_active: bool = True,
) -> User:
    user = User(
        email=email,
        username=username,
        hashed_password=hash_password(password),
        is_active=is_active,
        is_superuser=False,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def test_login_success_returns_tokens(client: AsyncClient, db_session: AsyncSession):
    await _create_user(db_session)

    response = await client.post(
        "/api/v1/auth/login",
        json={"username": "testuser", "password": TEST_PASSWORD},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["token_type"] == "bearer"
    assert data["access_token"]
    assert data["refresh_token"]


async def test_login_wrong_password_returns_401(client: AsyncClient, db_session: AsyncSession):
    await _create_user(db_session)

    response = await client.post(
        "/api/v1/auth/login",
        json={"username": "testuser", "password": "WrongPassword"},
    )

    assert response.status_code == 401


async def test_login_unknown_user_returns_401(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/login",
        json={"username": "doesnotexist", "password": "whatever"},
    )

    assert response.status_code == 401


async def test_login_inactive_user_returns_401(client: AsyncClient, db_session: AsyncSession):
    await _create_user(db_session, username="inactiveuser", email="inactive@example.com", is_active=False)

    response = await client.post(
        "/api/v1/auth/login",
        json={"username": "inactiveuser", "password": TEST_PASSWORD},
    )

    assert response.status_code == 401


async def test_login_issues_token_usable_for_protected_route(client: AsyncClient, db_session: AsyncSession):
    await _create_user(db_session)

    login_response = await client.post(
        "/api/v1/auth/login",
        json={"username": "testuser", "password": TEST_PASSWORD},
    )
    token = login_response.json()["access_token"]

    me_response = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert me_response.status_code == 200
    assert me_response.json()["username"] == "testuser"
