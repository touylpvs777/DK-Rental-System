import logging
import math
import time

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.quotation import Quotation, QuotationStatus
from app.models.quotation_item import QuotationItem
from app.models.quotation_status_history import QuotationStatusHistory
from app.repositories.quotation_repository import QuotationFilter, QuotationRepository
from app.schemas.quotation import (
    QuotationCreate,
    QuotationDetail,
    QuotationItemBulkItem,
    QuotationItemCreate,
    QuotationItemUpdate,
    QuotationListResponse,
    QuotationOut,
    QuotationUpdate,
)

logger = logging.getLogger(__name__)

_VALID_SORTS = {"created_at", "updated_at", "total_amount", "valid_until", "quotation_number", "status"}
_VALID_ORDERS = {"asc", "desc"}

_TYPE_PREFIXES = {
    "rental": "RNT",
    "sales": "SAL",
    "service": "SVC",
    "spare_parts": "PRT",
}

_DRAFT_ONLY_MSG = "Quotation can only be edited in draft status."
_TERMINAL_STATUSES = {
    QuotationStatus.CONVERTED.value,
    QuotationStatus.REJECTED.value,
    QuotationStatus.CANCELLED.value,
}


class QuotationService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = QuotationRepository(db)

    # ── List ─────────────────────────────────────────────────────────────────

    async def list_quotations(
        self,
        q: str | None = None,
        status_filter: str | None = None,
        quotation_type: str | None = None,
        customer_id: int | None = None,
        lead_id: int | None = None,
        assigned_to: int | None = None,
        is_active: bool | None = True,
        created_from=None,
        created_to=None,
        page: int = 1,
        page_size: int = 20,
        sort: str = "created_at",
        order: str = "desc",
    ) -> QuotationListResponse:
        page = max(1, page)
        page_size = min(max(1, page_size), 100)
        sort = sort if sort in _VALID_SORTS else "created_at"
        order = order if order in _VALID_ORDERS else "desc"

        f = QuotationFilter(
            q=q, status=status_filter, quotation_type=quotation_type,
            customer_id=customer_id, lead_id=lead_id, assigned_to=assigned_to,
            is_active=is_active, created_from=created_from, created_to=created_to,
            page=page, page_size=page_size, sort=sort, order=order,
        )
        quotations, total = await self._repo.get_list(f)
        pages = math.ceil(total / page_size) if page_size else 1

        items = []
        for qt in quotations:
            obj = QuotationOut.model_validate(qt)
            obj.item_count = await self._repo.get_item_count(qt.id)
            items.append(obj)

        return QuotationListResponse(
            items=items, total=total, page=page, page_size=page_size, pages=pages,
        )

    # ── Detail ───────────────────────────────────────────────────────────────

    async def get_quotation(self, quotation_id: int, user_permissions: set[str] | None = None) -> QuotationDetail:
        quotation = await self._repo.get_detail(quotation_id)
        if quotation is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found")
        return self._to_detail(quotation, user_permissions)

    # ── Create ───────────────────────────────────────────────────────────────

    async def create_quotation(self, data: QuotationCreate, created_by: int) -> Quotation:
        if data.valid_from and data.valid_until and data.valid_until < data.valid_from:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="valid_until must be on or after valid_from.",
            )

        number = await self._generate_number(data.quotation_type.value)

        quotation = Quotation(
            quotation_number=number,
            quotation_type=data.quotation_type.value,
            status=QuotationStatus.DRAFT.value,
            title=data.title.strip(),
            customer_id=data.customer_id,
            lead_id=data.lead_id,
            assigned_to=data.assigned_to or created_by,
            contact_name=data.contact_name,
            contact_email=data.contact_email,
            contact_phone=data.contact_phone,
            tax_rate=data.tax_rate,
            currency=data.currency,
            exchange_rate=data.exchange_rate,
            bank_details=data.bank_details,
            valid_from=data.valid_from,
            valid_until=data.valid_until,
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
            quotation = await self._repo.create(quotation)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Quotation number generation conflict. Please retry.",
            )

        await self._repo.add_status_history(QuotationStatusHistory(
            quotation_id=quotation.id,
            from_status=None,
            to_status=QuotationStatus.DRAFT.value,
            reason="Created",
            changed_by=created_by,
        ))

        await self.db.commit()
        # A relationship FK (customer_id/lead_id/assigned_to) not already cached
        # in this session's identity map would need a genuine lazy-load during
        # serialization, which async SQLAlchemy can't do implicitly outside a
        # greenlet context — re-fetch with full eager-loading to guarantee it's
        # always safe to serialize regardless of what's already in the session.
        return await self._repo.get_by_id(quotation.id)

    # ── Update ───────────────────────────────────────────────────────────────

    async def update_quotation(
        self, quotation_id: int, data: QuotationUpdate, updated_by: int,
    ) -> Quotation:
        quotation = await self._require(quotation_id)
        self._require_draft(quotation)

        changes = data.model_dump(exclude_unset=True)

        vf = changes.get("valid_from", quotation.valid_from)
        vu = changes.get("valid_until", quotation.valid_until)
        if vf and vu and vu < vf:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="valid_until must be on or after valid_from.",
            )

        recalc = "tax_rate" in changes or "discount_amount" in changes or "round_amount" in changes
        changes["updated_by"] = updated_by

        try:
            quotation = await self._repo.update(quotation, changes)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Update conflicts with an existing quotation.",
            )

        if recalc:
            await self._recalculate_totals(quotation)

        await self.db.commit()
        # `_repo.update()`'s partial `db.refresh(..., attribute_names=[...])`
        # expires every OTHER attribute/relationship on the object (e.g.
        # `assigned_user`) — re-fetch with full eager-loading so the route's
        # `QuotationOut.model_validate(...)` doesn't attempt an implicit
        # lazy-load outside the async greenlet context (MissingGreenlet).
        return await self._repo.get_by_id(quotation_id)

    # ── Delete ───────────────────────────────────────────────────────────────

    async def delete_quotation(self, quotation_id: int) -> None:
        quotation = await self._require(quotation_id)
        if quotation.status != QuotationStatus.DRAFT.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Only draft quotations can be deleted.",
            )
        await self._repo.delete(quotation)
        await self.db.commit()

    # ── Items ────────────────────────────────────────────────────────────────

    async def add_item(
        self, quotation_id: int, data: QuotationItemCreate,
    ) -> QuotationItem:
        quotation = await self._require(quotation_id)
        self._require_draft(quotation)

        line_number = await self._repo.next_line_number(quotation_id)
        line_total = data.quantity * data.unit_price * (1 - data.discount_percent / 100)

        item = QuotationItem(
            quotation_id=quotation_id,
            line_number=line_number,
            item_type=data.item_type.value,
            forklift_id=data.forklift_id,
            product_id=data.product_id,
            item_code=data.item_code,
            description=data.description,
            quantity=data.quantity,
            unit=data.unit,
            unit_price=data.unit_price,
            discount_percent=data.discount_percent,
            tax_percent=data.tax_percent,
            line_total=round(line_total, 2),
            rental_duration_days=data.rental_duration_days,
            rental_rate_period=data.rental_rate_period,
            notes=data.notes,
            sort_order=data.sort_order,
        )
        item = await self._repo.add_item(item)
        await self._recalculate_totals(quotation)
        await self.db.commit()
        return item

    async def update_item(
        self, quotation_id: int, item_id: int, data: QuotationItemUpdate,
    ) -> QuotationItem:
        quotation = await self._require(quotation_id)
        self._require_draft(quotation)
        item = await self._require_item(item_id, quotation_id)

        changes = data.model_dump(exclude_unset=True)

        qty = changes.get("quantity", item.quantity)
        price = changes.get("unit_price", item.unit_price)
        disc = changes.get("discount_percent", item.discount_percent)
        changes["line_total"] = round(qty * price * (1 - disc / 100), 2)

        item = await self._repo.update_item(item, changes)
        await self._recalculate_totals(quotation)
        await self.db.commit()
        return item

    async def delete_item(self, quotation_id: int, item_id: int) -> None:
        quotation = await self._require(quotation_id)
        self._require_draft(quotation)
        item = await self._require_item(item_id, quotation_id)

        await self._repo.delete_item(item)
        await self._recalculate_totals(quotation)
        await self.db.commit()

    async def bulk_replace_items(
        self, quotation_id: int, items: list[QuotationItemBulkItem],
    ) -> list[QuotationItem]:
        """
        Replaces the entire line-item set in one transaction/one recalculation —
        what the Excel-like grid editor's "Save" action calls, instead of one
        HTTP request per row (which would be both non-atomic and N recalculations
        instead of one for a multi-row paste).
        """
        quotation = await self._require(quotation_id)
        self._require_draft(quotation)

        existing_by_id = {item.id: item for item in quotation.items}
        incoming_ids = {i.id for i in items if i.id is not None}

        # Snapshot into a plain list first — iterating `quotation.items` while
        # deleting from it would mutate the SQLAlchemy relationship collection
        # mid-iteration.
        for item in [i for i in quotation.items if i.id not in incoming_ids]:
            await self._repo.delete_item(item)

        result: list[QuotationItem] = []
        for line_number, data in enumerate(items, start=1):
            line_total = round(data.quantity * data.unit_price * (1 - data.discount_percent / 100), 2)
            if data.id is not None and data.id in existing_by_id:
                changes = data.model_dump(exclude={"id", "item_type"})
                changes["line_total"] = line_total
                changes["line_number"] = line_number
                item = await self._repo.update_item(existing_by_id[data.id], changes)
            else:
                item = await self._repo.add_item(QuotationItem(
                    quotation_id=quotation_id,
                    line_number=line_number,
                    item_type=data.item_type.value,
                    forklift_id=data.forklift_id,
                    product_id=data.product_id,
                    item_code=data.item_code,
                    description=data.description,
                    quantity=data.quantity,
                    unit=data.unit,
                    unit_price=data.unit_price,
                    discount_percent=data.discount_percent,
                    tax_percent=data.tax_percent,
                    line_total=line_total,
                    rental_duration_days=data.rental_duration_days,
                    rental_rate_period=data.rental_rate_period,
                    notes=data.notes,
                    sort_order=data.sort_order,
                ))
            result.append(item)

        await self._recalculate_totals(quotation)
        await self.db.commit()
        return result

    # ── Totals recalculation ─────────────────────────────────────────────────

    async def _recalculate_totals(self, quotation: Quotation) -> None:
        subtotal = await self._repo.get_items_subtotal(quotation.id)
        tax_amount = await self._repo.get_items_tax_total(quotation.id)
        total = round(subtotal + tax_amount - quotation.discount_amount + quotation.round_amount, 2)

        await self._repo.update(quotation, {
            "subtotal": round(subtotal, 2),
            "tax_amount": round(tax_amount, 2),
            "total_amount": max(total, 0),
        })

    # ── Helpers ──────────────────────────────────────────────────────────────

    async def _require(self, quotation_id: int) -> Quotation:
        quotation = await self._repo.get_by_id(quotation_id)
        if quotation is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quotation not found")
        return quotation

    @staticmethod
    def _require_draft(quotation: Quotation) -> None:
        if quotation.status != QuotationStatus.DRAFT.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=_DRAFT_ONLY_MSG,
            )

    async def _require_item(self, item_id: int, quotation_id: int) -> QuotationItem:
        item = await self._repo.get_item_by_id(item_id)
        if item is None or item.quotation_id != quotation_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Line item not found")
        return item

    async def _generate_number(self, qtype: str) -> str:
        prefix = _TYPE_PREFIXES.get(qtype, "GEN")
        year = time.strftime("%Y")
        base = f"QT-{prefix}-{year}"
        seq = 1
        while await self._repo.number_exists(f"{base}-{seq:05d}"):
            seq += 1
        return f"{base}-{seq:05d}"

    @staticmethod
    def _to_detail(quotation: Quotation, user_permissions: set[str] | None = None) -> QuotationDetail:
        obj = QuotationDetail.model_validate(quotation)
        obj.item_count = len(quotation.items)
        obj.recent_status_history = quotation.status_history[:15]
        obj.recent_approvals = quotation.approvals[:10]
        obj.available_actions = _compute_actions(quotation.status, user_permissions)
        return obj


def _compute_actions(current_status: str, permissions: set[str] | None = None) -> list[str]:
    if permissions is None:
        permissions = set()

    has_update = "quotation.update" in permissions or not permissions
    has_approve = "quotation.approve" in permissions or not permissions
    has_convert = "quotation.convert" in permissions or not permissions

    actions_map: dict[str, list[str]] = {
        QuotationStatus.DRAFT.value: [],
        QuotationStatus.UNDER_REVIEW.value: [],
        QuotationStatus.APPROVED.value: [],
        QuotationStatus.REVISION.value: [],
        QuotationStatus.SENT.value: [],
        QuotationStatus.ACCEPTED.value: [],
        QuotationStatus.EXPIRED.value: [],
    }

    # "cancel" is relabeled "Void" in the UI — allowed anywhere before the
    # customer has actually accepted/converted the quotation (see the matching
    # widened VALID_TRANSITIONS in quotation_workflow_service.py).
    if has_update:
        actions_map[QuotationStatus.DRAFT.value].extend(["submit", "cancel"])
        actions_map[QuotationStatus.UNDER_REVIEW.value].append("cancel")
        actions_map[QuotationStatus.APPROVED.value].extend(["send", "cancel"])
        actions_map[QuotationStatus.REVISION.value].append("cancel")
        actions_map[QuotationStatus.SENT.value].extend(["accept", "decline", "cancel"])
        actions_map[QuotationStatus.EXPIRED.value].append("reactivate")
    if has_approve:
        actions_map[QuotationStatus.UNDER_REVIEW.value].extend(["approve", "reject"])
    if has_convert:
        actions_map[QuotationStatus.ACCEPTED.value].append("convert")

    return actions_map.get(current_status, [])
