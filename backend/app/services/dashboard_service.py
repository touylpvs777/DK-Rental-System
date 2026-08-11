from datetime import date, datetime, timedelta
from sqlalchemy import case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.customer import Customer, CustomerStatus
from app.models.inventory_balance import InventoryBalance
from app.models.inventory_transaction import InventoryTransaction, TransactionType
from app.models.invoice import Invoice, InvoiceStatus, ReferenceType
from app.models.invoice_item import InvoiceItem
from app.models.lead import Lead, LeadStatus
from app.models.maintenance_cost import MaintenanceCost, MaintenanceCostType
from app.models.purchase_order import POStatus, PurchaseOrder
from app.models.spare_part import SparePart
from app.models.work_order import WorkOrder, WorkOrderStatus
from app.schemas.dashboard import (
    CostMetrics,
    CreditMetrics,
    DashboardSummary,
    ErpDashboardSummary,
    InventoryOpsMetrics,
    LeadMetrics,
    ProfitMetrics,
    ProfitTrendPoint,
    RevenueBreakdown,
    SalesMetrics,
    ServiceMetrics,
    TrendPoint,
)

_OPEN_INVOICE_STATUSES = (InvoiceStatus.CANCELLED.value, InvoiceStatus.VOIDED.value)
_SERVICE_COST_TYPES_OTHER = (MaintenanceCostType.EXTERNAL_SERVICE.value, MaintenanceCostType.OTHER.value)


# ── Helpers ────────────────────────────────────────────────────────────────────


def _month_range(months: int) -> list[str]:
    """Return a list of 'YYYY-MM' strings for the last N months, oldest first."""
    today = date.today()
    result: list[str] = []
    for i in range(months - 1, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        result.append(f"{y:04d}-{m:02d}")
    return result


def _cutoff_from_months(months: int) -> datetime:
    """Return the datetime of the first day of the earliest month in _month_range(months)."""
    first = _month_range(months)[0]
    y, m = map(int, first.split("-"))
    return datetime(y, m, 1)


def _month_expr(column):
    """Database-agnostic 'YYYY-MM' expression for grouping by month."""
    if settings.DATABASE_URL.startswith("sqlite"):
        return func.strftime("%Y-%m", column)
    # PostgreSQL
    return func.to_char(func.date_trunc("month", column), "YYYY-MM")


def _rate(numerator: int, denominator: int) -> float:
    return round(numerator / denominator * 100, 1) if denominator else 0.0


def _revenue_range_bounds(range_key: str) -> tuple[datetime | None, datetime | None]:
    """Return (start, end) bounds for a Revenue Breakdown time-range filter.

    `end` is exclusive; either bound may be None to mean unbounded. Unknown
    keys behave like "all" (no filter) rather than raising.
    """
    today = date.today()
    if range_key == "week":
        start = today - timedelta(days=today.weekday())
        return datetime.combine(start, datetime.min.time()), None
    if range_key == "month":
        return datetime(today.year, today.month, 1), None
    if range_key == "last_month":
        this_month_start = date(today.year, today.month, 1)
        prev_month = today.month - 1 or 12
        prev_year = today.year if today.month > 1 else today.year - 1
        return datetime(prev_year, prev_month, 1), datetime.combine(this_month_start, datetime.min.time())
    if range_key == "year":
        return datetime(today.year, 1, 1), None
    return None, None


# ── Service ────────────────────────────────────────────────────────────────────


class DashboardService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Summary ────────────────────────────────────────────────────────────

    async def get_summary(self) -> DashboardSummary:
        customer_row = (
            await self.db.execute(
                select(
                    func.count(Customer.id).label("total"),
                    func.count(
                        case((Customer.status == CustomerStatus.ACTIVE, 1))
                    ).label("active"),
                    func.count(
                        case((Customer.status == CustomerStatus.PROSPECT, 1))
                    ).label("prospect"),
                )
            )
        ).one()

        lead_row = (
            await self.db.execute(
                select(
                    func.count(Lead.id).label("total"),
                    func.count(case((Lead.status == LeadStatus.NEW, 1))).label("new"),
                    func.count(case((Lead.status == LeadStatus.CONTACTED, 1))).label("contacted"),
                    func.count(case((Lead.status == LeadStatus.QUALIFIED, 1))).label("qualified"),
                    func.count(case((Lead.status == LeadStatus.PROPOSAL, 1))).label("proposal"),
                    func.count(case((Lead.status == LeadStatus.WON, 1))).label("won"),
                    func.count(case((Lead.status == LeadStatus.LOST, 1))).label("lost"),
                )
            )
        ).one()

        source_rows = (
            await self.db.execute(
                select(Lead.source, func.count(Lead.id).label("cnt"))
                .group_by(Lead.source)
            )
        ).all()
        leads_by_source: dict[str, int] = {
            (row.source or "unknown"): row.cnt for row in source_rows
        }

        total: int = lead_row.total or 0
        won: int = lead_row.won or 0
        lost: int = lead_row.lost or 0
        concluded = won + lost

        return DashboardSummary(
            total_customers=customer_row.total,
            active_customers=customer_row.active,
            prospect_customers=customer_row.prospect,
            total_leads=total,
            new_leads=lead_row.new,
            contacted_leads=lead_row.contacted,
            qualified_leads=lead_row.qualified,
            proposal_leads=lead_row.proposal,
            won_leads=won,
            lost_leads=lost,
            leads_by_source=leads_by_source,
            conversion_rate=_rate(won, total),
            win_rate=_rate(won, concluded),
            lost_rate=_rate(lost, concluded),
        )

    # ── Trend charts ───────────────────────────────────────────────────────

    async def get_lead_trend(self, months: int = 12) -> list[TrendPoint]:
        cutoff = _cutoff_from_months(months)
        month_col = _month_expr(Lead.created_at)
        rows = (
            await self.db.execute(
                select(month_col.label("month"), func.count(Lead.id).label("count"))
                .where(Lead.created_at >= cutoff)
                .group_by(month_col)
                .order_by(month_col)
            )
        ).all()
        data = {row.month: row.count for row in rows}
        return [TrendPoint(month=m, count=data.get(m, 0)) for m in _month_range(months)]

    async def get_customer_trend(self, months: int = 12) -> list[TrendPoint]:
        cutoff = _cutoff_from_months(months)
        month_col = _month_expr(Customer.created_at)
        rows = (
            await self.db.execute(
                select(month_col.label("month"), func.count(Customer.id).label("count"))
                .where(Customer.created_at >= cutoff)
                .group_by(month_col)
                .order_by(month_col)
            )
        ).all()
        data = {row.month: row.count for row in rows}
        return [TrendPoint(month=m, count=data.get(m, 0)) for m in _month_range(months)]

    # ── Lead metrics ───────────────────────────────────────────────────────

    async def get_lead_metrics(self) -> LeadMetrics:
        lead_row = (
            await self.db.execute(
                select(
                    func.count(Lead.id).label("total"),
                    func.count(case((Lead.status == LeadStatus.NEW, 1))).label("new"),
                    func.count(case((Lead.status == LeadStatus.CONTACTED, 1))).label("contacted"),
                    func.count(case((Lead.status == LeadStatus.QUALIFIED, 1))).label("qualified"),
                    func.count(case((Lead.status == LeadStatus.PROPOSAL, 1))).label("proposal"),
                    func.count(case((Lead.status == LeadStatus.WON, 1))).label("won"),
                    func.count(case((Lead.status == LeadStatus.LOST, 1))).label("lost"),
                )
            )
        ).one()

        source_rows = (
            await self.db.execute(
                select(Lead.source, func.count(Lead.id).label("cnt"))
                .group_by(Lead.source)
            )
        ).all()

        total: int = lead_row.total or 0
        won: int = lead_row.won or 0
        lost: int = lead_row.lost or 0
        concluded = won + lost

        return LeadMetrics(
            total=total,
            conversion_rate=_rate(won, total),
            win_rate=_rate(won, concluded),
            lost_rate=_rate(lost, concluded),
            by_status={
                "new": lead_row.new,
                "contacted": lead_row.contacted,
                "qualified": lead_row.qualified,
                "proposal": lead_row.proposal,
                "won": won,
                "lost": lost,
            },
            by_source={(row.source or "unknown"): row.cnt for row in source_rows},
        )

    # ── ERP financial & operational summary ─────────────────────────────────
    #
    # `import_fees`, `shipping_fees` (Costs) and `discount` (Service) have no
    # backing column anywhere in the schema yet — they're returned as 0.0
    # placeholders until a table/field is added to track them. Every other
    # figure below is a real aggregate query, not mocked.

    async def _sales_totals(self, since: datetime | None = None) -> dict:
        stmt = select(
            func.coalesce(func.sum(Invoice.subtotal), 0.0).label("total_sales"),
            func.coalesce(func.sum(Invoice.discount_amount), 0.0).label("total_discount"),
            func.coalesce(func.sum(Invoice.tax_amount), 0.0).label("total_tax"),
            func.coalesce(func.sum(Invoice.total_amount), 0.0).label("net_sales"),
            func.coalesce(func.sum(Invoice.amount_paid), 0.0).label("amount_received"),
            func.count(Invoice.id).label("invoice_count"),
        ).where(Invoice.status.notin_(_OPEN_INVOICE_STATUSES))
        if since is not None:
            stmt = stmt.where(Invoice.created_at >= since)
        return dict((await self.db.execute(stmt)).one()._mapping)

    async def _po_cost_total(self, since: datetime | None = None) -> float:
        stmt = select(
            func.coalesce(func.sum(PurchaseOrder.total_amount), 0.0)
        ).where(PurchaseOrder.status != POStatus.CANCELLED.value)
        if since is not None:
            stmt = stmt.where(PurchaseOrder.created_at >= since)
        return (await self.db.execute(stmt)).scalar_one()

    async def _service_cost_total(self, since: datetime | None = None) -> float:
        stmt = (
            select(func.coalesce(func.sum(MaintenanceCost.amount), 0.0))
            .select_from(MaintenanceCost)
            .join(WorkOrder, MaintenanceCost.work_order_id == WorkOrder.id)
            .where(WorkOrder.status != WorkOrderStatus.CANCELLED.value)
        )
        if since is not None:
            stmt = stmt.where(MaintenanceCost.created_at >= since)
        return (await self.db.execute(stmt)).scalar_one()

    async def get_erp_summary(self, revenue_range: str = "all") -> ErpDashboardSummary:
        today_start = datetime.combine(date.today(), datetime.min.time())
        month_start = _cutoff_from_months(1)

        sales_all = await self._sales_totals()
        sales_today = await self._sales_totals(since=today_start)
        sales_month = await self._sales_totals(since=month_start)

        po_cost_all = await self._po_cost_total()
        po_cost_today = await self._po_cost_total(since=today_start)
        po_cost_month = await self._po_cost_total(since=month_start)

        service_cost_all = await self._service_cost_total()
        service_cost_today = await self._service_cost_total(since=today_start)
        service_cost_month = await self._service_cost_total(since=month_start)

        net_profit_all = sales_all["net_sales"] - po_cost_all - service_cost_all
        net_profit_today = sales_today["net_sales"] - po_cost_today - service_cost_today
        net_profit_month = sales_month["net_sales"] - po_cost_month - service_cost_month

        item_qty_row = (
            await self.db.execute(
                select(func.coalesce(func.sum(InvoiceItem.quantity), 0.0))
                .select_from(InvoiceItem)
                .join(Invoice, InvoiceItem.invoice_id == Invoice.id)
                .where(Invoice.status.notin_(_OPEN_INVOICE_STATUSES))
            )
        ).scalar_one()

        sales = SalesMetrics(
            total_sales=sales_all["total_sales"],
            total_discount=sales_all["total_discount"],
            total_tax=sales_all["total_tax"],
            net_sales=sales_all["net_sales"],
            amount_received=sales_all["amount_received"],
            invoice_count=sales_all["invoice_count"],
        )

        costs = CostMetrics(
            purchase_price=po_cost_all,
            import_fees=0.0,
            shipping_fees=0.0,
            total_cost=po_cost_all,
        )

        profit = ProfitMetrics(
            profit_per_item=round(net_profit_all / item_qty_row, 2) if item_qty_row else 0.0,
            profit_per_invoice=(
                round(net_profit_all / sales_all["invoice_count"], 2)
                if sales_all["invoice_count"] else 0.0
            ),
            daily_profit=round(net_profit_today, 2),
            monthly_profit=round(net_profit_month, 2),
        )

        stock_in_row = (
            await self.db.execute(
                select(func.coalesce(func.sum(InventoryTransaction.quantity), 0.0))
                .where(
                    InventoryTransaction.transaction_type.in_(
                        (TransactionType.RECEIVE.value, TransactionType.RETURN.value)
                    ),
                    InventoryTransaction.created_at >= month_start,
                )
            )
        ).scalar_one()
        stock_out_row = (
            await self.db.execute(
                select(func.coalesce(func.sum(InventoryTransaction.quantity), 0.0))
                .where(
                    InventoryTransaction.transaction_type.in_(
                        (TransactionType.ISSUE.value, TransactionType.CONSUME.value)
                    ),
                    InventoryTransaction.created_at >= month_start,
                )
            )
        ).scalar_one()
        current_balance = (
            await self.db.execute(select(func.coalesce(func.sum(InventoryBalance.quantity_on_hand), 0.0)))
        ).scalar_one()
        low_stock_alerts = (
            await self.db.execute(
                select(func.count())
                .select_from(InventoryBalance)
                .join(SparePart, InventoryBalance.spare_part_id == SparePart.id)
                .where(InventoryBalance.quantity_available <= SparePart.min_stock_level)
            )
        ).scalar_one()

        inventory = InventoryOpsMetrics(
            stock_in=stock_in_row,
            stock_out=stock_out_row,
            current_balance=current_balance,
            low_stock_alerts=low_stock_alerts,
        )

        service_row = (
            await self.db.execute(
                select(
                    func.coalesce(
                        func.sum(case((MaintenanceCost.cost_type == MaintenanceCostType.LABOR.value, MaintenanceCost.amount))), 0.0
                    ).label("labor"),
                    func.coalesce(
                        func.sum(case((MaintenanceCost.cost_type == MaintenanceCostType.PARTS.value, MaintenanceCost.amount))), 0.0
                    ).label("parts"),
                    func.coalesce(
                        func.sum(case((MaintenanceCost.cost_type.in_(_SERVICE_COST_TYPES_OTHER), MaintenanceCost.amount))), 0.0
                    ).label("other"),
                )
                .select_from(MaintenanceCost)
                .join(WorkOrder, MaintenanceCost.work_order_id == WorkOrder.id)
                .where(WorkOrder.status != WorkOrderStatus.CANCELLED.value)
            )
        ).one()

        service = ServiceMetrics(
            labor_cost=service_row.labor,
            parts_cost=service_row.parts,
            other_services=service_row.other,
            discount=0.0,
            grand_total=round(service_row.labor + service_row.parts + service_row.other, 2),
        )

        credit_row = (
            await self.db.execute(
                select(
                    func.coalesce(func.sum(Invoice.amount_paid), 0.0).label("paid"),
                    func.coalesce(func.sum(Invoice.balance_due), 0.0).label("outstanding"),
                ).where(Invoice.status.notin_(_OPEN_INVOICE_STATUSES))
            )
        ).one()
        credit = CreditMetrics(
            total_customer_debt=round(credit_row.paid + credit_row.outstanding, 2),
            total_paid=credit_row.paid,
            outstanding_balance=credit_row.outstanding,
        )

        bucket_expr = case(
            (Invoice.reference_type == ReferenceType.WORK_ORDER.value, "service"),
            (
                or_(Invoice.contract_id.isnot(None), Invoice.reference_type == ReferenceType.RENTAL.value),
                "vehicle",
            ),
            (Invoice.reference_type == ReferenceType.SALES.value, "parts"),
            else_="other",
        )
        revenue_start, revenue_end = _revenue_range_bounds(revenue_range)
        bucket_stmt = (
            select(bucket_expr.label("bucket"), func.coalesce(func.sum(Invoice.total_amount), 0.0).label("amt"))
            .where(Invoice.status.notin_(_OPEN_INVOICE_STATUSES))
        )
        if revenue_start is not None:
            bucket_stmt = bucket_stmt.where(Invoice.created_at >= revenue_start)
        if revenue_end is not None:
            bucket_stmt = bucket_stmt.where(Invoice.created_at < revenue_end)
        bucket_rows = (await self.db.execute(bucket_stmt.group_by(bucket_expr))).all()
        buckets = {row.bucket: row.amt for row in bucket_rows}
        revenue_breakdown = RevenueBreakdown(
            parts_revenue=buckets.get("parts", 0.0),
            vehicle_revenue=buckets.get("vehicle", 0.0),
            service_revenue=buckets.get("service", 0.0),
            other_revenue=buckets.get("other", 0.0),
        )

        return ErpDashboardSummary(
            sales=sales,
            costs=costs,
            profit=profit,
            inventory=inventory,
            service=service,
            credit=credit,
            revenue_breakdown=revenue_breakdown,
            net_profit=round(net_profit_all, 2),
        )

    async def get_profit_trend(self, months: int = 6) -> list[ProfitTrendPoint]:
        cutoff = _cutoff_from_months(months)

        sales_month_col = _month_expr(Invoice.created_at)
        sales_rows = (
            await self.db.execute(
                select(sales_month_col.label("month"), func.coalesce(func.sum(Invoice.total_amount), 0.0).label("amt"))
                .where(Invoice.status.notin_(_OPEN_INVOICE_STATUSES), Invoice.created_at >= cutoff)
                .group_by(sales_month_col)
            )
        ).all()
        sales_by_month = {row.month: row.amt for row in sales_rows}

        po_month_col = _month_expr(PurchaseOrder.created_at)
        po_rows = (
            await self.db.execute(
                select(po_month_col.label("month"), func.coalesce(func.sum(PurchaseOrder.total_amount), 0.0).label("amt"))
                .where(PurchaseOrder.status != POStatus.CANCELLED.value, PurchaseOrder.created_at >= cutoff)
                .group_by(po_month_col)
            )
        ).all()
        cost_by_month = {row.month: row.amt for row in po_rows}

        service_month_col = _month_expr(MaintenanceCost.created_at)
        service_rows = (
            await self.db.execute(
                select(service_month_col.label("month"), func.coalesce(func.sum(MaintenanceCost.amount), 0.0).label("amt"))
                .select_from(MaintenanceCost)
                .join(WorkOrder, MaintenanceCost.work_order_id == WorkOrder.id)
                .where(WorkOrder.status != WorkOrderStatus.CANCELLED.value, MaintenanceCost.created_at >= cutoff)
                .group_by(service_month_col)
            )
        ).all()
        service_cost_by_month = {row.month: row.amt for row in service_rows}

        return [
            ProfitTrendPoint(
                month=m,
                profit=round(
                    sales_by_month.get(m, 0.0) - cost_by_month.get(m, 0.0) - service_cost_by_month.get(m, 0.0), 2
                ),
            )
            for m in _month_range(months)
        ]
