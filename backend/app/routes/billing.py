import logging
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.models.activity_log import ActionType, EntityType
from app.models.user import User
from app.schemas.billing import (
    BillingDashboardSummary,
    DepositApplyAction, DepositCreate, DepositForfeitAction,
    DepositListResponse, DepositOut, DepositReceiveAction, DepositRefundAction,
    InvoiceCancelAction, InvoiceCreate, InvoiceDetail,
    InvoiceFromCyclesRequest, InvoiceIssueAction,
    InvoiceListResponse, InvoiceOut, InvoiceSendAction, InvoiceUpdate,
    PaymentAllocationCreate, PaymentAllocationOut,
    PaymentConfirmAction, PaymentCreate, PaymentListResponse,
    PaymentOut, PaymentRejectAction,
    RevenueRecognitionCreate, RevenueRecognitionListResponse,
    RevenueRecognitionOut,
)
from app.schemas.rental import RentalBillingCycleOut
from app.services.activity_log_service import ActivityLogService
from app.services.billing_service import BillingService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["Billing & Payments"])


# =============================================================================
# Invoice Endpoints
# =============================================================================


@router.get(
    "/invoices",
    response_model=InvoiceListResponse,
    summary="List invoices",
)
async def list_invoices(
    q: str | None = Query(default=None, description="Search invoice number"),
    status: str | None = Query(default=None, alias="status"),
    customer_id: int | None = None,
    contract_id: int | None = None,
    is_active: bool | None = True,
    issue_from: date | None = None,
    issue_to: date | None = None,
    due_from: date | None = None,
    due_to: date | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort: str = Query(
        default="created_at",
        pattern="^(created_at|updated_at|issue_date|due_date|total_amount|invoice_number|status)$",
    ),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.BILLING_READ),
):
    return await BillingService(db).list_invoices(
        q=q, status_filter=status, customer_id=customer_id,
        contract_id=contract_id, is_active=is_active,
        issue_from=issue_from, issue_to=issue_to,
        due_from=due_from, due_to=due_to,
        page=page, page_size=page_size, sort=sort, order=order,
    )


@router.get(
    "/invoices/{invoice_id}",
    response_model=InvoiceDetail,
    summary="Get invoice detail",
)
async def get_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.BILLING_READ),
):
    return await BillingService(db).get_invoice(invoice_id)


@router.post(
    "/invoices",
    response_model=InvoiceOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create invoice",
)
async def create_invoice(
    data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.BILLING_CREATE),
):
    invoice = await BillingService(db).create_invoice(data, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.INVOICE_CREATED,
        entity_type=EntityType.INVOICE,
        entity_id=invoice.id,
        details={"invoice_number": invoice.invoice_number},
    )
    return invoice


@router.put(
    "/invoices/{invoice_id}",
    response_model=InvoiceOut,
    summary="Update invoice",
)
async def update_invoice(
    invoice_id: int,
    data: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.BILLING_UPDATE),
):
    invoice = await BillingService(db).update_invoice(
        invoice_id, data, current_user.id,
    )
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.INVOICE_UPDATED,
        entity_type=EntityType.INVOICE,
        entity_id=invoice.id,
        details={"changed_fields": list(data.model_dump(exclude_unset=True).keys())},
    )
    return invoice


@router.post(
    "/invoices/{invoice_id}/issue",
    response_model=InvoiceOut,
    summary="Issue invoice",
)
async def issue_invoice(
    invoice_id: int,
    data: InvoiceIssueAction = InvoiceIssueAction(),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.BILLING_UPDATE),
):
    invoice = await BillingService(db).issue_invoice(
        invoice_id, data, current_user.id,
    )
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.INVOICE_ISSUED,
        entity_type=EntityType.INVOICE,
        entity_id=invoice.id,
        details={"invoice_number": invoice.invoice_number},
    )
    return invoice


@router.post(
    "/invoices/{invoice_id}/send",
    response_model=InvoiceOut,
    summary="Send invoice",
)
async def send_invoice(
    invoice_id: int,
    data: InvoiceSendAction = InvoiceSendAction(),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.BILLING_UPDATE),
):
    invoice = await BillingService(db).send_invoice(
        invoice_id, data, current_user.id,
    )
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.INVOICE_SENT,
        entity_type=EntityType.INVOICE,
        entity_id=invoice.id,
        details={"invoice_number": invoice.invoice_number},
    )
    return invoice


@router.post(
    "/invoices/{invoice_id}/cancel",
    response_model=InvoiceOut,
    summary="Cancel invoice",
)
async def cancel_invoice(
    invoice_id: int,
    data: InvoiceCancelAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.BILLING_UPDATE),
):
    invoice = await BillingService(db).cancel_invoice(
        invoice_id, data, current_user.id,
    )
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.INVOICE_CANCELLED,
        entity_type=EntityType.INVOICE,
        entity_id=invoice.id,
        details={"reason": data.cancellation_reason},
    )
    return invoice


@router.post(
    "/invoices/{invoice_id}/void",
    response_model=InvoiceOut,
    summary="Void invoice",
)
async def void_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.BILLING_APPROVE),
):
    invoice = await BillingService(db).void_invoice(invoice_id, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.INVOICE_VOIDED,
        entity_type=EntityType.INVOICE,
        entity_id=invoice.id,
        details={"invoice_number": invoice.invoice_number},
    )
    return invoice


@router.post(
    "/invoices/from-billing-cycles",
    response_model=InvoiceOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create invoice from billing cycles",
)
async def create_invoice_from_cycles(
    data: InvoiceFromCyclesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.BILLING_CREATE),
):
    invoice = await BillingService(db).create_invoice_from_cycles(
        data, current_user.id,
    )
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.INVOICE_CREATED,
        entity_type=EntityType.INVOICE,
        entity_id=invoice.id,
        details={
            "invoice_number": invoice.invoice_number,
            "from_billing_cycles": data.billing_cycle_ids,
        },
    )
    return invoice


# =============================================================================
# Payment Endpoints
# =============================================================================


@router.get(
    "/payments",
    response_model=PaymentListResponse,
    summary="List payments",
)
async def list_payments(
    q: str | None = Query(default=None, description="Search payment/reference number"),
    customer_id: int | None = None,
    contract_id: int | None = None,
    payment_status: str | None = None,
    payment_method: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort: str = Query(
        default="created_at",
        pattern="^(created_at|payment_date|amount|payment_number)$",
    ),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.BILLING_READ),
):
    return await BillingService(db).list_payments(
        q=q, customer_id=customer_id, contract_id=contract_id,
        payment_status=payment_status, payment_method=payment_method,
        date_from=date_from, date_to=date_to,
        page=page, page_size=page_size, sort=sort, order=order,
    )


@router.get(
    "/payments/{payment_id}",
    response_model=PaymentOut,
    summary="Get payment detail",
)
async def get_payment(
    payment_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.BILLING_READ),
):
    return await BillingService(db).get_payment(payment_id)


@router.post(
    "/payments",
    response_model=PaymentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Record payment",
)
async def record_payment(
    data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.BILLING_CREATE),
):
    payment = await BillingService(db).record_payment(data, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.PAYMENT_RECORDED,
        entity_type=EntityType.PAYMENT,
        entity_id=payment.id,
        details={"payment_number": payment.payment_number, "amount": payment.amount},
    )
    return payment


@router.post(
    "/payments/{payment_id}/confirm",
    response_model=PaymentOut,
    summary="Confirm payment",
)
async def confirm_payment(
    payment_id: int,
    data: PaymentConfirmAction = PaymentConfirmAction(),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.BILLING_APPROVE),
):
    payment = await BillingService(db).confirm_payment(payment_id, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.PAYMENT_CONFIRMED,
        entity_type=EntityType.PAYMENT,
        entity_id=payment.id,
        details={"payment_number": payment.payment_number},
    )
    return payment


@router.post(
    "/payments/{payment_id}/reject",
    response_model=PaymentOut,
    summary="Reject payment",
)
async def reject_payment(
    payment_id: int,
    data: PaymentRejectAction = PaymentRejectAction(),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.BILLING_APPROVE),
):
    payment = await BillingService(db).reject_payment(
        payment_id, current_user.id, data.reason,
    )
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.PAYMENT_REJECTED,
        entity_type=EntityType.PAYMENT,
        entity_id=payment.id,
        details={"payment_number": payment.payment_number},
    )
    return payment


@router.post(
    "/payments/{payment_id}/allocate",
    response_model=PaymentAllocationOut,
    summary="Allocate payment to invoice",
)
async def allocate_payment(
    payment_id: int,
    data: PaymentAllocationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.BILLING_UPDATE),
):
    data.payment_id = payment_id
    alloc = await BillingService(db).allocate_payment(data, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.PAYMENT_ALLOCATED,
        entity_type=EntityType.PAYMENT,
        entity_id=payment_id,
        details={"invoice_id": data.invoice_id, "amount": data.allocated_amount},
    )
    return alloc


# =============================================================================
# Deposit Endpoints
# =============================================================================


@router.get(
    "/deposits",
    response_model=DepositListResponse,
    summary="List deposits",
)
async def list_deposits(
    customer_id: int | None = None,
    contract_id: int | None = None,
    deposit_status: str | None = None,
    deposit_type: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.BILLING_READ),
):
    return await BillingService(db).list_deposits(
        customer_id=customer_id, contract_id=contract_id,
        deposit_status=deposit_status, deposit_type=deposit_type,
        page=page, page_size=page_size,
    )


@router.get(
    "/deposits/{deposit_id}",
    response_model=DepositOut,
    summary="Get deposit detail",
)
async def get_deposit(
    deposit_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.BILLING_READ),
):
    return await BillingService(db).get_deposit(deposit_id)


@router.post(
    "/deposits",
    response_model=DepositOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create deposit",
)
async def create_deposit(
    data: DepositCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.BILLING_CREATE),
):
    deposit = await BillingService(db).create_deposit(data, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.DEPOSIT_CREATED,
        entity_type=EntityType.DEPOSIT,
        entity_id=deposit.id,
        details={"deposit_number": deposit.deposit_number, "amount": deposit.amount},
    )
    return deposit


@router.post(
    "/deposits/{deposit_id}/receive",
    response_model=DepositOut,
    summary="Mark deposit as received",
)
async def receive_deposit(
    deposit_id: int,
    data: DepositReceiveAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.BILLING_UPDATE),
):
    deposit = await BillingService(db).receive_deposit(
        deposit_id, data, current_user.id,
    )
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.DEPOSIT_RECEIVED,
        entity_type=EntityType.DEPOSIT,
        entity_id=deposit.id,
        details={"deposit_number": deposit.deposit_number},
    )
    return deposit


@router.post(
    "/deposits/{deposit_id}/refund",
    response_model=DepositOut,
    summary="Refund deposit",
)
async def refund_deposit(
    deposit_id: int,
    data: DepositRefundAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.BILLING_UPDATE),
):
    deposit = await BillingService(db).refund_deposit(
        deposit_id, data, current_user.id,
    )
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.DEPOSIT_REFUNDED,
        entity_type=EntityType.DEPOSIT,
        entity_id=deposit.id,
        details={"refund_amount": data.refund_amount},
    )
    return deposit


@router.post(
    "/deposits/{deposit_id}/forfeit",
    response_model=DepositOut,
    summary="Forfeit deposit",
)
async def forfeit_deposit(
    deposit_id: int,
    data: DepositForfeitAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.BILLING_APPROVE),
):
    deposit = await BillingService(db).forfeit_deposit(
        deposit_id, data, current_user.id,
    )
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.DEPOSIT_FORFEITED,
        entity_type=EntityType.DEPOSIT,
        entity_id=deposit.id,
        details={"forfeit_amount": data.forfeit_amount},
    )
    return deposit


@router.post(
    "/deposits/{deposit_id}/apply",
    response_model=DepositOut,
    summary="Apply deposit to invoice",
)
async def apply_deposit(
    deposit_id: int,
    data: DepositApplyAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.BILLING_UPDATE),
):
    deposit = await BillingService(db).apply_deposit(
        deposit_id, data, current_user.id,
    )
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.DEPOSIT_APPLIED,
        entity_type=EntityType.DEPOSIT,
        entity_id=deposit.id,
        details={"apply_amount": data.apply_amount, "invoice_id": data.invoice_id},
    )
    return deposit


# =============================================================================
# Revenue Recognition Endpoints
# =============================================================================


@router.get(
    "/revenue-recognitions",
    response_model=RevenueRecognitionListResponse,
    summary="List revenue recognitions",
)
async def list_recognitions(
    contract_id: int | None = None,
    recognition_type: str | None = None,
    recognition_status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.BILLING_READ),
):
    return await BillingService(db).list_recognitions(
        contract_id=contract_id, recognition_type=recognition_type,
        recognition_status=recognition_status,
        date_from=date_from, date_to=date_to,
        page=page, page_size=page_size,
    )


@router.post(
    "/revenue-recognitions",
    response_model=RevenueRecognitionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create revenue recognition",
)
async def create_recognition(
    data: RevenueRecognitionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.BILLING_CREATE),
):
    rec = await BillingService(db).create_recognition(data, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.REVENUE_RECOGNIZED,
        entity_type=EntityType.REVENUE_RECOGNITION,
        entity_id=rec.id,
        details={"recognition_number": rec.recognition_number},
    )
    return rec


@router.post(
    "/revenue-recognitions/{recognition_id}/recognize",
    response_model=RevenueRecognitionOut,
    summary="Mark revenue as recognized",
)
async def recognize_revenue(
    recognition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.BILLING_APPROVE),
):
    rec = await BillingService(db).recognize(recognition_id, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.REVENUE_RECOGNIZED,
        entity_type=EntityType.REVENUE_RECOGNITION,
        entity_id=rec.id,
        details={"recognition_number": rec.recognition_number},
    )
    return rec


@router.post(
    "/revenue-recognitions/{recognition_id}/reverse",
    response_model=RevenueRecognitionOut,
    summary="Reverse revenue recognition",
)
async def reverse_revenue(
    recognition_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.BILLING_APPROVE),
):
    rec = await BillingService(db).reverse_recognition(
        recognition_id, current_user.id,
    )
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.REVENUE_REVERSED,
        entity_type=EntityType.REVENUE_RECOGNITION,
        entity_id=rec.id,
        details={"recognition_number": rec.recognition_number},
    )
    return rec


# =============================================================================
# Dashboard
# =============================================================================


@router.get(
    "/summary",
    response_model=BillingDashboardSummary,
    summary="Billing dashboard summary",
)
async def billing_summary(
    customer_id: int | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.BILLING_READ),
):
    return await BillingService(db).get_billing_summary(customer_id)


# =============================================================================
# Workflow Automation
# =============================================================================


@router.post(
    "/contracts/{contract_id}/generate-cycles",
    response_model=list[RentalBillingCycleOut],
    summary="Generate next billing cycles for a contract",
)
async def generate_billing_cycles(
    contract_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.BILLING_CREATE),
):
    cycles = await BillingService(db).generate_next_billing_cycles(
        contract_id, current_user.id,
    )
    if cycles:
        await ActivityLogService(db).log(
            user_id=current_user.id,
            action=ActionType.RENTAL_BILLING_CREATED,
            entity_type=EntityType.RENTAL_CONTRACT,
            entity_id=contract_id,
            details={"cycles_generated": len(cycles)},
        )
    return [RentalBillingCycleOut.model_validate(c) for c in cycles]


@router.post(
    "/invoices/mark-overdue",
    summary="Mark overdue invoices and billing cycles",
)
async def mark_overdue(
    db: AsyncSession = Depends(get_db),
    _: User = require_permission(PermissionName.BILLING_UPDATE),
):
    count = await BillingService(db).mark_overdue_invoices()
    return {"marked_overdue": count}
