import httpx
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.user import User

pytestmark = pytest.mark.anyio

# Only the leading bytes matter for magic-byte sniffing — the rest is filler.
# This also keeps the payload well under SNIFF_BYTES (2048), exercising the
# "stream ended before the sniff threshold" fallback path.
FAKE_JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"\x00" * 200


async def _login_as_superuser(client: AsyncClient, db_session: AsyncSession, *, username: str) -> str:
    user = User(
        email=f"{username}@example.com",
        username=username,
        hashed_password=hash_password("Test@1234"),
        is_active=True,
        is_superuser=True,
    )
    db_session.add(user)
    await db_session.commit()

    response = await client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": "Test@1234"},
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _mock_remote_response(monkeypatch, *, content: bytes, content_type: str) -> None:
    """Redirects the endpoint's outbound httpx.AsyncClient onto a MockTransport
    that returns the given body/headers instead of making a real request —
    DNS resolution (and therefore the SSRF hostname check) still runs for
    real against whatever URL the test uses, only the actual data fetch is
    faked."""
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, headers={"content-type": content_type}, content=content)

    mock_transport = httpx.MockTransport(handler)
    real_init = httpx.AsyncClient.__init__

    def patched_init(self, *args, **kwargs):
        kwargs["transport"] = mock_transport
        real_init(self, *args, **kwargs)

    monkeypatch.setattr(httpx.AsyncClient, "__init__", patched_init)


async def test_from_url_accepts_valid_image_served_as_octet_stream(
    client: AsyncClient, db_session: AsyncSession, monkeypatch,
):
    """Reproduces the reported bug: a real image served under a generic
    Content-Type (application/octet-stream) must be accepted, since the
    endpoint now identifies the format from the file's actual byte
    signature rather than trusting the remote server's header."""
    _mock_remote_response(monkeypatch, content=FAKE_JPEG_BYTES, content_type="application/octet-stream")
    token = await _login_as_superuser(client, db_session, username="octetstream")

    response = await client.post(
        "/api/v1/uploads/from-url",
        json={"image_url": "https://example.com/photo-from-cdn"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201, response.json()
    data = response.json()
    assert data["content_type"] == "image/jpeg"
    assert data["url"].endswith(".jpg")
    assert data["size"] == len(FAKE_JPEG_BYTES)


async def test_from_url_rejects_non_image_even_with_spoofed_image_content_type(
    client: AsyncClient, db_session: AsyncSession, monkeypatch,
):
    """The inverse case: a Content-Type header lying in the *other*
    direction (claims to be an image but isn't) must still be rejected —
    proving the header is never trusted, only the bytes are."""
    _mock_remote_response(
        monkeypatch,
        content=b"<html><body>Not an image</body></html>",
        content_type="image/jpeg",
    )
    token = await _login_as_superuser(client, db_session, username="spoofedtype")

    response = await client.post(
        "/api/v1/uploads/from-url",
        json={"image_url": "https://example.com/not-really-a-photo"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 422
    assert "signature" in response.json()["detail"].lower()


async def test_from_url_still_blocks_loopback_targets(
    client: AsyncClient, db_session: AsyncSession,
):
    """Regression check: the magic-byte change must not have weakened the
    SSRF host guard, which runs before any HTTP fetch is attempted."""
    token = await _login_as_superuser(client, db_session, username="ssrfcheck")

    response = await client.post(
        "/api/v1/uploads/from-url",
        json={"image_url": "http://127.0.0.1/internal.jpg"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 422
    assert "disallowed network address" in response.json()["detail"]
