import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  getQuotations,
  createQuotation as apiCreate,
  deleteQuotation as apiDelete,
} from '@/api/quotation'
import { toast } from '@/store/toastStore'
import type { QuotationCreate, QuotationListParams } from '@/types/quotation'

const DEFAULT_PARAMS: QuotationListParams = {
  page: 1,
  page_size: 20,
  sort: 'created_at',
  order: 'desc',
}

export function useQuotations(initialParams: QuotationListParams = DEFAULT_PARAMS) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [params, setParams] = useState<QuotationListParams>(initialParams)

  const query = useQuery({
    queryKey: ['quotations', params],
    queryFn: () => getQuotations(params).then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  const applyParams = (next: Partial<QuotationListParams>) =>
    setParams((prev) => ({ ...prev, ...next, page: next.page ?? 1 }))

  const createMutation = useMutation({
    mutationFn: (data: QuotationCreate) => apiCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      toast.success(t('quotations.list.toast.createSuccess'))
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? t('quotations.list.toast.createError'))
    },
  })
  const create = async (data: QuotationCreate): Promise<boolean> => {
    try {
      await createMutation.mutateAsync(data)
      return true
    } catch {
      return false
    }
  }

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      toast.success(t('quotations.list.toast.deleteSuccess'))
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? t('quotations.list.toast.deleteError'))
    },
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
    quotations: query.data?.items ?? [],
    total:      query.data?.total ?? 0,
    pages:      query.data?.pages ?? 1,
    page:       query.data?.page  ?? 1,
    params,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? t('quotations.list.toast.loadError') : null,
    applyParams,
    refetch: query.refetch,
    create,
    remove,
  }
}
