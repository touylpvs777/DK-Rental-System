import logging

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.forklift import ForkliftStatus
from app.models.forklift_ownership_cost import ForkliftOwnershipCost
from app.repositories.forklift_cost_repository import CostFilter, ForkliftCostRepository
from app.repositories.forklift_repository import ForkliftRepository
from app.schemas.forklift import CostSummary, OwnershipCostCreate, OwnershipCostUpdate

logger = logging.getLogger(__name__)

_BLOCKED_STATUSES = {ForkliftStatus.DECOMMISSIONED.value}


class ForkliftCostService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self._repo = ForkliftCostRepository(db)
        self._forklift_repo = ForkliftRepository(db)

    async def list_costs(
        self,
        forklift_id: int,
        cost_type: str | None = None,
        from_date=None,
        to_date=None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[ForkliftOwnershipCost]:
        await self._require_forklift(forklift_id)
        f = CostFilter(
            forklift_id=forklift_id,
            cost_type=cost_type,
            from_date=from_date,
            to_date=to_date,
            skip=skip,
            limit=limit,
        )
        return await self._repo.get_by_forklift(f)

    async def get_summary(self, forklift_id: int) -> CostSummary:
        await self._require_forklift(forklift_id)
        total = await self._repo.get_total_cost(forklift_id)
        by_type = await self._repo.get_cost_by_type(forklift_id)
        count = await self._repo.get_entry_count(forklift_id)
        return CostSummary(
            total_cost=total,
            by_type=by_type,
            currency="LAK",
            entry_count=count,
        )

    async def create_cost(
        self,
        forklift_id: int,
        data: OwnershipCostCreate,
        recorded_by: int,
    ) -> ForkliftOwnershipCost:
        forklift = await self._require_forklift(forklift_id)

        if forklift.status in _BLOCKED_STATUSES:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Cannot record costs for decommissioned forklift.",
            )

        cost = ForkliftOwnershipCost(
            forklift_id=forklift_id,
            cost_type=data.cost_type.value,
            amount=data.amount,
            currency=data.currency,
            cost_date=data.cost_date,
            description=data.description,
            vendor=data.vendor,
            reference_number=data.reference_number,
            recorded_by=recorded_by,
        )
        cost = await self._repo.create(cost)
        await self.db.commit()
        return cost

    async def update_cost(
        self,
        forklift_id: int,
        cost_id: int,
        data: OwnershipCostUpdate,
    ) -> ForkliftOwnershipCost:
        cost = await self._require_owned(cost_id, forklift_id)
        changes = data.model_dump(exclude_unset=True)

        if "cost_type" in changes and changes["cost_type"] is not None:
            changes["cost_type"] = changes["cost_type"].value

        cost = await self._repo.update(cost, changes)
        await self.db.commit()
        return cost

    async def delete_cost(self, forklift_id: int, cost_id: int) -> None:
        cost = await self._require_owned(cost_id, forklift_id)
        await self._repo.delete(cost)
        await self.db.commit()

    async def _require_forklift(self, forklift_id: int):
        forklift = await self._forklift_repo.get_by_id(forklift_id)
        if forklift is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Forklift not found",
            )
        return forklift

    async def _require_owned(self, cost_id: int, forklift_id: int) -> ForkliftOwnershipCost:
        cost = await self._repo.get_by_id(cost_id)
        if cost is None or cost.forklift_id != forklift_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Cost entry not found",
            )
        return cost
