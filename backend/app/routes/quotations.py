import logging
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.models.activity_log import ActionType, EntityType
from app.models.user import User
from app.schemas.quotation import (
    ApproveAction,
    ConvertAction,
    QuotationCreate,
    QuotationDetail,
    QuotationItemBulkItem,
    QuotationItemCreate,
    QuotationItemOut,
    QuotationItemUpdate,
    QuotationListResponse,
    QuotationOut,
    QuotationStatusHistoryOut,
    QuotationApprovalOut,
    QuotationUpdate,
    WorkflowAction,
)
from app.services.activity_log_service import ActivityLogService
from app.services.quotation_service import QuotationService
from app.services.quotation_workflow_service import QuotationWorkflowService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quotations", tags=["Quotations"])


# =============================================================================
# Quotation CRUD
# =============================================================================


@router.get("/", response_model=QuotationListResponse, summary="List quotations")
async def list_quotations(
    q: str | None = Query(default=None, description="Search number, title"),
    status: str | None = Query(default=None, alias="status"),
    quotation_type: str | None = None,
    customer_id: int | None = None,
    lead_id: int | None = None,
    assigned_to: int | None = None,
    is_active: bool | None = True,
    created_from: date | None = None,
    created_to: date | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort: str = Query(
        default="created_at",
        pattern="^(created_at|updated_at|total_amount|valid_until|quotation_number|status)$",
    ),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_READ),
):
    return await QuotationService(db).list_quotations(
        q=q, status_filter=status, quotation_type=quotation_type,
        customer_id=customer_id, lead_id=lead_id, assigned_to=assigned_to,
        is_active=is_active, created_from=created_from, created_to=created_to,
        page=page, page_size=page_size, sort=sort, order=order,
    )


@router.get("/{quotation_id}", response_model=QuotationDetail, summary="Get quotation detail")
async def get_quotation(
    quotation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_READ),
):
    return await QuotationService(db).get_quotation(quotation_id)


@router.post(
    "/",
    response_model=QuotationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create draft quotation",
)
async def create_quotation(
    data: QuotationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_CREATE),
):
    quotation = await QuotationService(db).create_quotation(data, created_by=current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.QUOTATION_CREATED,
        entity_type=EntityType.QUOTATION,
        entity_id=quotation.id,
        details={
            "quotation_number": quotation.quotation_number,
            "type": quotation.quotation_type,
            "title": quotation.title,
        },
    )
    return QuotationOut.model_validate(quotation)


@router.put("/{quotation_id}", response_model=QuotationOut, summary="Update draft quotation")
async def update_quotation(
    quotation_id: int,
    data: QuotationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_UPDATE),
):
    quotation = await QuotationService(db).update_quotation(
        quotation_id, data, updated_by=current_user.id,
    )
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.QUOTATION_UPDATED,
        entity_type=EntityType.QUOTATION,
        entity_id=quotation.id,
        details={
            "quotation_number": quotation.quotation_number,
            "changed_fields": list(data.model_dump(exclude_unset=True).keys()),
        },
    )
    return QuotationOut.model_validate(quotation)


@router.delete(
    "/{quotation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete draft quotation",
)
async def delete_quotation(
    quotation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_DELETE),
):
    svc = QuotationService(db)
    detail = await svc.get_quotation(quotation_id)
    number = detail.quotation_number
    await svc.delete_quotation(quotation_id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.QUOTATION_DELETED,
        entity_type=EntityType.QUOTATION,
        entity_id=quotation_id,
        details={"quotation_number": number},
    )


# =============================================================================
# Line Items
# =============================================================================


@router.get(
    "/{quotation_id}/items",
    response_model=list[QuotationItemOut],
    summary="List line items",
)
async def list_items(
    quotation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_READ),
):
    detail = await QuotationService(db).get_quotation(quotation_id)
    return detail.items


@router.post(
    "/{quotation_id}/items",
    response_model=QuotationItemOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add line item",
)
async def add_item(
    quotation_id: int,
    data: QuotationItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_UPDATE),
):
    item = await QuotationService(db).add_item(quotation_id, data)
    return QuotationItemOut.model_validate(item)


@router.put(
    "/{quotation_id}/items/bulk",
    response_model=list[QuotationItemOut],
    summary="Replace all line items in one transaction (Excel-grid editor save)",
)
async def bulk_replace_items(
    quotation_id: int,
    data: list[QuotationItemBulkItem],
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_UPDATE),
):
    items = await QuotationService(db).bulk_replace_items(quotation_id, data)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.QUOTATION_UPDATED,
        entity_type=EntityType.QUOTATION,
        entity_id=quotation_id,
        details={"bulk_items_replaced": len(items)},
    )
    return [QuotationItemOut.model_validate(i) for i in items]


@router.put(
    "/{quotation_id}/items/{item_id}",
    response_model=QuotationItemOut,
    summary="Update line item",
)
async def update_item(
    quotation_id: int,
    item_id: int,
    data: QuotationItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_UPDATE),
):
    item = await QuotationService(db).update_item(quotation_id, item_id, data)
    return QuotationItemOut.model_validate(item)


@router.delete(
    "/{quotation_id}/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove line item",
)
async def delete_item(
    quotation_id: int,
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_UPDATE),
):
    await QuotationService(db).delete_item(quotation_id, item_id)


# =============================================================================
# Workflow Actions
# =============================================================================


@router.post("/{quotation_id}/submit", response_model=QuotationOut, summary="Submit for review")
async def submit_quotation(
    quotation_id: int,
    body: WorkflowAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_UPDATE),
):
    reason = body.reason if body else None
    quotation = await QuotationWorkflowService(db).submit(quotation_id, reason, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.QUOTATION_SUBMITTED,
        entity_type=EntityType.QUOTATION,
        entity_id=quotation.id,
        details={"quotation_number": quotation.quotation_number, "total_amount": quotation.total_amount},
    )
    return QuotationOut.model_validate(quotation)


@router.post("/{quotation_id}/approve", response_model=QuotationOut, summary="Approve quotation")
async def approve_quotation(
    quotation_id: int,
    body: ApproveAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_APPROVE),
):
    reason = body.reason if body else None
    conditions = body.conditions if body else None
    quotation = await QuotationWorkflowService(db).approve(
        quotation_id, reason, conditions, current_user.id,
    )
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.QUOTATION_APPROVED,
        entity_type=EntityType.QUOTATION,
        entity_id=quotation.id,
        details={"quotation_number": quotation.quotation_number, "reason": reason},
    )
    return QuotationOut.model_validate(quotation)


@router.post("/{quotation_id}/reject", response_model=QuotationOut, summary="Request revision")
async def reject_quotation(
    quotation_id: int,
    body: WorkflowAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_APPROVE),
):
    reason = body.reason if body else None
    quotation = await QuotationWorkflowService(db).reject(quotation_id, reason, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.QUOTATION_REVISION_REQUESTED,
        entity_type=EntityType.QUOTATION,
        entity_id=quotation.id,
        details={"quotation_number": quotation.quotation_number, "reason": reason},
    )
    return QuotationOut.model_validate(quotation)


@router.post("/{quotation_id}/send", response_model=QuotationOut, summary="Send to customer")
async def send_quotation(
    quotation_id: int,
    body: WorkflowAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_UPDATE),
):
    reason = body.reason if body else None
    quotation = await QuotationWorkflowService(db).send(quotation_id, reason, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.QUOTATION_SENT,
        entity_type=EntityType.QUOTATION,
        entity_id=quotation.id,
        details={"quotation_number": quotation.quotation_number},
    )
    return QuotationOut.model_validate(quotation)


@router.post("/{quotation_id}/accept", response_model=QuotationOut, summary="Mark accepted")
async def accept_quotation(
    quotation_id: int,
    body: WorkflowAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_UPDATE),
):
    reason = body.reason if body else None
    quotation = await QuotationWorkflowService(db).accept(quotation_id, reason, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.QUOTATION_ACCEPTED,
        entity_type=EntityType.QUOTATION,
        entity_id=quotation.id,
        details={"quotation_number": quotation.quotation_number, "total_amount": quotation.total_amount},
    )
    return QuotationOut.model_validate(quotation)


@router.post("/{quotation_id}/decline", response_model=QuotationOut, summary="Mark rejected")
async def decline_quotation(
    quotation_id: int,
    body: WorkflowAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_UPDATE),
):
    reason = body.reason if body else None
    quotation = await QuotationWorkflowService(db).decline(quotation_id, reason, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.QUOTATION_DECLINED,
        entity_type=EntityType.QUOTATION,
        entity_id=quotation.id,
        details={"quotation_number": quotation.quotation_number, "reason": reason},
    )
    return QuotationOut.model_validate(quotation)


@router.post("/{quotation_id}/convert", response_model=QuotationOut, summary="Convert to order")
async def convert_quotation(
    quotation_id: int,
    body: ConvertAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_CONVERT),
):
    quotation = await QuotationWorkflowService(db).convert(
        quotation_id, body.converted_to_type, body.notes, current_user.id,
    )
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.QUOTATION_CONVERTED,
        entity_type=EntityType.QUOTATION,
        entity_id=quotation.id,
        details={
            "quotation_number": quotation.quotation_number,
            "converted_to_type": body.converted_to_type,
        },
    )
    return QuotationOut.model_validate(quotation)


@router.post("/{quotation_id}/cancel", response_model=QuotationOut, summary="Cancel quotation")
async def cancel_quotation(
    quotation_id: int,
    body: WorkflowAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_UPDATE),
):
    reason = body.reason if body else None
    quotation = await QuotationWorkflowService(db).cancel(quotation_id, reason, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.QUOTATION_CANCELLED,
        entity_type=EntityType.QUOTATION,
        entity_id=quotation.id,
        details={"quotation_number": quotation.quotation_number, "reason": reason},
    )
    return QuotationOut.model_validate(quotation)


@router.post(
    "/{quotation_id}/reactivate",
    response_model=QuotationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Reactivate expired quotation",
)
async def reactivate_quotation(
    quotation_id: int,
    body: WorkflowAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_UPDATE),
):
    reason = body.reason if body else None
    quotation = await QuotationWorkflowService(db).reactivate(quotation_id, reason, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.QUOTATION_REACTIVATED,
        entity_type=EntityType.QUOTATION,
        entity_id=quotation.id,
        details={
            "quotation_number": quotation.quotation_number,
            "new_revision": quotation.revision_number,
        },
    )
    return QuotationOut.model_validate(quotation)


# =============================================================================
# Sub-Resources (read-only)
# =============================================================================


@router.get(
    "/{quotation_id}/status-history",
    response_model=list[QuotationStatusHistoryOut],
    summary="Status audit trail",
)
async def list_status_history(
    quotation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_READ),
):
    detail = await QuotationService(db).get_quotation(quotation_id)
    return detail.recent_status_history


@router.get(
    "/{quotation_id}/approvals",
    response_model=list[QuotationApprovalOut],
    summary="Approval decision log",
)
async def list_approvals(
    quotation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.QUOTATION_READ),
):
    detail = await QuotationService(db).get_quotation(quotation_id)
    return detail.recent_approvals
