import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  getForklifts,
  createForklift as apiCreate,
  updateForklift as apiUpdate,
  deleteForklift as apiDelete,
} from '@/api/forklift'
import { toast } from '@/store/toastStore'
import type { ForkliftCreate, ForkliftUpdate, ForkliftListParams } from '@/types/forklift'

const DEFAULT_PARAMS: ForkliftListParams = {
  page: 1,
  page_size: 20,
  is_active: undefined,
  sort: 'created_at',
  order: 'desc',
}

export function useForklifts(initialParams: ForkliftListParams = DEFAULT_PARAMS) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [params, setParams] = useState<ForkliftListParams>(initialParams)

  const query = useQuery({
    queryKey: ['forklifts', params],
    queryFn: () => getForklifts(params).then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  const applyParams = (next: Partial<ForkliftListParams>) =>
    setParams((prev) => ({ ...prev, ...next, page: next.page ?? 1 }))

  const createMutation = useMutation({
    mutationFn: (data: ForkliftCreate) => apiCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forklifts'] })
      toast.success(t('equipment.registry.toast.createSuccess'))
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? t('equipment.registry.toast.createError'))
    },
  })
  const create = async (data: ForkliftCreate): Promise<boolean> => {
    try {
      await createMutation.mutateAsync(data)
      return true
    } catch {
      return false
    }
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ForkliftUpdate }) => apiUpdate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forklifts'] })
      toast.success(t('equipment.registry.toast.updateSuccess'))
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? t('equipment.registry.toast.updateError'))
    },
  })
  const update = async (id: number, data: ForkliftUpdate): Promise<boolean> => {
    try {
      await updateMutation.mutateAsync({ id, data })
      return true
    } catch {
      return false
    }
  }

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forklifts'] })
      toast.success(t('equipment.registry.toast.deleteSuccess'))
    },
    onError: () => toast.error(t('equipment.registry.toast.deleteError')),
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
    forklifts: query.data?.items ?? [],
    total:     query.data?.total ?? 0,
    pages:     query.data?.pages ?? 1,
    page:      query.data?.page  ?? 1,
    params,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? t('equipment.registry.toast.loadError') : null,
    applyParams,
    refetch: query.refetch,
    create,
    update,
    remove,
  }
}

export type UseForkliftsReturn = ReturnType<typeof useForklifts>
