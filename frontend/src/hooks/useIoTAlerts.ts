import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getIoTAlerts } from '@/api/iot'

export function useIoTAlerts(limit = 20) {
  const { t } = useTranslation()

  const query = useQuery({
    queryKey: ['iotAlerts', limit],
    queryFn: () => getIoTAlerts(limit).then((r) => r.data),
  })

  return {
    alerts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.isError ? t('dashboard.fleetOps.alerts.loadError') : null,
    refetch: query.refetch,
  }
}
