from datetime import date, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.customer import Customer
from app.models.forklift import Forklift
from app.models.invoice import Invoice
from app.models.rental_contract import RentalContract
from app.models.user import User
from app.models.work_order import WorkOrder

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


async def _seed_customer_360_data(db_session: AsyncSession) -> Customer:
    customer = Customer(first_name="Somchai", last_name="Vong", company="Vong Logistics")
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)

    forklift = Forklift(
        serial_number="FL-001",
        slug="fl-001",
        name_en="Toyota 8FG25",
        customer_id=customer.id,
        current_hour_meter=120.5,
    )
    db_session.add(forklift)
    await db_session.commit()
    await db_session.refresh(forklift)

    contract = RentalContract(
        contract_number="RC-001",
        customer_id=customer.id,
        status="active",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
        total_value=5000.0,
        currency="LAK",
    )
    db_session.add(contract)
    await db_session.commit()
    await db_session.refresh(contract)

    work_order = WorkOrder(
        work_order_number="WO-001",
        forklift_id=forklift.id,
        order_type="preventive",
        status="in_progress",
        title="500-hour service",
        scheduled_date=datetime(2026, 3, 1),
    )
    invoice = Invoice(
        invoice_number="INV-001",
        contract_id=contract.id,
        customer_id=customer.id,
        status="issued",
        total_amount=1000.0,
        balance_due=1000.0,
        currency="LAK",
    )
    db_session.add_all([work_order, invoice])
    await db_session.commit()

    return customer


async def test_customer_360_returns_aggregated_data(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _seed_customer_360_data(db_session)

    response = await client.get(
        f"/api/v1/customers/{customer.id}/overview",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()

    assert data["customer"]["id"] == customer.id
    assert data["summary"]["forklift_count"] == 1
    assert data["summary"]["active_rental_count"] == 1
    assert data["summary"]["open_work_order_count"] == 1
    assert data["summary"]["total_outstanding"] == 1000.0

    assert len(data["forklifts"]) == 1
    assert data["forklifts"][0]["serial_number"] == "FL-001"

    assert len(data["rental_contracts"]) == 1
    assert data["rental_contracts"][0]["contract_number"] == "RC-001"

    assert len(data["work_orders"]) == 1
    assert data["work_orders"][0]["forklift"]["serial_number"] == "FL-001"

    assert len(data["invoices"]) == 1
    assert data["invoices"][0]["invoice_number"] == "INV-001"


async def test_customer_360_unknown_customer_returns_404(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)

    response = await client.get(
        "/api/v1/customers/999999/overview",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 404


async def test_customer_360_empty_customer_returns_empty_lists(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = Customer(first_name="Empty", last_name="Customer")
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)

    response = await client.get(
        f"/api/v1/customers/{customer.id}/overview",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["forklifts"] == []
    assert data["rental_contracts"] == []
    assert data["work_orders"] == []
    assert data["invoices"] == []
    assert data["summary"]["forklift_count"] == 0
