import logging
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.models.activity_log import ActionType, EntityType
from app.models.user import User
from app.schemas.sales_order import (
    SalesOrderCreate,
    SalesOrderDetail,
    SalesOrderItemBulkItem,
    SalesOrderItemCreate,
    SalesOrderItemOut,
    SalesOrderListResponse,
    SalesOrderOut,
    SalesOrderStatusHistoryOut,
    SalesOrderUpdate,
    WorkflowAction,
)
from app.services.activity_log_service import ActivityLogService
from app.services.sales_order_service import SalesOrderService
from app.services.sales_order_workflow_service import SalesOrderWorkflowService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sales-orders", tags=["Sales Orders"])


# =============================================================================
# Sales Order CRUD
# =============================================================================


@router.get("/", response_model=SalesOrderListResponse, summary="List sales orders")
async def list_sales_orders(
    q: str | None = Query(default=None, description="Search number, title"),
    status: str | None = Query(default=None, alias="status"),
    customer_id: int | None = None,
    quotation_id: int | None = None,
    assigned_to: int | None = None,
    is_active: bool | None = True,
    created_from: date | None = None,
    created_to: date | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort: str = Query(
        default="created_at",
        pattern="^(created_at|updated_at|total_amount|order_date|so_number|status)$",
    ),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.SALES_ORDER_READ),
):
    return await SalesOrderService(db).list_sales_orders(
        q=q, status_filter=status, customer_id=customer_id, quotation_id=quotation_id,
        assigned_to=assigned_to, is_active=is_active, created_from=created_from,
        created_to=created_to, page=page, page_size=page_size, sort=sort, order=order,
    )


@router.get("/{sales_order_id}", response_model=SalesOrderDetail, summary="Get sales order detail")
async def get_sales_order(
    sales_order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.SALES_ORDER_READ),
):
    return await SalesOrderService(db).get_sales_order(sales_order_id)


@router.post(
    "/",
    response_model=SalesOrderOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create draft sales order",
)
async def create_sales_order(
    data: SalesOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.SALES_ORDER_CREATE),
):
    sales_order = await SalesOrderService(db).create_sales_order(data, created_by=current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.SALES_ORDER_CREATED,
        entity_type=EntityType.SALES_ORDER,
        entity_id=sales_order.id,
        details={"so_number": sales_order.so_number, "title": sales_order.title},
    )
    return SalesOrderOut.model_validate(sales_order)


@router.put("/{sales_order_id}", response_model=SalesOrderOut, summary="Update draft sales order")
async def update_sales_order(
    sales_order_id: int,
    data: SalesOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.SALES_ORDER_UPDATE),
):
    sales_order = await SalesOrderService(db).update_sales_order(
        sales_order_id, data, updated_by=current_user.id,
    )
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.SALES_ORDER_UPDATED,
        entity_type=EntityType.SALES_ORDER,
        entity_id=sales_order.id,
        details={
            "so_number": sales_order.so_number,
            "changed_fields": list(data.model_dump(exclude_unset=True).keys()),
        },
    )
    return SalesOrderOut.model_validate(sales_order)


@router.delete(
    "/{sales_order_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete draft sales order",
)
async def delete_sales_order(
    sales_order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.SALES_ORDER_DELETE),
):
    svc = SalesOrderService(db)
    detail = await svc.get_sales_order(sales_order_id)
    number = detail.so_number
    await svc.delete_sales_order(sales_order_id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.SALES_ORDER_DELETED,
        entity_type=EntityType.SALES_ORDER,
        entity_id=sales_order_id,
        details={"so_number": number},
    )


# =============================================================================
# Line Items
# =============================================================================


@router.get(
    "/{sales_order_id}/items",
    response_model=list[SalesOrderItemOut],
    summary="List line items",
)
async def list_items(
    sales_order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.SALES_ORDER_READ),
):
    detail = await SalesOrderService(db).get_sales_order(sales_order_id)
    return detail.items


@router.post(
    "/{sales_order_id}/items",
    response_model=SalesOrderItemOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add line item",
)
async def add_item(
    sales_order_id: int,
    data: SalesOrderItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.SALES_ORDER_UPDATE),
):
    item = await SalesOrderService(db).add_item(sales_order_id, data)
    return SalesOrderItemOut.model_validate(item)


@router.put(
    "/{sales_order_id}/items/bulk",
    response_model=list[SalesOrderItemOut],
    summary="Replace all line items in one transaction (Excel-grid editor save)",
)
async def bulk_replace_items(
    sales_order_id: int,
    data: list[SalesOrderItemBulkItem],
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.SALES_ORDER_UPDATE),
):
    items = await SalesOrderService(db).bulk_replace_items(sales_order_id, data)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.SALES_ORDER_UPDATED,
        entity_type=EntityType.SALES_ORDER,
        entity_id=sales_order_id,
        details={"bulk_items_replaced": len(items)},
    )
    return [SalesOrderItemOut.model_validate(i) for i in items]


@router.delete(
    "/{sales_order_id}/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove line item",
)
async def delete_item(
    sales_order_id: int,
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.SALES_ORDER_UPDATE),
):
    await SalesOrderService(db).delete_item(sales_order_id, item_id)


# =============================================================================
# Workflow Actions
# =============================================================================


@router.post("/{sales_order_id}/confirm", response_model=SalesOrderOut, summary="Confirm sales order")
async def confirm_sales_order(
    sales_order_id: int,
    body: WorkflowAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.SALES_ORDER_UPDATE),
):
    reason = body.reason if body else None
    sales_order = await SalesOrderWorkflowService(db).confirm(sales_order_id, reason, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.SALES_ORDER_CONFIRMED,
        entity_type=EntityType.SALES_ORDER,
        entity_id=sales_order.id,
        details={"so_number": sales_order.so_number, "total_amount": sales_order.total_amount},
    )
    return SalesOrderOut.model_validate(sales_order)


@router.post("/{sales_order_id}/complete", response_model=SalesOrderOut, summary="Mark sales order completed")
async def complete_sales_order(
    sales_order_id: int,
    body: WorkflowAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.SALES_ORDER_UPDATE),
):
    reason = body.reason if body else None
    sales_order = await SalesOrderWorkflowService(db).complete(sales_order_id, reason, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.SALES_ORDER_COMPLETED,
        entity_type=EntityType.SALES_ORDER,
        entity_id=sales_order.id,
        details={"so_number": sales_order.so_number},
    )
    return SalesOrderOut.model_validate(sales_order)


@router.post("/{sales_order_id}/cancel", response_model=SalesOrderOut, summary="Cancel sales order")
async def cancel_sales_order(
    sales_order_id: int,
    body: WorkflowAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.SALES_ORDER_UPDATE),
):
    reason = body.reason if body else None
    sales_order = await SalesOrderWorkflowService(db).cancel(sales_order_id, reason, current_user.id)
    await ActivityLogService(db).log(
        user_id=current_user.id,
        action=ActionType.SALES_ORDER_CANCELLED,
        entity_type=EntityType.SALES_ORDER,
        entity_id=sales_order.id,
        details={"so_number": sales_order.so_number, "reason": reason},
    )
    return SalesOrderOut.model_validate(sales_order)


# =============================================================================
# Sub-Resources (read-only)
# =============================================================================


@router.get(
    "/{sales_order_id}/status-history",
    response_model=list[SalesOrderStatusHistoryOut],
    summary="Status audit trail",
)
async def list_status_history(
    sales_order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.SALES_ORDER_READ),
):
    detail = await SalesOrderService(db).get_sales_order(sales_order_id)
    return detail.recent_status_history
