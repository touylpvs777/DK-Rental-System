import logging
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.models.activity_log import ActionType, EntityType
from app.models.user import User
from app.schemas.receipt import (
    ReceiptCreate,
    ReceiptDetail,
    ReceiptListResponse,
    ReceiptOut,
    ReceiptStatusHistoryOut,
    ReceiptUpdate,
    WorkflowAction,
)
from app.services.activity_log_service import ActivityLogService
from app.services.receipt_service import ReceiptService
from app.services.receipt_workflow_service import ReceiptWorkflowService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/receipts", tags=["Receipts"])


# =============================================================================
# Receipt CRUD
# =============================================================================


@router.get("/", response_model=ReceiptListResponse, summary="List receipts")
async def list_receipts(
    q: str | None = Query(default=None, description="Search receipt number"),
    status: str | None = Query(default=None, alias="status"),
    customer_id: int | None = None,
    invoice_id: int | None = None,
    assigned_to: int | None = None,
    is_active: bool | None = True,
    created_from: date | None = None,
    created_to: date | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort: str = Query(
        default="created_at",
        pattern="^(created_at|updated_at|payment_date|receipt_number|status|amount_received)$",
    ),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RECEIPT_READ),
):
    return await ReceiptService(db).list_receipts(
        q=q, status_filter=status, customer_id=customer_id, invoice_id=invoice_id,
        assigned_to=assigned_to, is_active=is_active, created_from=created_from,
        created_to=created_to, page=page, page_size=page_size, sort=sort, order=order,
    )


@router.get("/{receipt_id}", response_model=ReceiptDetail, summary="Get receipt detail")
async def get_receipt(
    receipt_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RECEIPT_READ),
):
    return await ReceiptService(db).get_receipt(receipt_id)


@router.post(
    "/",
    response_model=ReceiptOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create draft receipt",
)
async def create_receipt(
    data: ReceiptCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RECEIPT_CREATE),
):
    receipt = await ReceiptService(db).create_receipt(data, created_by=current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RECEIPT_CREATED,
        entity_type=EntityType.RECEIPT,
        entity_id=receipt.id,
        details={"receipt_number": receipt.receipt_number, "invoice_id": receipt.invoice_id},
    )
    return ReceiptOut.model_validate(receipt)


@router.put("/{receipt_id}", response_model=ReceiptOut, summary="Update draft receipt")
async def update_receipt(
    receipt_id: int,
    data: ReceiptUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RECEIPT_UPDATE),
):
    receipt = await ReceiptService(db).update_receipt(receipt_id, data, updated_by=current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RECEIPT_UPDATED,
        entity_type=EntityType.RECEIPT,
        entity_id=receipt.id,
        details={
            "receipt_number": receipt.receipt_number,
            "changed_fields": list(data.model_dump(exclude_unset=True).keys()),
        },
    )
    return ReceiptOut.model_validate(receipt)


@router.delete(
    "/{receipt_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete draft receipt",
)
async def delete_receipt(
    receipt_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RECEIPT_DELETE),
):
    svc = ReceiptService(db)
    detail = await svc.get_receipt(receipt_id)
    number = detail.receipt_number
    await svc.delete_receipt(receipt_id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RECEIPT_DELETED,
        entity_type=EntityType.RECEIPT,
        entity_id=receipt_id,
        details={"receipt_number": number},
    )


# =============================================================================
# Workflow Actions
# =============================================================================


@router.post("/{receipt_id}/confirm", response_model=ReceiptOut, summary="Confirm receipt")
async def confirm_receipt(
    receipt_id: int,
    body: WorkflowAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RECEIPT_UPDATE),
):
    reason = body.reason if body else None
    receipt = await ReceiptWorkflowService(db).confirm(receipt_id, reason, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RECEIPT_CONFIRMED,
        entity_type=EntityType.RECEIPT,
        entity_id=receipt.id,
        details={"receipt_number": receipt.receipt_number},
    )
    return ReceiptOut.model_validate(receipt)


@router.post("/{receipt_id}/cancel", response_model=ReceiptOut, summary="Cancel receipt")
async def cancel_receipt(
    receipt_id: int,
    body: WorkflowAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RECEIPT_UPDATE),
):
    reason = body.reason if body else None
    receipt = await ReceiptWorkflowService(db).cancel(receipt_id, reason, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.RECEIPT_CANCELLED,
        entity_type=EntityType.RECEIPT,
        entity_id=receipt.id,
        details={"receipt_number": receipt.receipt_number, "reason": reason},
    )
    return ReceiptOut.model_validate(receipt)


# =============================================================================
# Sub-Resources (read-only)
# =============================================================================


@router.get(
    "/{receipt_id}/status-history",
    response_model=list[ReceiptStatusHistoryOut],
    summary="Status audit trail",
)
async def list_status_history(
    receipt_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RECEIPT_READ),
):
    detail = await ReceiptService(db).get_receipt(receipt_id)
    return detail.recent_status_history
