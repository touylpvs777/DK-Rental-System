import logging

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.shift_handover import ShiftHandover
from app.repositories.forklift_repository import ForkliftRepository
from app.repositories.rental_repository import RentalRepository
from app.repositories.shift_handover_repository import ShiftHandoverRepository
from app.schemas.shift_handover import (
    ShiftHandoverCreate,
    ShiftHandoverListResponse,
    ShiftHandoverResponse,
    ShiftHandoverUpdate,
)

logger = logging.getLogger(__name__)


class ShiftHandoverService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = ShiftHandoverRepository(db)
        self._forklift_repo = ForkliftRepository(db)
        self._contract_repo = RentalRepository(db)

    async def list_handovers(
        self,
        rental_contract_id: int | None = None,
        forklift_id: int | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> ShiftHandoverListResponse:
        items = await self._repo.get_all(
            rental_contract_id=rental_contract_id, forklift_id=forklift_id, skip=skip, limit=limit,
        )
        total = await self._repo.count(rental_contract_id=rental_contract_id, forklift_id=forklift_id)
        return ShiftHandoverListResponse(
            items=[ShiftHandoverResponse.model_validate(h) for h in items],
            total=total,
        )

    async def get_handover(self, handover_id: int) -> ShiftHandover:
        handover = await self._repo.get_by_id(handover_id)
        if handover is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shift handover not found")
        return handover

    async def create_handover(self, data: ShiftHandoverCreate, created_by: int) -> ShiftHandover:
        contract = await self._contract_repo.get_by_id(data.rental_contract_id)
        if contract is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rental contract not found")
        forklift = await self._forklift_repo.get_by_id(data.forklift_id)
        if forklift is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Forklift not found")

        handover = ShiftHandover(
            rental_contract_id=data.rental_contract_id,
            forklift_id=data.forklift_id,
            handover_datetime=data.handover_datetime,
            shift_name=data.shift_name.strip(),
            handover_person=data.handover_person.strip(),
            receiver_person=data.receiver_person.strip(),
            hour_meter=data.hour_meter,
            checklist_status=data.checklist_status.strip(),
            issues_description=data.issues_description,
            issue_photos=data.issue_photos,
            signatures=data.signatures,
            created_by=created_by,
        )
        try:
            handover = await self._repo.create(handover)
            await self.db.commit()
            return await self._repo.get_by_id(handover.id)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Could not create shift handover")

    async def update_handover(self, handover_id: int, data: ShiftHandoverUpdate) -> ShiftHandover:
        handover = await self.get_handover(handover_id)
        changes = data.model_dump(exclude_unset=True)
        if "shift_name" in changes and changes["shift_name"]:
            changes["shift_name"] = changes["shift_name"].strip()
        if "handover_person" in changes and changes["handover_person"]:
            changes["handover_person"] = changes["handover_person"].strip()
        if "receiver_person" in changes and changes["receiver_person"]:
            changes["receiver_person"] = changes["receiver_person"].strip()
        if "checklist_status" in changes and changes["checklist_status"]:
            changes["checklist_status"] = changes["checklist_status"].strip()

        handover = await self._repo.update(handover, changes)
        await self.db.commit()
        return await self._repo.get_by_id(handover.id)

    async def delete_handover(self, handover_id: int) -> None:
        handover = await self.get_handover(handover_id)
        await self._repo.delete(handover)
        await self.db.commit()
