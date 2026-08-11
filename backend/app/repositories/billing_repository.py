import logging
from dataclasses import dataclass, field
from datetime import date

from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.deposit import Deposit
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.payment import Payment
from app.models.payment_allocation import PaymentAllocation
from app.models.revenue_recognition import RevenueRecognition

logger = logging.getLogger(__name__)


@dataclass
class InvoiceFilter:
    q: str | None = None
    status: str | None = None
    customer_id: int | None = None
    contract_id: int | None = None
    is_active: bool | None = True
    issue_from: date | None = None
    issue_to: date | None = None
    due_from: date | None = None
    due_to: date | None = None
    page: int = 1
    page_size: int = 20
    sort: str = "created_at"
    order: str = "desc"


@dataclass
class PaymentFilter:
    q: str | None = None
    customer_id: int | None = None
    contract_id: int | None = None
    payment_status: str | None = None
    payment_method: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    page: int = 1
    page_size: int = 20
    sort: str = "created_at"
    order: str = "desc"


@dataclass
class DepositFilter:
    customer_id: int | None = None
    contract_id: int | None = None
    deposit_status: str | None = None
    deposit_type: str | None = None
    page: int = 1
    page_size: int = 20


@dataclass
class RevenueRecognitionFilter:
    contract_id: int | None = None
    recognition_type: str | None = None
    recognition_status: str | None = None
    date_from: date | None = None
    date_to: date | None = None
    page: int = 1
    page_size: int = 20


class BillingRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Invoice ──────────────────────────────────────────────────────────────

    async def get_invoice_by_id(self, invoice_id: int) -> Invoice | None:
        result = await self.db.execute(
            select(Invoice)
            .options(
                selectinload(Invoice.customer),
                selectinload(Invoice.contract),
                selectinload(Invoice.items),
                selectinload(Invoice.allocations),
                selectinload(Invoice.creator),
            )
            .where(Invoice.id == invoice_id)
        )
        return result.scalar_one_or_none()

    async def get_invoice_list(self, f: InvoiceFilter) -> tuple[list[Invoice], int]:
        stmt = (
            select(Invoice)
            .options(
                selectinload(Invoice.customer),
                selectinload(Invoice.contract),
                selectinload(Invoice.creator),
            )
        )
        count_stmt = select(func.count(Invoice.id))

        conditions = []
        if f.is_active is not None:
            conditions.append(Invoice.is_active == f.is_active)
        if f.status:
            conditions.append(Invoice.status == f.status)
        if f.customer_id:
            conditions.append(Invoice.customer_id == f.customer_id)
        if f.contract_id:
            conditions.append(Invoice.contract_id == f.contract_id)
        if f.issue_from:
            conditions.append(Invoice.issue_date >= f.issue_from)
        if f.issue_to:
            conditions.append(Invoice.issue_date <= f.issue_to)
        if f.due_from:
            conditions.append(Invoice.due_date >= f.due_from)
        if f.due_to:
            conditions.append(Invoice.due_date <= f.due_to)
        if f.q:
            pattern = f"%{f.q}%"
            conditions.append(
                or_(
                    Invoice.invoice_number.ilike(pattern),
                    Invoice.notes.ilike(pattern),
                )
            )

        if conditions:
            stmt = stmt.where(and_(*conditions))
            count_stmt = count_stmt.where(and_(*conditions))

        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        sort_col = getattr(Invoice, f.sort, Invoice.created_at)
        if f.order == "asc":
            stmt = stmt.order_by(sort_col.asc())
        else:
            stmt = stmt.order_by(sort_col.desc())

        offset = (f.page - 1) * f.page_size
        stmt = stmt.offset(offset).limit(f.page_size)

        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def invoice_number_exists(self, number: str) -> bool:
        result = await self.db.execute(
            select(Invoice.id).where(Invoice.invoice_number == number)
        )
        return result.scalar_one_or_none() is not None

    async def create_invoice(self, invoice: Invoice) -> Invoice:
        self.db.add(invoice)
        try:
            await self.db.flush()
            await self.db.refresh(invoice)
            return invoice
        except IntegrityError:
            await self.db.rollback()
            raise

    async def update_invoice(self, invoice: Invoice, changes: dict) -> Invoice:
        for key, value in changes.items():
            setattr(invoice, key, value)
        try:
            await self.db.flush()
            await self.db.refresh(invoice)
            return invoice
        except IntegrityError:
            await self.db.rollback()
            raise

    async def delete_invoice(self, invoice: Invoice) -> None:
        await self.db.delete(invoice)
        await self.db.flush()

    # ── Invoice Items ────────────────────────────────────────────────────────

    async def add_invoice_item(self, item: InvoiceItem) -> InvoiceItem:
        self.db.add(item)
        await self.db.flush()
        await self.db.refresh(item)
        return item

    async def get_invoice_item_by_id(self, item_id: int) -> InvoiceItem | None:
        return await self.db.get(InvoiceItem, item_id)

    async def delete_invoice_item(self, item: InvoiceItem) -> None:
        await self.db.delete(item)
        await self.db.flush()

    async def get_invoice_items_subtotal(self, invoice_id: int) -> float:
        # Pre-tax sum: `_recalculate_invoice_totals` applies `invoice.tax_rate`
        # to this figure, so it must be `amount` (pre-tax), not `line_total`
        # (amount + that line's own tax) — summing line_total here would
        # double-tax every invoice.
        result = await self.db.execute(
            select(func.coalesce(func.sum(InvoiceItem.amount), 0.0))
            .where(InvoiceItem.invoice_id == invoice_id)
        )
        return float(result.scalar_one())

    async def next_invoice_line_number(self, invoice_id: int) -> int:
        result = await self.db.execute(
            select(func.coalesce(func.max(InvoiceItem.line_number), 0))
            .where(InvoiceItem.invoice_id == invoice_id)
        )
        return int(result.scalar_one()) + 1

    # ── Payment ──────────────────────────────────────────────────────────────

    async def get_payment_by_id(self, payment_id: int) -> Payment | None:
        result = await self.db.execute(
            select(Payment)
            .options(
                selectinload(Payment.customer),
                selectinload(Payment.contract),
                selectinload(Payment.allocations),
                selectinload(Payment.confirmer),
                selectinload(Payment.creator),
            )
            .where(Payment.id == payment_id)
        )
        return result.scalar_one_or_none()

    async def get_payment_list(self, f: PaymentFilter) -> tuple[list[Payment], int]:
        stmt = (
            select(Payment)
            .options(
                selectinload(Payment.customer),
                selectinload(Payment.contract),
                selectinload(Payment.confirmer),
                selectinload(Payment.creator),
            )
        )
        count_stmt = select(func.count(Payment.id))

        conditions = []
        if f.customer_id:
            conditions.append(Payment.customer_id == f.customer_id)
        if f.contract_id:
            conditions.append(Payment.contract_id == f.contract_id)
        if f.payment_status:
            conditions.append(Payment.payment_status == f.payment_status)
        if f.payment_method:
            conditions.append(Payment.payment_method == f.payment_method)
        if f.date_from:
            conditions.append(Payment.payment_date >= f.date_from)
        if f.date_to:
            conditions.append(Payment.payment_date <= f.date_to)
        if f.q:
            pattern = f"%{f.q}%"
            conditions.append(
                or_(
                    Payment.payment_number.ilike(pattern),
                    Payment.reference_number.ilike(pattern),
                )
            )

        if conditions:
            stmt = stmt.where(and_(*conditions))
            count_stmt = count_stmt.where(and_(*conditions))

        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        sort_col = getattr(Payment, f.sort, Payment.created_at)
        if f.order == "asc":
            stmt = stmt.order_by(sort_col.asc())
        else:
            stmt = stmt.order_by(sort_col.desc())

        offset = (f.page - 1) * f.page_size
        stmt = stmt.offset(offset).limit(f.page_size)

        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def payment_number_exists(self, number: str) -> bool:
        result = await self.db.execute(
            select(Payment.id).where(Payment.payment_number == number)
        )
        return result.scalar_one_or_none() is not None

    async def create_payment(self, payment: Payment) -> Payment:
        self.db.add(payment)
        try:
            await self.db.flush()
            await self.db.refresh(payment)
            return payment
        except IntegrityError:
            await self.db.rollback()
            raise

    async def update_payment(self, payment: Payment, changes: dict) -> Payment:
        for key, value in changes.items():
            setattr(payment, key, value)
        try:
            await self.db.flush()
            await self.db.refresh(payment)
            return payment
        except IntegrityError:
            await self.db.rollback()
            raise

    # ── Payment Allocation ───────────────────────────────────────────────────

    async def add_allocation(self, alloc: PaymentAllocation) -> PaymentAllocation:
        self.db.add(alloc)
        await self.db.flush()
        await self.db.refresh(alloc)
        return alloc

    async def get_allocations_for_invoice(
        self, invoice_id: int,
    ) -> list[PaymentAllocation]:
        result = await self.db.execute(
            select(PaymentAllocation)
            .where(PaymentAllocation.invoice_id == invoice_id)
        )
        return list(result.scalars().all())

    async def get_allocations_for_payment(
        self, payment_id: int,
    ) -> list[PaymentAllocation]:
        result = await self.db.execute(
            select(PaymentAllocation)
            .where(PaymentAllocation.payment_id == payment_id)
        )
        return list(result.scalars().all())

    async def get_total_allocated_for_payment(self, payment_id: int) -> float:
        result = await self.db.execute(
            select(func.coalesce(func.sum(PaymentAllocation.allocated_amount), 0.0))
            .where(PaymentAllocation.payment_id == payment_id)
        )
        return float(result.scalar_one())

    async def get_total_paid_for_invoice(self, invoice_id: int) -> float:
        result = await self.db.execute(
            select(func.coalesce(func.sum(PaymentAllocation.allocated_amount), 0.0))
            .where(PaymentAllocation.invoice_id == invoice_id)
        )
        return float(result.scalar_one())

    # ── Deposit ──────────────────────────────────────────────────────────────

    async def get_deposit_by_id(self, deposit_id: int) -> Deposit | None:
        result = await self.db.execute(
            select(Deposit)
            .options(
                selectinload(Deposit.contract),
                selectinload(Deposit.customer),
                selectinload(Deposit.creator),
            )
            .where(Deposit.id == deposit_id)
        )
        return result.scalar_one_or_none()

    async def get_deposit_list(self, f: DepositFilter) -> tuple[list[Deposit], int]:
        stmt = (
            select(Deposit)
            .options(
                selectinload(Deposit.contract),
                selectinload(Deposit.customer),
                selectinload(Deposit.creator),
            )
        )
        count_stmt = select(func.count(Deposit.id))

        conditions = []
        if f.customer_id:
            conditions.append(Deposit.customer_id == f.customer_id)
        if f.contract_id:
            conditions.append(Deposit.contract_id == f.contract_id)
        if f.deposit_status:
            conditions.append(Deposit.deposit_status == f.deposit_status)
        if f.deposit_type:
            conditions.append(Deposit.deposit_type == f.deposit_type)

        if conditions:
            stmt = stmt.where(and_(*conditions))
            count_stmt = count_stmt.where(and_(*conditions))

        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        stmt = stmt.order_by(Deposit.created_at.desc())
        offset = (f.page - 1) * f.page_size
        stmt = stmt.offset(offset).limit(f.page_size)

        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def deposit_number_exists(self, number: str) -> bool:
        result = await self.db.execute(
            select(Deposit.id).where(Deposit.deposit_number == number)
        )
        return result.scalar_one_or_none() is not None

    async def create_deposit(self, deposit: Deposit) -> Deposit:
        self.db.add(deposit)
        try:
            await self.db.flush()
            await self.db.refresh(deposit)
            return deposit
        except IntegrityError:
            await self.db.rollback()
            raise

    async def update_deposit(self, deposit: Deposit, changes: dict) -> Deposit:
        for key, value in changes.items():
            setattr(deposit, key, value)
        try:
            await self.db.flush()
            await self.db.refresh(deposit)
            return deposit
        except IntegrityError:
            await self.db.rollback()
            raise

    # ── Revenue Recognition ──────────────────────────────────────────────────

    async def get_recognition_by_id(
        self, recognition_id: int,
    ) -> RevenueRecognition | None:
        result = await self.db.execute(
            select(RevenueRecognition)
            .options(selectinload(RevenueRecognition.creator))
            .where(RevenueRecognition.id == recognition_id)
        )
        return result.scalar_one_or_none()

    async def get_recognition_list(
        self, f: RevenueRecognitionFilter,
    ) -> tuple[list[RevenueRecognition], int]:
        stmt = (
            select(RevenueRecognition)
            .options(selectinload(RevenueRecognition.creator))
        )
        count_stmt = select(func.count(RevenueRecognition.id))

        conditions = []
        if f.contract_id:
            conditions.append(RevenueRecognition.contract_id == f.contract_id)
        if f.recognition_type:
            conditions.append(RevenueRecognition.recognition_type == f.recognition_type)
        if f.recognition_status:
            conditions.append(
                RevenueRecognition.recognition_status == f.recognition_status
            )
        if f.date_from:
            conditions.append(RevenueRecognition.recognition_date >= f.date_from)
        if f.date_to:
            conditions.append(RevenueRecognition.recognition_date <= f.date_to)

        if conditions:
            stmt = stmt.where(and_(*conditions))
            count_stmt = count_stmt.where(and_(*conditions))

        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar_one()

        stmt = stmt.order_by(RevenueRecognition.recognition_date.desc())
        offset = (f.page - 1) * f.page_size
        stmt = stmt.offset(offset).limit(f.page_size)

        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def recognition_number_exists(self, number: str) -> bool:
        result = await self.db.execute(
            select(RevenueRecognition.id)
            .where(RevenueRecognition.recognition_number == number)
        )
        return result.scalar_one_or_none() is not None

    async def create_recognition(
        self, rec: RevenueRecognition,
    ) -> RevenueRecognition:
        self.db.add(rec)
        try:
            await self.db.flush()
            await self.db.refresh(rec)
            return rec
        except IntegrityError:
            await self.db.rollback()
            raise

    async def update_recognition(
        self, rec: RevenueRecognition, changes: dict,
    ) -> RevenueRecognition:
        for key, value in changes.items():
            setattr(rec, key, value)
        try:
            await self.db.flush()
            await self.db.refresh(rec)
            return rec
        except IntegrityError:
            await self.db.rollback()
            raise

    # ── Dashboard Aggregation ────────────────────────────────────────────────

    async def get_billing_dashboard(
        self, customer_id: int | None = None,
    ) -> dict:
        base_cond = [Invoice.is_active == True]
        if customer_id:
            base_cond.append(Invoice.customer_id == customer_id)

        total_invoiced_q = select(
            func.coalesce(func.sum(Invoice.total_amount), 0.0)
        ).where(
            and_(*base_cond, Invoice.status.notin_(["draft", "cancelled", "voided"]))
        )

        total_paid_q = select(
            func.coalesce(func.sum(Invoice.amount_paid), 0.0)
        ).where(and_(*base_cond))

        total_overdue_q = select(
            func.coalesce(func.sum(Invoice.balance_due), 0.0)
        ).where(and_(*base_cond, Invoice.status == "overdue"))

        total_outstanding_q = select(
            func.coalesce(func.sum(Invoice.balance_due), 0.0)
        ).where(
            and_(
                *base_cond,
                Invoice.status.in_(["issued", "sent", "partially_paid", "overdue"]),
            )
        )

        invoice_count_q = select(func.count(Invoice.id)).where(and_(*base_cond))

        pay_cond = []
        if customer_id:
            pay_cond.append(Payment.customer_id == customer_id)
        payment_count_q = select(func.count(Payment.id))
        if pay_cond:
            payment_count_q = payment_count_q.where(and_(*pay_cond))

        r1 = await self.db.execute(total_invoiced_q)
        r2 = await self.db.execute(total_paid_q)
        r3 = await self.db.execute(total_outstanding_q)
        r4 = await self.db.execute(total_overdue_q)
        r5 = await self.db.execute(invoice_count_q)
        r6 = await self.db.execute(payment_count_q)

        return {
            "total_invoiced": float(r1.scalar_one()),
            "total_paid": float(r2.scalar_one()),
            "total_outstanding": float(r3.scalar_one()),
            "total_overdue": float(r4.scalar_one()),
            "invoice_count": int(r5.scalar_one()),
            "payment_count": int(r6.scalar_one()),
        }
