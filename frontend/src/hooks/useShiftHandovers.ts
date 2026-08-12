import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  getShiftHandovers,
  createShiftHandover as apiCreate,
  updateShiftHandover as apiUpdate,
  deleteShiftHandover as apiDelete,
} from '@/api/shiftHandover'
import { toast } from '@/store/toastStore'
import type { ShiftHandoverCreate, ShiftHandoverListParams, ShiftHandoverUpdate } from '@/types/shiftHandover'

const DEFAULT_PARAMS: ShiftHandoverListParams = { skip: 0, limit: 20 }

export function useShiftHandovers(initialParams: ShiftHandoverListParams = DEFAULT_PARAMS) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [params, setParams] = useState<ShiftHandoverListParams>(initialParams)

  const query = useQuery({
    queryKey: ['shiftHandovers', params],
    queryFn: () => getShiftHandovers(params).then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  const applyParams = (next: Partial<ShiftHandoverListParams>) =>
    setParams((prev) => ({ ...prev, ...next, skip: next.skip ?? 0 }))

  const createMutation = useMutation({
    mutationFn: (data: ShiftHandoverCreate) => apiCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftHandovers'] })
      toast.success(t('shiftHandover.toast.createSuccess'))
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? t('shiftHandover.toast.createError'))
    },
  })
  const create = async (data: ShiftHandoverCreate): Promise<boolean> => {
    try {
      await createMutation.mutateAsync(data)
      return true
    } catch {
      return false
    }
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ShiftHandoverUpdate }) => apiUpdate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftHandovers'] })
      toast.success(t('shiftHandover.toast.updateSuccess'))
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? t('shiftHandover.toast.updateError'))
    },
  })
  const update = async (id: number, data: ShiftHandoverUpdate): Promise<boolean> => {
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
      queryClient.invalidateQueries({ queryKey: ['shiftHandovers'] })
      toast.success(t('shiftHandover.toast.deleteSuccess'))
    },
    onError: () => toast.error(t('shiftHandover.toast.deleteError')),
  })
  const remove = async (id: number): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync(id)
      return true
    } catch {
      return false
    }
  }

  const limit = params.limit ?? 20
  const skip = params.skip ?? 0
  const total = query.data?.total ?? 0

  return {
    handovers: query.data?.items ?? [],
    total,
    skip,
    limit,
    hasNext: skip + limit < total,
    hasPrev: skip > 0,
    params,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? t('shiftHandover.toast.loadError') : null,
    applyParams,
    refetch: query.refetch,
    create,
    update,
    remove,
  }
}
