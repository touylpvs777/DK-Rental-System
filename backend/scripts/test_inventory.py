"""End-to-end inventory test — exercises every feature in the checklist.

Idempotent: uses timestamp-based unique identifiers so it can run repeatedly.
"""

import asyncio
import sys
import os
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from httpx import AsyncClient, ASGITransport
from app.main import app

passed = 0
failed = 0
RUN_ID = str(int(time.time()))[-6:]


def check(label, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  ✓ {label}")
    else:
        failed += 1
        print(f"  ✗ {label} — {detail}")


async def main():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        r = await c.post("/api/v1/auth/login", json={"username": "admin", "password": "Admin@123"})
        h = {"Authorization": f"Bearer {r.json()['access_token']}"}

        print("=== INVENTORY END-TO-END TEST ===\n")

        # 1. Spare Part CRUD
        print("[1] Spare Part CRUD")
        r = await c.get("/api/v1/inventory/parts", headers=h)
        check("List parts", r.status_code == 200 and r.json()["total"] >= 12)

        r = await c.get("/api/v1/inventory/parts", headers=h, params={"part_category": "filter"})
        check("Filter by category", r.status_code == 200 and r.json()["total"] >= 2)

        r = await c.get("/api/v1/inventory/parts", headers=h, params={"q": "brake"})
        check("Search by name", r.status_code == 200 and r.json()["total"] >= 1)

        parts = (await c.get("/api/v1/inventory/parts", headers=h)).json()["items"]
        p1 = parts[0]
        r = await c.get(f"/api/v1/inventory/parts/{p1['id']}", headers=h)
        check("Get part detail", r.status_code == 200)

        r = await c.post("/api/v1/inventory/parts", headers=h, json={
            "part_number": f"TST-{RUN_ID}", "name": "Manual Test Part",
            "part_category": "general", "unit_price": 10000,
        })
        check("Create part", r.status_code == 201)
        test_part_id = r.json()["id"]

        r = await c.put(f"/api/v1/inventory/parts/{test_part_id}", headers=h, json={"name": "Updated Name"})
        check("Update part", r.status_code == 200 and r.json()["name"] == "Updated Name")

        r = await c.post("/api/v1/inventory/parts", headers=h, json={
            "part_number": f"TST-{RUN_ID}", "name": "Dup", "part_category": "general",
        })
        check("Duplicate rejected (409)", r.status_code == 409)

        r = await c.get("/api/v1/inventory/parts", headers=h, params={"page_size": 200})
        check("Pagination guard (422)", r.status_code == 422)

        # 2. Warehouse CRUD
        print("\n[2] Warehouse CRUD")
        r = await c.get("/api/v1/inventory/warehouses", headers=h)
        check("List warehouses", r.status_code == 200 and len(r.json()) >= 3)

        r = await c.post("/api/v1/inventory/warehouses", headers=h, json={"code": f"TW-{RUN_ID}", "name": "Test WH"})
        check("Create warehouse", r.status_code == 201)
        test_wh_id = r.json()["id"]

        r = await c.post("/api/v1/inventory/warehouses", headers=h, json={"code": f"TW-{RUN_ID}", "name": "Dup"})
        check("Duplicate code rejected (409)", r.status_code == 409)

        # 3. Stock In
        print("\n[3] Stock In (Receive)")
        whs = (await c.get("/api/v1/inventory/warehouses", headers=h)).json()
        wh1_id = whs[0]["id"]

        r = await c.post("/api/v1/inventory/transactions", headers=h, json={
            "transaction_type": "receive", "spare_part_id": test_part_id,
            "warehouse_id": wh1_id, "quantity": 50, "unit_cost": 10000,
        })
        check("Receive stock", r.status_code == 201)

        r = await c.get("/api/v1/inventory/balances", headers=h, params={"spare_part_id": test_part_id})
        bal = r.json()[0] if r.json() else {}
        check("Balance = 50", bal.get("quantity_on_hand") == 50)

        # 4. Stock Out
        print("\n[4] Stock Out (Issue)")
        r = await c.post("/api/v1/inventory/transactions", headers=h, json={
            "transaction_type": "issue", "spare_part_id": test_part_id,
            "warehouse_id": wh1_id, "quantity": 5, "unit_cost": 10000,
        })
        check("Issue stock", r.status_code == 201)

        r = await c.get("/api/v1/inventory/balances", headers=h, params={"spare_part_id": test_part_id})
        check("Balance = 45", r.json()[0]["quantity_on_hand"] == 45)

        # 5. Stock Adjustment
        print("\n[5] Stock Adjustment")
        r = await c.post("/api/v1/inventory/transactions", headers=h, json={
            "transaction_type": "adjust", "spare_part_id": test_part_id,
            "warehouse_id": wh1_id, "quantity": 40, "unit_cost": 10000,
        })
        check("Adjust stock", r.status_code == 201)

        r = await c.get("/api/v1/inventory/balances", headers=h, params={"spare_part_id": test_part_id})
        check("Balance = 40 (adjusted)", r.json()[0]["quantity_on_hand"] == 40)

        # 6. Part Consumption
        print("\n[6] Part Consumption")
        r = await c.post("/api/v1/inventory/consume", headers=h, json={
            "spare_part_id": test_part_id, "warehouse_id": wh1_id, "quantity": 3,
        })
        check("Consume part", r.status_code == 201 and r.json()["total_cost"] == 30000)

        r = await c.get("/api/v1/inventory/balances", headers=h, params={"spare_part_id": test_part_id})
        check("Balance = 37", r.json()[0]["quantity_on_hand"] == 37)

        r = await c.post("/api/v1/inventory/consume", headers=h, json={
            "spare_part_id": test_part_id, "warehouse_id": wh1_id, "quantity": 999,
        })
        check("Insufficient stock rejected (422)", r.status_code == 422)

        r = await c.get("/api/v1/inventory/consumptions", headers=h, params={"spare_part_id": test_part_id})
        check("Consumption history", r.status_code == 200 and len(r.json()) >= 1)

        # 7. Purchase Order Workflow
        print("\n[7] Purchase Order Workflow")
        r = await c.post("/api/v1/inventory/purchase-orders", headers=h, json={
            "vendor": "Test Vendor", "warehouse_id": wh1_id, "order_date": "2026-07-15",
            "items": [{"spare_part_id": test_part_id, "quantity_ordered": 25, "unit_cost": 9500}],
        })
        check("Create PO", r.status_code == 201)
        po = r.json()
        po_id = po["id"]
        check("PO status = draft", po["status"] == "draft")
        check("PO total = 237500", po["total_amount"] == 237500)

        r = await c.post(f"/api/v1/inventory/purchase-orders/{po_id}/submit", headers=h)
        check("Submit PO → ordered", r.status_code == 200 and r.json()["status"] == "ordered")

        item_id = po["items"][0]["id"]
        r = await c.post(f"/api/v1/inventory/purchase-orders/{po_id}/receive", headers=h, json=[
            {"item_id": item_id, "quantity_received": 15},
        ])
        check("Partial receive → partially_received", r.status_code == 200 and r.json()["status"] == "partially_received")

        r = await c.post(f"/api/v1/inventory/purchase-orders/{po_id}/receive", headers=h, json=[
            {"item_id": item_id, "quantity_received": 10},
        ])
        check("Full receive → received", r.status_code == 200 and r.json()["status"] == "received")

        r = await c.get("/api/v1/inventory/balances", headers=h, params={"spare_part_id": test_part_id})
        check("Balance after PO = 62 (37+25)", r.json()[0]["quantity_on_hand"] == 62)

        # 8. Reorder Alerts
        print("\n[8] Reorder Alerts")
        r = await c.get("/api/v1/inventory/dashboard", headers=h)
        d = r.json()
        check("Low stock alerts present", d["low_stock_count"] >= 4)
        check("Alert details populated", len(d["reorder_alerts"]) >= 4)

        # 9. Dashboard
        print("\n[9] Inventory Dashboard")
        check("Total parts >= 12", d["total_parts"] >= 12)
        check("Total warehouses >= 3", d["total_warehouses"] >= 3)
        check("Stock value > 0", d["total_stock_value"] > 0)
        check("Pending POs >= 1", d["pending_po_count"] >= 1)

        # 10. Permissions
        print("\n[10] Permissions")
        r = await c.get("/api/v1/inventory/parts")
        check("Unauthenticated → 401", r.status_code == 401)

        # 11. Transaction Audit
        print("\n[11] Transaction Audit Trail")
        r = await c.get("/api/v1/inventory/transactions", headers=h, params={"spare_part_id": test_part_id})
        txns = r.json()
        check("Has transaction log", len(txns) >= 4)
        types = {t["transaction_type"] for t in txns}
        check("All types logged", types >= {"receive", "issue", "adjust", "consume"})

        # 12. Platform Regression
        print("\n[12] Platform Regression")
        for path in ["/health", "/api/v1/dashboard/summary", "/api/v1/forklifts/",
                      "/api/v1/quotations/", "/api/v1/rental-contracts/",
                      "/api/v1/movements/", "/api/v1/maintenance/dashboard"]:
            r = await c.get(path, headers=h)
            name = path.split("/")[-1] or "health"
            check(name, r.status_code == 200)

        print(f"\n{'='*50}")
        print(f"RESULTS: {passed} passed, {failed} failed")
        print(f"{'='*50}")


if __name__ == "__main__":
    asyncio.run(main())
