import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getInvoices } from '@/api/billing'
import type { InvoiceListParams } from '@/types/billing'

const DEFAULT_PARAMS: InvoiceListParams = {
  page: 1,
  page_size: 20,
}

export function useInvoices(initialParams: InvoiceListParams = DEFAULT_PARAMS) {
  const { t } = useTranslation()
  const [params, setParams] = useState<InvoiceListParams>(initialParams)

  const query = useQuery({
    queryKey: ['invoices', params],
    queryFn: () => getInvoices(params).then((r) => r.data),
    placeholderData: keepPreviousData,
  })

  const applyParams = (next: Partial<InvoiceListParams>) =>
    setParams((prev) => ({ ...prev, ...next, page: next.page ?? 1 }))

  return {
    invoices: query.data?.items ?? [],
    total:    query.data?.total ?? 0,
    pages:    query.data?.pages ?? 1,
    page:     query.data?.page  ?? 1,
    params,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.isError ? t('billing.invoice.list.loadError') : null,
    applyParams,
    refetch: query.refetch,
  }
}
