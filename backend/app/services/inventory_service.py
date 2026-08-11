import logging
import math
import time

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.spare_part import SparePart
from app.models.warehouse import Warehouse
from app.models.inventory_transaction import InventoryTransaction, TransactionType
from app.models.purchase_order import POStatus, PurchaseOrder
from app.models.purchase_order_item import PurchaseOrderItem
from app.models.part_consumption import PartConsumption
from app.repositories.inventory_repository import InventoryRepository, PartFilter
from app.repositories.partner_repository import PartnerRepository
from app.services.notification_service import ADMIN_ROLE, NotificationService, resolve_actor_name
from app.services.po_excel_service import POExcelService
from app.schemas.inventory import (
    BalanceOut, ConsumeAction, ConsumptionOut, InventoryDashboardSummary,
    POCreate, POListResponse, POListOut, POOut, POUpdate,
    ReorderAlertItem, SparePartCreate, SparePartListResponse, SparePartOut,
    SparePartUpdate, TransactionCreate, TransactionOut, WarehouseCreate, WarehouseOut,
    ReceiveItemAction,
)
from app.schemas.po_excel import GridColumn, POExcelImportResult, POGridData, POGridRow

logger = logging.getLogger(__name__)


class InventoryService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = InventoryRepository(db)

    # ── Spare Parts ──────────────────────────────────────────────────────────

    async def list_parts(self, q=None, part_category=None, brand_id=None, is_active=True, page=1, page_size=20, sort="name", order="asc") -> SparePartListResponse:
        page = max(1, page); page_size = min(max(1, page_size), 100)
        f = PartFilter(q=q, part_category=part_category, brand_id=brand_id, is_active=is_active, page=page, page_size=page_size, sort=sort, order=order)
        items, total = await self._repo.get_parts(f)
        return SparePartListResponse(items=[SparePartOut.model_validate(p) for p in items], total=total, page=page, page_size=page_size, pages=math.ceil(total / page_size) if page_size else 1)

    async def get_part(self, part_id: int) -> SparePart:
        p = await self._repo.get_part_by_id(part_id)
        if p is None: raise HTTPException(status_code=404, detail="Spare part not found")
        return p

    async def create_part(self, data: SparePartCreate) -> SparePart:
        if await self._repo.part_number_exists(data.part_number):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Part number already exists")
        part = SparePart(
            part_number=data.part_number.strip(), name=data.name.strip(), description=data.description,
            part_category=data.part_category.value, brand_id=data.brand_id, unit=data.unit,
            unit_price=data.unit_price, currency=data.currency, min_stock_level=data.min_stock_level,
            reorder_quantity=data.reorder_quantity, lead_time_days=data.lead_time_days, image_url=data.image_url,
        )
        part = await self._repo.create_part(part)
        await self.db.commit()
        return await self._repo.get_part_by_id(part.id)

    async def update_part(self, part_id: int, data: SparePartUpdate) -> SparePart:
        part = await self.get_part(part_id)
        changes = data.model_dump(exclude_unset=True)
        if "part_category" in changes and changes["part_category"]:
            changes["part_category"] = changes["part_category"].value
        await self._repo.update_part(part, changes)
        await self.db.commit()
        return await self._repo.get_part_by_id(part.id)

    # ── Warehouses ───────────────────────────────────────────────────────────

    async def list_warehouses(self) -> list[Warehouse]:
        return await self._repo.get_warehouses()

    async def get_warehouse(self, warehouse_id: int) -> Warehouse:
        wh = await self._repo.get_warehouse_by_id(warehouse_id)
        if wh is None:
            raise HTTPException(status_code=404, detail="Warehouse not found")
        return wh

    async def create_warehouse(self, data: WarehouseCreate) -> Warehouse:
        wh = Warehouse(code=data.code.strip().upper(), name=data.name.strip(), address=data.address, contact_name=data.contact_name, contact_phone=data.contact_phone)
        try:
            wh = await self._repo.create_warehouse(wh)
            await self.db.commit(); return wh
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Warehouse code already exists")

    # ── Balances ─────────────────────────────────────────────────────────────

    async def get_balances(self, part_id: int | None = None, warehouse_id: int | None = None) -> list:
        if part_id: return await self._repo.get_balances_by_part(part_id)
        if warehouse_id: return await self._repo.get_balances_by_warehouse(warehouse_id)
        return []

    # ── Transactions ─────────────────────────────────────────────────────────

    async def create_transaction(self, data: TransactionCreate, user_id: int) -> InventoryTransaction:
        part = await self.get_part(data.spare_part_id)
        wh = await self._repo.get_warehouse_by_id(data.warehouse_id)
        if wh is None: raise HTTPException(status_code=404, detail="Warehouse not found")

        number = await self._gen_number("IT")
        total_cost = round(data.quantity * data.unit_cost, 2)
        txn = InventoryTransaction(
            transaction_number=number, transaction_type=data.transaction_type.value,
            spare_part_id=data.spare_part_id, warehouse_id=data.warehouse_id,
            quantity=data.quantity, unit_cost=data.unit_cost, total_cost=total_cost,
            reference_type=data.reference_type, reference_id=data.reference_id,
            notes=data.notes, created_by=user_id,
        )
        txn = await self._repo.create_transaction(txn)
        await self._apply_balance(data.spare_part_id, data.warehouse_id, data.transaction_type.value, data.quantity)
        await self.db.commit()

        # Enterprise Audit & Alert: a manually-entered Goods Receipt or stock
        # adjustment is a "major operational movement" — notify admins. Manual
        # entries are naturally one-at-a-time (unlike bulk import), so a
        # per-transaction notification here doesn't flood the feed. ISSUE/
        # TRANSFER/RETURN/CONSUME are routine day-to-day movements and don't notify.
        if data.transaction_type.value in (TransactionType.RECEIVE.value, TransactionType.ADJUST.value):
            try:
                actor_name = await resolve_actor_name(self.db, user_id)
                verb = "recorded a Goods Receipt of" if data.transaction_type.value == TransactionType.RECEIVE.value else "adjusted stock of"
                await NotificationService(self.db).notify_role(
                    role=ADMIN_ROLE,
                    subject="Goods Receipt Recorded" if data.transaction_type.value == TransactionType.RECEIVE.value else "Stock Adjusted",
                    message=f"{actor_name} {verb} {part.name} ({part.part_number}) at {wh.name}: {data.quantity} {part.unit}.",
                    event_type=f"inventory.transaction.{data.transaction_type.value}",
                    entity_type="inventory_transaction",
                    entity_id=txn.id,
                )
            except Exception:
                logger.exception("Failed to notify admins of inventory transaction %s", txn.id)

        loaded = await self._repo.get_transactions(part_id=data.spare_part_id, limit=1)
        return loaded[0] if loaded else txn

    async def adjust_stock_absolute(
        self,
        part_id: int,
        warehouse_id: int,
        quantity: float,
        user_id: int | None,
        reference_type: str | None = None,
        reference_id: int | None = None,
        notes: str | None = None,
    ) -> InventoryTransaction:
        """
        Sets on-hand stock to an absolute value (ADJUST) — for stock-count
        corrections, where the caller knows the true total and wants to
        overwrite whatever the system currently shows. Deliberately bypasses
        TransactionCreate's `gt=0` constraint, since a legitimate absolute
        adjustment (e.g. a recount that finds zero stock) may set quantity to
        exactly 0. Does not commit — the caller controls the transaction
        boundary.
        """
        if quantity < 0:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Quantity cannot be negative")
        number = await self._gen_number("IT")
        txn = InventoryTransaction(
            transaction_number=number, transaction_type=TransactionType.ADJUST.value,
            spare_part_id=part_id, warehouse_id=warehouse_id,
            quantity=quantity, unit_cost=0.0, total_cost=0.0,
            reference_type=reference_type, reference_id=reference_id,
            notes=notes, created_by=user_id,
        )
        txn = await self._repo.create_transaction(txn)
        await self._apply_balance(part_id, warehouse_id, TransactionType.ADJUST.value, quantity)
        return txn

    async def receive_stock(
        self,
        part_id: int,
        warehouse_id: int,
        quantity: float,
        user_id: int | None,
        reference_type: str | None = None,
        reference_id: int | None = None,
        notes: str | None = None,
    ) -> InventoryTransaction:
        """
        Records a Goods Receipt (RECEIVE) — stock that has physically arrived
        and is being added to whatever is already on hand, as opposed to
        `adjust_stock_absolute` which overwrites the total. This is what the
        bulk inventory importer and any "stock received" entry point should
        call: it's additive, auditable, and produces the transaction record
        a future goods-receipt document/printout would be built from. Does
        not commit — the caller controls the transaction boundary.
        """
        if quantity <= 0:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Received quantity must be greater than zero")
        number = await self._gen_number("IT")
        txn = InventoryTransaction(
            transaction_number=number, transaction_type=TransactionType.RECEIVE.value,
            spare_part_id=part_id, warehouse_id=warehouse_id,
            quantity=quantity, unit_cost=0.0, total_cost=0.0,
            reference_type=reference_type, reference_id=reference_id,
            notes=notes, created_by=user_id,
        )
        txn = await self._repo.create_transaction(txn)
        await self._apply_balance(part_id, warehouse_id, TransactionType.RECEIVE.value, quantity)
        return txn

    async def _apply_balance(self, part_id: int, wh_id: int, txn_type: str, qty: float) -> None:
        bal = await self._repo.get_or_create_balance(part_id, wh_id)
        on_hand = bal.quantity_on_hand
        reserved = bal.quantity_reserved

        if txn_type in (TransactionType.RECEIVE.value, TransactionType.RETURN.value):
            on_hand += qty
        elif txn_type in (TransactionType.ISSUE.value, TransactionType.CONSUME.value):
            on_hand -= qty
        elif txn_type == TransactionType.ADJUST.value:
            on_hand = qty
        available = on_hand - reserved
        await self._repo.update_balance(bal, {"quantity_on_hand": max(on_hand, 0), "quantity_available": max(available, 0)})

    async def get_transactions(self, part_id: int | None = None, warehouse_id: int | None = None) -> list[InventoryTransaction]:
        return await self._repo.get_transactions(part_id=part_id, wh_id=warehouse_id)

    # ── Purchase Orders ──────────────────────────────────────────────────────

    async def list_pos(self, status_filter: str | None = None, page: int = 1, page_size: int = 20) -> POListResponse:
        items, total = await self._repo.get_pos(status=status_filter, page=page, page_size=page_size)
        return POListResponse(items=[POListOut.model_validate(po) for po in items], total=total, page=page, page_size=page_size, pages=math.ceil(total / page_size) if page_size else 1)

    async def get_po(self, po_id: int) -> PurchaseOrder:
        po = await self._repo.get_po_by_id(po_id)
        if po is None: raise HTTPException(status_code=404, detail="Purchase order not found")
        return po

    async def create_po(self, data: POCreate, user_id: int) -> PurchaseOrder:
        wh = await self._repo.get_warehouse_by_id(data.warehouse_id)
        if wh is None: raise HTTPException(status_code=404, detail="Warehouse not found")
        if data.partner_id is not None:
            partner = await PartnerRepository(self.db).get_partner_by_id(data.partner_id)
            if partner is None: raise HTTPException(status_code=404, detail="Partner not found")

        number = await self._gen_number("PO")
        subtotal = sum(round(i.quantity_ordered * i.unit_cost, 2) for i in data.items)
        tax_amount = round(subtotal * data.tax_rate / 100, 2)
        po = PurchaseOrder(
            po_number=number, vendor=data.vendor.strip(),
            vendor_address=data.vendor_address, vendor_contact=data.vendor_contact,
            partner_id=data.partner_id,
            warehouse_id=data.warehouse_id,
            order_date=data.order_date, expected_date=data.expected_date,
            subtotal=subtotal, tax_rate=data.tax_rate, tax_amount=tax_amount,
            total_amount=round(subtotal + tax_amount, 2), notes=data.notes, created_by=user_id,
        )
        try:
            po = await self._repo.create_po(po)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="PO number conflict")

        for item_data in data.items:
            part = None
            if item_data.spare_part_id is not None:
                part = await self.get_part(item_data.spare_part_id)
            line_total = round(item_data.quantity_ordered * item_data.unit_cost, 2)
            poi = PurchaseOrderItem(
                purchase_order_id=po.id, spare_part_id=item_data.spare_part_id,
                item_code=item_data.item_code or (part.part_number if part else None),
                description=item_data.description or (part.name if part else None),
                unit=item_data.unit or (part.unit if part else None),
                quantity_ordered=item_data.quantity_ordered, unit_cost=item_data.unit_cost,
                line_total=line_total, notes=item_data.notes,
            )
            self.db.add(poi)
        await self.db.flush()
        await self.db.commit()
        return await self._repo.get_po_by_id(po.id)

    def _ensure_po_editable(self, po: PurchaseOrder) -> None:
        # Shared guard for both header updates and cancellation: a PO that's
        # already cancelled, fully received, or has had any goods received
        # against it (partially_received, or any line with quantity_received
        # > 0 even if the aggregate status hasn't caught up yet) is locked —
        # there's no separate Goods Receipt entity in this schema, so "linked
        # to a completed goods receipt" is read as "any receiving occurred".
        if po.status == POStatus.CANCELLED.value:
            raise HTTPException(status_code=422, detail="Cannot modify a cancelled purchase order.")
        if po.status == POStatus.RECEIVED.value:
            raise HTTPException(status_code=422, detail="Cannot modify a fully received purchase order.")
        if any(item.quantity_received > 0 for item in po.items):
            raise HTTPException(status_code=422, detail="Cannot modify a purchase order that already has received goods.")

    async def update_po_header(self, po_id: int, data: POUpdate) -> PurchaseOrder:
        po = await self.get_po(po_id)
        self._ensure_po_editable(po)

        changes = data.model_dump(exclude_unset=True)
        if not changes:
            return po

        if "warehouse_id" in changes:
            wh = await self._repo.get_warehouse_by_id(changes["warehouse_id"])
            if wh is None:
                raise HTTPException(status_code=404, detail="Warehouse not found")
        if changes.get("partner_id") is not None:
            partner = await PartnerRepository(self.db).get_partner_by_id(changes["partner_id"])
            if partner is None:
                raise HTTPException(status_code=404, detail="Partner not found")
        if changes.get("vendor") is not None:
            changes["vendor"] = changes["vendor"].strip()

        await self._repo.update_po(po, changes)
        await self.db.commit()
        return await self._repo.get_po_by_id(po_id)

    async def cancel_po(self, po_id: int, cancellation_reason: str | None) -> PurchaseOrder:
        po = await self.get_po(po_id)
        self._ensure_po_editable(po)

        await self._repo.update_po(po, {
            "status": POStatus.CANCELLED.value,
            "cancellation_reason": cancellation_reason,
        })
        await self.db.commit()
        return await self._repo.get_po_by_id(po_id)

    async def submit_po(self, po_id: int) -> PurchaseOrder:
        po = await self.get_po(po_id)
        if po.status != POStatus.DRAFT.value:
            raise HTTPException(status_code=422, detail="Can only submit draft POs")
        await self._repo.update_po(po, {"status": POStatus.ORDERED.value})
        await self.db.commit()
        return await self._repo.get_po_by_id(po.id)

    async def receive_po_items(self, po_id: int, receives: list[ReceiveItemAction], user_id: int) -> PurchaseOrder:
        po = await self.get_po(po_id)
        if po.status not in (POStatus.ORDERED.value, POStatus.PARTIALLY_RECEIVED.value):
            raise HTTPException(status_code=422, detail="PO not in receivable status")

        for r in receives:
            item = await self._repo.get_po_item(r.item_id)
            if item is None or item.purchase_order_id != po_id:
                raise HTTPException(status_code=404, detail=f"PO item {r.item_id} not found")
            new_received = item.quantity_received + r.quantity_received
            if new_received > item.quantity_ordered:
                raise HTTPException(status_code=422, detail=f"Cannot receive more than ordered for item {r.item_id}")
            await self._repo.update_po_item(item, {"quantity_received": new_received})

            # Free-text lines (no catalog spare_part_id) only track received
            # quantity on the PO itself — they never touch stock balances,
            # since there's no catalog item to move stock for.
            if item.spare_part_id is not None:
                number = await self._gen_number("IT")
                txn = InventoryTransaction(
                    transaction_number=number, transaction_type=TransactionType.RECEIVE.value,
                    spare_part_id=item.spare_part_id, warehouse_id=po.warehouse_id,
                    quantity=r.quantity_received, unit_cost=item.unit_cost,
                    total_cost=round(r.quantity_received * item.unit_cost, 2),
                    reference_type="purchase_order", reference_id=po.id,
                    notes=f"Received from PO {po.po_number}", created_by=user_id,
                )
                await self._repo.create_transaction(txn)
                await self._apply_balance(item.spare_part_id, po.warehouse_id, TransactionType.RECEIVE.value, r.quantity_received)

        po_reloaded = await self._repo.get_po_by_id(po_id)
        all_received = all(i.quantity_received >= i.quantity_ordered for i in po_reloaded.items)
        any_received = any(i.quantity_received > 0 for i in po_reloaded.items)
        new_status = POStatus.RECEIVED.value if all_received else POStatus.PARTIALLY_RECEIVED.value if any_received else po.status
        if new_status == POStatus.RECEIVED.value:
            await self._repo.update_po(po_reloaded, {"status": new_status, "received_date": po_reloaded.order_date.__class__.today()})
        elif new_status != po.status:
            await self._repo.update_po(po_reloaded, {"status": new_status})
        await self.db.commit()
        return await self._repo.get_po_by_id(po_id)

    # ── Purchase Order: item grid (bulk replace) ──────────────────────────────

    def _recalculate_po_totals(self, po: PurchaseOrder, items: list[PurchaseOrderItem]) -> None:
        subtotal = round(sum(i.line_total for i in items), 2)
        tax_amount = round(subtotal * po.tax_rate / 100, 2)
        po.subtotal = subtotal
        po.tax_amount = tax_amount
        po.total_amount = round(subtotal + tax_amount, 2)

    async def get_po_grid(self, po_id: int) -> POGridData:
        po = await self.get_po(po_id)
        columns = [
            GridColumn(field="item_code", header_name="Part No", type="text"),
            GridColumn(field="description", header_name="Description", type="text"),
            GridColumn(field="unit", header_name="U/M", type="text"),
            GridColumn(field="quantity_ordered", header_name="Quantity", type="number"),
            GridColumn(field="unit_cost", header_name="Unit Price", type="number"),
            GridColumn(field="line_total", header_name="Total", editable=False, type="number"),
        ]
        rows = [
            POGridRow(
                id=i.id, item_code=i.item_code, description=i.description, unit=i.unit,
                quantity_ordered=i.quantity_ordered, unit_cost=i.unit_cost, line_total=i.line_total,
            )
            for i in po.items
        ]
        return POGridData(columns=columns, rows=rows)

    async def replace_po_items_bulk(self, po_id: int, rows: list) -> PurchaseOrder:
        """Accepts either `POGridRow` objects (from the grid PUT endpoint) or
        plain dicts (from the Excel import parser) — both describe the PO's
        complete new item set."""
        po = await self.get_po(po_id)
        self._ensure_po_editable(po)

        new_items: list[PurchaseOrderItem] = []
        for r in rows:
            data = r.model_dump() if hasattr(r, "model_dump") else r
            quantity = float(data["quantity_ordered"])
            unit_cost = float(data["unit_cost"])
            if quantity <= 0:
                raise HTTPException(status_code=422, detail=f"Quantity must be greater than 0 for {data.get('description') or 'a line item'}")
            if unit_cost < 0:
                raise HTTPException(status_code=422, detail=f"Unit price cannot be negative for {data.get('description') or 'a line item'}")
            new_items.append(PurchaseOrderItem(
                item_code=data.get("item_code"), description=data.get("description"), unit=data.get("unit"),
                quantity_ordered=quantity, unit_cost=unit_cost, line_total=round(quantity * unit_cost, 2),
            ))
        if not new_items:
            raise HTTPException(status_code=422, detail="A purchase order needs at least one line item")

        self._recalculate_po_totals(po, new_items)
        await self._repo.replace_po_items(po, new_items)
        await self.db.commit()
        return await self._repo.get_po_by_id(po_id)

    # ── Purchase Order: Excel export/import ───────────────────────────────────

    async def export_po_excel(self, po_id: int) -> bytes:
        po = await self.get_po(po_id)
        return POExcelService().export(po)

    async def import_po_excel(self, content: bytes) -> POExcelImportResult:
        po_number, item_rows, row_errors = POExcelService().parse(content)

        po = await self._repo.get_po_by_number(po_number)
        if po is None:
            raise HTTPException(status_code=404, detail=f"No purchase order found with PO Number '{po_number}'")

        if not item_rows:
            return POExcelImportResult(success=False, po_id=po.id, po_number=po.po_number, items_replaced=0, errors=row_errors)

        updated_po = await self.replace_po_items_bulk(po.id, item_rows)
        return POExcelImportResult(
            success=True, po_id=updated_po.id, po_number=updated_po.po_number,
            items_replaced=len(updated_po.items), errors=row_errors,
        )

    # ── Consumption ──────────────────────────────────────────────────────────

    async def consume_part(self, data: ConsumeAction, user_id: int) -> PartConsumption:
        part = await self.get_part(data.spare_part_id)
        bal = await self._repo.get_balance(data.spare_part_id, data.warehouse_id)
        if bal is None or bal.quantity_available < data.quantity:
            raise HTTPException(status_code=422, detail="Insufficient stock")

        total_cost = round(data.quantity * part.unit_price, 2)
        c = PartConsumption(
            spare_part_id=data.spare_part_id, warehouse_id=data.warehouse_id,
            work_order_id=data.work_order_id, forklift_id=data.forklift_id,
            quantity=data.quantity, unit_cost=part.unit_price, total_cost=total_cost,
            notes=data.notes, consumed_by=user_id,
        )
        c = await self._repo.create_consumption(c)

        number = await self._gen_number("IT")
        await self._repo.create_transaction(InventoryTransaction(
            transaction_number=number, transaction_type=TransactionType.CONSUME.value,
            spare_part_id=data.spare_part_id, warehouse_id=data.warehouse_id,
            quantity=data.quantity, unit_cost=part.unit_price, total_cost=total_cost,
            reference_type="work_order" if data.work_order_id else None, reference_id=data.work_order_id,
            notes=data.notes, created_by=user_id,
        ))
        await self._apply_balance(data.spare_part_id, data.warehouse_id, TransactionType.CONSUME.value, data.quantity)
        await self.db.commit()

        loaded = await self._repo.get_consumptions(part_id=data.spare_part_id, limit=1)
        return loaded[0] if loaded else c

    async def get_consumptions(self, part_id: int | None = None, work_order_id: int | None = None) -> list[PartConsumption]:
        return await self._repo.get_consumptions(part_id=part_id, wo_id=work_order_id)

    # ── Dashboard ────────────────────────────────────────────────────────────

    async def get_dashboard(self) -> InventoryDashboardSummary:
        total_parts = await self._repo.count_active_parts()
        total_wh = await self._repo.count_active_warehouses()
        stock_value = await self._repo.total_stock_value()
        pending_po = await self._repo.count_pending_pos()
        low_stock_rows = await self._repo.get_low_stock()

        alerts = []
        for bal, part in low_stock_rows:
            wh = await self._repo.get_warehouse_by_id(bal.warehouse_id)
            if wh:
                alerts.append(ReorderAlertItem(
                    spare_part_id=part.id, part_number=part.part_number, name=part.name,
                    warehouse_id=wh.id, warehouse_code=wh.code, warehouse_name=wh.name,
                    quantity_available=bal.quantity_available, min_stock_level=part.min_stock_level,
                    reorder_quantity=part.reorder_quantity,
                ))

        return InventoryDashboardSummary(
            total_parts=total_parts, total_warehouses=total_wh,
            total_stock_value=stock_value, currency="LAK",
            low_stock_count=len(alerts), pending_po_count=pending_po,
            reorder_alerts=alerts,
        )

    # ── Helpers ──────────────────────────────────────────────────────────────

    async def _gen_number(self, prefix: str) -> str:
        year = time.strftime("%Y")
        base = f"{prefix}-{year}"
        seq = 1
        if prefix == "PO":
            while await self._repo.po_number_exists(f"{base}-{seq:05d}"): seq += 1
        else:
            while await self._repo.txn_number_exists(f"{base}-{seq:06d}"): seq += 1
            return f"{base}-{seq:06d}"
        return f"{base}-{seq:05d}"
