import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getWorkOrders } from '@/api/maintenance'
import type { WOListParams } from '@/types/maintenance'

const DEFAULT_PARAMS: WOListParams = {
  page: 1,
  page_size: 20,
}

export function useWorkOrders(initialParams: WOListParams = DEFAULT_PARAMS) {
  const { t } = useTranslation()
  const [params, setParams] = useState<WOListParams>(initialParams)

  const query = useQuery({
    queryKey: ['workOrders', params],
    queryFn: () => getWorkOrders(params).then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  const applyParams = (next: Partial<WOListParams>) =>
    setParams((prev) => ({ ...prev, ...next, page: next.page ?? 1 }))

  return {
    workOrders: query.data?.items ?? [],
    total:      query.data?.total ?? 0,
    pages:      query.data?.pages ?? 1,
    page:       query.data?.page  ?? 1,
    params,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? t('maintenance.workOrders.list.loadError') : null,
    applyParams,
    refetch: query.refetch,
  }
}
