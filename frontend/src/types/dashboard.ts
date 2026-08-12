export interface TrendPoint {
  month: string
  count: number
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

export interface ProfitMetrics {
  profit_per_invoice: number
  daily_profit: number
  monthly_profit: number
}

export interface ServiceMetrics {
  labor_cost: number
  parts_cost: number
  other_services: number
  grand_total: number
}

export interface CreditMetrics {
  total_customer_debt: number
  total_paid: number
  outstanding_balance: number
}

export interface RevenueBreakdown {
  vehicle_revenue: number
  service_revenue: number
  other_revenue: number
}

export type DashboardRevenueRange = 'week' | 'month' | 'last_month' | 'year' | 'all'

export interface ErpDashboardSummary {
  sales: SalesMetrics
  profit: ProfitMetrics
  service: ServiceMetrics
  credit: CreditMetrics
  revenue_breakdown: RevenueBreakdown
  net_profit: number
}

export interface FleetMetrics {
  total: number
  in_stock: number
  rented: number
  in_service: number
  reserved: number
}

export interface DashboardSummary {
  total_customers: number
  active_customers: number
  prospect_customers: number
  fleet: FleetMetrics
  active_rental_contracts: number
  total_rental_contracts: number
}
