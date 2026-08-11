import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  getReceipts,
  deleteReceipt as apiDelete,
} from '@/api/receipt'
import type { ReceiptListParams } from '@/types/receipt'

const DEFAULT_PARAMS: ReceiptListParams = {
  page: 1,
  page_size: 20,
  sort: 'created_at',
  order: 'desc',
}

export function useReceipts(initialParams: ReceiptListParams = DEFAULT_PARAMS) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [params, setParams] = useState<ReceiptListParams>(initialParams)

  const query = useQuery({
    queryKey: ['receipts', params],
    queryFn: () => getReceipts(params).then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  const applyParams = (next: Partial<ReceiptListParams>) =>
    setParams((prev) => ({ ...prev, ...next, page: next.page ?? 1 }))

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['receipts'] }),
  })
  const remove = async (id: number): Promise<boolean> => {
    try {
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
    receipts:  query.data?.items ?? [],
    total:     query.data?.total ?? 0,
    pages:     query.data?.pages ?? 1,
    page:      query.data?.page  ?? 1,
    params,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? t('receipts.list.loadError') : null,
    applyParams,
    refetch: query.refetch,
    remove,
  }
}
