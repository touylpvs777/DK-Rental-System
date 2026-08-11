import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getMovements } from '@/api/movement'
import type { MovementListParams } from '@/types/movement'

const DEFAULT_PARAMS: MovementListParams = {
  page: 1,
  page_size: 20,
}

export function useMovements(initialParams: MovementListParams = DEFAULT_PARAMS) {
  const { t } = useTranslation()
  const [params, setParams] = useState<MovementListParams>(initialParams)

  const query = useQuery({
    queryKey: ['movements', params],
    queryFn: () => getMovements(params).then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  const applyParams = (next: Partial<MovementListParams>) =>
    setParams((prev) => ({ ...prev, ...next, page: next.page ?? 1 }))

  return {
    movements: query.data?.items ?? [],
    total:     query.data?.total ?? 0,
    pages:     query.data?.pages ?? 1,
    page:      query.data?.page  ?? 1,
    params,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? t('movement.list.loadFailed') : null,
    applyParams,
    refetch: query.refetch,
  }
}
