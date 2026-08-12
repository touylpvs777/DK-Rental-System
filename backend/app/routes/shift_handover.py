import logging

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.models.user import User
from app.schemas.shift_handover import (
    ShiftHandoverCreate,
    ShiftHandoverListResponse,
    ShiftHandoverResponse,
    ShiftHandoverUpdate,
)
from app.services.shift_handover_service import ShiftHandoverService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/shift-handovers", tags=["Shift Handover Checklist"])


@router.get("/", response_model=ShiftHandoverListResponse, summary="List shift handovers")
async def list_handovers(
    rental_contract_id: int | None = None,
    forklift_id: int | None = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_READ),
):
    return await ShiftHandoverService(db).list_handovers(
        rental_contract_id=rental_contract_id, forklift_id=forklift_id, skip=skip, limit=limit,
    )


@router.post(
    "/",
    response_model=ShiftHandoverResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create shift handover",
)
async def create_handover(
    data: ShiftHandoverCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_CREATE),
):
    handover = await ShiftHandoverService(db).create_handover(data, created_by=current_user.id)
    return ShiftHandoverResponse.model_validate(handover)


@router.get("/{handover_id}", response_model=ShiftHandoverResponse, summary="Get shift handover by ID")
async def get_handover(
    handover_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_READ),
):
    handover = await ShiftHandoverService(db).get_handover(handover_id)
    return ShiftHandoverResponse.model_validate(handover)


@router.put("/{handover_id}", response_model=ShiftHandoverResponse, summary="Update shift handover")
async def update_handover(
    handover_id: int,
    data: ShiftHandoverUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_UPDATE),
):
    handover = await ShiftHandoverService(db).update_handover(handover_id, data)
    return ShiftHandoverResponse.model_validate(handover)


@router.delete("/{handover_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete shift handover")
async def delete_handover(
    handover_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.RENTAL_DELETE),
):
    await ShiftHandoverService(db).delete_handover(handover_id)
