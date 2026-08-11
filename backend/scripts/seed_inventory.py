"""Seed inventory data — warehouses, spare parts, stock, PO, consumptions."""

import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.database.session import AsyncSessionLocal, engine
from app.database.base import Base
from app.services.inventory_service import InventoryService
from app.schemas.inventory import (
    SparePartCreate,
    WarehouseCreate,
    TransactionCreate,
    POCreate,
    POItemCreate,
    ConsumeAction,
)
from app.models.inventory_transaction import TransactionType


WAREHOUSES = [
    {"code": "VTE-MAIN", "name": "Main Warehouse Vientiane", "address": "Km 8, Thadeua Road, Vientiane Capital"},
    {"code": "VTE-SVC", "name": "Service Center", "address": "Nongbone Workshop Area, Vientiane"},
    {"code": "SAV-01", "name": "Savannakhet Depot", "address": "Route 13 South, Savannakhet Province"},
]

SPARE_PARTS = [
    {"part_number": "FLT-OIL-001", "name": "Engine Oil Filter", "part_category": "filter", "unit_price": 45000, "unit": "piece", "min_stock_level": 20, "reorder_quantity": 50, "lead_time_days": 5},
    {"part_number": "FLT-AIR-001", "name": "Air Filter Element", "part_category": "filter", "unit_price": 65000, "unit": "piece", "min_stock_level": 15, "reorder_quantity": 30, "lead_time_days": 7},
    {"part_number": "BRK-PAD-001", "name": "Brake Pad Set (Front)", "part_category": "brake", "unit_price": 180000, "unit": "set", "min_stock_level": 10, "reorder_quantity": 20, "lead_time_days": 10},
    {"part_number": "HYD-HSE-001", "name": "Hydraulic Hose Assembly", "part_category": "hydraulic", "unit_price": 250000, "unit": "piece", "min_stock_level": 5, "reorder_quantity": 10, "lead_time_days": 14},
    {"part_number": "ELC-ALT-001", "name": "Alternator 12V 55A", "part_category": "electrical", "unit_price": 1200000, "unit": "piece", "min_stock_level": 2, "reorder_quantity": 5, "lead_time_days": 21},
    {"part_number": "BLT-DRV-001", "name": "Drive Belt V-Type", "part_category": "belt", "unit_price": 85000, "unit": "piece", "min_stock_level": 8, "reorder_quantity": 20, "lead_time_days": 7},
    {"part_number": "TIR-PNU-001", "name": "Pneumatic Forklift Tire 7.00-12", "part_category": "tire", "unit_price": 950000, "unit": "piece", "min_stock_level": 4, "reorder_quantity": 8, "lead_time_days": 14},
    {"part_number": "CHN-MST-001", "name": "Mast Chain Assembly", "part_category": "chain", "unit_price": 1800000, "unit": "piece", "min_stock_level": 2, "reorder_quantity": 4, "lead_time_days": 21},
    {"part_number": "BAT-TRC-001", "name": "Traction Battery 48V 600Ah", "part_category": "battery", "unit_price": 15000000, "unit": "piece", "min_stock_level": 1, "reorder_quantity": 2, "lead_time_days": 30},
    {"part_number": "LUB-ENG-001", "name": "Engine Oil 15W-40 (20L)", "part_category": "lubricant", "unit_price": 350000, "unit": "drum", "min_stock_level": 5, "reorder_quantity": 10, "lead_time_days": 5},
    {"part_number": "ENG-SPK-001", "name": "Spark Plug Set (4pc)", "part_category": "engine", "unit_price": 120000, "unit": "set", "min_stock_level": 10, "reorder_quantity": 25, "lead_time_days": 7},
    {"part_number": "ELC-FUS-001", "name": "Blade Fuse Kit (Assorted)", "part_category": "electrical", "unit_price": 35000, "unit": "kit", "min_stock_level": 15, "reorder_quantity": 30, "lead_time_days": 3},
]

STOCK_ENTRIES = [
    # (part_index, wh_index, quantity)
    (0, 0, 150), (0, 1, 40), (0, 2, 25),
    (1, 0, 80), (1, 1, 20),
    (2, 0, 30), (2, 1, 10),
    (3, 0, 15), (3, 1, 5),
    (4, 0, 6),
    (5, 0, 50), (5, 1, 15),
    (6, 0, 12), (6, 2, 4),
    (7, 0, 5),
    (8, 0, 3),
    (9, 0, 20), (9, 1, 8),
    (10, 0, 40), (10, 1, 12),
    (11, 0, 60), (11, 1, 20), (11, 2, 15),
]


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        svc = InventoryService(db)

        print("=== Seeding Inventory Data ===\n")

        # Warehouses
        wh_ids = []
        for w in WAREHOUSES:
            try:
                wh = await svc.create_warehouse(WarehouseCreate(**w))
                wh_ids.append(wh.id)
                print(f"  Warehouse: {wh.code} — {wh.name}")
            except Exception as e:
                print(f"  Warehouse {w['code']}: skipped ({e})")
                whs = await svc.list_warehouses()
                existing = next((x for x in whs if x.code == w["code"]), None)
                wh_ids.append(existing.id if existing else 0)
        print(f"  → {len(wh_ids)} warehouses\n")

        # Spare Parts
        part_ids = []
        for p in SPARE_PARTS:
            try:
                part = await svc.create_part(SparePartCreate(**p))
                part_ids.append(part.id)
                print(f"  Part: {part.part_number} — {part.name}")
            except Exception as e:
                print(f"  Part {p['part_number']}: skipped ({e})")
                resp = await svc.list_parts(q=p["part_number"])
                existing = resp.items[0] if resp.items else None
                part_ids.append(existing.id if existing else 0)
        print(f"  → {len(part_ids)} parts\n")

        # Stock Receives
        count = 0
        for pi, wi, qty in STOCK_ENTRIES:
            if part_ids[pi] and wh_ids[wi]:
                try:
                    await svc.create_transaction(
                        TransactionCreate(
                            transaction_type=TransactionType.RECEIVE,
                            spare_part_id=part_ids[pi],
                            warehouse_id=wh_ids[wi],
                            quantity=qty,
                            unit_cost=SPARE_PARTS[pi]["unit_price"],
                            notes="Initial stock seed",
                        ),
                        user_id=1,
                    )
                    count += 1
                except Exception as e:
                    print(f"  Stock receive error: {e}")
        print(f"  → {count} stock receive transactions\n")

        # Purchase Order
        try:
            po = await svc.create_po(
                POCreate(
                    vendor="Toyota Genuine Parts — Lao PDR",
                    warehouse_id=wh_ids[0],
                    order_date="2026-07-01",
                    expected_date="2026-07-15",
                    notes="Monthly replenishment order",
                    items=[
                        POItemCreate(spare_part_id=part_ids[0], quantity_ordered=100, unit_cost=44000),
                        POItemCreate(spare_part_id=part_ids[2], quantity_ordered=20, unit_cost=175000),
                        POItemCreate(spare_part_id=part_ids[5], quantity_ordered=30, unit_cost=82000),
                        POItemCreate(spare_part_id=part_ids[10], quantity_ordered=40, unit_cost=115000),
                    ],
                ),
                user_id=1,
            )
            await svc.submit_po(po.id)
            print(f"  PO: {po.po_number} — submitted (4 items)\n")
        except Exception as e:
            print(f"  PO: skipped ({e})\n")

        # Consumptions
        consume_count = 0
        for pi, wi, qty in [(0, 0, 3), (2, 0, 2)]:
            if part_ids[pi] and wh_ids[wi]:
                try:
                    await svc.consume_part(
                        ConsumeAction(
                            spare_part_id=part_ids[pi],
                            warehouse_id=wh_ids[wi],
                            quantity=qty,
                            notes="Seed consumption for testing",
                        ),
                        user_id=1,
                    )
                    consume_count += 1
                except Exception as e:
                    print(f"  Consume error: {e}")
        print(f"  → {consume_count} consumption records\n")

        # Summary
        dashboard = await svc.get_dashboard()
        print("=== Seed Complete ===")
        print(f"  Parts:      {dashboard.total_parts}")
        print(f"  Warehouses: {dashboard.total_warehouses}")
        print(f"  Stock Value: {dashboard.total_stock_value:,.0f} {dashboard.currency}")
        print(f"  Low Stock:  {dashboard.low_stock_count}")
        print(f"  Pending POs: {dashboard.pending_po_count}")
        if dashboard.reorder_alerts:
            print(f"  Alerts:")
            for a in dashboard.reorder_alerts:
                print(f"    ⚠ {a.part_number} @ {a.warehouse_code}: {a.quantity_available} available (min {a.min_stock_level})")


if __name__ == "__main__":
    asyncio.run(main())
