from datetime import datetime

from pydantic import BaseModel


class TrendPoint(BaseModel):
    month: str  # "YYYY-MM"
    count: int


class ProfitTrendPoint(BaseModel):
    month: str  # "YYYY-MM"
    profit: float


class SalesMetrics(BaseModel):
    total_sales: float       # sum of invoice subtotals (before discount/tax)
    total_discount: float
    total_tax: float
    net_sales: float         # total_sales - total_discount + total_tax (= invoice total_amount)
    amount_received: float   # sum of invoice.amount_paid
    invoice_count: int


class ProfitMetrics(BaseModel):
    profit_per_invoice: float   # net_profit / invoice_count
    daily_profit: float         # today's net_sales - today's recorded service costs
    monthly_profit: float       # this month's net_sales - this month's recorded service costs


class ServiceMetrics(BaseModel):
    labor_cost: float
    parts_cost: float
    other_services: float
    grand_total: float        # labor_cost + parts_cost + other_services


class CreditMetrics(BaseModel):
    total_customer_debt: float   # total billed (amount_paid + balance_due) on open invoices
    total_paid: float
    outstanding_balance: float


class RevenueBreakdown(BaseModel):
    vehicle_revenue: float   # invoices tied to a rental contract, or reference_type = "rental"
    service_revenue: float   # invoices tagged reference_type = "work_order"
    other_revenue: float     # everything else (no contract, no reference_type)


class ErpDashboardSummary(BaseModel):
    sales: SalesMetrics
    profit: ProfitMetrics
    service: ServiceMetrics
    credit: CreditMetrics
    revenue_breakdown: RevenueBreakdown
    net_profit: float


class FleetMetrics(BaseModel):
    total: int
    in_stock: int
    rented: int
    in_service: int
    reserved: int


class DashboardForkliftBrief(BaseModel):
    id: int
    serial_number: str
    name_en: str


class DashboardDeliveryOrderBrief(BaseModel):
    id: int
    do_no: str
    order_type: str
    status: str
    delivery_date: datetime
    contract_number: str
    customer_name: str
    forklift: DashboardForkliftBrief | None = None


class DashboardQuotationBrief(BaseModel):
    id: int
    quotation_no: str
    status: str
    customer_name: str
    rental_price: float
    created_at: datetime


class DashboardSummary(BaseModel):
    # ── Customers ──────────────────────────────────────────────────────────
    total_customers: int
    active_customers: int
    prospect_customers: int

    # ── Fleet ──────────────────────────────────────────────────────────────
    fleet: FleetMetrics
    # `fleet.in_stock` / `fleet.in_service` restated as their operational
    # names for callers that just want a single fleet-availability number
    # without pulling in the whole FleetMetrics breakdown.
    available_forklifts: int
    maintenance_count: int

    # ── Rentals ────────────────────────────────────────────────────────────
    active_rental_contracts: int
    total_rental_contracts: int

    # ── Quote-to-cash pipeline ────────────────────────────────────────────
    recent_pending_deliveries: list[DashboardDeliveryOrderBrief]
    recent_pending_returns: list[DashboardDeliveryOrderBrief]
    pending_quotations: list[DashboardQuotationBrief]
