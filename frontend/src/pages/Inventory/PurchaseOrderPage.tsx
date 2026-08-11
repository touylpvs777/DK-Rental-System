import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Plus, RefreshCw } from 'lucide-react'
import { getPurchaseOrders } from '@/api/inventory'
import { PurchaseOrderTable } from '@/modules/inventory'
import type { POListItem } from '@/types/inventory'
import PageHeader from '@/components/layout/PageHeader'
import '@/styles/shared.css'

export default function PurchaseOrderPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const STATUS_OPTS = [
    { value: '', label: t('inventory.purchaseOrder.status.all') },
    { value: 'draft', label: t('inventory.purchaseOrder.status.draft') },
    { value: 'ordered', label: t('inventory.purchaseOrder.status.ordered') },
    { value: 'partially_received', label: t('inventory.purchaseOrder.status.partial') },
    { value: 'received', label: t('inventory.purchaseOrder.status.received') },
    { value: 'cancelled', label: t('inventory.purchaseOrder.status.cancelled') },
  ]
  const [items, setItems] = useState<POListItem[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setIsLoading(true); setError(null)
    try {
      const { data } = await getPurchaseOrders({ status: statusFilter || undefined, page, page_size: 20 })
      setItems(data.items); setTotal(data.total); setPages(data.pages)
    } catch { setError(t('inventory.purchaseOrder.loadError')) }
    finally { setIsLoading(false) }
  }, [statusFilter, page])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <PageHeader title={t('inventory.purchaseOrder.title')} subtitle={t('inventory.purchaseOrder.subtitle', { count: total })}>
        <button className="btn btn-ghost" onClick={load} disabled={isLoading}>
          <RefreshCw size={14} className={isLoading ? 'spin' : ''} /> {t('inventory.common.refresh')}
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/inventory/purchase-orders/new')}>
          <Plus size={14} /> {t('inventory.purchaseOrder.newPO')}
        </button>
      </PageHeader>

      {error && <div className="page-error"><AlertCircle size={16} /> {error}</div>}

      <div className="toolbar">
        <select className="filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
          {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="toolbar-count">{t('inventory.common.resultCount', { count: total })}</span>
      </div>

      <PurchaseOrderTable
        items={items}
        total={total}
        page={page}
        pages={pages}
        isLoading={isLoading}
        onPageChange={setPage}
        onRowClick={(id) => navigate(`/inventory/purchase-orders/${id}`)}
      />
    </div>
  )
}
