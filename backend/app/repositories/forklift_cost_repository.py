import logging
from dataclasses import dataclass
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.forklift_ownership_cost import ForkliftOwnershipCost

logger = logging.getLogger(__name__)


@dataclass
class CostFilter:
    forklift_id: int
    cost_type: str | None = None
    from_date: date | None = None
    to_date: date | None = None
    skip: int = 0
    limit: int = 50


class ForkliftCostRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, cost_id: int) -> ForkliftOwnershipCost | None:
        return await self.db.get(ForkliftOwnershipCost, cost_id)

    async def get_by_forklift(self, f: CostFilter) -> list[ForkliftOwnershipCost]:
        stmt = (
            select(ForkliftOwnershipCost)
            .where(ForkliftOwnershipCost.forklift_id == f.forklift_id)
        )
        stmt = self._apply_filters(stmt, f)
        stmt = (
            stmt.order_by(ForkliftOwnershipCost.cost_date.desc(), ForkliftOwnershipCost.id.desc())
            .offset(f.skip)
            .limit(f.limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_by_forklift(self, f: CostFilter) -> int:
        stmt = (
            select(func.count(ForkliftOwnershipCost.id))
            .where(ForkliftOwnershipCost.forklift_id == f.forklift_id)
        )
        stmt = self._apply_filters(stmt, f)
        result = await self.db.execute(stmt)
        return result.scalar_one()

    async def get_total_cost(self, forklift_id: int) -> float:
        result = await self.db.execute(
            select(func.coalesce(func.sum(ForkliftOwnershipCost.amount), 0.0))
            .where(ForkliftOwnershipCost.forklift_id == forklift_id)
        )
        return float(result.scalar_one())

    async def get_cost_by_type(self, forklift_id: int) -> dict[str, float]:
        result = await self.db.execute(
            select(
                ForkliftOwnershipCost.cost_type,
                func.coalesce(func.sum(ForkliftOwnershipCost.amount), 0.0),
            )
            .where(ForkliftOwnershipCost.forklift_id == forklift_id)
            .group_by(ForkliftOwnershipCost.cost_type)
        )
        return {row[0]: float(row[1]) for row in result.all()}

    async def get_entry_count(self, forklift_id: int) -> int:
        result = await self.db.execute(
            select(func.count(ForkliftOwnershipCost.id))
            .where(ForkliftOwnershipCost.forklift_id == forklift_id)
        )
        return result.scalar_one()

    def _apply_filters(self, stmt, f: CostFilter):
        if f.cost_type is not None:
            stmt = stmt.where(ForkliftOwnershipCost.cost_type == f.cost_type)
        if f.from_date is not None:
            stmt = stmt.where(ForkliftOwnershipCost.cost_date >= f.from_date)
        if f.to_date is not None:
            stmt = stmt.where(ForkliftOwnershipCost.cost_date <= f.to_date)
        return stmt

    async def create(self, cost: ForkliftOwnershipCost) -> ForkliftOwnershipCost:
        self.db.add(cost)
        await self.db.flush()
        await self.db.refresh(cost)
        logger.info(
            "Cost recorded: forklift=%s type=%s amount=%s",
            cost.forklift_id, cost.cost_type, cost.amount,
        )
        return cost

    async def update(self, cost: ForkliftOwnershipCost, changes: dict) -> ForkliftOwnershipCost:
        for key, value in changes.items():
            setattr(cost, key, value)
        await self.db.flush()
        await self.db.refresh(cost)
        logger.info("Cost updated: id=%s", cost.id)
        return cost

    async def delete(self, cost: ForkliftOwnershipCost) -> None:
        await self.db.delete(cost)
        await self.db.flush()
        logger.info("Cost deleted: id=%s forklift=%s", cost.id, cost.forklift_id)
