import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { getActivity } from '@/api/activity'

export interface ActivityFilters {
  action?: string
  entity_type?: string
  from_date?: string
  to_date?: string
}

export function useActivity(filters: ActivityFilters) {
  const { t } = useTranslation()

  const query = useQuery({
    queryKey: ['activity', filters],
    queryFn: () => getActivity({
      limit: 200,
      ...(filters.action      && { action:      filters.action }),
      ...(filters.entity_type && { entity_type: filters.entity_type }),
      ...(filters.from_date   && { from_date:   filters.from_date }),
      ...(filters.to_date     && { to_date:      filters.to_date }),
    }).then((r) => r.data),
  })

  return {
    logs: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? t('activity.loadError') : null,
    refetch: query.refetch,
  }
}
