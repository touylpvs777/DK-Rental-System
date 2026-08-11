import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCustomers,
  createCustomer as apiCreate,
  updateCustomer as apiUpdate,
  deleteCustomer as apiDelete,
} from '@/api/customers'
import { toast } from '@/store/toastStore'
import type { CustomerCreate, CustomerUpdate } from '@/types/customer'

export function useCustomers() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['customers'],
    queryFn: () => getCustomers({ limit: 500 }).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: CustomerCreate) => apiCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success(t('customers.list.toast.createSuccess'))
    },
    onError: () => toast.error(t('customers.list.toast.createError')),
  })
  const create = async (data: CustomerCreate): Promise<boolean> => {
    try {
      await createMutation.mutateAsync(data)
      return true
    } catch {
      return false
    }
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CustomerUpdate }) => apiUpdate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success(t('customers.list.toast.updateSuccess'))
    },
    onError: () => toast.error(t('customers.list.toast.updateError')),
  })
  const update = async (id: number, data: CustomerUpdate): Promise<boolean> => {
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
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success(t('customers.list.toast.deleteSuccess'))
    },
    onError: () => toast.error(t('customers.list.toast.deleteError')),
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
    customers: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? t('customers.list.toast.loadError') : null,
    refetch: query.refetch,
    create,
    update,
    remove,
  }
}
