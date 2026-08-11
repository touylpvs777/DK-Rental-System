import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.customer import Customer
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


async def _make_sales_order(client: AsyncClient, token: str, customer_id: int) -> int:
    response = await client.post(
        "/api/v1/sales-orders/",
        json={"title": "SO for delivery", "customer_id": customer_id},
        headers=_auth(token),
    )
    return response.json()["id"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── CRUD ─────────────────────────────────────────────────────────────────────


async def test_create_delivery_note_unknown_sales_order_returns_404(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)

    response = await client.post(
        "/api/v1/delivery-notes/",
        json={"sales_order_id": 9999},
        headers=_auth(token),
    )
    assert response.status_code == 404


async def test_create_delivery_note_returns_201_and_inherits_customer(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    so_id = await _make_sales_order(client, token, customer.id)

    response = await client.post(
        "/api/v1/delivery-notes/",
        json={"sales_order_id": so_id, "warehouse": "Vientiane Main WH"},
        headers=_auth(token),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["dn_number"].startswith("DN-")
    assert body["status"] == "draft"
    assert body["sales_order"]["id"] == so_id
    assert body["customer"]["id"] == customer.id


async def test_update_delivery_note_rejected_once_dispatched(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    so_id = await _make_sales_order(client, token, customer.id)
    created = await client.post(
        "/api/v1/delivery-notes/", json={"sales_order_id": so_id}, headers=_auth(token),
    )
    dn_id = created.json()["id"]
    await client.post(
        f"/api/v1/delivery-notes/{dn_id}/items",
        json={"description": "Forklift 3T", "quantity_delivered": 1},
        headers=_auth(token),
    )
    dispatched = await client.post(f"/api/v1/delivery-notes/{dn_id}/dispatch", headers=_auth(token))
    assert dispatched.status_code == 200
    assert dispatched.json()["status"] == "dispatched"

    update = await client.put(
        f"/api/v1/delivery-notes/{dn_id}", json={"warehouse": "Changed"}, headers=_auth(token),
    )
    assert update.status_code == 422


# ── Items ────────────────────────────────────────────────────────────────────


async def test_add_item_with_ordered_and_delivered_quantities(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    so_id = await _make_sales_order(client, token, customer.id)
    created = await client.post(
        "/api/v1/delivery-notes/", json={"sales_order_id": so_id}, headers=_auth(token),
    )
    dn_id = created.json()["id"]

    item = await client.post(
        f"/api/v1/delivery-notes/{dn_id}/items",
        json={"description": "Spare part filter", "quantity_ordered": 10, "quantity_delivered": 8, "unit": "pcs"},
        headers=_auth(token),
    )
    assert item.status_code == 201
    body = item.json()
    assert body["quantity_ordered"] == 10
    assert body["quantity_delivered"] == 8

    detail = await client.get(f"/api/v1/delivery-notes/{dn_id}", headers=_auth(token))
    assert len(detail.json()["items"]) == 1


async def test_bulk_replace_items_single_transaction(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    so_id = await _make_sales_order(client, token, customer.id)
    created = await client.post(
        "/api/v1/delivery-notes/", json={"sales_order_id": so_id}, headers=_auth(token),
    )
    dn_id = created.json()["id"]

    bulk = await client.put(
        f"/api/v1/delivery-notes/{dn_id}/items/bulk",
        json=[
            {"description": "Item A", "quantity_delivered": 1},
            {"description": "Item B", "quantity_delivered": 2},
        ],
        headers=_auth(token),
    )
    assert bulk.status_code == 200
    assert len(bulk.json()) == 2


# ── Workflow ─────────────────────────────────────────────────────────────────


async def test_dispatch_requires_line_items(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    so_id = await _make_sales_order(client, token, customer.id)
    created = await client.post(
        "/api/v1/delivery-notes/", json={"sales_order_id": so_id}, headers=_auth(token),
    )
    dn_id = created.json()["id"]

    response = await client.post(f"/api/v1/delivery-notes/{dn_id}/dispatch", headers=_auth(token))
    assert response.status_code == 422


async def test_dispatch_then_deliver_workflow(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    so_id = await _make_sales_order(client, token, customer.id)
    created = await client.post(
        "/api/v1/delivery-notes/", json={"sales_order_id": so_id}, headers=_auth(token),
    )
    dn_id = created.json()["id"]
    await client.post(
        f"/api/v1/delivery-notes/{dn_id}/items",
        json={"description": "Forklift 3T", "quantity_delivered": 1},
        headers=_auth(token),
    )

    dispatch = await client.post(f"/api/v1/delivery-notes/{dn_id}/dispatch", headers=_auth(token))
    assert dispatch.status_code == 200
    assert dispatch.json()["status"] == "dispatched"

    deliver = await client.post(f"/api/v1/delivery-notes/{dn_id}/deliver", headers=_auth(token))
    assert deliver.status_code == 200
    assert deliver.json()["status"] == "delivered"

    # Terminal — no further transitions allowed.
    cancel = await client.post(f"/api/v1/delivery-notes/{dn_id}/cancel", headers=_auth(token))
    assert cancel.status_code == 422


async def test_cancel_from_draft(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    so_id = await _make_sales_order(client, token, customer.id)
    created = await client.post(
        "/api/v1/delivery-notes/", json={"sales_order_id": so_id}, headers=_auth(token),
    )
    dn_id = created.json()["id"]

    response = await client.post(
        f"/api/v1/delivery-notes/{dn_id}/cancel", json={"reason": "Order cancelled"}, headers=_auth(token),
    )
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"


async def test_delete_requires_draft_status(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    so_id = await _make_sales_order(client, token, customer.id)
    created = await client.post(
        "/api/v1/delivery-notes/", json={"sales_order_id": so_id}, headers=_auth(token),
    )
    dn_id = created.json()["id"]
    await client.post(
        f"/api/v1/delivery-notes/{dn_id}/items",
        json={"description": "Forklift 3T", "quantity_delivered": 1},
        headers=_auth(token),
    )
    await client.post(f"/api/v1/delivery-notes/{dn_id}/dispatch", headers=_auth(token))

    response = await client.delete(f"/api/v1/delivery-notes/{dn_id}", headers=_auth(token))
    assert response.status_code == 422
