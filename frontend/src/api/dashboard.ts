import client from './client'
import type { DashboardSummary, TrendPoint, LeadMetrics, ErpDashboardSummary, ProfitTrendPoint, DashboardRevenueRange } from '@/types/dashboard'

export const getSummary = () =>
  client.get<DashboardSummary>('/dashboard/summary')

export const getErpSummary = (revenueRange: DashboardRevenueRange = 'all') =>
  client.get<ErpDashboardSummary>('/dashboard/erp-summary', { params: { range: revenueRange } })

export const getProfitTrend = (months = 6) =>
  client.get<ProfitTrendPoint[]>('/dashboard/profit-trend', { params: { months } })

export const getLeadTrend = (months = 12) =>
  client.get<TrendPoint[]>('/dashboard/lead-trend', { params: { months } })

export const getCustomerTrend = (months = 12) =>
  client.get<TrendPoint[]>('/dashboard/customer-trend', { params: { months } })

export const getLeadMetrics = () =>
  client.get<LeadMetrics>('/dashboard/lead-metrics')
