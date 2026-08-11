import io

import openpyxl
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import hash_password
from app.models.product import Product
from app.models.user import User

pytestmark = pytest.mark.anyio

TEST_PASSWORD = "Test@1234"


async def _create_admin(db_session: AsyncSession) -> User:
    user = User(
        email="admin@example.com", username="admin",
        hashed_password=hash_password(TEST_PASSWORD),
        is_active=True, is_superuser=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


async def _login(client: AsyncClient) -> str:
    response = await client.post(
        "/api/v1/auth/login", json={"username": "admin", "password": TEST_PASSWORD}
    )
    assert response.status_code == 200
    return response.json()["access_token"]


def _workbook_bytes(sheet_name: str, headers: list[str], rows: list[list[str]]) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = sheet_name
    ws.append(headers)
    for row in rows:
        ws.append(row)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


async def test_import_falls_back_to_generic_parser_for_unrecognized_sheet_name(
    client: AsyncClient, db_session: AsyncSession,
):
    """A sheet named e.g. 'Sheet1' matches none of the DK LAO template
    keywords (Jungheinrich, Mitsubishi, ...) — this must not silently
    import 0 rows. It should fall back to the generic header-driven parser
    on the first sheet instead."""
    await _create_admin(db_session)
    token = await _login(client)

    content = _workbook_bytes(
        "Sheet1",
        ["  Product Name  ", "Model", "BRAND", "Category", "Notes"],
        [
            ["Widget A", "WA-100", "Acme", "Tools", "First widget"],
            ["Widget B", "WB-200", "Acme", "Tools", ""],
        ],
    )

    response = await client.post(
        "/api/v1/catalog/products/import/",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("products.xlsx", content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert response.status_code == 200
    body = response.json()

    assert body["success_rows"] == 2
    assert body["error_rows"] == 0

    products = (await db_session.execute(
        select(Product).options(selectinload(Product.brand), selectinload(Product.category))
    )).scalars().all()
    names = {p.name_en for p in products}
    assert names == {"Widget A", "Widget B"}

    widget_a = next(p for p in products if p.name_en == "Widget A")
    assert widget_a.model_number == "WA-100"
    assert widget_a.brand is not None and widget_a.brand.name == "Acme"
    assert widget_a.category is not None and widget_a.category.name_en == "Tools"


async def test_import_known_sheet_name_still_uses_specialized_handler(
    client: AsyncClient, db_session: AsyncSession,
):
    """Sanity check: a recognized sheet name (containing 'Jungheinrich')
    must still be routed to its specialized column parser, not the
    generic fallback — the fallback only kicks in when nothing matches."""
    await _create_admin(db_session)
    token = await _login(client)

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Jungheinrich Forklift"
    ws.append(["Model", "Origin", "Lift Height", "Capacity", "Voltage"])  # row 1: title-ish
    ws.append(["Model", "Origin", "Lift Height", "Capacity", "Voltage"])  # row 2: header (parser starts row 3)
    ws.append(["EFG 220", "Germany", "3000 - 6000 mm", "2.0 - 2.5 t", "48 V"])
    buf = io.BytesIO()
    wb.save(buf)
    content = buf.getvalue()

    response = await client.post(
        "/api/v1/catalog/products/import/",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("forklifts.xlsx", content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success_rows"] == 1
    assert body["error_rows"] == 0

    product = (await db_session.execute(
        select(Product).options(selectinload(Product.brand)).where(Product.model_number == "EFG 220")
    )).scalar_one()
    assert product.brand is not None and product.brand.name == "Jungheinrich"
