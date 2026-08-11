import { useTranslation } from 'react-i18next'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getErpSummary, getProfitTrend } from '@/api/dashboard'
import type { DashboardRevenueRange } from '@/types/dashboard'

export function useDashboardStats(revenueRange: DashboardRevenueRange = 'all') {
  const { t } = useTranslation()

  const query = useQuery({
    queryKey: ['dashboardStats', revenueRange],
    queryFn: async () => {
      const [summaryRes, trendRes] = await Promise.all([getErpSummary(revenueRange), getProfitTrend(6)])
      return { data: summaryRes.data, trend: trendRes.data }
    },
    placeholderData: keepPreviousData,
  })

  return {
    data: query.data?.data ?? null,
    trend: query.data?.trend ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? t('dashboard.erp.loadError') : null,
    refetch: query.refetch,
  }
}
