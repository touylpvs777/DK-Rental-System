import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.customer import Customer
from app.models.invoice import Invoice
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


async def _make_invoice(db_session: AsyncSession, customer_id: int, *, number: str = "INV-TEST-0001") -> Invoice:
    invoice = Invoice(
        invoice_number=number,
        customer_id=customer_id,
        status="issued",
        total_amount=5_000_000.0,
        balance_due=5_000_000.0,
        currency="LAK",
        vehicle_make="Toyota",
        job_number="JOB-001",
    )
    db_session.add(invoice)
    await db_session.commit()
    await db_session.refresh(invoice)
    return invoice


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── CRUD ─────────────────────────────────────────────────────────────────────


async def test_create_receipt_unknown_invoice_returns_404(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)

    response = await client.post(
        "/api/v1/receipts/",
        json={"invoice_id": 9999, "amount_received": 100},
        headers=_auth(token),
    )
    assert response.status_code == 404


async def test_create_receipt_returns_201_and_inherits_customer_and_vehicle(
    client: AsyncClient, db_session: AsyncSession,
):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    invoice = await _make_invoice(db_session, customer.id)

    response = await client.post(
        "/api/v1/receipts/",
        json={"invoice_id": invoice.id, "amount_received": 5_000_000, "payment_method": "transfer", "bank_account": "BCEL"},
        headers=_auth(token),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["receipt_number"].startswith("RCT-")
    assert body["status"] == "draft"
    assert body["invoice"]["id"] == invoice.id
    assert body["customer"]["id"] == customer.id
    assert body["payment_method"] == "transfer"

    detail = await client.get(f"/api/v1/receipts/{body['id']}", headers=_auth(token))
    assert detail.json()["bank_account"] == "BCEL"
    assert detail.json()["vehicle_make"] == "Toyota"
    assert detail.json()["job_number"] == "JOB-001"


async def test_create_receipt_rejects_invalid_payment_method(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    invoice = await _make_invoice(db_session, customer.id)

    response = await client.post(
        "/api/v1/receipts/",
        json={"invoice_id": invoice.id, "amount_received": 100, "payment_method": "bitcoin"},
        headers=_auth(token),
    )
    assert response.status_code == 422


async def test_create_receipt_rejects_non_positive_amount(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    invoice = await _make_invoice(db_session, customer.id)

    response = await client.post(
        "/api/v1/receipts/",
        json={"invoice_id": invoice.id, "amount_received": 0},
        headers=_auth(token),
    )
    assert response.status_code == 422


async def test_update_receipt_rejected_once_confirmed(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    invoice = await _make_invoice(db_session, customer.id)
    created = await client.post(
        "/api/v1/receipts/", json={"invoice_id": invoice.id, "amount_received": 1000}, headers=_auth(token),
    )
    receipt_id = created.json()["id"]

    confirmed = await client.post(f"/api/v1/receipts/{receipt_id}/confirm", headers=_auth(token))
    assert confirmed.status_code == 200
    assert confirmed.json()["status"] == "confirmed"

    update = await client.put(
        f"/api/v1/receipts/{receipt_id}", json={"reference_number": "Changed"}, headers=_auth(token),
    )
    assert update.status_code == 422


# ── Workflow ─────────────────────────────────────────────────────────────────


async def test_confirm_then_cancel_workflow(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    invoice = await _make_invoice(db_session, customer.id)
    created = await client.post(
        "/api/v1/receipts/", json={"invoice_id": invoice.id, "amount_received": 2500}, headers=_auth(token),
    )
    receipt_id = created.json()["id"]

    confirm = await client.post(f"/api/v1/receipts/{receipt_id}/confirm", headers=_auth(token))
    assert confirm.status_code == 200
    assert confirm.json()["status"] == "confirmed"

    cancel = await client.post(
        f"/api/v1/receipts/{receipt_id}/cancel", json={"reason": "Duplicate entry"}, headers=_auth(token),
    )
    assert cancel.status_code == 200
    assert cancel.json()["status"] == "cancelled"

    # Terminal — no further transitions allowed.
    confirm_again = await client.post(f"/api/v1/receipts/{receipt_id}/confirm", headers=_auth(token))
    assert confirm_again.status_code == 422


async def test_cancel_from_draft(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    invoice = await _make_invoice(db_session, customer.id)
    created = await client.post(
        "/api/v1/receipts/", json={"invoice_id": invoice.id, "amount_received": 1000}, headers=_auth(token),
    )
    receipt_id = created.json()["id"]

    response = await client.post(
        f"/api/v1/receipts/{receipt_id}/cancel", json={"reason": "Cancelled"}, headers=_auth(token),
    )
    assert response.status_code == 200
    assert response.json()["status"] == "cancelled"


async def test_delete_requires_draft_status(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    invoice = await _make_invoice(db_session, customer.id)
    created = await client.post(
        "/api/v1/receipts/", json={"invoice_id": invoice.id, "amount_received": 1000}, headers=_auth(token),
    )
    receipt_id = created.json()["id"]
    await client.post(f"/api/v1/receipts/{receipt_id}/confirm", headers=_auth(token))

    response = await client.delete(f"/api/v1/receipts/{receipt_id}", headers=_auth(token))
    assert response.status_code == 422


async def test_delete_draft_receipt_succeeds(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    invoice = await _make_invoice(db_session, customer.id)
    created = await client.post(
        "/api/v1/receipts/", json={"invoice_id": invoice.id, "amount_received": 1000}, headers=_auth(token),
    )
    receipt_id = created.json()["id"]

    response = await client.delete(f"/api/v1/receipts/{receipt_id}", headers=_auth(token))
    assert response.status_code == 204


# ── List ─────────────────────────────────────────────────────────────────────


async def test_list_receipts_filters_by_invoice(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    invoice_a = await _make_invoice(db_session, customer.id, number="INV-TEST-0002")
    invoice_b = await _make_invoice(db_session, customer.id, number="INV-TEST-0003")
    await client.post("/api/v1/receipts/", json={"invoice_id": invoice_a.id, "amount_received": 100}, headers=_auth(token))
    await client.post("/api/v1/receipts/", json={"invoice_id": invoice_b.id, "amount_received": 200}, headers=_auth(token))

    response = await client.get(f"/api/v1/receipts/?invoice_id={invoice_a.id}", headers=_auth(token))
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["invoice"]["id"] == invoice_a.id
