import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { createDeliveryOrder as apiCreate, deleteDeliveryOrder as apiDelete, getDeliveryOrders, updateDeliveryOrder as apiUpdate } from '@/api/deliveryOrders'
import { toast } from '@/store/toastStore'
import type { DeliveryOrderCreate, DeliveryOrderListParams, DeliveryOrderUpdate } from '@/types/deliveryOrder'

export function useDeliveryOrders(initialParams: DeliveryOrderListParams = { page: 1, page_size: 20 }) {
  const { t } = useTranslation(); const queryClient = useQueryClient(); const [params, setParams] = useState(initialParams)
  const query = useQuery({ queryKey: ['deliveryOrders', params], queryFn: () => getDeliveryOrders(params).then(r => r.data), placeholderData: keepPreviousData })
  const createMutation = useMutation({ mutationFn: apiCreate, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['deliveryOrders'] }); toast.success(t('deliveryOrders.toast.createSuccess')) }, onError: () => toast.error(t('deliveryOrders.toast.createError')) })
  const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: number; data: DeliveryOrderUpdate }) => apiUpdate(id, data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['deliveryOrders'] }); toast.success(t('deliveryOrders.toast.updateSuccess')) }, onError: () => toast.error(t('deliveryOrders.toast.updateError')) })
  const deleteMutation = useMutation({ mutationFn: apiDelete, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['deliveryOrders'] }); toast.success(t('deliveryOrders.toast.deleteSuccess')) }, onError: () => toast.error(t('deliveryOrders.toast.deleteError')) })
  const run = async <T,>(fn: () => Promise<T>) => { try { await fn(); return true } catch { return false } }
  return {
    orders: query.data?.items ?? [], total: query.data?.total ?? 0, pages: query.data?.pages ?? 1, page: query.data?.page ?? 1, params,
    isLoading: query.isLoading, isFetching: query.isFetching, error: query.isError ? t('deliveryOrders.toast.loadError') : null,
    applyParams: (next: Partial<DeliveryOrderListParams>) => setParams(p => ({ ...p, ...next, page: next.page ?? 1 })), refetch: query.refetch,
    create: (data: DeliveryOrderCreate) => run(() => createMutation.mutateAsync(data)), update: (id: number, data: DeliveryOrderUpdate) => run(() => updateMutation.mutateAsync({ id, data })), remove: (id: number) => run(() => deleteMutation.mutateAsync(id)),
  }
}
