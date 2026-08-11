import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getLeads,
  createLead  as apiCreate,
  updateLead  as apiUpdate,
  deleteLead  as apiDelete,
} from '@/api/leads'
import { toast } from '@/store/toastStore'
import type { LeadCreate, LeadUpdate } from '@/types/lead'

export function useLeads() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['leads'],
    queryFn: () => getLeads({ limit: 500 }).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: LeadCreate) => apiCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success(t('leads.list.toast.createSuccess'))
    },
    onError: () => toast.error(t('leads.list.toast.createError')),
  })
  const create = async (data: LeadCreate): Promise<boolean> => {
    try {
      await createMutation.mutateAsync(data)
      return true
    } catch {
      return false
    }
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: LeadUpdate }) => apiUpdate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success(t('leads.list.toast.updateSuccess'))
    },
    onError: (err: unknown) => {
      // Surface backend validation message (e.g. invalid status transition)
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(detail ?? t('leads.list.toast.updateError'))
    },
  })
  const update = async (id: number, data: LeadUpdate): Promise<boolean> => {
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
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success(t('leads.list.toast.deleteSuccess'))
    },
    onError: () => toast.error(t('leads.list.toast.deleteError')),
  })
  const remove = async (id: number): Promise<boolean> => {
    try {
      await deleteMutation.mutateAsync(id)
      return true
    } catch {
      return false
    }
  }

  return {
    leads: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? t('leads.list.toast.loadError') : null,
    refetch: query.refetch,
    create,
    update,
    remove,
  }
}
