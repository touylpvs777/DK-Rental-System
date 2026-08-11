import logging
import math
import time
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.asset_movement import AssetMovement, MovementStatus, MovementType
from app.models.forklift import ForkliftStatus
from app.models.forklift_location import ForkliftLocation
from app.models.forklift_status_history import ForkliftStatusHistory
from app.models.movement_history import MovementHistory
from app.repositories.forklift_repository import ForkliftRepository
from app.repositories.forklift_status_repository import ForkliftStatusRepository
from app.repositories.movement_repository import MovementFilter, MovementRepository
from app.schemas.movement import (
    ArriveAction,
    CancelAction,
    CheckpointAction,
    CompleteAction,
    DepartAction,
    MovementCreate,
    MovementDetail,
    MovementListResponse,
    MovementOut,
    MovementUpdate,
    PrepareAction,
)

logger = logging.getLogger(__name__)

_VALID_SORTS = {"created_at", "scheduled_date", "movement_number", "status", "priority"}
_VALID_ORDERS = {"asc", "desc"}

VALID_TRANSITIONS: dict[str, set[str]] = {
    MovementStatus.DRAFT.value: {MovementStatus.PREPARING.value, MovementStatus.CANCELLED.value},
    MovementStatus.PREPARING.value: {MovementStatus.IN_TRANSIT.value, MovementStatus.CANCELLED.value},
    MovementStatus.IN_TRANSIT.value: {MovementStatus.DELIVERED.value, MovementStatus.COMPLETED.value, MovementStatus.CANCELLED.value},
    MovementStatus.DELIVERED.value: {MovementStatus.COMPLETED.value},
    MovementStatus.COMPLETED.value: set(),
    MovementStatus.CANCELLED.value: set(),
}


class MovementService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = MovementRepository(db)
        self._forklift_repo = ForkliftRepository(db)
        self._forklift_status_repo = ForkliftStatusRepository(db)

    # ── List ─────────────────────────────────────────────────────────────────

    async def list_movements(
        self,
        q: str | None = None,
        movement_type: str | None = None,
        status_filter: str | None = None,
        forklift_id: int | None = None,
        customer_id: int | None = None,
        assigned_driver_id: int | None = None,
        priority: str | None = None,
        is_active: bool | None = True,
        scheduled_from=None, scheduled_to=None,
        page: int = 1, page_size: int = 20,
        sort: str = "created_at", order: str = "desc",
    ) -> MovementListResponse:
        page = max(1, page)
        page_size = min(max(1, page_size), 100)
        sort = sort if sort in _VALID_SORTS else "created_at"
        order = order if order in _VALID_ORDERS else "desc"

        f = MovementFilter(
            q=q, movement_type=movement_type, status=status_filter,
            forklift_id=forklift_id, customer_id=customer_id,
            assigned_driver_id=assigned_driver_id, priority=priority,
            is_active=is_active, scheduled_from=scheduled_from, scheduled_to=scheduled_to,
            page=page, page_size=page_size, sort=sort, order=order,
        )
        movements, total = await self._repo.get_list(f)
        pages = math.ceil(total / page_size) if page_size else 1
        items = [MovementOut.model_validate(m) for m in movements]
        return MovementListResponse(
            items=items, total=total, page=page, page_size=page_size, pages=pages,
        )

    # ── Detail ───────────────────────────────────────────────────────────────

    async def get_movement(self, movement_id: int) -> MovementDetail:
        movement = await self._repo.get_detail(movement_id)
        if movement is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movement not found")
        return MovementDetail.model_validate(movement)

    # ── Create ───────────────────────────────────────────────────────────────

    async def create_movement(self, data: MovementCreate, created_by: int) -> AssetMovement:
        forklift = await self._forklift_repo.get_by_id(data.forklift_id)
        if forklift is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Forklift not found")
        if not forklift.is_active:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Forklift is not active")
        if forklift.status in (ForkliftStatus.SOLD.value, ForkliftStatus.DECOMMISSIONED.value):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Cannot move forklift in '{forklift.status}' status",
            )

        number = await self._generate_number()

        movement = AssetMovement(
            movement_number=number,
            movement_type=data.movement_type.value,
            status=MovementStatus.DRAFT.value,
            priority=data.priority.value,
            forklift_id=data.forklift_id,
            customer_id=data.customer_id,
            rental_contract_id=data.rental_contract_id,
            from_location=data.from_location,
            from_address=data.from_address,
            to_location=data.to_location,
            to_address=data.to_address,
            scheduled_date=data.scheduled_date,
            assigned_driver_id=data.assigned_driver_id,
            tracking_code=data.tracking_code,
            notes=data.notes,
            internal_notes=data.internal_notes,
            created_by=created_by,
            updated_by=created_by,
        )

        try:
            movement = await self._repo.create(movement)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Movement number conflict. Retry.")

        await self._add_checkpoint(movement, None, MovementStatus.DRAFT.value, "Created", created_by)
        await self.db.commit()
        return await self._repo.get_by_id(movement.id)

    # ── Update ───────────────────────────────────────────────────────────────

    async def update_movement(self, movement_id: int, data: MovementUpdate, updated_by: int) -> AssetMovement:
        movement = await self._require(movement_id)
        if movement.status not in (MovementStatus.DRAFT.value, MovementStatus.PREPARING.value):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Can only edit movements in draft or preparing status",
            )

        changes = data.model_dump(exclude_unset=True)
        if "priority" in changes and changes["priority"]:
            changes["priority"] = changes["priority"].value
        changes["updated_by"] = updated_by

        try:
            movement = await self._repo.update(movement, changes)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Update conflict")

        await self.db.commit()
        return await self._repo.get_by_id(movement.id)

    # ── Workflow ─────────────────────────────────────────────────────────────

    async def prepare(self, movement_id: int, data: PrepareAction | None, user_id: int) -> AssetMovement:
        movement = await self._require(movement_id)
        self._validate_transition(movement.status, MovementStatus.PREPARING.value)
        await self._transition(movement, MovementStatus.PREPARING.value, data.notes if data else None, user_id)
        return await self._repo.get_by_id(movement.id)

    async def depart(self, movement_id: int, data: DepartAction, user_id: int) -> AssetMovement:
        movement = await self._require(movement_id)
        self._validate_transition(movement.status, MovementStatus.IN_TRANSIT.value)

        await self._repo.update(movement, {
            "departure_hour_meter": data.departure_hour_meter,
            "actual_departure": datetime.now(timezone.utc),
        })

        await self._transition(movement, MovementStatus.IN_TRANSIT.value, data.notes if data else None, user_id)
        return await self._repo.get_by_id(movement.id)

    async def arrive(self, movement_id: int, data: ArriveAction, user_id: int) -> AssetMovement:
        movement = await self._require(movement_id)

        if movement.departure_hour_meter is not None and data.arrival_hour_meter < movement.departure_hour_meter:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Arrival hour meter must be >= departure reading",
            )

        target = MovementStatus.DELIVERED.value if movement.movement_type == MovementType.CUSTOMER_DEPLOYMENT.value else MovementStatus.COMPLETED.value
        self._validate_transition(movement.status, target)

        await self._repo.update(movement, {
            "arrival_hour_meter": data.arrival_hour_meter,
            "actual_arrival": datetime.now(timezone.utc),
        })

        await self._update_forklift_on_arrival(movement, data.arrival_hour_meter, user_id)
        await self._transition(movement, target, data.notes if data else None, user_id)
        return await self._repo.get_by_id(movement.id)

    async def complete(self, movement_id: int, data: CompleteAction | None, user_id: int) -> AssetMovement:
        movement = await self._require(movement_id)
        self._validate_transition(movement.status, MovementStatus.COMPLETED.value)
        await self._transition(movement, MovementStatus.COMPLETED.value, data.notes if data else None, user_id)
        return await self._repo.get_by_id(movement.id)

    async def cancel(self, movement_id: int, data: CancelAction, user_id: int) -> AssetMovement:
        movement = await self._require(movement_id)
        if movement.status in (MovementStatus.COMPLETED.value, MovementStatus.CANCELLED.value):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Cannot cancel movement in '{movement.status}' status",
            )
        await self._repo.update(movement, {"cancellation_reason": data.cancellation_reason})
        await self._transition(movement, MovementStatus.CANCELLED.value, data.cancellation_reason, user_id)
        return await self._repo.get_by_id(movement.id)

    async def add_checkpoint(self, movement_id: int, data: CheckpointAction, user_id: int) -> MovementHistory:
        movement = await self._require(movement_id)
        if movement.status in (MovementStatus.COMPLETED.value, MovementStatus.CANCELLED.value):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Cannot add checkpoints to a completed or cancelled movement",
            )
        checkpoint = MovementHistory(
            movement_id=movement.id,
            from_status=movement.status,
            to_status=movement.status,
            location=data.location,
            latitude=data.latitude,
            longitude=data.longitude,
            notes=data.notes,
            recorded_by=user_id,
        )
        checkpoint = await self._repo.add_checkpoint(checkpoint)
        await self.db.commit()
        return checkpoint

    # ── Private ──────────────────────────────────────────────────────────────

    async def _require(self, movement_id: int) -> AssetMovement:
        movement = await self._repo.get_by_id(movement_id)
        if movement is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Movement not found")
        return movement

    @staticmethod
    def _validate_transition(current: str, target: str) -> None:
        allowed = VALID_TRANSITIONS.get(current, set())
        if target not in allowed:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Invalid transition: '{current}' → '{target}'",
            )

    async def _transition(self, movement: AssetMovement, target: str, notes: str | None, user_id: int) -> None:
        old_status = movement.status
        await self._repo.update(movement, {"status": target, "updated_by": user_id})
        await self._add_checkpoint(movement, old_status, target, notes, user_id)
        await self.db.commit()

    async def _add_checkpoint(self, movement: AssetMovement, from_status: str | None, to_status: str, notes: str | None, user_id: int) -> None:
        await self._repo.add_checkpoint(MovementHistory(
            movement_id=movement.id,
            from_status=from_status,
            to_status=to_status,
            notes=notes,
            recorded_by=user_id,
        ))

    async def _update_forklift_on_arrival(self, movement: AssetMovement, hour_meter: float, user_id: int) -> None:
        forklift = await self._forklift_repo.get_by_id(movement.forklift_id)
        if forklift is None:
            return

        if hour_meter > forklift.current_hour_meter:
            await self._forklift_repo.update(forklift, {"current_hour_meter": hour_meter})

        self.db.add(ForkliftLocation(
            forklift_id=forklift.id,
            location_name=movement.to_location,
            address=movement.to_address,
            customer_id=movement.customer_id,
            effective_date=datetime.now(timezone.utc).date(),
            recorded_by=user_id,
        ))
        await self.db.flush()

    async def _generate_number(self) -> str:
        year = time.strftime("%Y")
        base = f"MV-{year}"
        seq = 1
        while await self._repo.number_exists(f"{base}-{seq:05d}"):
            seq += 1
        return f"{base}-{seq:05d}"
