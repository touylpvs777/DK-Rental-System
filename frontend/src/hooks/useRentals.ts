import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  getRentalContracts,
  createRentalContract as apiCreate,
  deleteRentalContract as apiDelete,
} from '@/api/rental'
import { toast } from '@/store/toastStore'
import type { RentalContractCreate, RentalContractListParams } from '@/types/rental'

const DEFAULT_PARAMS: RentalContractListParams = {
  page: 1,
  page_size: 20,
  sort: 'created_at',
  order: 'desc',
}

export function useRentalContracts(initialParams: RentalContractListParams = DEFAULT_PARAMS) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [params, setParams] = useState<RentalContractListParams>(initialParams)

  const query = useQuery({
    queryKey: ['rentalContracts', params],
    queryFn: () => getRentalContracts(params).then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  const applyParams = (next: Partial<RentalContractListParams>) =>
    setParams((prev) => ({ ...prev, ...next, page: next.page ?? 1 }))

  const createMutation = useMutation({
    mutationFn: (data: RentalContractCreate) => apiCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rentalContracts'] })
      toast.success(t('rental.list.toast.createSuccess'))
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? t('rental.list.toast.createError'))
    },
  })
  const create = async (data: RentalContractCreate): Promise<boolean> => {
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
      queryClient.invalidateQueries({ queryKey: ['rentalContracts'] })
      toast.success(t('rental.list.toast.deleteSuccess'))
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? t('rental.list.toast.deleteError'))
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
    contracts: query.data?.items ?? [],
    total:     query.data?.total ?? 0,
    pages:     query.data?.pages ?? 1,
    page:      query.data?.page  ?? 1,
    params,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? t('rental.list.toast.loadError') : null,
    applyParams,
    refetch: query.refetch,
    create,
    remove,
  }
}
