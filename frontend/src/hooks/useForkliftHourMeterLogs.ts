import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getHourMeterLogs } from '@/api/forklift'

export function useForkliftHourMeterLogs(forkliftId: number, limit = 10) {
  const { t } = useTranslation()

  const query = useQuery({
    queryKey: ['forkliftHourMeterLogs', forkliftId, limit],
    queryFn: () => getHourMeterLogs(forkliftId, { limit }).then((r) => r.data),
    enabled: Number.isFinite(forkliftId),
  })

  return {
    logs: query.data ?? [],
    isLoading: query.isLoading,
    error: query.isError ? t('equipment.detail.hourMeterLogLoadError') : null,
    refetch: query.refetch,
  }
}
