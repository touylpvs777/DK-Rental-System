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


class CostMetrics(BaseModel):
    purchase_price: float    # sum of purchase-order subtotals
    import_fees: float       # not yet tracked at the PO level — placeholder until modeled
    shipping_fees: float     # not yet tracked at the PO level — placeholder until modeled
    total_cost: float        # purchase_price + tax on POs + import_fees + shipping_fees


class ProfitMetrics(BaseModel):
    profit_per_item: float      # net_profit / total items sold (blended average, not per-SKU margin)
    profit_per_invoice: float   # net_profit / invoice_count
    daily_profit: float         # today's net_sales - today's recorded costs
    monthly_profit: float       # this month's net_sales - this month's recorded costs


class InventoryOpsMetrics(BaseModel):
    stock_in: float           # units received this month (receive + return transactions)
    stock_out: float          # units issued/consumed this month
    current_balance: float    # sum of quantity_on_hand across all warehouses
    low_stock_alerts: int     # existing low-stock alert count


class ServiceMetrics(BaseModel):
    labor_cost: float
    parts_cost: float
    other_services: float
    discount: float           # not yet tracked at the work-order level — placeholder until modeled
    grand_total: float        # labor_cost + parts_cost + other_services - discount


class CreditMetrics(BaseModel):
    total_customer_debt: float   # total billed (amount_paid + balance_due) on open invoices
    total_paid: float
    outstanding_balance: float


class RevenueBreakdown(BaseModel):
    parts_revenue: float     # invoices tagged reference_type = "sales"
    vehicle_revenue: float   # invoices tied to a rental contract, or reference_type = "rental"
    service_revenue: float   # invoices tagged reference_type = "work_order"
    other_revenue: float     # everything else (no contract, no reference_type)


class ErpDashboardSummary(BaseModel):
    sales: SalesMetrics
    costs: CostMetrics
    profit: ProfitMetrics
    inventory: InventoryOpsMetrics
    service: ServiceMetrics
    credit: CreditMetrics
    revenue_breakdown: RevenueBreakdown
    net_profit: float


class LeadMetrics(BaseModel):
    total: int
    # conversion_rate: won leads out of all leads ever entered
    conversion_rate: float
    # win_rate / lost_rate: of concluded (won + lost) leads
    win_rate: float
    lost_rate: float
    by_status: dict[str, int]
    by_source: dict[str, int]


class DashboardSummary(BaseModel):
    # ── Customers ──────────────────────────────────────────────────────────
    total_customers: int
    active_customers: int
    prospect_customers: int

    # ── Leads (counts) ─────────────────────────────────────────────────────
    total_leads: int
    new_leads: int
    contacted_leads: int
    qualified_leads: int
    proposal_leads: int
    won_leads: int
    lost_leads: int
    leads_by_source: dict[str, int]

    # ── Lead rates (%) ─────────────────────────────────────────────────────
    conversion_rate: float  # won / total_leads × 100
    win_rate: float         # won / (won + lost) × 100
    lost_rate: float        # lost / (won + lost) × 100
