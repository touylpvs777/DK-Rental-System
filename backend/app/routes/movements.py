import logging
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionName, require_permission
from app.database.session import get_db
from app.models.user import User
from app.schemas.movement import (
    ArriveAction,
    CancelAction,
    CheckpointAction,
    CompleteAction,
    DepartAction,
    MovementCreate,
    MovementDetail,
    MovementHistoryOut,
    MovementListResponse,
    MovementOut,
    MovementUpdate,
    PrepareAction,
)
from app.services.movement_service import MovementService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/movements", tags=["Asset Movements"])


@router.get("/", response_model=MovementListResponse, summary="List movements")
async def list_movements(
    q: str | None = Query(default=None),
    movement_type: str | None = None,
    status: str | None = Query(default=None, alias="status"),
    forklift_id: int | None = None,
    customer_id: int | None = None,
    assigned_driver_id: int | None = None,
    priority: str | None = None,
    is_active: bool | None = True,
    scheduled_from: date | None = None,
    scheduled_to: date | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    sort: str = Query(
        default="created_at",
        pattern="^(created_at|scheduled_date|movement_number|status|priority)$",
    ),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_READ),
):
    return await MovementService(db).list_movements(
        q=q, movement_type=movement_type, status_filter=status,
        forklift_id=forklift_id, customer_id=customer_id,
        assigned_driver_id=assigned_driver_id, priority=priority,
        is_active=is_active, scheduled_from=scheduled_from, scheduled_to=scheduled_to,
        page=page, page_size=page_size, sort=sort, order=order,
    )


@router.get("/{movement_id}", response_model=MovementDetail, summary="Get movement detail")
async def get_movement(
    movement_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_READ),
):
    return await MovementService(db).get_movement(movement_id)


@router.post("/", response_model=MovementOut, status_code=status.HTTP_201_CREATED, summary="Create movement")
async def create_movement(
    data: MovementCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    movement = await MovementService(db).create_movement(data, created_by=current_user.id)
    return MovementOut.model_validate(movement)


@router.put("/{movement_id}", response_model=MovementOut, summary="Update movement")
async def update_movement(
    movement_id: int,
    data: MovementUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    movement = await MovementService(db).update_movement(movement_id, data, updated_by=current_user.id)
    return MovementOut.model_validate(movement)


# ── Workflow ─────────────────────────────────────────────────────────────────

@router.post("/{movement_id}/prepare", response_model=MovementOut, summary="Start preparation")
async def prepare_movement(
    movement_id: int,
    body: PrepareAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    movement = await MovementService(db).prepare(movement_id, body, current_user.id)
    return MovementOut.model_validate(movement)


@router.post("/{movement_id}/depart", response_model=MovementOut, summary="Record departure")
async def depart_movement(
    movement_id: int,
    body: DepartAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    movement = await MovementService(db).depart(movement_id, body, current_user.id)
    return MovementOut.model_validate(movement)


@router.post("/{movement_id}/arrive", response_model=MovementOut, summary="Record arrival")
async def arrive_movement(
    movement_id: int,
    body: ArriveAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    movement = await MovementService(db).arrive(movement_id, body, current_user.id)
    return MovementOut.model_validate(movement)


@router.post("/{movement_id}/complete", response_model=MovementOut, summary="Complete movement")
async def complete_movement(
    movement_id: int,
    body: CompleteAction | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    movement = await MovementService(db).complete(movement_id, body, current_user.id)
    return MovementOut.model_validate(movement)


@router.post("/{movement_id}/cancel", response_model=MovementOut, summary="Cancel movement")
async def cancel_movement(
    movement_id: int,
    body: CancelAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    movement = await MovementService(db).cancel(movement_id, body, current_user.id)
    return MovementOut.model_validate(movement)


@router.post("/{movement_id}/checkpoint", response_model=MovementHistoryOut, status_code=status.HTTP_201_CREATED, summary="Add tracking checkpoint")
async def add_checkpoint(
    movement_id: int,
    body: CheckpointAction,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_permission(PermissionName.FORKLIFT_UPDATE),
):
    checkpoint = await MovementService(db).add_checkpoint(movement_id, body, current_user.id)
    return MovementHistoryOut.model_validate(checkpoint)
