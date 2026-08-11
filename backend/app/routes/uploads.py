import asyncio
import ipaddress
import logging
import socket
import uuid
from pathlib import Path
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, File, HTTPException, UploadFile, status
from pydantic import BaseModel, HttpUrl

from app.core.config import settings
from app.core.permissions import PermissionName, require_permission
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/uploads", tags=["Uploads"])

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

DANGEROUS_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".sh", ".ps1", ".dll", ".so",
    ".php", ".py", ".rb", ".js", ".html", ".htm", ".svg",
}

MIME_TO_EXT = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}

FETCH_TIMEOUT_SECONDS = 10.0

# How many bytes of the response body to buffer before deciding whether it's
# a real image. Large enough to cover every signature below with margin
# (WebP's is the longest at 12 bytes), small enough that a malicious or
# broken URL serving a huge non-image payload only ever costs us this much
# bandwidth before the download is aborted.
SNIFF_BYTES = 2048


def _sniff_image_type(head: bytes) -> str | None:
    """Identifies the true image format from its byte signature ("magic
    bytes"), independent of whatever Content-Type header the remote server
    sent — some CDNs/misconfigured servers serve real images under a generic
    type like `application/octet-stream`, which a header-only check would
    wrongly reject. Only the three formats this endpoint accepts are
    recognized; anything else (including non-image files) returns None.
    """
    if head.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if len(head) >= 12 and head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image/webp"
    return None


def _validate_file(file: UploadFile) -> None:
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"File type '{file.content_type}' is not allowed. Accepted: JPEG, PNG, WebP.",
        )

    filename = file.filename or ""
    ext = Path(filename).suffix.lower()
    if ext in DANGEROUS_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Executable files are not allowed.",
        )
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Extension '{ext}' is not allowed. Accepted: {', '.join(sorted(ALLOWED_EXTENSIONS))}.",
        )


class ImageFromUrlRequest(BaseModel):
    image_url: HttpUrl


async def _assert_public_host(hostname: str) -> None:
    """Blocks SSRF: rejects any hostname that resolves to a loopback, private,
    link-local (this includes the 169.254.169.254 cloud-metadata endpoint),
    multicast, reserved, or unspecified address. `HttpUrl` already restricts
    the scheme to http/https, so this is the remaining guard against the
    server being made to reach internal-only network targets. This checks the
    hostname's resolved address at request time; it does not pin the
    connection to that exact address, so it does not fully close a
    DNS-rebinding race (a name that resolves to a public IP here but is
    re-pointed at an internal IP by the time httpx connects moments later) —
    a narrower, harder-to-execute attack than the direct cases this blocks.
    """
    try:
        infos = await asyncio.to_thread(socket.getaddrinfo, hostname, None)
    except socket.gaierror:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Could not resolve the image URL's host.",
        )

    for info in infos:
        addr = info[4][0]
        ip = ipaddress.ip_address(addr.split("%")[0])  # strip IPv6 zone id if present
        if (
            ip.is_loopback or ip.is_private or ip.is_link_local
            or ip.is_multicast or ip.is_reserved or ip.is_unspecified
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="This image URL points to a disallowed network address.",
            )


@router.post(
    "/images",
    status_code=status.HTTP_201_CREATED,
    summary="Upload an image",
    response_model=dict,
)
async def upload_image(
    file: UploadFile = File(..., description="Image file (JPEG, PNG, WebP, max 5 MB)"),
    _: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    _validate_file(file)

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    content = await file.read()
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds {settings.MAX_UPLOAD_SIZE_MB} MB limit.",
        )

    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "image.jpg").suffix.lower()
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = upload_dir / unique_name

    file_path.write_bytes(content)

    url = f"/uploads/images/{unique_name}"
    logger.info("Image uploaded: %s (%d bytes)", url, len(content))

    return {
        "url": url,
        "filename": unique_name,
        "original_name": file.filename,
        "size": len(content),
        "content_type": file.content_type,
    }


@router.post(
    "/from-url",
    status_code=status.HTTP_201_CREATED,
    summary="Fetch an image from a URL and save it locally",
    response_model=dict,
)
async def upload_image_from_url(
    data: ImageFromUrlRequest,
    _: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    image_url = str(data.image_url)
    hostname = urlparse(image_url).hostname
    if not hostname:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Invalid image URL.")
    await _assert_public_host(hostname)

    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    chunks = bytearray()
    detected_type: str | None = None
    invalid_signature_error = HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail=(
            "URL did not return a supported image (checked the file's actual "
            "signature, not just its Content-Type header). Accepted: JPEG, PNG, WebP."
        ),
    )

    try:
        async with httpx.AsyncClient(timeout=FETCH_TIMEOUT_SECONDS, follow_redirects=False) as client:
            async with client.stream("GET", image_url) as response:
                if response.is_redirect:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail="The image URL redirects elsewhere; please provide a direct image URL.",
                    )
                if response.status_code != status.HTTP_200_OK:
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                        detail=f"Could not fetch the image (remote server responded {response.status_code}).",
                    )

                # The Content-Type header is deliberately NOT gated on here —
                # some CDNs serve real images as application/octet-stream or
                # similar, which previously caused false rejections. The
                # magic-byte check below is the sole authority on file type.
                async for chunk in response.aiter_bytes(chunk_size=SNIFF_BYTES):
                    chunks.extend(chunk)

                    if detected_type is None and len(chunks) >= SNIFF_BYTES:
                        detected_type = _sniff_image_type(bytes(chunks))
                        if detected_type is None:
                            # Raising here exits both `async with` blocks via
                            # their __aexit__, which aborts the in-flight
                            # download and closes the connection immediately —
                            # a bad/oversized payload is never fully fetched.
                            raise invalid_signature_error

                    if len(chunks) > max_bytes:
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"Image exceeds {settings.MAX_UPLOAD_SIZE_MB} MB limit.",
                        )

                # Response ended before SNIFF_BYTES accumulated (a
                # legitimately small image) — sniff whatever we have; every
                # signature above fits well under SNIFF_BYTES.
                if detected_type is None:
                    detected_type = _sniff_image_type(bytes(chunks))
                    if detected_type is None:
                        raise invalid_signature_error
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Timed out fetching the image URL.",
        )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Failed to fetch the image URL: {exc}",
        )

    content = bytes(chunks)

    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    ext = MIME_TO_EXT[detected_type]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = upload_dir / unique_name
    file_path.write_bytes(content)

    url = f"/uploads/images/{unique_name}"
    logger.info(
        "Image fetched from URL and saved: %s (%d bytes, source=%s, detected_type=%s)",
        url, len(content), image_url, detected_type,
    )

    return {
        "url": url,
        "filename": unique_name,
        "original_name": image_url,
        "size": len(content),
        "content_type": detected_type,
    }
