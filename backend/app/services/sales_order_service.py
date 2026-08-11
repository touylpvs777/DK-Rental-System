import logging
import math
import time
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sales_order import SalesOrder, SalesOrderStatus
from app.models.sales_order_item import SalesOrderItem
from app.models.sales_order_status_history import SalesOrderStatusHistory
from app.repositories.sales_order_repository import SalesOrderFilter, SalesOrderRepository
from app.schemas.sales_order import (
    SalesOrderCreate,
    SalesOrderDetail,
    SalesOrderItemBulkItem,
    SalesOrderItemCreate,
    SalesOrderListResponse,
    SalesOrderOut,
    SalesOrderUpdate,
)

logger = logging.getLogger(__name__)

_VALID_SORTS = {"created_at", "updated_at", "total_amount", "order_date", "so_number", "status"}
_VALID_ORDERS = {"asc", "desc"}

_DRAFT_ONLY_MSG = "Sales order can only be edited in draft status."


class SalesOrderService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = SalesOrderRepository(db)

    # ── List ─────────────────────────────────────────────────────────────────

    async def list_sales_orders(
        self,
        q: str | None = None,
        status_filter: str | None = None,
        customer_id: int | None = None,
        quotation_id: int | None = None,
        assigned_to: int | None = None,
        is_active: bool | None = True,
        created_from=None,
        created_to=None,
        page: int = 1,
        page_size: int = 20,
        sort: str = "created_at",
        order: str = "desc",
    ) -> SalesOrderListResponse:
        page = max(1, page)
        page_size = min(max(1, page_size), 100)
        sort = sort if sort in _VALID_SORTS else "created_at"
        order = order if order in _VALID_ORDERS else "desc"

        f = SalesOrderFilter(
            q=q, status=status_filter, customer_id=customer_id, quotation_id=quotation_id,
            assigned_to=assigned_to, is_active=is_active, created_from=created_from,
            created_to=created_to, page=page, page_size=page_size, sort=sort, order=order,
        )
        sales_orders, total = await self._repo.get_list(f)
        pages = math.ceil(total / page_size) if page_size else 1

        items = []
        for so in sales_orders:
            obj = SalesOrderOut.model_validate(so)
            obj.item_count = await self._repo.get_item_count(so.id)
            items.append(obj)

        return SalesOrderListResponse(
            items=items, total=total, page=page, page_size=page_size, pages=pages,
        )

    # ── Detail ───────────────────────────────────────────────────────────────

    async def get_sales_order(self, sales_order_id: int) -> SalesOrderDetail:
        sales_order = await self._repo.get_detail(sales_order_id)
        if sales_order is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales order not found")
        return self._to_detail(sales_order)

    # ── Create ───────────────────────────────────────────────────────────────

    async def create_sales_order(self, data: SalesOrderCreate, created_by: int) -> SalesOrder:
        number = await self._generate_number()

        sales_order = SalesOrder(
            so_number=number,
            status=SalesOrderStatus.DRAFT.value,
            title=data.title.strip(),
            quotation_id=data.quotation_id,
            customer_id=data.customer_id,
            assigned_to=data.assigned_to or created_by,
            contact_name=data.contact_name,
            contact_email=data.contact_email,
            contact_phone=data.contact_phone,
            tax_rate=data.tax_rate,
            currency=data.currency,
            exchange_rate=data.exchange_rate,
            bank_details=data.bank_details,
            order_date=data.order_date or date.today(),
            expected_delivery_date=data.expected_delivery_date,
            customer_reference=data.customer_reference,
            vehicle_make=data.vehicle_make,
            vehicle_model=data.vehicle_model,
            vehicle_vin=data.vehicle_vin,
            vehicle_engine_no=data.vehicle_engine_no,
            vehicle_reg_no=data.vehicle_reg_no,
            job_number=data.job_number,
            machine_type=data.machine_type,
            hour_meter=data.hour_meter,
            location=data.location,
            round_amount=data.round_amount,
            terms_conditions=data.terms_conditions,
            notes=data.notes,
            internal_notes=data.internal_notes,
            created_by=created_by,
            updated_by=created_by,
        )
        try:
            sales_order = await self._repo.create(sales_order)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Sales order number generation conflict. Please retry.",
            )

        await self._repo.add_status_history(SalesOrderStatusHistory(
            sales_order_id=sales_order.id,
            from_status=None,
            to_status=SalesOrderStatus.DRAFT.value,
            reason="Created",
            changed_by=created_by,
        ))

        await self.db.commit()
        # See quotation_service.create_quotation: re-fetch with full eager
        # loading so serialization never needs an implicit lazy-load outside
        # the async greenlet context (MissingGreenlet).
        return await self._repo.get_by_id(sales_order.id)

    # ── Update ───────────────────────────────────────────────────────────────

    async def update_sales_order(
        self, sales_order_id: int, data: SalesOrderUpdate, updated_by: int,
    ) -> SalesOrder:
        sales_order = await self._require(sales_order_id)
        self._require_draft(sales_order)

        changes = data.model_dump(exclude_unset=True)
        recalc = "tax_rate" in changes or "discount_amount" in changes or "round_amount" in changes
        changes["updated_by"] = updated_by

        try:
            sales_order = await self._repo.update(sales_order, changes)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Update conflicts with an existing sales order.",
            )

        if recalc:
            await self._recalculate_totals(sales_order)

        await self.db.commit()
        return await self._repo.get_by_id(sales_order_id)

    # ── Delete ───────────────────────────────────────────────────────────────

    async def delete_sales_order(self, sales_order_id: int) -> None:
        sales_order = await self._require(sales_order_id)
        if sales_order.status != SalesOrderStatus.DRAFT.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Only draft sales orders can be deleted.",
            )
        await self._repo.delete(sales_order)
        await self.db.commit()

    # ── Items ────────────────────────────────────────────────────────────────

    async def add_item(self, sales_order_id: int, data: SalesOrderItemCreate) -> SalesOrderItem:
        sales_order = await self._require(sales_order_id)
        self._require_draft(sales_order)

        line_number = len(sales_order.items) + 1
        line_total = data.quantity * data.unit_price * (1 - data.discount_percent / 100)

        item = SalesOrderItem(
            sales_order_id=sales_order_id,
            line_number=line_number,
            item_code=data.item_code,
            description=data.description,
            quantity=data.quantity,
            unit=data.unit,
            unit_price=data.unit_price,
            discount_percent=data.discount_percent,
            tax_percent=data.tax_percent,
            line_total=round(line_total, 2),
            notes=data.notes,
            sort_order=data.sort_order,
        )
        item = await self._repo.add_item(item)
        await self._recalculate_totals(sales_order)
        await self.db.commit()
        return item

    async def delete_item(self, sales_order_id: int, item_id: int) -> None:
        sales_order = await self._require(sales_order_id)
        self._require_draft(sales_order)
        item = await self._require_item(item_id, sales_order_id)

        await self._repo.delete_item(item)
        await self._recalculate_totals(sales_order)
        await self.db.commit()

    async def bulk_replace_items(
        self, sales_order_id: int, items: list[SalesOrderItemBulkItem],
    ) -> list[SalesOrderItem]:
        """Replaces the entire line-item set in one transaction/one
        recalculation — what the Excel-grid editor's Save action calls."""
        sales_order = await self._require(sales_order_id)
        self._require_draft(sales_order)

        existing_by_id = {item.id: item for item in sales_order.items}
        incoming_ids = {i.id for i in items if i.id is not None}

        for item in [i for i in sales_order.items if i.id not in incoming_ids]:
            await self._repo.delete_item(item)

        result: list[SalesOrderItem] = []
        for line_number, data in enumerate(items, start=1):
            line_total = round(data.quantity * data.unit_price * (1 - data.discount_percent / 100), 2)
            if data.id is not None and data.id in existing_by_id:
                changes = data.model_dump(exclude={"id"})
                changes["line_total"] = line_total
                changes["line_number"] = line_number
                item = await self._repo.update_item(existing_by_id[data.id], changes)
            else:
                item = await self._repo.add_item(SalesOrderItem(
                    sales_order_id=sales_order_id,
                    line_number=line_number,
                    item_code=data.item_code,
                    description=data.description,
                    quantity=data.quantity,
                    unit=data.unit,
                    unit_price=data.unit_price,
                    discount_percent=data.discount_percent,
                    tax_percent=data.tax_percent,
                    line_total=line_total,
                    notes=data.notes,
                    sort_order=data.sort_order,
                ))
            result.append(item)

        await self._recalculate_totals(sales_order)
        await self.db.commit()
        return result

    # ── Totals recalculation ─────────────────────────────────────────────────

    async def _recalculate_totals(self, sales_order: SalesOrder) -> None:
        subtotal = await self._repo.get_items_subtotal(sales_order.id)
        tax_amount = await self._repo.get_items_tax_total(sales_order.id)
        total = round(subtotal + tax_amount - sales_order.discount_amount + sales_order.round_amount, 2)

        await self._repo.update(sales_order, {
            "subtotal": round(subtotal, 2),
            "tax_amount": round(tax_amount, 2),
            "total_amount": max(total, 0),
        })

    # ── Helpers ──────────────────────────────────────────────────────────────

    async def _require(self, sales_order_id: int) -> SalesOrder:
        sales_order = await self._repo.get_by_id(sales_order_id)
        if sales_order is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales order not found")
        return sales_order

    @staticmethod
    def _require_draft(sales_order: SalesOrder) -> None:
        if sales_order.status != SalesOrderStatus.DRAFT.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=_DRAFT_ONLY_MSG,
            )

    async def _require_item(self, item_id: int, sales_order_id: int) -> SalesOrderItem:
        item = await self._repo.get_item_by_id(item_id)
        if item is None or item.sales_order_id != sales_order_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Line item not found")
        return item

    async def _generate_number(self) -> str:
        year = time.strftime("%Y")
        base = f"SO-{year}"
        seq = 1
        while await self._repo.number_exists(f"{base}-{seq:05d}"):
            seq += 1
        return f"{base}-{seq:05d}"

    @staticmethod
    def _to_detail(sales_order: SalesOrder) -> SalesOrderDetail:
        obj = SalesOrderDetail.model_validate(sales_order)
        obj.item_count = len(sales_order.items)
        obj.recent_status_history = sales_order.status_history[:15]
        obj.available_actions = _compute_actions(sales_order.status)
        return obj


def _compute_actions(current_status: str) -> list[str]:
    actions_map: dict[str, list[str]] = {
        SalesOrderStatus.DRAFT.value: ["confirm", "cancel"],
        SalesOrderStatus.CONFIRMED.value: ["complete", "cancel"],
        SalesOrderStatus.COMPLETED.value: [],
        SalesOrderStatus.CANCELLED.value: [],
    }
    return actions_map.get(current_status, [])
