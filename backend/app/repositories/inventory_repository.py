import logging
from dataclasses import dataclass

from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.spare_part import SparePart
from app.models.warehouse import Warehouse
from app.models.brand import Brand
from app.models.inventory_balance import InventoryBalance
from app.models.inventory_transaction import InventoryTransaction
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_order_item import PurchaseOrderItem
from app.models.part_consumption import PartConsumption

logger = logging.getLogger(__name__)


@dataclass
class PartFilter:
    q: str | None = None
    part_category: str | None = None
    brand_id: int | None = None
    is_active: bool | None = True
    page: int = 1
    page_size: int = 20
    sort: str = "name"
    order: str = "asc"


class InventoryRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Spare Parts ──────────────────────────────────────────────────────────

    async def get_parts(self, f: PartFilter) -> tuple[list[SparePart], int]:
        stmt = select(SparePart).options(selectinload(SparePart.brand))
        if f.is_active is not None:
            stmt = stmt.where(SparePart.is_active == f.is_active)
        if f.part_category:
            stmt = stmt.where(SparePart.part_category == f.part_category)
        if f.brand_id:
            stmt = stmt.where(SparePart.brand_id == f.brand_id)
        if f.q:
            p = f"%{f.q}%"
            stmt = stmt.where(or_(SparePart.part_number.ilike(p), SparePart.name.ilike(p)))

        count = (await self.db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
        sort_col = {"name": SparePart.name, "part_number": SparePart.part_number, "created_at": SparePart.created_at, "unit_price": SparePart.unit_price}.get(f.sort, SparePart.name)
        stmt = stmt.order_by(sort_col.asc() if f.order == "asc" else sort_col.desc())
        stmt = stmt.offset((f.page - 1) * f.page_size).limit(f.page_size)
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), count

    async def get_part_by_id(self, part_id: int) -> SparePart | None:
        result = await self.db.execute(select(SparePart).options(selectinload(SparePart.brand)).where(SparePart.id == part_id))
        return result.scalar_one_or_none()

    async def part_number_exists(self, pn: str, exclude_id: int | None = None) -> bool:
        stmt = select(SparePart.id).where(SparePart.part_number == pn)
        if exclude_id:
            stmt = stmt.where(SparePart.id != exclude_id)
        return (await self.db.execute(stmt)).scalar_one_or_none() is not None

    async def get_part_by_number(self, pn: str) -> SparePart | None:
        result = await self.db.execute(
            select(SparePart).options(selectinload(SparePart.brand)).where(SparePart.part_number == pn)
        )
        return result.scalar_one_or_none()

    async def create_part(self, part: SparePart) -> SparePart:
        self.db.add(part)
        try:
            await self.db.flush(); await self.db.refresh(part); return part
        except IntegrityError:
            await self.db.rollback(); raise

    async def update_part(self, part: SparePart, changes: dict) -> SparePart:
        for k, v in changes.items(): setattr(part, k, v)
        await self.db.flush(); await self.db.refresh(part); return part

    # ── Warehouses ───────────────────────────────────────────────────────────

    async def get_warehouses(self, is_active: bool | None = True) -> list[Warehouse]:
        stmt = select(Warehouse).order_by(Warehouse.name)
        if is_active is not None:
            stmt = stmt.where(Warehouse.is_active == is_active)
        return list((await self.db.execute(stmt)).scalars().all())

    async def get_warehouse_by_id(self, wh_id: int) -> Warehouse | None:
        return await self.db.get(Warehouse, wh_id)

    async def get_default_warehouse(self) -> Warehouse | None:
        """First active warehouse by id — used as the implicit target when a
        bulk import supplies a Quantity column without specifying a warehouse."""
        result = await self.db.execute(
            select(Warehouse).where(Warehouse.is_active == True).order_by(Warehouse.id.asc()).limit(1)  # noqa: E712
        )
        return result.scalar_one_or_none()

    async def create_warehouse(self, wh: Warehouse) -> Warehouse:
        self.db.add(wh)
        try:
            await self.db.flush(); await self.db.refresh(wh); return wh
        except IntegrityError:
            await self.db.rollback(); raise

    # ── Brands ───────────────────────────────────────────────────────────────

    async def get_brand_by_name(self, name: str) -> Brand | None:
        result = await self.db.execute(select(Brand).where(func.lower(Brand.name) == name.strip().lower()))
        return result.scalar_one_or_none()

    async def get_brand_by_slug(self, slug: str) -> Brand | None:
        result = await self.db.execute(select(Brand).where(Brand.slug == slug))
        return result.scalar_one_or_none()

    async def create_brand(self, brand: Brand) -> Brand:
        self.db.add(brand)
        try:
            await self.db.flush(); await self.db.refresh(brand); return brand
        except IntegrityError:
            await self.db.rollback(); raise

    # ── Balances ─────────────────────────────────────────────────────────────

    async def get_balance(self, part_id: int, wh_id: int) -> InventoryBalance | None:
        result = await self.db.execute(
            select(InventoryBalance)
            .options(selectinload(InventoryBalance.spare_part), selectinload(InventoryBalance.warehouse))
            .where(and_(InventoryBalance.spare_part_id == part_id, InventoryBalance.warehouse_id == wh_id))
        )
        return result.scalar_one_or_none()

    async def get_or_create_balance(self, part_id: int, wh_id: int) -> InventoryBalance:
        bal = await self.get_balance(part_id, wh_id)
        if bal:
            return bal
        bal = InventoryBalance(spare_part_id=part_id, warehouse_id=wh_id)
        self.db.add(bal)
        await self.db.flush()
        await self.db.refresh(bal)
        return bal

    async def get_balances_by_part(self, part_id: int) -> list[InventoryBalance]:
        result = await self.db.execute(
            select(InventoryBalance)
            .options(selectinload(InventoryBalance.spare_part), selectinload(InventoryBalance.warehouse))
            .where(InventoryBalance.spare_part_id == part_id)
        )
        return list(result.scalars().all())

    async def get_balances_by_warehouse(self, wh_id: int) -> list[InventoryBalance]:
        result = await self.db.execute(
            select(InventoryBalance)
            .options(selectinload(InventoryBalance.spare_part), selectinload(InventoryBalance.warehouse))
            .where(InventoryBalance.warehouse_id == wh_id)
        )
        return list(result.scalars().all())

    async def update_balance(self, bal: InventoryBalance, changes: dict) -> InventoryBalance:
        for k, v in changes.items(): setattr(bal, k, v)
        await self.db.flush(); await self.db.refresh(bal); return bal

    async def get_low_stock(self) -> list[tuple[InventoryBalance, SparePart]]:
        result = await self.db.execute(
            select(InventoryBalance, SparePart)
            .join(SparePart, InventoryBalance.spare_part_id == SparePart.id)
            .where(InventoryBalance.quantity_available <= SparePart.min_stock_level)
        )
        return list(result.all())

    # ── Transactions ─────────────────────────────────────────────────────────

    async def txn_number_exists(self, number: str) -> bool:
        return (await self.db.execute(select(InventoryTransaction.id).where(InventoryTransaction.transaction_number == number))).scalar_one_or_none() is not None

    async def create_transaction(self, txn: InventoryTransaction) -> InventoryTransaction:
        self.db.add(txn)
        await self.db.flush(); await self.db.refresh(txn); return txn

    async def get_transactions(self, part_id: int | None = None, wh_id: int | None = None, limit: int = 50) -> list[InventoryTransaction]:
        stmt = select(InventoryTransaction).options(
            selectinload(InventoryTransaction.spare_part), selectinload(InventoryTransaction.warehouse), selectinload(InventoryTransaction.user),
        ).order_by(InventoryTransaction.created_at.desc()).limit(limit)
        if part_id: stmt = stmt.where(InventoryTransaction.spare_part_id == part_id)
        if wh_id: stmt = stmt.where(InventoryTransaction.warehouse_id == wh_id)
        return list((await self.db.execute(stmt)).scalars().all())

    # ── Purchase Orders ──────────────────────────────────────────────────────

    async def po_number_exists(self, number: str) -> bool:
        return (await self.db.execute(select(PurchaseOrder.id).where(PurchaseOrder.po_number == number))).scalar_one_or_none() is not None

    async def create_po(self, po: PurchaseOrder) -> PurchaseOrder:
        self.db.add(po)
        try:
            await self.db.flush(); await self.db.refresh(po); return po
        except IntegrityError:
            await self.db.rollback(); raise

    async def get_po_by_id(self, po_id: int) -> PurchaseOrder | None:
        result = await self.db.execute(
            select(PurchaseOrder)
            .options(
                selectinload(PurchaseOrder.warehouse),
                selectinload(PurchaseOrder.partner),
                selectinload(PurchaseOrder.items).selectinload(PurchaseOrderItem.spare_part),
            )
            .where(PurchaseOrder.id == po_id)
        )
        return result.scalar_one_or_none()

    async def get_po_by_number(self, po_number: str) -> PurchaseOrder | None:
        result = await self.db.execute(
            select(PurchaseOrder)
            .options(
                selectinload(PurchaseOrder.warehouse),
                selectinload(PurchaseOrder.partner),
                selectinload(PurchaseOrder.items).selectinload(PurchaseOrderItem.spare_part),
            )
            .where(PurchaseOrder.po_number == po_number)
        )
        return result.scalar_one_or_none()

    async def replace_po_items(self, po: PurchaseOrder, items: list[PurchaseOrderItem]) -> None:
        """Delete every existing line item on `po` and insert `items` in their
        place — the bulk-replace used by both the grid PUT and Excel import,
        since an edited grid/sheet describes the PO's full new item set
        rather than a diff against the old one."""
        for existing in list(po.items):
            await self.db.delete(existing)
        await self.db.flush()
        for item in items:
            item.purchase_order_id = po.id
            self.db.add(item)
        await self.db.flush()

    async def get_pos(self, status: str | None = None, page: int = 1, page_size: int = 20) -> tuple[list[PurchaseOrder], int]:
        stmt = select(PurchaseOrder).options(selectinload(PurchaseOrder.warehouse)).where(PurchaseOrder.is_active == True)  # noqa: E712
        if status: stmt = stmt.where(PurchaseOrder.status == status)
        count = (await self.db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
        stmt = stmt.order_by(PurchaseOrder.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        return list((await self.db.execute(stmt)).scalars().all()), count

    async def update_po(self, po: PurchaseOrder, changes: dict) -> PurchaseOrder:
        for k, v in changes.items(): setattr(po, k, v)
        await self.db.flush(); await self.db.refresh(po); return po

    async def get_po_item(self, item_id: int) -> PurchaseOrderItem | None:
        return await self.db.get(PurchaseOrderItem, item_id)

    async def update_po_item(self, item: PurchaseOrderItem, changes: dict) -> PurchaseOrderItem:
        for k, v in changes.items(): setattr(item, k, v)
        await self.db.flush(); await self.db.refresh(item); return item

    # ── Consumptions ─────────────────────────────────────────────────────────

    async def create_consumption(self, c: PartConsumption) -> PartConsumption:
        self.db.add(c)
        await self.db.flush(); await self.db.refresh(c); return c

    async def get_consumptions(self, part_id: int | None = None, wo_id: int | None = None, limit: int = 50) -> list[PartConsumption]:
        stmt = select(PartConsumption).options(
            selectinload(PartConsumption.spare_part), selectinload(PartConsumption.warehouse),
            selectinload(PartConsumption.work_order), selectinload(PartConsumption.forklift),
            selectinload(PartConsumption.user),
        ).order_by(PartConsumption.consumed_at.desc()).limit(limit)
        if part_id: stmt = stmt.where(PartConsumption.spare_part_id == part_id)
        if wo_id: stmt = stmt.where(PartConsumption.work_order_id == wo_id)
        return list((await self.db.execute(stmt)).scalars().all())

    # ── Dashboard ────────────────────────────────────────────────────────────

    async def count_active_parts(self) -> int:
        return (await self.db.execute(select(func.count(SparePart.id)).where(SparePart.is_active == True))).scalar_one()  # noqa: E712

    async def count_active_warehouses(self) -> int:
        return (await self.db.execute(select(func.count(Warehouse.id)).where(Warehouse.is_active == True))).scalar_one()  # noqa: E712

    async def total_stock_value(self) -> float:
        result = await self.db.execute(
            select(func.coalesce(func.sum(InventoryBalance.quantity_on_hand * SparePart.unit_price), 0.0))
            .join(SparePart, InventoryBalance.spare_part_id == SparePart.id)
        )
        return float(result.scalar_one())

    async def count_pending_pos(self) -> int:
        return (await self.db.execute(
            select(func.count(PurchaseOrder.id)).where(PurchaseOrder.status.in_(["draft", "ordered"]))
        )).scalar_one()
