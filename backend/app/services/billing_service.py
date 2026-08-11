import logging
import math
import time
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.customer import Customer
from app.models.deposit import Deposit, DepositRecordStatus, DepositType
from app.models.invoice import Invoice, InvoiceStatus
from app.models.invoice_item import InvoiceItem
from app.models.payment import Payment, PaymentMethod, PaymentRecordStatus
from app.models.payment_allocation import PaymentAllocation
from app.models.rental_billing_cycle import BillingType, RentalBillingCycle
from app.models.rental_contract import RentalContract
from app.models.rental_contract_item import RentalContractItem
from app.models.revenue_recognition import (
    RecognitionStatus, RecognitionType, RevenueRecognition,
)
from app.repositories.billing_repository import (
    BillingRepository, DepositFilter, InvoiceFilter,
    PaymentFilter, RevenueRecognitionFilter,
)
from app.repositories.rental_repository import RentalRepository
from app.schemas.billing import (
    BillingDashboardSummary,
    DepositApplyAction, DepositCreate, DepositForfeitAction,
    DepositListResponse, DepositReceiveAction, DepositRefundAction,
    DepositUpdate,
    InvoiceCancelAction, InvoiceCreate, InvoiceFromCyclesRequest,
    InvoiceIssueAction, InvoiceItemCreate, InvoiceListResponse,
    InvoiceSendAction, InvoiceUpdate,
    PaymentConfirmAction, PaymentCreate, PaymentListResponse, PaymentUpdate,
    PaymentAllocationCreate,
    RevenueRecognitionCreate, RevenueRecognitionListResponse,
)

logger = logging.getLogger(__name__)


class BillingService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = BillingRepository(db)

    # ══════════════════════════════════════════════════════════════════════════
    # INVOICE
    # ═════════════════════════��════════════════════════════════════════════════

    async def create_invoice(
        self, data: InvoiceCreate, created_by: int,
    ) -> Invoice:
        if data.billing_cycle_ids and data.items:
            raise HTTPException(
                status_code=422,
                detail="Provide either billing_cycle_ids or items, not both.",
            )

        contract = None
        if data.contract_id is not None:
            contract = await self.db.get(RentalContract, data.contract_id)
            if contract is None:
                raise HTTPException(status_code=404, detail="Contract not found")
        customer = await self.db.get(Customer, data.customer_id)
        if customer is None:
            raise HTTPException(status_code=404, detail="Customer not found")

        number = await self._gen_invoice_number()
        invoice = Invoice(
            invoice_number=number,
            contract_id=data.contract_id,
            customer_id=data.customer_id,
            reference_type=data.reference_type.value if data.reference_type else None,
            reference_id=data.reference_id,
            currency=data.currency,
            exchange_rate=data.exchange_rate,
            bank_details=data.bank_details,
            tax_rate=data.tax_rate,
            discount_amount=data.discount_amount,
            issue_date=data.issue_date,
            due_date=data.due_date,
            billing_period_start=data.billing_period_start,
            billing_period_end=data.billing_period_end,
            vehicle_make=data.vehicle_make,
            vehicle_model=data.vehicle_model,
            vehicle_vin=data.vehicle_vin,
            vehicle_engine_no=data.vehicle_engine_no,
            vehicle_reg_no=data.vehicle_reg_no,
            job_number=data.job_number,
            notes=data.notes,
            internal_notes=data.internal_notes,
            created_by=created_by,
        )
        invoice = await self._repo.create_invoice(invoice)

        if data.billing_cycle_ids:
            await self._populate_items_from_cycles(
                invoice, data.billing_cycle_ids, data.tax_rate,
            )
        elif data.items:
            await self._populate_manual_items(invoice, data.items, data.tax_rate)

        await self._recalculate_invoice_totals(invoice)
        await self.db.commit()
        return await self._repo.get_invoice_by_id(invoice.id)

    async def create_invoice_from_cycles(
        self, data: InvoiceFromCyclesRequest, created_by: int,
    ) -> Invoice:
        contract = await self.db.get(RentalContract, data.contract_id)
        if contract is None:
            raise HTTPException(status_code=404, detail="Contract not found")

        number = await self._gen_invoice_number()
        invoice = Invoice(
            invoice_number=number,
            contract_id=data.contract_id,
            customer_id=contract.customer_id,
            currency=data.currency,
            tax_rate=data.tax_rate,
            discount_amount=data.discount_amount,
            notes=data.notes,
            created_by=created_by,
        )
        invoice = await self._repo.create_invoice(invoice)

        await self._populate_items_from_cycles(
            invoice, data.billing_cycle_ids, data.tax_rate,
        )

        await self._recalculate_invoice_totals(invoice)
        await self.db.commit()
        return await self._repo.get_invoice_by_id(invoice.id)

    async def get_invoice(self, invoice_id: int) -> Invoice:
        invoice = await self._repo.get_invoice_by_id(invoice_id)
        if invoice is None:
            raise HTTPException(status_code=404, detail="Invoice not found")
        return invoice

    async def list_invoices(
        self,
        q: str | None = None,
        status_filter: str | None = None,
        customer_id: int | None = None,
        contract_id: int | None = None,
        is_active: bool | None = True,
        issue_from: date | None = None,
        issue_to: date | None = None,
        due_from: date | None = None,
        due_to: date | None = None,
        page: int = 1,
        page_size: int = 20,
        sort: str = "created_at",
        order: str = "desc",
    ) -> InvoiceListResponse:
        f = InvoiceFilter(
            q=q, status=status_filter, customer_id=customer_id,
            contract_id=contract_id, is_active=is_active,
            issue_from=issue_from, issue_to=issue_to,
            due_from=due_from, due_to=due_to,
            page=page, page_size=page_size, sort=sort, order=order,
        )
        items, total = await self._repo.get_invoice_list(f)
        pages = math.ceil(total / page_size) if total else 0
        return InvoiceListResponse(
            items=items, total=total, page=page, page_size=page_size, pages=pages,
        )

    async def update_invoice(
        self, invoice_id: int, data: InvoiceUpdate, updated_by: int,
    ) -> Invoice:
        invoice = await self.get_invoice(invoice_id)
        if invoice.status != InvoiceStatus.DRAFT.value:
            raise HTTPException(
                status_code=422, detail="Only draft invoices can be updated",
            )
        changes = data.model_dump(exclude_unset=True)
        changes["updated_by"] = updated_by
        invoice = await self._repo.update_invoice(invoice, changes)

        if "tax_rate" in changes or "discount_amount" in changes:
            await self._recalculate_invoice_totals(invoice)

        await self.db.commit()
        return await self._repo.get_invoice_by_id(invoice.id)

    async def issue_invoice(
        self, invoice_id: int, data: InvoiceIssueAction, user_id: int,
    ) -> Invoice:
        invoice = await self.get_invoice(invoice_id)
        if invoice.status != InvoiceStatus.DRAFT.value:
            raise HTTPException(
                status_code=422, detail="Only draft invoices can be issued",
            )

        issue_date = data.issue_date or date.today()
        contract = await self.db.get(RentalContract, invoice.contract_id)
        payment_terms = contract.payment_terms_days if contract else 30
        due_date = data.due_date or (issue_date + timedelta(days=payment_terms))

        changes = {
            "status": InvoiceStatus.ISSUED.value,
            "issue_date": issue_date,
            "due_date": due_date,
            "updated_by": user_id,
        }
        await self._repo.update_invoice(invoice, changes)
        await self.db.commit()
        return await self._repo.get_invoice_by_id(invoice.id)

    async def send_invoice(
        self, invoice_id: int, data: InvoiceSendAction, user_id: int,
    ) -> Invoice:
        invoice = await self.get_invoice(invoice_id)
        if invoice.status != InvoiceStatus.ISSUED.value:
            raise HTTPException(
                status_code=422, detail="Only issued invoices can be sent",
            )
        changes = {
            "status": InvoiceStatus.SENT.value,
            "sent_at": datetime.now(timezone.utc),
            "updated_by": user_id,
        }
        await self._repo.update_invoice(invoice, changes)
        await self.db.commit()
        return await self._repo.get_invoice_by_id(invoice.id)

    async def cancel_invoice(
        self, invoice_id: int, data: InvoiceCancelAction, user_id: int,
    ) -> Invoice:
        invoice = await self.get_invoice(invoice_id)
        if invoice.status in (InvoiceStatus.PAID.value, InvoiceStatus.VOIDED.value):
            raise HTTPException(
                status_code=422, detail="Paid or voided invoices cannot be cancelled",
            )
        changes = {
            "status": InvoiceStatus.CANCELLED.value,
            "cancelled_at": datetime.now(timezone.utc),
            "cancellation_reason": data.cancellation_reason,
            "updated_by": user_id,
        }
        await self._repo.update_invoice(invoice, changes)

        # Revert linked billing cycles
        await self._revert_billing_cycles(invoice.id)

        await self.db.commit()
        return await self._repo.get_invoice_by_id(invoice.id)

    async def void_invoice(self, invoice_id: int, user_id: int) -> Invoice:
        invoice = await self.get_invoice(invoice_id)
        if invoice.status not in (
            InvoiceStatus.ISSUED.value, InvoiceStatus.SENT.value,
        ):
            raise HTTPException(
                status_code=422,
                detail="Only issued or sent invoices can be voided",
            )
        changes = {
            "status": InvoiceStatus.VOIDED.value,
            "cancelled_at": datetime.now(timezone.utc),
            "updated_by": user_id,
        }
        await self._repo.update_invoice(invoice, changes)
        await self._revert_billing_cycles(invoice.id)
        await self.db.commit()
        return await self._repo.get_invoice_by_id(invoice.id)

    # ══════════════════════════════════════════════════════════════════════════
    # PAYMENT
    # ══���═══════════════���═══════════════════════════════════════════════════════

    async def record_payment(
        self, data: PaymentCreate, created_by: int,
    ) -> Payment:
        customer = await self.db.get(Customer, data.customer_id)
        if customer is None:
            raise HTTPException(status_code=404, detail="Customer not found")
        if data.contract_id:
            contract = await self.db.get(RentalContract, data.contract_id)
            if contract is None:
                raise HTTPException(status_code=404, detail="Contract not found")

        number = await self._gen_payment_number()
        payment = Payment(
            payment_number=number,
            customer_id=data.customer_id,
            contract_id=data.contract_id,
            payment_method=data.payment_method.value,
            amount=data.amount,
            currency=data.currency,
            payment_date=data.payment_date,
            received_date=data.received_date,
            reference_number=data.reference_number,
            notes=data.notes,
            created_by=created_by,
        )
        payment = await self._repo.create_payment(payment)
        await self.db.commit()
        return await self._repo.get_payment_by_id(payment.id)

    async def get_payment(self, payment_id: int) -> Payment:
        payment = await self._repo.get_payment_by_id(payment_id)
        if payment is None:
            raise HTTPException(status_code=404, detail="Payment not found")
        return payment

    async def list_payments(
        self,
        q: str | None = None,
        customer_id: int | None = None,
        contract_id: int | None = None,
        payment_status: str | None = None,
        payment_method: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        page: int = 1,
        page_size: int = 20,
        sort: str = "created_at",
        order: str = "desc",
    ) -> PaymentListResponse:
        f = PaymentFilter(
            q=q, customer_id=customer_id, contract_id=contract_id,
            payment_status=payment_status, payment_method=payment_method,
            date_from=date_from, date_to=date_to,
            page=page, page_size=page_size, sort=sort, order=order,
        )
        items, total = await self._repo.get_payment_list(f)
        pages = math.ceil(total / page_size) if total else 0
        return PaymentListResponse(
            items=items, total=total, page=page, page_size=page_size, pages=pages,
        )

    async def confirm_payment(
        self, payment_id: int, user_id: int,
    ) -> Payment:
        payment = await self.get_payment(payment_id)
        if payment.payment_status != PaymentRecordStatus.PENDING.value:
            raise HTTPException(
                status_code=422, detail="Only pending payments can be confirmed",
            )
        changes = {
            "payment_status": PaymentRecordStatus.CONFIRMED.value,
            "confirmed_by": user_id,
            "confirmed_at": datetime.now(timezone.utc),
        }
        await self._repo.update_payment(payment, changes)
        await self.db.commit()
        return await self._repo.get_payment_by_id(payment.id)

    async def reject_payment(
        self, payment_id: int, user_id: int, reason: str | None = None,
    ) -> Payment:
        payment = await self.get_payment(payment_id)
        if payment.payment_status != PaymentRecordStatus.PENDING.value:
            raise HTTPException(
                status_code=422, detail="Only pending payments can be rejected",
            )
        changes = {
            "payment_status": PaymentRecordStatus.REJECTED.value,
            "updated_by": user_id,
        }
        if reason:
            changes["notes"] = reason
        await self._repo.update_payment(payment, changes)
        await self.db.commit()
        return await self._repo.get_payment_by_id(payment.id)

    # ══════════════════════════════════════════════════════════════════════════
    # PAYMENT ALLOCATION
    # ════════���═════════════════════════════════════════════════════════════════

    async def allocate_payment(
        self, data: PaymentAllocationCreate, user_id: int,
    ) -> PaymentAllocation:
        payment = await self.get_payment(data.payment_id)
        if payment.payment_status != PaymentRecordStatus.CONFIRMED.value:
            raise HTTPException(
                status_code=422, detail="Payment must be confirmed before allocation",
            )

        invoice = await self.get_invoice(data.invoice_id)
        if invoice.status in (
            InvoiceStatus.CANCELLED.value, InvoiceStatus.VOIDED.value,
            InvoiceStatus.DRAFT.value,
        ):
            raise HTTPException(
                status_code=422,
                detail="Cannot allocate to cancelled, voided, or draft invoices",
            )

        # Validate allocation amount doesn't exceed unallocated payment balance
        total_allocated = await self._repo.get_total_allocated_for_payment(
            data.payment_id,
        )
        available = payment.amount - total_allocated
        if data.allocated_amount > available + 0.001:
            raise HTTPException(
                status_code=422,
                detail=f"Allocation exceeds unallocated payment balance ({available:.2f})",
            )

        # Validate allocation doesn't exceed invoice balance
        if data.allocated_amount > invoice.balance_due + 0.001:
            raise HTTPException(
                status_code=422,
                detail=f"Allocation exceeds invoice balance due ({invoice.balance_due:.2f})",
            )

        alloc = PaymentAllocation(
            payment_id=data.payment_id,
            invoice_id=data.invoice_id,
            allocated_amount=data.allocated_amount,
            allocated_by=user_id,
        )
        alloc = await self._repo.add_allocation(alloc)

        # Update invoice amounts
        new_paid = invoice.amount_paid + data.allocated_amount
        new_balance = invoice.total_amount - new_paid
        new_status = invoice.status
        paid_date = None

        if new_balance <= 0.001:
            new_status = InvoiceStatus.PAID.value
            paid_date = date.today()
            new_balance = 0.0
        elif new_paid > 0:
            new_status = InvoiceStatus.PARTIALLY_PAID.value

        invoice_changes = {
            "amount_paid": round(new_paid, 2),
            "balance_due": round(new_balance, 2),
            "status": new_status,
        }
        if paid_date:
            invoice_changes["paid_date"] = paid_date
        await self._repo.update_invoice(invoice, invoice_changes)

        # Update billing cycles if invoice fully paid
        if new_status == InvoiceStatus.PAID.value:
            await self._mark_billing_cycles_paid(invoice.id)
            # Auto-schedule revenue recognition
            refreshed = await self._repo.get_invoice_by_id(invoice.id)
            if refreshed:
                await self.schedule_revenue_recognition(refreshed, user_id)

        await self.db.commit()
        return alloc

    # ══════════════════════════════════════════════════════════════════════════
    # DEPOSIT
    # ═���═════════════��════════════════════════════════��═════════════════════════

    async def create_deposit(
        self, data: DepositCreate, created_by: int,
    ) -> Deposit:
        contract = await self.db.get(RentalContract, data.contract_id)
        if contract is None:
            raise HTTPException(status_code=404, detail="Contract not found")
        customer = await self.db.get(Customer, data.customer_id)
        if customer is None:
            raise HTTPException(status_code=404, detail="Customer not found")

        number = await self._gen_deposit_number()
        deposit = Deposit(
            deposit_number=number,
            contract_id=data.contract_id,
            customer_id=data.customer_id,
            deposit_type=data.deposit_type.value,
            amount=data.amount,
            currency=data.currency,
            notes=data.notes,
            created_by=created_by,
        )
        deposit = await self._repo.create_deposit(deposit)
        await self.db.commit()
        return await self._repo.get_deposit_by_id(deposit.id)

    async def get_deposit(self, deposit_id: int) -> Deposit:
        deposit = await self._repo.get_deposit_by_id(deposit_id)
        if deposit is None:
            raise HTTPException(status_code=404, detail="Deposit not found")
        return deposit

    async def list_deposits(
        self,
        customer_id: int | None = None,
        contract_id: int | None = None,
        deposit_status: str | None = None,
        deposit_type: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> DepositListResponse:
        f = DepositFilter(
            customer_id=customer_id, contract_id=contract_id,
            deposit_status=deposit_status, deposit_type=deposit_type,
            page=page, page_size=page_size,
        )
        items, total = await self._repo.get_deposit_list(f)
        pages = math.ceil(total / page_size) if total else 0
        return DepositListResponse(
            items=items, total=total, page=page, page_size=page_size, pages=pages,
        )

    async def receive_deposit(
        self, deposit_id: int, data: DepositReceiveAction, user_id: int,
    ) -> Deposit:
        deposit = await self.get_deposit(deposit_id)
        if deposit.deposit_status != DepositRecordStatus.PENDING.value:
            raise HTTPException(
                status_code=422, detail="Only pending deposits can be received",
            )
        changes = {
            "deposit_status": DepositRecordStatus.RECEIVED.value,
            "received_date": data.received_date,
            "updated_by": user_id,
        }
        if data.payment_id:
            changes["payment_id"] = data.payment_id
        await self._repo.update_deposit(deposit, changes)
        await self.db.commit()
        return await self._repo.get_deposit_by_id(deposit.id)

    async def refund_deposit(
        self, deposit_id: int, data: DepositRefundAction, user_id: int,
    ) -> Deposit:
        deposit = await self.get_deposit(deposit_id)
        if deposit.deposit_status not in (
            DepositRecordStatus.RECEIVED.value,
            DepositRecordStatus.PARTIALLY_REFUNDED.value,
        ):
            raise HTTPException(
                status_code=422, detail="Deposit must be received before refund",
            )
        available = (
            deposit.amount - deposit.applied_amount
            - deposit.forfeit_amount - deposit.refund_amount
        )
        if data.refund_amount > available + 0.001:
            raise HTTPException(
                status_code=422,
                detail=f"Refund exceeds available deposit balance ({available:.2f})",
            )

        new_refund = deposit.refund_amount + data.refund_amount
        remaining = deposit.amount - deposit.applied_amount - deposit.forfeit_amount - new_refund
        new_status = (
            DepositRecordStatus.REFUNDED.value
            if remaining <= 0.001
            else DepositRecordStatus.PARTIALLY_REFUNDED.value
        )

        changes = {
            "refund_amount": round(new_refund, 2),
            "refund_date": data.refund_date,
            "deposit_status": new_status,
            "updated_by": user_id,
        }
        if data.refund_payment_id:
            changes["refund_payment_id"] = data.refund_payment_id
        if data.notes:
            changes["notes"] = data.notes
        await self._repo.update_deposit(deposit, changes)
        await self.db.commit()
        return await self._repo.get_deposit_by_id(deposit.id)

    async def forfeit_deposit(
        self, deposit_id: int, data: DepositForfeitAction, user_id: int,
    ) -> Deposit:
        deposit = await self.get_deposit(deposit_id)
        if deposit.deposit_status != DepositRecordStatus.RECEIVED.value:
            raise HTTPException(
                status_code=422, detail="Only received deposits can be forfeited",
            )
        available = (
            deposit.amount - deposit.applied_amount - deposit.refund_amount
        )
        if data.forfeit_amount > available + 0.001:
            raise HTTPException(
                status_code=422,
                detail=f"Forfeit exceeds available balance ({available:.2f})",
            )

        changes = {
            "forfeit_amount": round(data.forfeit_amount, 2),
            "deposit_status": DepositRecordStatus.FORFEITED.value,
            "updated_by": user_id,
        }
        if data.reason:
            changes["notes"] = data.reason
        await self._repo.update_deposit(deposit, changes)

        # Create revenue recognition for forfeiture
        rec_number = await self._gen_recognition_number()
        rec = RevenueRecognition(
            recognition_number=rec_number,
            contract_id=deposit.contract_id,
            recognition_type=RecognitionType.DEPOSIT_FORFEITURE.value,
            recognition_date=date.today(),
            amount=data.forfeit_amount,
            currency=deposit.currency,
            description=f"Deposit forfeiture - {deposit.deposit_number}",
            created_by=user_id,
        )
        await self._repo.create_recognition(rec)

        await self.db.commit()
        return await self._repo.get_deposit_by_id(deposit.id)

    async def apply_deposit(
        self, deposit_id: int, data: DepositApplyAction, user_id: int,
    ) -> Deposit:
        deposit = await self.get_deposit(deposit_id)
        if deposit.deposit_status != DepositRecordStatus.RECEIVED.value:
            raise HTTPException(
                status_code=422, detail="Only received deposits can be applied",
            )
        available = (
            deposit.amount - deposit.refund_amount
            - deposit.forfeit_amount - deposit.applied_amount
        )
        if data.apply_amount > available + 0.001:
            raise HTTPException(
                status_code=422,
                detail=f"Apply amount exceeds available balance ({available:.2f})",
            )

        invoice = await self.get_invoice(data.invoice_id)
        if data.apply_amount > invoice.balance_due + 0.001:
            raise HTTPException(
                status_code=422,
                detail=f"Apply amount exceeds invoice balance due ({invoice.balance_due:.2f})",
            )

        # Update deposit
        new_applied = deposit.applied_amount + data.apply_amount
        remaining = deposit.amount - deposit.refund_amount - deposit.forfeit_amount - new_applied
        dep_status = (
            DepositRecordStatus.APPLIED.value
            if remaining <= 0.001
            else deposit.deposit_status
        )
        await self._repo.update_deposit(deposit, {
            "applied_amount": round(new_applied, 2),
            "deposit_status": dep_status,
            "updated_by": user_id,
        })

        # Update invoice
        new_paid = invoice.amount_paid + data.apply_amount
        new_balance = invoice.total_amount - new_paid
        inv_status = invoice.status
        paid_date = None
        if new_balance <= 0.001:
            inv_status = InvoiceStatus.PAID.value
            paid_date = date.today()
            new_balance = 0.0
        elif new_paid > 0:
            inv_status = InvoiceStatus.PARTIALLY_PAID.value

        inv_changes = {
            "amount_paid": round(new_paid, 2),
            "balance_due": round(new_balance, 2),
            "status": inv_status,
        }
        if paid_date:
            inv_changes["paid_date"] = paid_date
        await self._repo.update_invoice(invoice, inv_changes)

        if inv_status == InvoiceStatus.PAID.value:
            await self._mark_billing_cycles_paid(invoice.id)
            refreshed = await self._repo.get_invoice_by_id(invoice.id)
            if refreshed:
                await self.schedule_revenue_recognition(refreshed, user_id)

        await self.db.commit()
        return await self._repo.get_deposit_by_id(deposit.id)

    # ══════════════════════════════════════════════════════════════════════════
    # REVENUE RECOGNITION
    # ═══════════════════════════════════════════���══════════════════════════════

    async def create_recognition(
        self, data: RevenueRecognitionCreate, created_by: int,
    ) -> RevenueRecognition:
        contract = await self.db.get(RentalContract, data.contract_id)
        if contract is None:
            raise HTTPException(status_code=404, detail="Contract not found")

        number = await self._gen_recognition_number()
        rec = RevenueRecognition(
            recognition_number=number,
            contract_id=data.contract_id,
            invoice_id=data.invoice_id,
            invoice_item_id=data.invoice_item_id,
            recognition_type=data.recognition_type.value,
            recognition_date=data.recognition_date,
            amount=data.amount,
            currency=data.currency,
            period_start=data.period_start,
            period_end=data.period_end,
            description=data.description,
            notes=data.notes,
            created_by=created_by,
        )
        rec = await self._repo.create_recognition(rec)
        await self.db.commit()
        return await self._repo.get_recognition_by_id(rec.id)

    async def recognize(
        self, recognition_id: int, user_id: int,
    ) -> RevenueRecognition:
        rec = await self._repo.get_recognition_by_id(recognition_id)
        if rec is None:
            raise HTTPException(
                status_code=404, detail="Revenue recognition not found",
            )
        if rec.recognition_status != RecognitionStatus.SCHEDULED.value:
            raise HTTPException(
                status_code=422, detail="Only scheduled entries can be recognized",
            )
        await self._repo.update_recognition(rec, {
            "recognition_status": RecognitionStatus.RECOGNIZED.value,
            "updated_by": user_id,
        })
        await self.db.commit()
        return await self._repo.get_recognition_by_id(rec.id)

    async def reverse_recognition(
        self, recognition_id: int, user_id: int,
    ) -> RevenueRecognition:
        rec = await self._repo.get_recognition_by_id(recognition_id)
        if rec is None:
            raise HTTPException(
                status_code=404, detail="Revenue recognition not found",
            )
        if rec.recognition_status != RecognitionStatus.RECOGNIZED.value:
            raise HTTPException(
                status_code=422, detail="Only recognized entries can be reversed",
            )
        await self._repo.update_recognition(rec, {
            "recognition_status": RecognitionStatus.REVERSED.value,
            "updated_by": user_id,
        })
        await self.db.commit()
        return await self._repo.get_recognition_by_id(rec.id)

    async def list_recognitions(
        self,
        contract_id: int | None = None,
        recognition_type: str | None = None,
        recognition_status: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> RevenueRecognitionListResponse:
        f = RevenueRecognitionFilter(
            contract_id=contract_id, recognition_type=recognition_type,
            recognition_status=recognition_status,
            date_from=date_from, date_to=date_to,
            page=page, page_size=page_size,
        )
        items, total = await self._repo.get_recognition_list(f)
        pages = math.ceil(total / page_size) if total else 0
        return RevenueRecognitionListResponse(
            items=items, total=total, page=page, page_size=page_size, pages=pages,
        )

    # ═��══════════════════════════════��═════════════════════════════════════════
    # DASHBOARD
    # ══════════════════════════════════════════════════════════════════════════

    async def get_billing_summary(
        self, customer_id: int | None = None,
    ) -> BillingDashboardSummary:
        data = await self._repo.get_billing_dashboard(customer_id)
        return BillingDashboardSummary(**data)

    # ══════════════════════════════════════════════════════════════════════════
    # WORKFLOW AUTOMATION (called from rental_workflow_service)
    # ══════════════════════════════════════════════════════════════════════════

    async def on_contract_activated(
        self, contract: RentalContract, user_id: int,
    ) -> None:
        rental_repo = RentalRepository(self.db)
        actual_start = contract.actual_start_date or contract.start_date

        # Generate first rental period billing cycle for each item
        for item in contract.items:
            period_end = self._calc_period_end(
                actual_start, contract.billing_cycle_day, contract.end_date,
            )
            exists = await rental_repo.billing_period_exists(
                contract.id, actual_start, period_end,
            )
            if exists:
                continue

            number = await self._gen_billing_number()
            desc = f"Rental period {actual_start.isoformat()} to {period_end.isoformat()}"
            if item.forklift_id:
                desc = f"{item.description} - {desc}"

            amount = round(item.monthly_rate * ((period_end - actual_start).days / 30), 2)
            tax_amt = round(amount * contract.tax_rate / 100, 2)

            cycle = RentalBillingCycle(
                billing_number=number,
                contract_id=contract.id,
                contract_item_id=item.id,
                billing_type=BillingType.RENTAL_PERIOD.value,
                description=desc,
                period_start=actual_start,
                period_end=period_end,
                quantity=1.0,
                unit_rate=amount,
                amount=amount,
                tax_amount=tax_amt,
                total_amount=round(amount + tax_amt, 2),
                currency=contract.currency,
                due_date=actual_start + timedelta(days=contract.payment_terms_days),
                generated_by="system",
                created_by=user_id,
            )
            await rental_repo.add_billing_cycle(cycle)

        # Auto-create deposit billing cycle if deposit > 0
        if contract.deposit_amount > 0:
            dep_number = await self._gen_billing_number()
            dep_cycle = RentalBillingCycle(
                billing_number=dep_number,
                contract_id=contract.id,
                billing_type=BillingType.DEPOSIT.value,
                description=f"Security deposit for {contract.contract_number}",
                quantity=1.0,
                unit_rate=contract.deposit_amount,
                amount=contract.deposit_amount,
                tax_amount=0.0,
                total_amount=contract.deposit_amount,
                currency=contract.currency,
                due_date=actual_start,
                generated_by="system",
                created_by=user_id,
            )
            await rental_repo.add_billing_cycle(dep_cycle)

        await self.db.flush()

    async def generate_next_billing_cycles(
        self, contract_id: int, user_id: int,
    ) -> list[RentalBillingCycle]:
        # selectinload avoids a lazy-load of `contract.items` below, which
        # raises MissingGreenlet on an AsyncSession outside an awaited context.
        contract = (
            await self.db.execute(
                select(RentalContract)
                .where(RentalContract.id == contract_id)
                .options(selectinload(RentalContract.items))
            )
        ).scalar_one_or_none()
        if contract is None:
            raise HTTPException(status_code=404, detail="Contract not found")

        rental_repo = RentalRepository(self.db)
        created_cycles = []

        # Find the latest billing period end for each item
        for item in contract.items:
            result = await self.db.execute(
                select(RentalBillingCycle.period_end)
                .where(
                    and_(
                        RentalBillingCycle.contract_id == contract_id,
                        RentalBillingCycle.contract_item_id == item.id,
                        RentalBillingCycle.billing_type == BillingType.RENTAL_PERIOD.value,
                    )
                )
                .order_by(RentalBillingCycle.period_end.desc())
                .limit(1)
            )
            last_end = result.scalar_one_or_none()

            if last_end is None:
                next_start = contract.actual_start_date or contract.start_date
            else:
                next_start = last_end + timedelta(days=1)

            if next_start > contract.end_date:
                continue

            period_end = self._calc_period_end(
                next_start, contract.billing_cycle_day, contract.end_date,
            )

            exists = await rental_repo.billing_period_exists(
                contract_id, next_start, period_end,
            )
            if exists:
                continue

            number = await self._gen_billing_number()
            desc = f"Rental period {next_start.isoformat()} to {period_end.isoformat()}"
            if item.description:
                desc = f"{item.description} - {desc}"

            amount = round(item.monthly_rate * ((period_end - next_start).days / 30), 2)
            tax_amt = round(amount * contract.tax_rate / 100, 2)

            cycle = RentalBillingCycle(
                billing_number=number,
                contract_id=contract_id,
                contract_item_id=item.id,
                billing_type=BillingType.RENTAL_PERIOD.value,
                description=desc,
                period_start=next_start,
                period_end=period_end,
                quantity=1.0,
                unit_rate=amount,
                amount=amount,
                tax_amount=tax_amt,
                total_amount=round(amount + tax_amt, 2),
                currency=contract.currency,
                due_date=next_start + timedelta(days=contract.payment_terms_days),
                generated_by="system",
                created_by=user_id,
            )
            cycle = await rental_repo.add_billing_cycle(cycle)
            created_cycles.append(cycle)

        await self.db.commit()
        return created_cycles

    async def on_damage_report_created(
        self, contract: RentalContract, report, user_id: int,
    ) -> RentalBillingCycle | None:
        if not report.is_customer_liable or report.total_charge <= 0:
            return None

        rental_repo = RentalRepository(self.db)
        number = await self._gen_billing_number()

        cycle = RentalBillingCycle(
            billing_number=number,
            contract_id=contract.id,
            billing_type=BillingType.DAMAGE_CHARGE.value,
            description=f"Damage charge - {report.report_number}: {report.component}",
            quantity=1.0,
            unit_rate=report.total_charge,
            amount=report.total_charge,
            tax_amount=0.0,
            total_amount=report.total_charge,
            currency=contract.currency,
            due_date=date.today() + timedelta(days=contract.payment_terms_days),
            generated_by="system",
            created_by=user_id,
        )
        cycle = await rental_repo.add_billing_cycle(cycle)
        await self.db.flush()
        return cycle

    async def on_early_termination(
        self, contract: RentalContract, user_id: int,
    ) -> RentalBillingCycle | None:
        if contract.early_termination_fee_pct <= 0:
            return None

        fee = round(contract.total_value * contract.early_termination_fee_pct / 100, 2)
        if fee <= 0:
            return None

        rental_repo = RentalRepository(self.db)
        number = await self._gen_billing_number()

        cycle = RentalBillingCycle(
            billing_number=number,
            contract_id=contract.id,
            billing_type=BillingType.EARLY_TERMINATION.value,
            description=f"Early termination fee ({contract.early_termination_fee_pct}%)",
            quantity=1.0,
            unit_rate=fee,
            amount=fee,
            tax_amount=0.0,
            total_amount=fee,
            currency=contract.currency,
            due_date=date.today() + timedelta(days=contract.payment_terms_days),
            generated_by="system",
            created_by=user_id,
        )
        cycle = await rental_repo.add_billing_cycle(cycle)
        await self.db.flush()
        return cycle

    async def on_late_return(
        self, contract: RentalContract, days_late: int, user_id: int,
    ) -> RentalBillingCycle | None:
        if contract.late_return_penalty_pct <= 0 or days_late <= 0:
            return None

        base_daily = contract.subtotal / max((contract.end_date - contract.start_date).days, 1)
        penalty = round(base_daily * days_late * contract.late_return_penalty_pct / 100, 2)
        if penalty <= 0:
            return None

        rental_repo = RentalRepository(self.db)
        number = await self._gen_billing_number()

        cycle = RentalBillingCycle(
            billing_number=number,
            contract_id=contract.id,
            billing_type=BillingType.LATE_RETURN_PENALTY.value,
            description=f"Late return penalty - {days_late} days ({contract.late_return_penalty_pct}%)",
            quantity=float(days_late),
            unit_rate=round(base_daily * contract.late_return_penalty_pct / 100, 2),
            amount=penalty,
            tax_amount=0.0,
            total_amount=penalty,
            currency=contract.currency,
            due_date=date.today() + timedelta(days=contract.payment_terms_days),
            generated_by="system",
            created_by=user_id,
        )
        cycle = await rental_repo.add_billing_cycle(cycle)
        await self.db.flush()
        return cycle

    async def on_overtime_hours(
        self, contract: RentalContract, item: RentalContractItem,
        excess_hours: float, user_id: int,
    ) -> RentalBillingCycle | None:
        if excess_hours <= 0 or not item.hourly_rate:
            return None

        rate = round(item.hourly_rate * contract.overtime_rate_pct / 100, 2)
        amount = round(excess_hours * rate, 2)

        rental_repo = RentalRepository(self.db)
        number = await self._gen_billing_number()

        cycle = RentalBillingCycle(
            billing_number=number,
            contract_id=contract.id,
            contract_item_id=item.id,
            billing_type=BillingType.OVERTIME_HOURS.value,
            description=f"Overtime hours - {excess_hours:.1f}h @ {contract.overtime_rate_pct}%",
            quantity=excess_hours,
            unit_rate=rate,
            amount=amount,
            tax_amount=0.0,
            total_amount=amount,
            currency=contract.currency,
            due_date=date.today() + timedelta(days=contract.payment_terms_days),
            generated_by="system",
            created_by=user_id,
        )
        cycle = await rental_repo.add_billing_cycle(cycle)
        await self.db.flush()
        return cycle

    async def on_contract_settling(
        self, contract: RentalContract, user_id: int,
    ) -> Invoice | None:
        rental_repo = RentalRepository(self.db)

        # Gather all uninvoiced billing cycles
        result = await self.db.execute(
            select(RentalBillingCycle)
            .where(
                and_(
                    RentalBillingCycle.contract_id == contract.id,
                    RentalBillingCycle.payment_status == "pending",
                    RentalBillingCycle.is_credit == False,
                )
            )
        )
        pending_cycles = list(result.scalars().all())

        if not pending_cycles:
            return None

        cycle_ids = [c.id for c in pending_cycles]
        number = await self._gen_invoice_number()
        invoice = Invoice(
            invoice_number=number,
            contract_id=contract.id,
            customer_id=contract.customer_id,
            currency=contract.currency,
            tax_rate=contract.tax_rate,
            notes=f"Final settlement invoice for {contract.contract_number}",
            created_by=user_id,
        )
        invoice = await self._repo.create_invoice(invoice)
        await self._populate_items_from_cycles(invoice, cycle_ids, contract.tax_rate)
        await self._recalculate_invoice_totals(invoice)

        # Auto-issue the settlement invoice
        issue_date = date.today()
        due_date = issue_date + timedelta(days=contract.payment_terms_days)
        await self._repo.update_invoice(invoice, {
            "status": InvoiceStatus.ISSUED.value,
            "issue_date": issue_date,
            "due_date": due_date,
            "updated_by": user_id,
        })

        await self.db.flush()
        return await self._repo.get_invoice_by_id(invoice.id)

    async def mark_overdue_invoices(self) -> int:
        today = date.today()
        result = await self.db.execute(
            select(Invoice)
            .where(
                and_(
                    Invoice.status.in_([
                        InvoiceStatus.ISSUED.value,
                        InvoiceStatus.SENT.value,
                        InvoiceStatus.PARTIALLY_PAID.value,
                    ]),
                    Invoice.due_date < today,
                    Invoice.is_active == True,
                )
            )
        )
        invoices = list(result.scalars().all())
        count = 0
        for inv in invoices:
            inv.status = InvoiceStatus.OVERDUE.value
            count += 1

        # Also mark billing cycles as overdue
        result2 = await self.db.execute(
            select(RentalBillingCycle)
            .where(
                and_(
                    RentalBillingCycle.payment_status.in_(["pending", "invoiced"]),
                    RentalBillingCycle.due_date < today,
                )
            )
        )
        for cycle in result2.scalars().all():
            cycle.payment_status = "overdue"

        if count > 0:
            await self.db.commit()
        return count

    async def schedule_revenue_recognition(
        self, invoice: Invoice, user_id: int,
    ) -> list[RevenueRecognition]:
        entries = []
        result = await self.db.execute(
            select(InvoiceItem).where(InvoiceItem.invoice_id == invoice.id)
        )
        items = list(result.scalars().all())

        for item in items:
            rec_type = RecognitionType.RENTAL_INCOME.value
            if item.billing_cycle_id:
                cycle = await self.db.get(RentalBillingCycle, item.billing_cycle_id)
                if cycle:
                    rec_type = self._map_billing_type_to_recognition(cycle.billing_type)

            number = await self._gen_recognition_number()
            period_start = invoice.billing_period_start
            period_end = invoice.billing_period_end
            if item.billing_cycle_id:
                cycle = await self.db.get(RentalBillingCycle, item.billing_cycle_id)
                if cycle:
                    period_start = cycle.period_start or period_start
                    period_end = cycle.period_end or period_end

            rec = RevenueRecognition(
                recognition_number=number,
                invoice_id=invoice.id,
                invoice_item_id=item.id,
                contract_id=invoice.contract_id,
                recognition_type=rec_type,
                recognition_date=period_end or invoice.paid_date or date.today(),
                amount=item.line_total,
                currency=invoice.currency,
                period_start=period_start,
                period_end=period_end,
                description=item.description,
                created_by=user_id,
            )
            rec = await self._repo.create_recognition(rec)
            entries.append(rec)

        await self.db.flush()
        return entries

    # ══════════════════════════════════════════════════════════════════════════
    # PRIVATE HELPERS
    # ══════════════════════════════════════════════════════════════════════════

    async def _populate_items_from_cycles(
        self, invoice: Invoice, cycle_ids: list[int], tax_rate: float,
    ) -> None:
        line_number = 0
        period_starts = []
        period_ends = []

        for cycle_id in cycle_ids:
            cycle = await self.db.get(RentalBillingCycle, cycle_id)
            if cycle is None:
                continue
            if cycle.payment_status == "paid":
                continue

            line_number += 1
            tax_amt = round(cycle.amount * tax_rate / 100, 2)
            line_total = round(cycle.amount + tax_amt, 2)

            item = InvoiceItem(
                invoice_id=invoice.id,
                billing_cycle_id=cycle_id,
                line_number=line_number,
                description=cycle.description,
                quantity=cycle.quantity,
                unit_rate=cycle.unit_rate,
                amount=cycle.amount,
                tax_amount=tax_amt,
                line_total=line_total,
                sort_order=line_number,
            )
            await self._repo.add_invoice_item(item)

            # Update billing cycle
            cycle.payment_status = "invoiced"
            cycle.invoice_id = invoice.id
            await self.db.flush()

            if cycle.period_start:
                period_starts.append(cycle.period_start)
            if cycle.period_end:
                period_ends.append(cycle.period_end)

        if period_starts:
            invoice.billing_period_start = min(period_starts)
        if period_ends:
            invoice.billing_period_end = max(period_ends)
        await self.db.flush()

    async def _populate_manual_items(
        self, invoice: Invoice, items: list[InvoiceItemCreate], tax_rate: float,
    ) -> None:
        """Freeform counterpart to `_populate_items_from_cycles` for
        work-order/sales invoices that have no RentalBillingCycle to draw
        from — the caller types description/quantity/unit_rate directly."""
        for line_number, item_data in enumerate(items, start=1):
            amount = round(item_data.quantity * item_data.unit_rate, 2)
            tax_amt = round(amount * tax_rate / 100, 2)
            line_total = round(amount + tax_amt, 2)

            item = InvoiceItem(
                invoice_id=invoice.id,
                line_number=line_number,
                item_code=item_data.item_code,
                description=item_data.description.strip(),
                unit=item_data.unit,
                quantity=item_data.quantity,
                unit_rate=item_data.unit_rate,
                amount=amount,
                tax_amount=tax_amt,
                line_total=line_total,
                sort_order=line_number,
            )
            await self._repo.add_invoice_item(item)
        await self.db.flush()

    async def _recalculate_invoice_totals(self, invoice: Invoice) -> None:
        subtotal = await self._repo.get_invoice_items_subtotal(invoice.id)
        tax_amount = round(subtotal * invoice.tax_rate / 100, 2)
        total = round(subtotal + tax_amount - invoice.discount_amount, 2)
        balance = round(total - invoice.amount_paid, 2)

        invoice.subtotal = subtotal
        invoice.tax_amount = tax_amount
        invoice.total_amount = total
        invoice.balance_due = max(balance, 0.0)
        await self.db.flush()

    async def _revert_billing_cycles(self, invoice_id: int) -> None:
        result = await self.db.execute(
            select(InvoiceItem)
            .where(InvoiceItem.invoice_id == invoice_id)
            .where(InvoiceItem.billing_cycle_id.isnot(None))
        )
        items = result.scalars().all()
        for item in items:
            cycle = await self.db.get(RentalBillingCycle, item.billing_cycle_id)
            if cycle:
                cycle.payment_status = "pending"
                cycle.invoice_id = None
        await self.db.flush()

    async def _mark_billing_cycles_paid(self, invoice_id: int) -> None:
        result = await self.db.execute(
            select(InvoiceItem)
            .where(InvoiceItem.invoice_id == invoice_id)
            .where(InvoiceItem.billing_cycle_id.isnot(None))
        )
        items = result.scalars().all()
        for item in items:
            cycle = await self.db.get(RentalBillingCycle, item.billing_cycle_id)
            if cycle:
                cycle.payment_status = "paid"
                cycle.paid_date = date.today()
        await self.db.flush()

    @staticmethod
    def _next_cycle_day(year: int, month: int, billing_cycle_day: int) -> date:
        import calendar
        last_day = calendar.monthrange(year, month)[1]
        return date(year, month, min(billing_cycle_day, last_day))

    @classmethod
    def _calc_period_end(
        cls, start: date, billing_cycle_day: int, contract_end: date,
    ) -> date:
        if start.month == 12:
            next_month = cls._next_cycle_day(start.year + 1, 1, billing_cycle_day)
        else:
            next_month = cls._next_cycle_day(start.year, start.month + 1, billing_cycle_day)
        period_end = next_month - timedelta(days=1)
        if period_end <= start:
            # `start` fell exactly one day before the billing-cycle boundary,
            # so the naive calc above produces a degenerate (same-day) period.
            # Roll forward one more month so every generated cycle is a real
            # billing period instead of a same-day one immediately followed
            # by another due period on the very next scan (double-billing).
            if next_month.month == 12:
                next_month = cls._next_cycle_day(next_month.year + 1, 1, billing_cycle_day)
            else:
                next_month = cls._next_cycle_day(next_month.year, next_month.month + 1, billing_cycle_day)
            period_end = next_month - timedelta(days=1)
        return min(period_end, contract_end)

    @staticmethod
    def _map_billing_type_to_recognition(billing_type: str) -> str:
        mapping = {
            BillingType.RENTAL_PERIOD.value: RecognitionType.RENTAL_INCOME.value,
            BillingType.DELIVERY_FEE.value: RecognitionType.SERVICE_FEE.value,
            BillingType.RETRIEVAL_FEE.value: RecognitionType.SERVICE_FEE.value,
            BillingType.OVERTIME_HOURS.value: RecognitionType.RENTAL_INCOME.value,
            BillingType.EARLY_TERMINATION.value: RecognitionType.PENALTY_FEE.value,
            BillingType.LATE_RETURN_PENALTY.value: RecognitionType.PENALTY_FEE.value,
            BillingType.DAMAGE_CHARGE.value: RecognitionType.DAMAGE_RECOVERY.value,
            BillingType.DEPOSIT_REFUND.value: RecognitionType.DEPOSIT_FORFEITURE.value,
        }
        return mapping.get(billing_type, RecognitionType.RENTAL_INCOME.value)

    async def _gen_billing_number(self) -> str:
        rental_repo = RentalRepository(self.db)
        year = time.strftime("%Y")
        base = f"RB-{year}"
        seq = 1
        while await rental_repo.billing_number_exists(f"{base}-{seq:05d}"):
            seq += 1
        return f"{base}-{seq:05d}"

    async def _gen_invoice_number(self) -> str:
        year = time.strftime("%Y")
        base = f"INV-{year}"
        seq = 1
        while await self._repo.invoice_number_exists(f"{base}-{seq:05d}"):
            seq += 1
        return f"{base}-{seq:05d}"

    async def _gen_payment_number(self) -> str:
        year = time.strftime("%Y")
        base = f"PAY-{year}"
        seq = 1
        while await self._repo.payment_number_exists(f"{base}-{seq:05d}"):
            seq += 1
        return f"{base}-{seq:05d}"

    async def _gen_deposit_number(self) -> str:
        year = time.strftime("%Y")
        base = f"DEP-{year}"
        seq = 1
        while await self._repo.deposit_number_exists(f"{base}-{seq:05d}"):
            seq += 1
        return f"{base}-{seq:05d}"

    async def _gen_recognition_number(self) -> str:
        year = time.strftime("%Y")
        base = f"REV-{year}"
        seq = 1
        while await self._repo.recognition_number_exists(f"{base}-{seq:05d}"):
            seq += 1
        return f"{base}-{seq:05d}"
