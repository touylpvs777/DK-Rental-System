from datetime import datetime, time

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models.customer import Customer
from app.models.user import User
from app.schemas.report import ReportFilters


class ReportService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _apply_date_filter(self, stmt, column, filters: ReportFilters):
        if filters.from_date:
            stmt = stmt.where(column >= datetime.combine(filters.from_date, time.min))
        if filters.to_date:
            stmt = stmt.where(column <= datetime.combine(filters.to_date, time.max))
        return stmt

    # ── Customer report ───────────────────────────────────────────────────────

    async def customers(self, filters: ReportFilters) -> list[dict]:
        AssignedAgent = aliased(User, name="assigned_agent")

        stmt = (
            select(
                Customer.id.label("id"),
                Customer.first_name.label("first_name"),
                Customer.last_name.label("last_name"),
                Customer.email.label("email"),
                Customer.phone.label("phone"),
                Customer.company.label("company"),
                Customer.status.label("status"),
                Customer.created_at.label("created_at"),
                AssignedAgent.username.label("assigned_to"),
            )
            .outerjoin(AssignedAgent, Customer.assigned_to == AssignedAgent.id)
            .order_by(Customer.created_at.desc())
        )
        stmt = self._apply_date_filter(stmt, Customer.created_at, filters)

        rows = (await self.db.execute(stmt)).mappings().all()
        return [dict(r) for r in rows]
