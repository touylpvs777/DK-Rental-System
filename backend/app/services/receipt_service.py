import logging
import math
import time
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invoice import Invoice
from app.models.receipt import Receipt, ReceiptStatus
from app.models.receipt_status_history import ReceiptStatusHistory
from app.repositories.receipt_repository import ReceiptFilter, ReceiptRepository
from app.schemas.receipt import (
    ReceiptCreate,
    ReceiptDetail,
    ReceiptListResponse,
    ReceiptOut,
    ReceiptUpdate,
)

logger = logging.getLogger(__name__)

_VALID_SORTS = {"created_at", "updated_at", "payment_date", "receipt_number", "status", "amount_received"}
_VALID_ORDERS = {"asc", "desc"}

_DRAFT_ONLY_MSG = "Receipt can only be edited in draft status."


class ReceiptService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = ReceiptRepository(db)

    # ── List ─────────────────────────────────────────────────────────────────

    async def list_receipts(
        self,
        q: str | None = None,
        status_filter: str | None = None,
        customer_id: int | None = None,
        invoice_id: int | None = None,
        assigned_to: int | None = None,
        is_active: bool | None = True,
        created_from=None,
        created_to=None,
        page: int = 1,
        page_size: int = 20,
        sort: str = "created_at",
        order: str = "desc",
    ) -> ReceiptListResponse:
        page = max(1, page)
        page_size = min(max(1, page_size), 100)
        sort = sort if sort in _VALID_SORTS else "created_at"
        order = order if order in _VALID_ORDERS else "desc"

        f = ReceiptFilter(
            q=q, status=status_filter, customer_id=customer_id, invoice_id=invoice_id,
            assigned_to=assigned_to, is_active=is_active, created_from=created_from,
            created_to=created_to, page=page, page_size=page_size, sort=sort, order=order,
        )
        receipts, total = await self._repo.get_list(f)
        pages = math.ceil(total / page_size) if page_size else 1

        return ReceiptListResponse(
            items=[ReceiptOut.model_validate(r) for r in receipts],
            total=total, page=page, page_size=page_size, pages=pages,
        )

    # ── Detail ───────────────────────────────────────────────────────────────

    async def get_receipt(self, receipt_id: int) -> ReceiptDetail:
        receipt = await self._repo.get_detail(receipt_id)
        if receipt is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
        return self._to_detail(receipt)

    # ── Create ───────────────────────────────────────────────────────────────

    async def create_receipt(self, data: ReceiptCreate, created_by: int) -> Receipt:
        invoice = await self.db.get(Invoice, data.invoice_id)
        if invoice is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

        number = await self._generate_number()

        receipt = Receipt(
            receipt_number=number,
            status=ReceiptStatus.DRAFT.value,
            invoice_id=data.invoice_id,
            customer_id=data.customer_id if data.customer_id is not None else invoice.customer_id,
            assigned_to=data.assigned_to or created_by,
            payment_date=data.payment_date or date.today(),
            payment_method=data.payment_method,
            bank_account=data.bank_account,
            reference_number=data.reference_number,
            amount_received=data.amount_received,
            currency=data.currency or invoice.currency,
            exchange_rate=data.exchange_rate if data.exchange_rate is not None else invoice.exchange_rate,
            customer_reference=data.customer_reference,
            vehicle_make=data.vehicle_make if data.vehicle_make is not None else invoice.vehicle_make,
            vehicle_model=data.vehicle_model if data.vehicle_model is not None else invoice.vehicle_model,
            vehicle_vin=data.vehicle_vin if data.vehicle_vin is not None else invoice.vehicle_vin,
            vehicle_engine_no=data.vehicle_engine_no if data.vehicle_engine_no is not None else invoice.vehicle_engine_no,
            vehicle_reg_no=data.vehicle_reg_no if data.vehicle_reg_no is not None else invoice.vehicle_reg_no,
            job_number=data.job_number if data.job_number is not None else invoice.job_number,
            terms_conditions=data.terms_conditions,
            notes=data.notes,
            internal_notes=data.internal_notes,
            created_by=created_by,
            updated_by=created_by,
        )
        try:
            receipt = await self._repo.create(receipt)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Receipt number generation conflict. Please retry.",
            )

        await self._repo.add_status_history(ReceiptStatusHistory(
            receipt_id=receipt.id,
            from_status=None,
            to_status=ReceiptStatus.DRAFT.value,
            reason="Created",
            changed_by=created_by,
        ))

        await self.db.commit()
        return await self._repo.get_by_id(receipt.id)

    # ── Update ───────────────────────────────────────────────────────────────

    async def update_receipt(self, receipt_id: int, data: ReceiptUpdate, updated_by: int) -> Receipt:
        receipt = await self._require(receipt_id)
        self._require_draft(receipt)

        changes = data.model_dump(exclude_unset=True)
        changes["updated_by"] = updated_by

        try:
            receipt = await self._repo.update(receipt, changes)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Update conflicts with an existing receipt.",
            )

        await self.db.commit()
        return await self._repo.get_by_id(receipt_id)

    # ── Delete ───────────────────────────────────────────────────────────────

    async def delete_receipt(self, receipt_id: int) -> None:
        receipt = await self._require(receipt_id)
        if receipt.status != ReceiptStatus.DRAFT.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Only draft receipts can be deleted.",
            )
        await self._repo.delete(receipt)
        await self.db.commit()

    # ── Helpers ──────────────────────────────────────────────────────────────

    async def _require(self, receipt_id: int) -> Receipt:
        receipt = await self._repo.get_by_id(receipt_id)
        if receipt is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
        return receipt

    @staticmethod
    def _require_draft(receipt: Receipt) -> None:
        if receipt.status != ReceiptStatus.DRAFT.value:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=_DRAFT_ONLY_MSG,
            )

    async def _generate_number(self) -> str:
        year = time.strftime("%Y")
        base = f"RCT-{year}"
        seq = 1
        while await self._repo.number_exists(f"{base}-{seq:05d}"):
            seq += 1
        return f"{base}-{seq:05d}"

    @staticmethod
    def _to_detail(receipt: Receipt) -> ReceiptDetail:
        obj = ReceiptDetail.model_validate(receipt)
        obj.recent_status_history = receipt.status_history[:15]
        obj.available_actions = _compute_actions(receipt.status)
        return obj


def _compute_actions(current_status: str) -> list[str]:
    actions_map: dict[str, list[str]] = {
        ReceiptStatus.DRAFT.value: ["confirm", "cancel"],
        ReceiptStatus.CONFIRMED.value: ["cancel"],
        ReceiptStatus.CANCELLED.value: [],
    }
    return actions_map.get(current_status, [])
