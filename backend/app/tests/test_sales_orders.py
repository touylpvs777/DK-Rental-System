import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.customer import Customer
from app.models.quotation import Quotation, QuotationStatus, QuotationType
from app.models.user import User

pytestmark = pytest.mark.anyio


async def _login(client: AsyncClient, db_session: AsyncSession, *, username: str = "agent") -> str:
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
    return response.json()["access_token"]


async def _make_customer(db_session: AsyncSession) -> Customer:
    customer = Customer(first_name="Somchai", last_name="Vong", company="Vong Logistics")
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)
    return customer


async def _make_quotation(db_session: AsyncSession, *, customer: Customer) -> Quotation:
    quotation = Quotation(
        quotation_number="QT-SAL-2026-00001",
        quotation_type=QuotationType.SALES.value,
        status=QuotationStatus.ACCEPTED.value,
        title="Forklift sale quote",
        customer_id=customer.id,
    )
    db_session.add(quotation)
    await db_session.commit()
    await db_session.refresh(quotation)
    return quotation


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── CRUD ─────────────────────────────────────────────────────────────────────


async def test_create_sales_order_returns_201_and_persists(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)

    response = await client.post(
        "/api/v1/sales-orders/",
        json={"title": "Forklift order", "customer_id": customer.id},
        headers=_auth(token),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["so_number"].startswith("SO-")
    assert body["status"] == "draft"
    assert body["title"] == "Forklift order"


async def test_create_sales_order_links_to_quotation(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    quotation = await _make_quotation(db_session, customer=customer)

    response = await client.post(
        "/api/v1/sales-orders/",
        json={"title": "Order from quote", "customer_id": customer.id, "quotation_id": quotation.id},
        headers=_auth(token),
    )

    assert response.status_code == 201
    so_id = response.json()["id"]

    detail = await client.get(f"/api/v1/sales-orders/{so_id}", headers=_auth(token))
    assert detail.status_code == 200
    assert detail.json()["quotation"]["id"] == quotation.id
    assert detail.json()["quotation"]["quotation_number"] == quotation.quotation_number


async def test_update_sales_order_rejected_once_confirmed(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)

    created = await client.post("/api/v1/sales-orders/", json={"title": "SO"}, headers=_auth(token))
    so_id = created.json()["id"]
    await client.post(
        f"/api/v1/sales-orders/{so_id}/items",
        json={"description": "Forklift 3T", "unit_price": 15000},
        headers=_auth(token),
    )
    confirmed = await client.post(f"/api/v1/sales-orders/{so_id}/confirm", headers=_auth(token))
    assert confirmed.status_code == 200
    assert confirmed.json()["status"] == "confirmed"

    update = await client.put(
        f"/api/v1/sales-orders/{so_id}", json={"title": "Changed"}, headers=_auth(token),
    )
    assert update.status_code == 422


# ── Items & totals ───────────────────────────────────────────────────────────


async def test_add_item_recalculates_totals(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    created = await client.post("/api/v1/sales-orders/", json={"title": "SO"}, headers=_auth(token))
    so_id = created.json()["id"]

    item = await client.post(
        f"/api/v1/sales-orders/{so_id}/items",
        json={
            "description": "Forklift 3T", "quantity": 2, "unit_price": 1000,
            "discount_percent": 10, "tax_percent": 5,
        },
        headers=_auth(token),
    )
    assert item.status_code == 201
    body = item.json()
    # line_total = 2*1000*(1-0.10) = 1800; tax = 1800*0.05 = 90; total = 1890
    assert body["line_total"] == 1800
    assert body["tax_amount"] == 90
    assert body["total"] == 1890

    detail = await client.get(f"/api/v1/sales-orders/{so_id}", headers=_auth(token))
    detail_body = detail.json()
    assert detail_body["subtotal"] == 1800
    assert detail_body["total_amount"] == 1890


async def test_bulk_replace_items_single_transaction(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    created = await client.post("/api/v1/sales-orders/", json={"title": "SO"}, headers=_auth(token))
    so_id = created.json()["id"]

    bulk = await client.put(
        f"/api/v1/sales-orders/{so_id}/items/bulk",
        json=[
            {"description": "Item A", "quantity": 1, "unit_price": 100},
            {"description": "Item B", "quantity": 2, "unit_price": 50},
        ],
        headers=_auth(token),
    )
    assert bulk.status_code == 200
    assert len(bulk.json()) == 2

    detail = await client.get(f"/api/v1/sales-orders/{so_id}", headers=_auth(token))
    assert len(detail.json()["items"]) == 2
    assert detail.json()["subtotal"] == 200


# ── Workflow ─────────────────────────────────────────────────────────────────


async def test_confirm_requires_line_items(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    created = await client.post("/api/v1/sales-orders/", json={"title": "SO"}, headers=_auth(token))
    so_id = created.json()["id"]

    response = await client.post(f"/api/v1/sales-orders/{so_id}/confirm", headers=_auth(token))
    assert response.status_code == 422


async def test_confirm_then_complete_workflow(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    created = await client.post("/api/v1/sales-orders/", json={"title": "SO"}, headers=_auth(token))
    so_id = created.json()["id"]
    await client.post(
        f"/api/v1/sales-orders/{so_id}/items",
        json={"description": "Forklift 3T", "unit_price": 15000},
        headers=_auth(token),
    )

    confirm = await client.post(f"/api/v1/sales-orders/{so_id}/confirm", headers=_auth(token))
    assert confirm.status_code == 200
    assert confirm.json()["status"] == "confirmed"

    complete = await client.post(f"/api/v1/sales-orders/{so_id}/complete", headers=_auth(token))
    assert complete.status_code == 200
    assert complete.json()["status"] == "completed"

    # Terminal — no further transitions allowed.
    cancel = await client.post(f"/api/v1/sales-orders/{so_id}/cancel", headers=_auth(token))
    assert cancel.status_code == 422


async def test_cancel_from_draft(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    created = await client.post("/api/v1/sales-orders/", json={"title": "SO"}, headers=_auth(token))
    so_id = created.json()["id"]

    response = await client.post(
        f"/api/v1/sales-orders/{so_id}/cancel", json={"reason": "Customer withdrew"}, headers=_auth(token),
    )
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"


async def test_delete_requires_draft_status(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    created = await client.post("/api/v1/sales-orders/", json={"title": "SO"}, headers=_auth(token))
    so_id = created.json()["id"]
    await client.post(
        f"/api/v1/sales-orders/{so_id}/items",
        json={"description": "Forklift 3T", "unit_price": 15000},
        headers=_auth(token),
    )
    await client.post(f"/api/v1/sales-orders/{so_id}/confirm", headers=_auth(token))

    response = await client.delete(f"/api/v1/sales-orders/{so_id}", headers=_auth(token))
    assert response.status_code == 422
