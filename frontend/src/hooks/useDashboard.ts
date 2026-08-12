import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { getSummary, getCustomerTrend } from '@/api/dashboard'
import { withMockFallback, generateMockTrend } from '@/utils/mockAdapter'

// ── Summary ─────────────────────────────────────────────────
export function useDashboardSummary() {
  const { t } = useTranslation()

  const query = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: () => getSummary().then((r) => r.data),
  })

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? t('dashboard.loadError') : null,
    refetch: query.refetch,
  }
}

// ── Customer Trend ───────────────────────────────────────────
export function useCustomerTrend(months = 12) {
  const { t } = useTranslation()

  const query = useQuery({
    queryKey: ['customerTrend', months],
    queryFn: async () => {
      const MOCK = generateMockTrend(12, months)
      try {
        const { data: trend } = await withMockFallback(() => getCustomerTrend(months), MOCK)
        return { trend, isMock: trend === MOCK }
      } catch (err) {
        const status = (err as AxiosError).response?.status
        if (status !== 401 && status !== 403) {
          return { trend: [], isMock: false }
        }
        throw err
      }
    },
  })

  return {
    data: query.data?.trend ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? t('dashboard.errors.customerTrend') : null,
    isMock: query.data?.isMock ?? false,
    refetch: query.refetch,
  }
}
