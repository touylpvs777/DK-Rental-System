import logging

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.models.user import User
from app.schemas.delivery_order import (
    DeliveryOrderCreate,
    DeliveryOrderListResponse,
    DeliveryOrderResponse,
    DeliveryOrderUpdate,
)
from app.services.delivery_order_service import DeliveryOrderService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/delivery-orders", tags=["Delivery Orders"])


@router.get("/", response_model=DeliveryOrderListResponse, summary="List delivery orders")
async def list_delivery_orders(
    q: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    contract_id: int | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_READ),
):
    return await DeliveryOrderService(db).list_delivery_orders(
        q=q, status_filter=status_filter, contract_id=contract_id, page=page, page_size=page_size,
    )


@router.post(
    "/",
    response_model=DeliveryOrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create delivery order",
)
async def create_delivery_order(
    data: DeliveryOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_CREATE),
):
    delivery_order = await DeliveryOrderService(db).create_delivery_order(data, created_by=current_user.id)
    return DeliveryOrderResponse.model_validate(delivery_order)


@router.get("/{delivery_order_id}", response_model=DeliveryOrderResponse, summary="Get delivery order by ID")
async def get_delivery_order(
    delivery_order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_READ),
):
    delivery_order = await DeliveryOrderService(db).get_delivery_order(delivery_order_id)
    return DeliveryOrderResponse.model_validate(delivery_order)


@router.put("/{delivery_order_id}", response_model=DeliveryOrderResponse, summary="Update delivery order")
async def update_delivery_order(
    delivery_order_id: int,
    data: DeliveryOrderUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_UPDATE),
):
    delivery_order = await DeliveryOrderService(db).update_delivery_order(delivery_order_id, data)
    return DeliveryOrderResponse.model_validate(delivery_order)


@router.delete("/{delivery_order_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete delivery order")
async def delete_delivery_order(
    delivery_order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_DELETE),
):
    await DeliveryOrderService(db).delete_delivery_order(delivery_order_id)
