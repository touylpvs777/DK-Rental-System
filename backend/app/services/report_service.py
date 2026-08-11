from datetime import datetime, time

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models.customer import Customer, CustomerStatus
from app.models.lead import Lead, LeadStatus
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

    # ── Lead report ───────────────────────────────────────────────────────────

    async def leads(self, filters: ReportFilters) -> list[dict]:
        AssignedAgent = aliased(User, name="assigned_agent")

        stmt = (
            select(
                Lead.id.label("id"),
                Lead.title.label("title"),
                Lead.description.label("description"),
                Lead.value.label("value"),
                Lead.status.label("status"),
                Lead.created_at.label("created_at"),
                Customer.first_name.label("customer_first_name"),
                Customer.last_name.label("customer_last_name"),
                AssignedAgent.username.label("assigned_to"),
            )
            .outerjoin(Customer, Lead.customer_id == Customer.id)
            .outerjoin(AssignedAgent, Lead.assigned_to == AssignedAgent.id)
            .order_by(Lead.created_at.desc())
        )
        stmt = self._apply_date_filter(stmt, Lead.created_at, filters)

        rows = (await self.db.execute(stmt)).mappings().all()
        return [dict(r) for r in rows]

    # ── Sales report ──────────────────────────────────────────────────────────

    async def sales(self, filters: ReportFilters) -> list[dict]:
        """
        Lead-level sales data (value is not null) plus a summary footer row.
        Ordered by status pipeline position, then value descending.
        """
        STATUS_ORDER = {s: i for i, s in enumerate(LeadStatus)}
        AssignedAgent = aliased(User, name="assigned_agent")

        stmt = (
            select(
                Lead.id.label("id"),
                Lead.title.label("title"),
                Lead.value.label("value"),
                Lead.status.label("status"),
                Lead.created_at.label("created_at"),
                Customer.first_name.label("customer_first_name"),
                Customer.last_name.label("customer_last_name"),
                AssignedAgent.username.label("sales_rep"),
            )
            .where(Lead.value.isnot(None))
            .outerjoin(Customer, Lead.customer_id == Customer.id)
            .outerjoin(AssignedAgent, Lead.assigned_to == AssignedAgent.id)
            .order_by(Lead.value.desc())
        )
        stmt = self._apply_date_filter(stmt, Lead.created_at, filters)

        rows = (await self.db.execute(stmt)).mappings().all()
        detail = [dict(r) for r in rows]

        # Summary aggregation (single DB query)
        agg_stmt = (
            select(
                func.count(Lead.id).label("total_leads"),
                func.coalesce(func.sum(Lead.value), 0).label("total_pipeline"),
                func.coalesce(
                    func.sum(Lead.value).filter(Lead.status == LeadStatus.WON), 0
                ).label("won_value"),
                func.coalesce(
                    func.sum(Lead.value).filter(Lead.status == LeadStatus.LOST), 0
                ).label("lost_value"),
                func.coalesce(
                    func.sum(Lead.value).filter(
                        Lead.status.notin_([LeadStatus.WON, LeadStatus.LOST])
                    ), 0
                ).label("active_pipeline"),
            )
            .where(Lead.value.isnot(None))
        )
        agg_stmt = self._apply_date_filter(agg_stmt, Lead.created_at, filters)
        summary = dict((await self.db.execute(agg_stmt)).mappings().one())

        return {"detail": detail, "summary": summary}
