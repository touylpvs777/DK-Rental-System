import logging
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.models.activity_log import ActionType, EntityType
from app.models.user import User
from app.schemas.delivery_note import (
    DeliveryNoteCreate,
    DeliveryNoteDetail,
    DeliveryNoteItemBulkItem,
    DeliveryNoteItemCreate,
    DeliveryNoteItemOut,
    DeliveryNoteListResponse,
    DeliveryNoteOut,
    DeliveryNoteStatusHistoryOut,
    DeliveryNoteUpdate,
    WorkflowAction,
)
from app.services.activity_log_service import ActivityLogService
from app.services.delivery_note_service import DeliveryNoteService
from app.services.delivery_note_workflow_service import DeliveryNoteWorkflowService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/delivery-notes", tags=["Delivery Notes"])


# =============================================================================
# Delivery Note CRUD
# =============================================================================


@router.get("/", response_model=DeliveryNoteListResponse, summary="List delivery notes")
async def list_delivery_notes(
    q: str | None = Query(default=None, description="Search DN number"),
    status: str | None = Query(default=None, alias="status"),
    customer_id: int | None = None,
    sales_order_id: int | None = None,
    assigned_to: int | None = None,
    is_active: bool | None = True,
    created_from: date | None = None,
    created_to: date | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort: str = Query(
        default="created_at",
        pattern="^(created_at|updated_at|delivery_date|dn_number|status)$",
    ),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.DELIVERY_NOTE_READ),
):
    return await DeliveryNoteService(db).list_delivery_notes(
        q=q, status_filter=status, customer_id=customer_id, sales_order_id=sales_order_id,
        assigned_to=assigned_to, is_active=is_active, created_from=created_from,
        created_to=created_to, page=page, page_size=page_size, sort=sort, order=order,
    )


@router.get("/{delivery_note_id}", response_model=DeliveryNoteDetail, summary="Get delivery note detail")
async def get_delivery_note(
    delivery_note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.DELIVERY_NOTE_READ),
):
    return await DeliveryNoteService(db).get_delivery_note(delivery_note_id)


@router.post(
    "/",
    response_model=DeliveryNoteOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create draft delivery note",
)
async def create_delivery_note(
    data: DeliveryNoteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.DELIVERY_NOTE_CREATE),
):
    delivery_note = await DeliveryNoteService(db).create_delivery_note(data, created_by=current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.DELIVERY_NOTE_CREATED,
        entity_type=EntityType.DELIVERY_NOTE,
        entity_id=delivery_note.id,
        details={"dn_number": delivery_note.dn_number, "sales_order_id": delivery_note.sales_order_id},
    )
    return DeliveryNoteOut.model_validate(delivery_note)


@router.put("/{delivery_note_id}", response_model=DeliveryNoteOut, summary="Update draft delivery note")
async def update_delivery_note(
    delivery_note_id: int,
    data: DeliveryNoteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.DELIVERY_NOTE_UPDATE),
):
    delivery_note = await DeliveryNoteService(db).update_delivery_note(
        delivery_note_id, data, updated_by=current_user.id,
    )
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.DELIVERY_NOTE_UPDATED,
        entity_type=EntityType.DELIVERY_NOTE,
        entity_id=delivery_note.id,
        details={
            "dn_number": delivery_note.dn_number,
            "changed_fields": list(data.model_dump(exclude_unset=True).keys()),
        },
    )
    return DeliveryNoteOut.model_validate(delivery_note)


@router.delete(
    "/{delivery_note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete draft delivery note",
)
async def delete_delivery_note(
    delivery_note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.DELIVERY_NOTE_DELETE),
):
    svc = DeliveryNoteService(db)
    detail = await svc.get_delivery_note(delivery_note_id)
    number = detail.dn_number
    await svc.delete_delivery_note(delivery_note_id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.DELIVERY_NOTE_DELETED,
        entity_type=EntityType.DELIVERY_NOTE,
        entity_id=delivery_note_id,
        details={"dn_number": number},
    )


# =============================================================================
# Line Items
# =============================================================================


@router.get(
    "/{delivery_note_id}/items",
    response_model=list[DeliveryNoteItemOut],
    summary="List line items",
)
async def list_items(
    delivery_note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.DELIVERY_NOTE_READ),
):
    detail = await DeliveryNoteService(db).get_delivery_note(delivery_note_id)
    return detail.items


@router.post(
    "/{delivery_note_id}/items",
    response_model=DeliveryNoteItemOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add line item",
)
async def add_item(
    delivery_note_id: int,
    data: DeliveryNoteItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.DELIVERY_NOTE_UPDATE),
):
    item = await DeliveryNoteService(db).add_item(delivery_note_id, data)
    return DeliveryNoteItemOut.model_validate(item)


@router.put(
    "/{delivery_note_id}/items/bulk",
    response_model=list[DeliveryNoteItemOut],
    summary="Replace all line items in one transaction (Excel-grid editor save)",
)
async def bulk_replace_items(
    delivery_note_id: int,
    data: list[DeliveryNoteItemBulkItem],
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.DELIVERY_NOTE_UPDATE),
):
    items = await DeliveryNoteService(db).bulk_replace_items(delivery_note_id, data)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.DELIVERY_NOTE_UPDATED,
        entity_type=EntityType.DELIVERY_NOTE,
        entity_id=delivery_note_id,
        details={"bulk_items_replaced": len(items)},
    )
    return [DeliveryNoteItemOut.model_validate(i) for i in items]


@router.delete(
    "/{delivery_note_id}/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove line item",
)
async def delete_item(
    delivery_note_id: int,
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.DELIVERY_NOTE_UPDATE),
):
    await DeliveryNoteService(db).delete_item(delivery_note_id, item_id)


# =============================================================================
# Workflow Actions
# =============================================================================


@router.post("/{delivery_note_id}/dispatch", response_model=DeliveryNoteOut, summary="Dispatch delivery note")
async def dispatch_delivery_note(
    delivery_note_id: int,
    body: WorkflowAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.DELIVERY_NOTE_UPDATE),
):
    reason = body.reason if body else None
    delivery_note = await DeliveryNoteWorkflowService(db).dispatch(delivery_note_id, reason, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.DELIVERY_NOTE_DISPATCHED,
        entity_type=EntityType.DELIVERY_NOTE,
        entity_id=delivery_note.id,
        details={"dn_number": delivery_note.dn_number},
    )
    return DeliveryNoteOut.model_validate(delivery_note)


@router.post("/{delivery_note_id}/deliver", response_model=DeliveryNoteOut, summary="Mark delivered")
async def deliver_delivery_note(
    delivery_note_id: int,
    body: WorkflowAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.DELIVERY_NOTE_UPDATE),
):
    reason = body.reason if body else None
    delivery_note = await DeliveryNoteWorkflowService(db).deliver(delivery_note_id, reason, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.DELIVERY_NOTE_DELIVERED,
        entity_type=EntityType.DELIVERY_NOTE,
        entity_id=delivery_note.id,
        details={"dn_number": delivery_note.dn_number},
    )
    return DeliveryNoteOut.model_validate(delivery_note)


@router.post("/{delivery_note_id}/cancel", response_model=DeliveryNoteOut, summary="Cancel delivery note")
async def cancel_delivery_note(
    delivery_note_id: int,
    body: WorkflowAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.DELIVERY_NOTE_UPDATE),
):
    reason = body.reason if body else None
    delivery_note = await DeliveryNoteWorkflowService(db).cancel(delivery_note_id, reason, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.DELIVERY_NOTE_CANCELLED,
        entity_type=EntityType.DELIVERY_NOTE,
        entity_id=delivery_note.id,
        details={"dn_number": delivery_note.dn_number, "reason": reason},
    )
    return DeliveryNoteOut.model_validate(delivery_note)


# =============================================================================
# Sub-Resources (read-only)
# =============================================================================


@router.get(
    "/{delivery_note_id}/status-history",
    response_model=list[DeliveryNoteStatusHistoryOut],
    summary="Status audit trail",
)
async def list_status_history(
    delivery_note_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.DELIVERY_NOTE_READ),
):
    detail = await DeliveryNoteService(db).get_delivery_note(delivery_note_id)
    return detail.recent_status_history
