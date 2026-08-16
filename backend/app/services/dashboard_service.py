from datetime import date, datetime, timedelta
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.customer import Customer, CustomerStatus
from app.models.delivery_order import DeliveryOrder, DeliveryOrderStatus, DeliveryOrderType
from app.models.forklift import Forklift, ForkliftStatus
from app.models.invoice import Invoice, InvoiceStatus, ReferenceType
from app.models.maintenance_cost import MaintenanceCost, MaintenanceCostType
from app.models.quotation import Quotation, QuotationStatus
from app.models.rental_contract import RentalContract, RentalContractStatus
from app.models.rental_contract_item import RentalContractItem
from app.models.work_order import WorkOrder, WorkOrderStatus
from app.schemas.dashboard import (
    CreditMetrics,
    DashboardDeliveryOrderBrief,
    DashboardForkliftBrief,
    DashboardQuotationBrief,
    DashboardSummary,
    ErpDashboardSummary,
    FleetMetrics,
    ProfitMetrics,
    ProfitTrendPoint,
    RevenueBreakdown,
    SalesMetrics,
    ServiceMetrics,
    TrendPoint,
)

# "Pending" for a delivery order = still awaiting dispatch or currently en
# route (matches DeliveryOrder's actual status enum, which has no literal
# "in_progress" value — IN_TRANSIT is that state's real name here).
_PENDING_DELIVERY_STATUSES = (DeliveryOrderStatus.PENDING.value, DeliveryOrderStatus.IN_TRANSIT.value)
_RECENT_LIST_LIMIT = 5

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

        fleet_row = (
            await self.db.execute(
                select(
                    func.count(Forklift.id).label("total"),
                    func.count(case((Forklift.status == ForkliftStatus.IN_STOCK.value, 1))).label("in_stock"),
                    func.count(case((Forklift.status == ForkliftStatus.RENTED.value, 1))).label("rented"),
                    func.count(case((Forklift.status == ForkliftStatus.IN_SERVICE.value, 1))).label("in_service"),
                    func.count(case((Forklift.status == ForkliftStatus.RESERVED.value, 1))).label("reserved"),
                )
            )
        ).one()

        rental_row = (
            await self.db.execute(
                select(
                    func.count(RentalContract.id).label("total"),
                    func.count(
                        case((RentalContract.status == RentalContractStatus.ACTIVE.value, 1))
                    ).label("active"),
                )
            )
        ).one()

        recent_pending_deliveries = await self._get_pending_delivery_orders(DeliveryOrderType.DELIVERY.value)
        recent_pending_returns = await self._get_pending_delivery_orders(DeliveryOrderType.RETURN.value)
        pending_quotations = await self._get_pending_quotations()

        return DashboardSummary(
            total_customers=customer_row.total,
            active_customers=customer_row.active,
            prospect_customers=customer_row.prospect,
            fleet=FleetMetrics(
                total=fleet_row.total,
                in_stock=fleet_row.in_stock,
                rented=fleet_row.rented,
                in_service=fleet_row.in_service,
                reserved=fleet_row.reserved,
            ),
            available_forklifts=fleet_row.in_stock,
            maintenance_count=fleet_row.in_service,
            active_rental_contracts=rental_row.active,
            total_rental_contracts=rental_row.total,
            recent_pending_deliveries=recent_pending_deliveries,
            recent_pending_returns=recent_pending_returns,
            pending_quotations=pending_quotations,
        )

    async def _get_pending_delivery_orders(
        self, order_type: str, limit: int = _RECENT_LIST_LIMIT,
    ) -> list[DashboardDeliveryOrderBrief]:
        stmt = (
            select(DeliveryOrder)
            .where(DeliveryOrder.order_type == order_type)
            .where(DeliveryOrder.status.in_(_PENDING_DELIVERY_STATUSES))
            .options(
                selectinload(DeliveryOrder.contract).selectinload(RentalContract.customer),
                selectinload(DeliveryOrder.contract)
                .selectinload(RentalContract.items)
                .selectinload(RentalContractItem.forklift),
            )
            .order_by(DeliveryOrder.delivery_date.desc())
            .limit(limit)
        )
        orders = (await self.db.execute(stmt)).scalars().all()

        briefs = []
        for order in orders:
            # A contract can have several forklifts on it; the dashboard just
            # needs a representative one, not every line item.
            forklift = next((item.forklift for item in order.contract.items if item.forklift), None)
            briefs.append(DashboardDeliveryOrderBrief(
                id=order.id,
                do_no=order.do_no,
                order_type=order.order_type,
                status=order.status,
                delivery_date=order.delivery_date,
                contract_number=order.contract.contract_number,
                customer_name=f"{order.contract.customer.first_name} {order.contract.customer.last_name}",
                forklift=DashboardForkliftBrief(
                    id=forklift.id, serial_number=forklift.serial_number, name_en=forklift.name_en,
                ) if forklift else None,
            ))
        return briefs

    async def _get_pending_quotations(self, limit: int = _RECENT_LIST_LIMIT) -> list[DashboardQuotationBrief]:
        # Quotation has no literal "pending" status — SENT (out to the
        # customer, awaiting their decision) is the closest real analog to
        # an actionable/pending item on this dashboard.
        stmt = (
            select(Quotation)
            .where(Quotation.status == QuotationStatus.SENT.value)
            .options(selectinload(Quotation.customer))
            .order_by(Quotation.created_at.desc())
            .limit(limit)
        )
        quotations = (await self.db.execute(stmt)).scalars().all()
        return [
            DashboardQuotationBrief(
                id=q.id,
                quotation_no=q.quotation_no,
                status=q.status,
                customer_name=f"{q.customer.first_name} {q.customer.last_name}",
                rental_price=q.rental_price,
                created_at=q.created_at,
            )
            for q in quotations
        ]

    # ── Trend charts ───────────────────────────────────────────────────────

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

    # ── ERP financial & operational summary ─────────────────────────────────

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

        service_cost_all = await self._service_cost_total()
        service_cost_today = await self._service_cost_total(since=today_start)
        service_cost_month = await self._service_cost_total(since=month_start)

        net_profit_all = sales_all["net_sales"] - service_cost_all
        net_profit_today = sales_today["net_sales"] - service_cost_today
        net_profit_month = sales_month["net_sales"] - service_cost_month

        sales = SalesMetrics(
            total_sales=sales_all["total_sales"],
            total_discount=sales_all["total_discount"],
            total_tax=sales_all["total_tax"],
            net_sales=sales_all["net_sales"],
            amount_received=sales_all["amount_received"],
            invoice_count=sales_all["invoice_count"],
        )

        profit = ProfitMetrics(
            profit_per_invoice=(
                round(net_profit_all / sales_all["invoice_count"], 2)
                if sales_all["invoice_count"] else 0.0
            ),
            daily_profit=round(net_profit_today, 2),
            monthly_profit=round(net_profit_month, 2),
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
                (Invoice.contract_id.isnot(None)) | (Invoice.reference_type == ReferenceType.RENTAL.value),
                "vehicle",
            ),
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
            vehicle_revenue=buckets.get("vehicle", 0.0),
            service_revenue=buckets.get("service", 0.0),
            other_revenue=buckets.get("other", 0.0),
        )

        return ErpDashboardSummary(
            sales=sales,
            profit=profit,
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
                    sales_by_month.get(m, 0.0) - service_cost_by_month.get(m, 0.0), 2
                ),
            )
            for m in _month_range(months)
        ]
