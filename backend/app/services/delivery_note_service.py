import logging
import math
import time
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.delivery_note import DeliveryNote, DeliveryNoteStatus
from app.models.delivery_note_item import DeliveryNoteItem
from app.models.delivery_note_status_history import DeliveryNoteStatusHistory
from app.repositories.delivery_note_repository import DeliveryNoteFilter, DeliveryNoteRepository
from app.repositories.sales_order_repository import SalesOrderRepository
from app.schemas.delivery_note import (
    DeliveryNoteCreate,
    DeliveryNoteDetail,
    DeliveryNoteItemBulkItem,
    DeliveryNoteItemCreate,
    DeliveryNoteListResponse,
    DeliveryNoteOut,
    DeliveryNoteUpdate,
)

logger = logging.getLogger(__name__)

_VALID_SORTS = {"created_at", "updated_at", "delivery_date", "dn_number", "status"}
_VALID_ORDERS = {"asc", "desc"}

_DRAFT_ONLY_MSG = "Delivery note can only be edited in draft status."


class DeliveryNoteService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = DeliveryNoteRepository(db)

    # ── List ─────────────────────────────────────────────────────────────────

    async def list_delivery_notes(
        self,
        q: str | None = None,
        status_filter: str | None = None,
        customer_id: int | None = None,
        sales_order_id: int | None = None,
        assigned_to: int | None = None,
        is_active: bool | None = True,
        created_from=None,
        created_to=None,
        page: int = 1,
        page_size: int = 20,
        sort: str = "created_at",
        order: str = "desc",
    ) -> DeliveryNoteListResponse:
        page = max(1, page)
        page_size = min(max(1, page_size), 100)
        sort = sort if sort in _VALID_SORTS else "created_at"
        order = order if order in _VALID_ORDERS else "desc"

        f = DeliveryNoteFilter(
            q=q, status=status_filter, customer_id=customer_id, sales_order_id=sales_order_id,
            assigned_to=assigned_to, is_active=is_active, created_from=created_from,
            created_to=created_to, page=page, page_size=page_size, sort=sort, order=order,
        )
        delivery_notes, total = await self._repo.get_list(f)
        pages = math.ceil(total / page_size) if page_size else 1

        items = []
        for dn in delivery_notes:
            obj = DeliveryNoteOut.model_validate(dn)
            obj.item_count = await self._repo.get_item_count(dn.id)
            items.append(obj)

        return DeliveryNoteListResponse(
            items=items, total=total, page=page, page_size=page_size, pages=pages,
        )

    # ── Detail ───────────────────────────────────────────────────────────────

    async def get_delivery_note(self, delivery_note_id: int) -> DeliveryNoteDetail:
        delivery_note = await self._repo.get_detail(delivery_note_id)
        if delivery_note is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery note not found")
        return self._to_detail(delivery_note)

    # ── Create ───────────────────────────────────────────────────────────────

    async def create_delivery_note(self, data: DeliveryNoteCreate, created_by: int) -> DeliveryNote:
        sales_order = await SalesOrderRepository(self.db).get_by_id(data.sales_order_id)
        if sales_order is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sales order not found")

        number = await self._generate_number()

        delivery_note = DeliveryNote(
            dn_number=number,
            status=DeliveryNoteStatus.DRAFT.value,
            sales_order_id=data.sales_order_id,
            customer_id=data.customer_id if data.customer_id is not None else sales_order.customer_id,
            assigned_to=data.assigned_to or created_by,
            delivery_date=data.delivery_date or date.today(),
            delivery_address=data.delivery_address,
            warehouse=data.warehouse,
            driver_name=data.driver_name,
            vehicle_plate=data.vehicle_plate,
            customer_reference=data.customer_reference,
            terms_conditions=data.terms_conditions,
            notes=data.notes,
            internal_notes=data.internal_notes,
            created_by=created_by,
            updated_by=created_by,
        )
        try:
            delivery_note = await self._repo.create(delivery_note)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Delivery note number generation conflict. Please retry.",
            )

        await self._repo.add_status_history(DeliveryNoteStatusHistory(
            delivery_note_id=delivery_note.id,
            from_status=None,
            to_status=DeliveryNoteStatus.DRAFT.value,
            reason="Created",
            changed_by=created_by,
        ))

        await self.db.commit()
        return await self._repo.get_by_id(delivery_note.id)

    # ── Update ───────────────────────────────────────────────────────────────

    async def update_delivery_note(
        self, delivery_note_id: int, data: DeliveryNoteUpdate, updated_by: int,
    ) -> DeliveryNote:
        delivery_note = await self._require(delivery_note_id)
        self._require_draft(delivery_note)

        changes = data.model_dump(exclude_unset=True)
        changes["updated_by"] = updated_by

        try:
            delivery_note = await self._repo.update(delivery_note, changes)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Update conflicts with an existing delivery note.",
            )

        await self.db.commit()
        return await self._repo.get_by_id(delivery_note_id)

    # ── Delete ───────────────────────────────────────────────────────────────

    async def delete_delivery_note(self, delivery_note_id: int) -> None:
        delivery_note = await self._require(delivery_note_id)
        if delivery_note.status != DeliveryNoteStatus.DRAFT.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Only draft delivery notes can be deleted.",
            )
        await self._repo.delete(delivery_note)
        await self.db.commit()

    # ── Items ────────────────────────────────────────────────────────────────

    async def add_item(self, delivery_note_id: int, data: DeliveryNoteItemCreate) -> DeliveryNoteItem:
        delivery_note = await self._require(delivery_note_id)
        self._require_draft(delivery_note)

        line_number = len(delivery_note.items) + 1
        item = DeliveryNoteItem(
            delivery_note_id=delivery_note_id,
            line_number=line_number,
            item_code=data.item_code,
            description=data.description,
            quantity_ordered=data.quantity_ordered,
            quantity_delivered=data.quantity_delivered,
            unit=data.unit,
            notes=data.notes,
            sort_order=data.sort_order,
        )
        item = await self._repo.add_item(item)
        await self.db.commit()
        return item

    async def delete_item(self, delivery_note_id: int, item_id: int) -> None:
        delivery_note = await self._require(delivery_note_id)
        self._require_draft(delivery_note)
        item = await self._require_item(item_id, delivery_note_id)

        await self._repo.delete_item(item)
        await self.db.commit()

    async def bulk_replace_items(
        self, delivery_note_id: int, items: list[DeliveryNoteItemBulkItem],
    ) -> list[DeliveryNoteItem]:
        """Replaces the entire line-item set in one transaction — same
        Excel-grid editor Save pattern as Quotation/Sales Order."""
        delivery_note = await self._require(delivery_note_id)
        self._require_draft(delivery_note)

        existing_by_id = {item.id: item for item in delivery_note.items}
        incoming_ids = {i.id for i in items if i.id is not None}

        for item in [i for i in delivery_note.items if i.id not in incoming_ids]:
            await self._repo.delete_item(item)

        result: list[DeliveryNoteItem] = []
        for line_number, data in enumerate(items, start=1):
            if data.id is not None and data.id in existing_by_id:
                changes = data.model_dump(exclude={"id"})
                changes["line_number"] = line_number
                item = await self._repo.update_item(existing_by_id[data.id], changes)
            else:
                item = await self._repo.add_item(DeliveryNoteItem(
                    delivery_note_id=delivery_note_id,
                    line_number=line_number,
                    item_code=data.item_code,
                    description=data.description,
                    quantity_ordered=data.quantity_ordered,
                    quantity_delivered=data.quantity_delivered,
                    unit=data.unit,
                    notes=data.notes,
                    sort_order=data.sort_order,
                ))
            result.append(item)

        await self.db.commit()
        return result

    # ── Helpers ──────────────────────────────────────────────────────────────

    async def _require(self, delivery_note_id: int) -> DeliveryNote:
        delivery_note = await self._repo.get_by_id(delivery_note_id)
        if delivery_note is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery note not found")
        return delivery_note

    @staticmethod
    def _require_draft(delivery_note: DeliveryNote) -> None:
        if delivery_note.status != DeliveryNoteStatus.DRAFT.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=_DRAFT_ONLY_MSG,
            )

    async def _require_item(self, item_id: int, delivery_note_id: int) -> DeliveryNoteItem:
        item = await self._repo.get_item_by_id(item_id)
        if item is None or item.delivery_note_id != delivery_note_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Line item not found")
        return item

    async def _generate_number(self) -> str:
        year = time.strftime("%Y")
        base = f"DN-{year}"
        seq = 1
        while await self._repo.number_exists(f"{base}-{seq:05d}"):
            seq += 1
        return f"{base}-{seq:05d}"

    @staticmethod
    def _to_detail(delivery_note: DeliveryNote) -> DeliveryNoteDetail:
        obj = DeliveryNoteDetail.model_validate(delivery_note)
        obj.item_count = len(delivery_note.items)
        obj.recent_status_history = delivery_note.status_history[:15]
        obj.available_actions = _compute_actions(delivery_note.status)
        return obj


def _compute_actions(current_status: str) -> list[str]:
    actions_map: dict[str, list[str]] = {
        DeliveryNoteStatus.DRAFT.value: ["dispatch", "cancel"],
        DeliveryNoteStatus.DISPATCHED.value: ["deliver", "cancel"],
        DeliveryNoteStatus.DELIVERED.value: [],
        DeliveryNoteStatus.CANCELLED.value: [],
    }
    return actions_map.get(current_status, [])
