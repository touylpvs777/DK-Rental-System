export interface TrendPoint {
  month: string
  count: number
}

export interface LeadMetrics {
  total: number
  conversion_rate: number
  win_rate: number
  lost_rate: number
  by_status: Record<string, number>
  by_source: Record<string, number>
}

export interface DashboardSummary {
  total_customers: number
  active_customers: number
  prospect_customers: number
  total_leads: number
  new_leads: number
  contacted_leads: number
  qualified_leads: number
  proposal_leads: number
  won_leads: number
  lost_leads: number
  leads_by_source: Record<string, number>
  conversion_rate: number
  win_rate: number
  lost_rate: number
}

export interface ProfitTrendPoint {
  month: string
  profit: number
}

export interface SalesMetrics {
  total_sales: number
  total_discount: number
  total_tax: number
  net_sales: number
  amount_received: number
  invoice_count: number
}

export interface CostMetrics {
  purchase_price: number
  import_fees: number
  shipping_fees: number
  total_cost: number
}

export interface ProfitMetrics {
  profit_per_item: number
  profit_per_invoice: number
  daily_profit: number
  monthly_profit: number
}

export interface InventoryOpsMetrics {
  stock_in: number
  stock_out: number
  current_balance: number
  low_stock_alerts: number
}

export interface ServiceMetrics {
  labor_cost: number
  parts_cost: number
  other_services: number
  discount: number
  grand_total: number
}

export interface CreditMetrics {
  total_customer_debt: number
  total_paid: number
  outstanding_balance: number
}

export interface RevenueBreakdown {
  parts_revenue: number
  vehicle_revenue: number
  service_revenue: number
  other_revenue: number
}

export type DashboardRevenueRange = 'week' | 'month' | 'last_month' | 'year' | 'all'

export interface ErpDashboardSummary {
  sales: SalesMetrics
  costs: CostMetrics
  profit: ProfitMetrics
  inventory: InventoryOpsMetrics
  service: ServiceMetrics
  credit: CreditMetrics
  revenue_breakdown: RevenueBreakdown
  net_profit: number
}
