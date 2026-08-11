import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  getProducts,
  createProduct as apiCreate,
  updateProduct as apiUpdate,
  deleteProduct as apiDelete,
} from '@/api/catalog'
import { toast } from '@/store/toastStore'
import type { Product, ProductCreate, ProductUpdate, ProductListParams } from '@/types/catalog'

const DEFAULT_PARAMS: ProductListParams = {
  page: 1,
  page_size: 20,
  is_active: undefined,
}

export function useCatalog(initialParams: ProductListParams = DEFAULT_PARAMS) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [params, setParams] = useState<ProductListParams>(initialParams)

  const query = useQuery({
    queryKey: ['products', params],
    queryFn: () => getProducts(params).then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  const applyParams = (next: Partial<ProductListParams>) =>
    setParams((prev) => ({ ...prev, ...next, page: next.page ?? 1 }))

  const createMutation = useMutation({
    mutationFn: (data: ProductCreate) => apiCreate(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success(t('catalog.products.toast.createSuccess'))
    },
    onError: () => toast.error(t('catalog.products.toast.createError')),
  })
  const create = async (data: ProductCreate): Promise<Product | null> => {
    try {
      return await createMutation.mutateAsync(data)
    } catch {
      return null
    }
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductUpdate }) => apiUpdate(id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success(t('catalog.products.toast.updateSuccess'))
    },
    onError: () => toast.error(t('catalog.products.toast.updateError')),
  })
  const update = async (id: number, data: ProductUpdate): Promise<Product | null> => {
    try {
      return await updateMutation.mutateAsync({ id, data })
    } catch {
      return null
    }
  }

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success(t('catalog.products.toast.deleteSuccess'))
    },
    onError: () => toast.error(t('catalog.products.toast.deleteError')),
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
    products: query.data?.items ?? [],
    total:    query.data?.total ?? 0,
    pages:    query.data?.pages ?? 1,
    page:     query.data?.page  ?? 1,
    params,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? t('catalog.products.toast.loadError') : null,
    applyParams,
    refetch: query.refetch,
    create,
    update,
    remove,
  }
}

export type UseCatalogReturn = ReturnType<typeof useCatalog>
