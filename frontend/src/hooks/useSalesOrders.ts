import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  getSalesOrders,
  deleteSalesOrder as apiDelete,
} from '@/api/salesOrder'
import type { SalesOrderListParams } from '@/types/salesOrder'

const DEFAULT_PARAMS: SalesOrderListParams = {
  page: 1,
  page_size: 20,
  sort: 'created_at',
  order: 'desc',
}

export function useSalesOrders(initialParams: SalesOrderListParams = DEFAULT_PARAMS) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [params, setParams] = useState<SalesOrderListParams>(initialParams)

  const query = useQuery({
    queryKey: ['salesOrders', params],
    queryFn: () => getSalesOrders(params).then((r) => r.data),
    // Keeps the previous page's rows on screen while a newly-clicked page
    // loads, instead of a skeleton flash — same stale-while-revalidate
    // spirit as the cross-navigation caching this hook exists for.
    placeholderData: keepPreviousData,
  })

  const applyParams = (next: Partial<SalesOrderListParams>) =>
    setParams((prev) => ({ ...prev, ...next, page: next.page ?? 1 }))

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(id),
    onSuccess: () => {
      // Matches every cached page/filter combination for this list, not
      // just the current one, so a later revisit doesn't serve a stale row.
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] })
    },
  })

  const remove = async (id: number): Promise<boolean> => {
    try {
      // Deleting the last row on a page beyond the first would otherwise
      // strand the user on a now-empty page — step back one page first.
      const wasLastItemOnPage = query.data?.items.length === 1 && (params.page ?? 1) > 1
      await deleteMutation.mutateAsync(id)
      if (wasLastItemOnPage) {
        setParams((prev) => ({ ...prev, page: (prev.page ?? 1) - 1 }))
      }
      return true
    } catch {
      return false
    }
  }

  return {
    salesOrders: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    pages: query.data?.pages ?? 1,
    page: query.data?.page ?? 1,
    params,
    // True only on the very first fetch for a given params/queryKey (no
    // cached data yet) — background revalidation never re-triggers this,
    // so the skeleton doesn't reappear on cached route re-navigation.
    isLoading: query.isLoading,
    // True during ANY fetch, including silent background revalidation —
    // use this for a subtle indicator (e.g. spinning the refresh icon),
    // never for the skeleton.
    isFetching: query.isFetching,
    error: query.isError ? t('salesOrders.list.loadError') : null,
    applyParams,
    refetch: query.refetch,
    remove,
  }
}
