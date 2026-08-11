import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { getSummary, getLeadTrend, getCustomerTrend, getLeadMetrics } from '@/api/dashboard'
import type { LeadMetrics } from '@/types/dashboard'
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

// ── Lead Trend ───────────────────────────────────────────────
export function useLeadTrend(months = 12) {
  const { t } = useTranslation()

  const query = useQuery({
    queryKey: ['leadTrend', months],
    queryFn: async () => {
      const MOCK = generateMockTrend(24, months)
      try {
        const { data: trend } = await withMockFallback(() => getLeadTrend(months), MOCK)
        // Detect mock: mock data has the same month labels as generated
        return { trend, isMock: trend === MOCK }
      } catch (err) {
        const status = (err as AxiosError).response?.status
        if (status !== 401 && status !== 403) {
          // non-auth errors → show empty state, not crash
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
    error: query.isError ? t('dashboard.errors.leadTrend') : null,
    isMock: query.data?.isMock ?? false,
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

// ── Lead Metrics ─────────────────────────────────────────────
const MOCK_METRICS: LeadMetrics = {
  total: 0,
  conversion_rate: 0,
  win_rate: 0,
  lost_rate: 0,
  by_status: {},
  by_source: {},
}

export function useLeadMetrics() {
  const { t } = useTranslation()

  const query = useQuery({
    queryKey: ['leadMetrics'],
    queryFn: async () => {
      try {
        const { data: metrics } = await withMockFallback(() => getLeadMetrics(), MOCK_METRICS)
        return metrics
      } catch (err) {
        const status = (err as AxiosError).response?.status
        if (status !== 401 && status !== 403) {
          return MOCK_METRICS
        }
        throw err
      }
    },
  })

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? t('dashboard.errors.leadMetrics') : null,
    refetch: query.refetch,
  }
}
