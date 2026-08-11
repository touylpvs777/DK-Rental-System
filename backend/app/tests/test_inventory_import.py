import pytest
from httpx import AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import hash_password
from app.models.activity_log import ActivityLog
from app.models.brand import Brand
from app.models.inventory_balance import InventoryBalance
from app.models.inventory_transaction import InventoryTransaction
from app.models.spare_part import SparePart
from app.models.user import User
from app.models.notification import Notification
from app.models.warehouse import Warehouse
from app.services.notification_service import ADMIN_ROLE

pytestmark = pytest.mark.anyio

TEST_PASSWORD = "Test@1234"

CSV_CONTENT = (
    b"SKU,Name,Category,Quantity,Unit Price\n"
    b"NEW-001,New Widget,general,15,9.99\n"
    b"EXIST-001,Existing Widget Updated,general,,12.50\n"
    b",Missing SKU Row,general,5,3.00\n"
)


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


async def test_import_creates_updates_and_reports_row_errors(client: AsyncClient, db_session: AsyncSession):
    await _create_admin(db_session)

    warehouse = Warehouse(code="MAIN", name="Main Warehouse")
    db_session.add(warehouse)
    existing = SparePart(part_number="EXIST-001", name="Existing Widget", unit_price=5.0)
    db_session.add(existing)
    await db_session.commit()

    token = await _login(client)

    response = await client.post(
        "/api/v1/inventory/import",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("parts.csv", CSV_CONTENT, "text/csv")},
    )
    assert response.status_code == 200
    body = response.json()

    assert body["rows_imported"] == 1
    assert body["rows_updated"] == 1
    assert body["success"] is True  # endpoint always succeeds; per-row problems land in errors[]
    assert len(body["errors"]) == 1
    assert body["errors"][0]["row_number"] == 4
    assert "part_number" in body["errors"][0]["error_message"] or "SKU" in body["errors"][0]["error_message"]

    # New part was created with the given price
    new_part = (await db_session.execute(
        select(SparePart).where(SparePart.part_number == "NEW-001")
    )).scalar_one()
    assert new_part.name == "New Widget"
    assert new_part.unit_price == 9.99

    # Quantity for the new part landed on the default warehouse's balance
    balance = (await db_session.execute(
        select(InventoryBalance).where(InventoryBalance.spare_part_id == new_part.id)
    )).scalar_one()
    assert balance.warehouse_id == warehouse.id
    assert balance.quantity_on_hand == 15

    # Existing part was updated in place (blank Quantity left untouched)
    await db_session.refresh(existing)
    assert existing.name == "Existing Widget Updated"
    assert existing.unit_price == 12.50

    # Audit trail recorded
    logs = (await db_session.execute(
        select(ActivityLog).where(ActivityLog.action == "inventory_import_executed")
    )).scalars().all()
    assert len(logs) == 1
    assert logs[0].details["rows_imported"] == 1
    assert logs[0].details["rows_updated"] == 1


async def test_import_quantity_is_additive_goods_receipt(client: AsyncClient, db_session: AsyncSession):
    """Importing a Quantity for a part that already has stock must ADD to
    the existing balance (a goods receipt — more stock arrived) rather than
    overwrite it, and must record a RECEIVE transaction (not ADJUST) as the
    auditable Goods Receipt document."""
    await _create_admin(db_session)

    warehouse = Warehouse(code="MAIN", name="Main Warehouse")
    db_session.add(warehouse)
    existing = SparePart(part_number="RESTOCK-001", name="Restock Widget", unit_price=5.0)
    db_session.add(existing)
    await db_session.commit()
    await db_session.refresh(existing)

    balance = InventoryBalance(
        spare_part_id=existing.id, warehouse_id=warehouse.id,
        quantity_on_hand=5, quantity_reserved=0, quantity_available=5,
    )
    db_session.add(balance)
    await db_session.commit()

    token = await _login(client)
    csv_bytes = b"SKU,Name,Quantity\nRESTOCK-001,Restock Widget,10\n"
    response = await client.post(
        "/api/v1/inventory/import",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("restock.csv", csv_bytes, "text/csv")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["rows_updated"] == 1
    assert len(body["errors"]) == 0

    await db_session.refresh(balance)
    assert balance.quantity_on_hand == 15  # 5 existing + 10 received, not overwritten to 10

    txn = (await db_session.execute(
        select(InventoryTransaction).where(InventoryTransaction.spare_part_id == existing.id)
    )).scalar_one()
    assert txn.transaction_type == "receive"
    assert txn.quantity == 10
    assert txn.reference_type == "inventory_import"


async def test_import_zero_quantity_creates_no_transaction(client: AsyncClient, db_session: AsyncSession):
    """A row that explicitly reports Quantity=0 is 'nothing received', not
    an error and not a goods receipt — no transaction should be created."""
    await _create_admin(db_session)
    token = await _login(client)

    csv_bytes = b"SKU,Name,Quantity\nZERO-001,Zero Widget,0\n"
    response = await client.post(
        "/api/v1/inventory/import",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("zero.csv", csv_bytes, "text/csv")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["rows_imported"] == 1
    assert len(body["errors"]) == 0

    part = (await db_session.execute(
        select(SparePart).where(SparePart.part_number == "ZERO-001")
    )).scalar_one()
    txns = (await db_session.execute(
        select(InventoryTransaction).where(InventoryTransaction.spare_part_id == part.id)
    )).scalars().all()
    assert txns == []


async def test_import_completion_notifies_admins(client: AsyncClient, db_session: AsyncSession):
    """Enterprise Audit & Alert: a completed import fires one summary
    notification to the admin role feed — not one per row."""
    await _create_admin(db_session)
    token = await _login(client)

    csv_bytes = b"SKU,Name,Quantity\nAUDIT-001,Audit Test Part,5\n"
    response = await client.post(
        "/api/v1/inventory/import",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("audit.csv", csv_bytes, "text/csv")},
    )
    assert response.status_code == 200

    notifications = (await db_session.execute(
        select(Notification).where(
            Notification.target_role == ADMIN_ROLE,
            Notification.event_type == "inventory.import_completed",
        )
    )).scalars().all()
    assert len(notifications) == 1
    assert "imported inventory into" in notifications[0].message
    assert "1 new part(s)" in notifications[0].message
    assert notifications[0].channel == "in_app"


async def test_import_rejects_unsupported_file_type(client: AsyncClient, db_session: AsyncSession):
    await _create_admin(db_session)
    token = await _login(client)

    response = await client.post(
        "/api/v1/inventory/import",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("parts.txt", b"not a real file", "text/plain")},
    )
    assert response.status_code == 422


async def test_import_without_warehouse_auto_provisions_one(client: AsyncClient, db_session: AsyncSession):
    await _create_admin(db_session)
    token = await _login(client)

    # No warehouse exists — self-healing import must auto-create a default
    # one (WH-MAIN) rather than failing every row that supplies Quantity.
    csv_bytes = b"SKU,Name,Category,Quantity,Unit Price\nNOWH-001,No Warehouse Part,general,10,1.00\n"
    response = await client.post(
        "/api/v1/inventory/import",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("parts.csv", csv_bytes, "text/csv")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["rows_imported"] == 1
    assert len(body["errors"]) == 0

    warehouse = (await db_session.execute(
        select(Warehouse).where(Warehouse.code == "WH-MAIN")
    )).scalar_one()
    assert warehouse.name == "Main Warehouse"

    part = (await db_session.execute(
        select(SparePart).where(SparePart.part_number == "NOWH-001")
    )).scalar_one()

    balance = (await db_session.execute(
        select(InventoryBalance).where(InventoryBalance.spare_part_id == part.id)
    )).scalar_one()
    assert balance.warehouse_id == warehouse.id
    assert balance.quantity_on_hand == 10


async def test_import_auto_provisions_unknown_brand(client: AsyncClient, db_session: AsyncSession):
    await _create_admin(db_session)
    token = await _login(client)

    csv_bytes = b"SKU,Name,Category,Brand,Unit Price\nBR-001,Branded Widget,general,Komatsu,4.50\n"
    response = await client.post(
        "/api/v1/inventory/import",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("parts.csv", csv_bytes, "text/csv")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["rows_imported"] == 1
    assert len(body["errors"]) == 0

    part = (await db_session.execute(
        select(SparePart).options(selectinload(SparePart.brand)).where(SparePart.part_number == "BR-001")
    )).scalar_one()
    assert part.brand is not None
    assert part.brand.name == "Komatsu"

    # Importing another row with the same brand name reuses it, not a duplicate.
    csv_bytes_2 = b"SKU,Name,Category,Brand,Unit Price\nBR-002,Another Widget,general,komatsu,6.00\n"
    response_2 = await client.post(
        "/api/v1/inventory/import",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("parts2.csv", csv_bytes_2, "text/csv")},
    )
    body_2 = response_2.json()
    assert body_2["success"] is True
    assert len(body_2["errors"]) == 0

    brands = (await db_session.execute(
        select(Brand).where(func.lower(Brand.name) == "komatsu")
    )).scalars().all()
    assert len(brands) == 1


async def test_import_never_500s_on_malformed_file(client: AsyncClient, db_session: AsyncSession):
    await _create_admin(db_session)
    token = await _login(client)

    # A .xlsx extension whose content isn't actually a valid spreadsheet —
    # this must degrade to a clean 4xx, never an unhandled 500.
    response = await client.post(
        "/api/v1/inventory/import",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("parts.xlsx", b"this is not a real xlsx file", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert response.status_code == 400
