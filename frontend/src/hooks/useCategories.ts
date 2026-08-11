import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getCategoryTree,
  getCategoriesFlat,
  createCategory as apiCreate,
  updateCategory as apiUpdate,
  deleteCategory as apiDelete,
} from '@/api/catalog'
import { toast } from '@/store/toastStore'
import type { ProductCategory, CategoryCreate, CategoryUpdate } from '@/types/catalog'

function flattenTree(nodes: ProductCategory[], depth = 0): ProductCategory[] {
  const result: ProductCategory[] = []
  for (const n of nodes) {
    result.push({ ...n, _depth: depth } as ProductCategory & { _depth: number })
    if (n.children?.length) result.push(...flattenTree(n.children, depth + 1))
  }
  return result
}

export function useCategories() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const [treeRes, flatRes] = await Promise.all([getCategoryTree(), getCategoriesFlat()])
      return { tree: treeRes.data, flat: flatRes.data }
    },
  })

  const tree = useMemo(() => query.data?.tree ?? [], [query.data])
  const flat = query.data?.flat ?? []
  const treeFlattened = useMemo(() => flattenTree(tree), [tree])

  const createMutation = useMutation({
    mutationFn: (data: CategoryCreate) => apiCreate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success(t('catalog.categories.toast.createSuccess'))
    },
    onError: () => toast.error(t('catalog.categories.toast.createError')),
  })
  const create = async (data: CategoryCreate): Promise<boolean> => {
    try {
      await createMutation.mutateAsync(data)
      return true
    } catch {
      return false
    }
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryUpdate }) => apiUpdate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success(t('catalog.categories.toast.updateSuccess'))
    },
    onError: () => toast.error(t('catalog.categories.toast.updateError')),
  })
  const update = async (id: number, data: CategoryUpdate): Promise<boolean> => {
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
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success(t('catalog.categories.toast.deleteSuccess'))
    },
    onError: () => toast.error(t('catalog.categories.toast.deleteError')),
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
    tree,
    flat,
    treeFlattened,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? t('catalog.categories.toast.loadError') : null,
    refetch: query.refetch,
    create,
    update,
    remove,
  }
}
