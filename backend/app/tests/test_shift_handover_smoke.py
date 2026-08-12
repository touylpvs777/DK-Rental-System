from datetime import date

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.customer import Customer
from app.models.forklift import Forklift
from app.models.rental_contract import RentalContract
from app.models.user import User

pytestmark = pytest.mark.anyio


async def _login(client: AsyncClient, db_session: AsyncSession) -> str:
    user = User(
        email="agent@example.com", username="agent",
        hashed_password=hash_password("Test@1234"),
        is_active=True, is_superuser=True,
    )
    db_session.add(user)
    await db_session.commit()
    response = await client.post("/api/v1/auth/login", json={"username": "agent", "password": "Test@1234"})
    return response.json()["access_token"]


async def _make_contract_and_forklift(db_session: AsyncSession) -> tuple[int, int]:
    customer = Customer(first_name="Somchai", last_name="Vong")
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)

    forklift = Forklift(serial_number="FL-001", slug="fl-001", name_en="Toyota 8FD25")
    contract = RentalContract(
        contract_number="RC-TEST-0001", customer_id=customer.id,
        start_date=date(2026, 1, 1), end_date=date(2026, 2, 1),
    )
    db_session.add_all([forklift, contract])
    await db_session.commit()
    await db_session.refresh(forklift)
    await db_session.refresh(contract)
    return contract.id, forklift.id


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def test_shift_handover_full_crud_lifecycle(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    contract_id, forklift_id = await _make_contract_and_forklift(db_session)

    # Create
    create_resp = await client.post(
        "/api/v1/shift-handovers/",
        json={
            "rental_contract_id": contract_id,
            "forklift_id": forklift_id,
            "handover_datetime": "2026-08-12T06:00:00Z",
            "shift_name": "Morning",
            "handover_person": "Nok",
            "receiver_person": "Somsak",
            "hour_meter": 1234.5,
            "checklist_status": "Issues Found",
            "issues_description": "Left fork slightly bent",
            "issue_photos": ["https://example.com/photo1.jpg"],
            "signatures": {"handover_person": "sig-a.png", "receiver_person": "sig-b.png"},
        },
        headers=_auth(token),
    )
    assert create_resp.status_code == 201, create_resp.text
    body = create_resp.json()
    assert body["rental_contract"]["id"] == contract_id
    assert body["forklift"]["id"] == forklift_id
    assert body["checklist_status"] == "Issues Found"
    handover_id = body["id"]

    # List (filtered)
    list_resp = await client.get(
        f"/api/v1/shift-handovers/?forklift_id={forklift_id}", headers=_auth(token),
    )
    assert list_resp.status_code == 200
    assert list_resp.json()["total"] == 1

    # Get by ID
    get_resp = await client.get(f"/api/v1/shift-handovers/{handover_id}", headers=_auth(token))
    assert get_resp.status_code == 200
    assert get_resp.json()["hour_meter"] == 1234.5

    # Update
    update_resp = await client.put(
        f"/api/v1/shift-handovers/{handover_id}",
        json={"checklist_status": "Normal", "issues_description": None},
        headers=_auth(token),
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["checklist_status"] == "Normal"
    assert update_resp.json()["issues_description"] is None

    # Delete
    delete_resp = await client.delete(f"/api/v1/shift-handovers/{handover_id}", headers=_auth(token))
    assert delete_resp.status_code == 204

    get_after_delete = await client.get(f"/api/v1/shift-handovers/{handover_id}", headers=_auth(token))
    assert get_after_delete.status_code == 404


async def test_create_handover_unknown_forklift_returns_404(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    contract_id, _forklift_id = await _make_contract_and_forklift(db_session)

    response = await client.post(
        "/api/v1/shift-handovers/",
        json={
            "rental_contract_id": contract_id,
            "forklift_id": 9999,
            "handover_datetime": "2026-08-12T06:00:00Z",
            "shift_name": "Night",
            "handover_person": "A",
            "receiver_person": "B",
            "hour_meter": 10,
        },
        headers=_auth(token),
    )
    assert response.status_code == 404
