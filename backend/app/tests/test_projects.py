import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.customer import Customer
from app.models.role import Role, RoleName
from app.models.user import User

pytestmark = pytest.mark.anyio


async def _login(
    client: AsyncClient, db_session: AsyncSession, *,
    username: str = "agent", is_superuser: bool = True, role_id: int | None = None,
) -> str:
    user = User(
        email=f"{username}@example.com",
        username=username,
        hashed_password=hash_password("Test@1234"),
        is_active=True,
        is_superuser=is_superuser,
        role_id=role_id,
    )
    db_session.add(user)
    await db_session.commit()

    response = await client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": "Test@1234"},
    )
    return response.json()["access_token"]


async def _make_role(db_session: AsyncSession, name: RoleName) -> Role:
    role = Role(name=name.value, description=name.value, is_active=True)
    db_session.add(role)
    await db_session.commit()
    await db_session.refresh(role)
    return role


async def _make_customer(db_session: AsyncSession) -> Customer:
    customer = Customer(first_name="Somchai", last_name="Vong", company="Vong Logistics")
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)
    return customer


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── Project CRUD ─────────────────────────────────────────────────────────────


async def test_create_project_returns_201_and_persists(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)

    response = await client.post(
        "/api/v1/projects",
        json={"name": "Vientiane Warehouse Racking", "customer_id": customer.id},
        headers=_auth(token),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Vientiane Warehouse Racking"
    assert body["status"] == "draft"
    assert body["project_number"].startswith("PRJ-")


async def test_create_project_unknown_customer_returns_404(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)

    response = await client.post(
        "/api/v1/projects",
        json={"name": "Ghost Project", "customer_id": 9999},
        headers=_auth(token),
    )

    assert response.status_code == 404


async def test_list_projects_returns_created_project(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    await client.post(
        "/api/v1/projects",
        json={"name": "Savannakhet Depot Fitout", "customer_id": customer.id},
        headers=_auth(token),
    )

    response = await client.get("/api/v1/projects", headers=_auth(token))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["name"] == "Savannakhet Depot Fitout"
    assert body["items"][0]["milestone_total"] == 0


async def test_get_project_detail_includes_customer_and_empty_lists(
    client: AsyncClient, db_session: AsyncSession,
):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    create_resp = await client.post(
        "/api/v1/projects",
        json={"name": "Pakse Cold Storage", "customer_id": customer.id},
        headers=_auth(token),
    )
    project_id = create_resp.json()["id"]

    response = await client.get(f"/api/v1/projects/{project_id}", headers=_auth(token))

    assert response.status_code == 200
    body = response.json()
    assert body["customer"]["id"] == customer.id
    assert body["milestones"] == []
    assert body["boq_items"] == []


async def test_get_unknown_project_returns_404(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)

    response = await client.get("/api/v1/projects/9999", headers=_auth(token))

    assert response.status_code == 404


async def test_update_project_changes_status(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    create_resp = await client.post(
        "/api/v1/projects",
        json={"name": "Luang Prabang Expansion", "customer_id": customer.id},
        headers=_auth(token),
    )
    project_id = create_resp.json()["id"]

    response = await client.put(
        f"/api/v1/projects/{project_id}", json={"status": "survey"}, headers=_auth(token),
    )

    assert response.status_code == 200
    assert response.json()["status"] == "survey"


async def test_approve_boq_sets_status_to_boq_approved(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    create_resp = await client.post(
        "/api/v1/projects",
        json={"name": "Thakhek Yard", "customer_id": customer.id},
        headers=_auth(token),
    )
    project_id = create_resp.json()["id"]

    response = await client.post(f"/api/v1/projects/{project_id}/approve-boq", headers=_auth(token))

    assert response.status_code == 200
    assert response.json()["status"] == "boq_approved"


async def test_delete_project_returns_204(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    create_resp = await client.post(
        "/api/v1/projects",
        json={"name": "Attapeu Warehouse", "customer_id": customer.id},
        headers=_auth(token),
    )
    project_id = create_resp.json()["id"]

    response = await client.delete(f"/api/v1/projects/{project_id}", headers=_auth(token))
    assert response.status_code == 204

    get_resp = await client.get(f"/api/v1/projects/{project_id}", headers=_auth(token))
    assert get_resp.status_code == 404


# ── Milestones ───────────────────────────────────────────────────────────────


async def test_create_milestone_and_toggle_status(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    project_id = (await client.post(
        "/api/v1/projects",
        json={"name": "Vang Vieng Site", "customer_id": customer.id},
        headers=_auth(token),
    )).json()["id"]

    create_resp = await client.post(
        f"/api/v1/projects/{project_id}/milestones",
        json={"name": "Survey", "due_date": "2026-08-01"},
        headers=_auth(token),
    )
    assert create_resp.status_code == 201
    milestone = create_resp.json()
    assert milestone["status"] == "pending"

    status_resp = await client.patch(
        f"/api/v1/projects/{project_id}/milestones/{milestone['id']}/status",
        json={"status": "completed"},
        headers=_auth(token),
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "completed"

    detail_resp = await client.get(f"/api/v1/projects/{project_id}", headers=_auth(token))
    assert detail_resp.json()["milestone_total"] == 1
    assert detail_resp.json()["milestone_completed"] == 1


async def test_delete_milestone_returns_204(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    project_id = (await client.post(
        "/api/v1/projects",
        json={"name": "Xam Neua Site", "customer_id": customer.id},
        headers=_auth(token),
    )).json()["id"]
    milestone_id = (await client.post(
        f"/api/v1/projects/{project_id}/milestones",
        json={"name": "Design"},
        headers=_auth(token),
    )).json()["id"]

    response = await client.delete(
        f"/api/v1/projects/{project_id}/milestones/{milestone_id}", headers=_auth(token),
    )
    assert response.status_code == 204


# ── BOQ items ────────────────────────────────────────────────────────────────


async def test_create_boq_item_computes_total_price(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    project_id = (await client.post(
        "/api/v1/projects",
        json={"name": "Salavan Racking", "customer_id": customer.id},
        headers=_auth(token),
    )).json()["id"]

    response = await client.post(
        f"/api/v1/projects/{project_id}/boq-items",
        json={"description": "Heavy-duty pallet racking bay", "quantity": 4, "unit_price": 250.0},
        headers=_auth(token),
    )

    assert response.status_code == 201
    body = response.json()
    assert body["total_price"] == 1000.0


async def test_update_boq_item_recomputes_total_price(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    project_id = (await client.post(
        "/api/v1/projects",
        json={"name": "Bolikhamxay Racking", "customer_id": customer.id},
        headers=_auth(token),
    )).json()["id"]
    item_id = (await client.post(
        f"/api/v1/projects/{project_id}/boq-items",
        json={"description": "Shelving unit", "quantity": 2, "unit_price": 100.0},
        headers=_auth(token),
    )).json()["id"]

    response = await client.put(
        f"/api/v1/projects/{project_id}/boq-items/{item_id}",
        json={"quantity": 5},
        headers=_auth(token),
    )

    assert response.status_code == 200
    assert response.json()["total_price"] == 500.0


async def test_delete_boq_item_returns_204(client: AsyncClient, db_session: AsyncSession):
    token = await _login(client, db_session)
    customer = await _make_customer(db_session)
    project_id = (await client.post(
        "/api/v1/projects",
        json={"name": "Champasak Racking", "customer_id": customer.id},
        headers=_auth(token),
    )).json()["id"]
    item_id = (await client.post(
        f"/api/v1/projects/{project_id}/boq-items",
        json={"description": "Loading dock leveler", "quantity": 1, "unit_price": 800.0},
        headers=_auth(token),
    )).json()["id"]

    response = await client.delete(
        f"/api/v1/projects/{project_id}/boq-items/{item_id}", headers=_auth(token),
    )
    assert response.status_code == 204


# ── RBAC enforcement ─────────────────────────────────────────────────────────


async def test_support_role_forbidden_from_creating_project(client: AsyncClient, db_session: AsyncSession):
    role = await _make_role(db_session, RoleName.SUPPORT)
    token = await _login(
        client, db_session, username="coordinator", is_superuser=False, role_id=role.id,
    )
    customer = await _make_customer(db_session)

    response = await client.post(
        "/api/v1/projects",
        json={"name": "Unauthorized Project", "customer_id": customer.id},
        headers=_auth(token),
    )

    assert response.status_code == 403


async def test_support_role_forbidden_from_creating_boq_item(client: AsyncClient, db_session: AsyncSession):
    manager_role = await _make_role(db_session, RoleName.MANAGER)
    manager_token = await _login(
        client, db_session, username="manager", is_superuser=False, role_id=manager_role.id,
    )
    customer = await _make_customer(db_session)
    project_id = (await client.post(
        "/api/v1/projects",
        json={"name": "Manager Created Project", "customer_id": customer.id},
        headers=_auth(manager_token),
    )).json()["id"]

    support_role = await _make_role(db_session, RoleName.SUPPORT)
    support_token = await _login(
        client, db_session, username="tech", is_superuser=False, role_id=support_role.id,
    )

    response = await client.post(
        f"/api/v1/projects/{project_id}/boq-items",
        json={"description": "Unauthorized item", "quantity": 1, "unit_price": 10.0},
        headers=_auth(support_token),
    )

    assert response.status_code == 403


async def test_support_role_can_view_and_toggle_milestone_status(
    client: AsyncClient, db_session: AsyncSession,
):
    manager_role = await _make_role(db_session, RoleName.MANAGER)
    manager_token = await _login(
        client, db_session, username="manager2", is_superuser=False, role_id=manager_role.id,
    )
    customer = await _make_customer(db_session)
    project_id = (await client.post(
        "/api/v1/projects",
        json={"name": "Coordinator Test Project", "customer_id": customer.id},
        headers=_auth(manager_token),
    )).json()["id"]
    milestone_id = (await client.post(
        f"/api/v1/projects/{project_id}/milestones",
        json={"name": "Install"},
        headers=_auth(manager_token),
    )).json()["id"]

    support_role = await _make_role(db_session, RoleName.SUPPORT)
    support_token = await _login(
        client, db_session, username="tech2", is_superuser=False, role_id=support_role.id,
    )

    view_resp = await client.get(f"/api/v1/projects/{project_id}", headers=_auth(support_token))
    assert view_resp.status_code == 200

    status_resp = await client.patch(
        f"/api/v1/projects/{project_id}/milestones/{milestone_id}/status",
        json={"status": "in_progress"},
        headers=_auth(support_token),
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["status"] == "in_progress"
