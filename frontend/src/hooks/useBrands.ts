import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getBrands,
  createBrand as apiCreate,
  updateBrand as apiUpdate,
  deleteBrand as apiDelete,
} from '@/api/catalog'
import { toast } from '@/store/toastStore'
import type { BrandCreate, BrandUpdate } from '@/types/catalog'

export function useBrands(activeOnly = false) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['brands', activeOnly],
    queryFn: () => getBrands(activeOnly ? { is_active: true, limit: 500 } : { limit: 500 }).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: BrandCreate) => apiCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] })
      toast.success(t('catalog.brands.toast.createSuccess'))
    },
    onError: () => toast.error(t('catalog.brands.toast.createError')),
  })
  const create = async (data: BrandCreate): Promise<boolean> => {
    try {
      await createMutation.mutateAsync(data)
      return true
    } catch {
      return false
    }
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: BrandUpdate }) => apiUpdate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] })
      toast.success(t('catalog.brands.toast.updateSuccess'))
    },
    onError: () => toast.error(t('catalog.brands.toast.updateError')),
  })
  const update = async (id: number, data: BrandUpdate): Promise<boolean> => {
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
      queryClient.invalidateQueries({ queryKey: ['brands'] })
      toast.success(t('catalog.brands.toast.deleteSuccess'))
    },
    onError: () => toast.error(t('catalog.brands.toast.deleteError')),
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
    brands: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? t('catalog.brands.toast.loadError') : null,
    refetch: query.refetch,
    create,
    update,
    remove,
  }
}
