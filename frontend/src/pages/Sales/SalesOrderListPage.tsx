import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search, Plus, AlertCircle, ChevronLeft, ChevronRight,
  FileCheck2, RefreshCw, Trash2,
} from 'lucide-react'
import { useSalesOrders } from '@/hooks/useSalesOrders'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import type { SalesOrder } from '@/types/salesOrder'
import PageHeader from '@/components/layout/PageHeader'
import '@/styles/shared.css'

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'gray', confirmed: 'blue', completed: 'green', cancelled: 'gray',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtAmount(n: number, currency: string) {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency}`
}

export default function SalesOrderListPage() {
  const { t } = useTranslation()
  const {
    salesOrders, total, pages, page: currentPage,
    params, isLoading, isFetching, error,
    applyParams, refetch, remove,
  } = useSalesOrders({ page: 1, page_size: 20 })

  const navigate = useNavigate()

  const [deleteTarget, setDeleteTarget] = useState<SalesOrder | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const STATUS_OPTIONS = [
    { value: '', label: t('salesOrders.list.allStatuses') },
    { value: 'draft', label: t('salesOrders.status.draft') },
    { value: 'confirmed', label: t('salesOrders.status.confirmed') },
    { value: 'completed', label: t('salesOrders.status.completed') },
    { value: 'cancelled', label: t('salesOrders.status.cancelled') },
  ]

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    await remove(deleteTarget.id)
    setIsDeleting(false)
    setDeleteTarget(null)
  }

  const hasFilters = params.q || params.status

  const pageNumbers = (() => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
    if (currentPage <= 4) return [1, 2, 3, 4, 5, '…', pages]
    if (currentPage >= pages - 3) return [1, '…', ...Array.from({ length: 5 }, (_, i) => pages - 4 + i)]
    return [1, '…', currentPage - 1, currentPage, currentPage + 1, '…', pages]
  })()

  return (
    <div>
      <PageHeader title={t('salesOrders.list.title')} subtitle={t('salesOrders.list.totalCount', { count: total })}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => refetch()} disabled={isFetching} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} className={isFetching ? 'spin' : ''} /> {t('quotations.list.refresh')}
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/sales-orders/new')}>
            <Plus size={15} /> {t('salesOrders.list.newSalesOrder')}
          </button>
        </div>
      </PageHeader>

      {error && (
        <div className="page-error">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="toolbar">
        <div className="search-wrap">
          <Search size={14} />
          <input
            className="search-input"
            placeholder={t('salesOrders.list.searchPlaceholder')}
            value={params.q ?? ''}
            onChange={(e) => applyParams({ q: e.target.value || undefined, page: 1 })}
          />
        </div>

        <select
          className="filter-select"
          value={params.status ?? ''}
          onChange={(e) => applyParams({ status: (e.target.value || undefined) as never, page: 1 })}
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {hasFilters && (
          <button
            className="clear-btn"
            onClick={() => applyParams({ q: undefined, status: undefined, page: 1 })}
          >
            {t('common.clearFilters')}
          </button>
        )}

        <span className="toolbar-count">{t('quotations.list.resultsCount', { count: total })}</span>
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('salesOrders.table.number')}</th>
                <th>{t('common.status')}</th>
                <th className="col-hide-sm">{t('salesOrders.table.customer')}</th>
                <th className="col-hide-sm">{t('salesOrders.table.quotationRef')}</th>
                <th className="col-hide-sm">{t('common.amount')}</th>
                <th className="col-hide-sm">{t('salesOrders.table.orderDate')}</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    <td><div className="skeleton-cell" style={{ width: '80%' }} /></td>
                    <td><div className="skeleton-cell" style={{ width: '70px' }} /></td>
                    <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: '60%' }} /></td>
                    <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: '60%' }} /></td>
                    <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: '50%' }} /></td>
                    <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: '80px' }} /></td>
                    <td><div className="skeleton-cell" style={{ width: '20px' }} /></td>
                  </tr>
                ))
              ) : salesOrders.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="table-empty">
                      <FileCheck2 size={36} />
                      <p>{t('salesOrders.list.empty')}</p>
                      <small>{t('salesOrders.list.createOrAdjust')}</small>
                    </div>
                  </td>
                </tr>
              ) : (
                salesOrders.map((so) => (
                  <tr
                    key={so.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/sales-orders/${so.id}`)}
                  >
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{so.so_number}</div>
                        <div className="cell-muted" style={{ fontSize: 12 }}>{so.title}</div>
                      </div>
                    </td>
                    <td><Badge variant={STATUS_VARIANT[so.status] ?? 'gray'}>{t(`salesOrders.status.${so.status}`, so.status)}</Badge></td>
                    <td className="cell-muted col-hide-sm">
                      {so.customer ? `${so.customer.first_name} ${so.customer.last_name}` : '—'}
                    </td>
                    <td className="cell-muted col-hide-sm">{so.quotation?.quotation_number ?? '—'}</td>
                    <td className="cell-muted col-hide-sm cell-mono">
                      {fmtAmount(so.total_amount, so.currency)}
                    </td>
                    <td className="cell-muted col-hide-sm">{fmtDate(so.order_date)}</td>
                    <td>
                      {so.status === 'draft' && (
                        <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="action-btn danger"
                            title={t('common.delete')}
                            onClick={() => setDeleteTarget(so)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && pages > 1 && (
          <div className="pagination">
            <span className="pagination-info">
              {t('quotations.list.pageOf', { page: currentPage, pages, total })}
            </span>
            <div className="pagination-controls">
              <button className="page-btn" disabled={currentPage === 1} onClick={() => applyParams({ page: currentPage - 1 })}>
                <ChevronLeft size={14} />
              </button>
              {pageNumbers.map((p, i) =>
                p === '…' ? (
                  <span key={`e-${i}`} className="page-btn" style={{ cursor: 'default', border: 'none' }}>…</span>
                ) : (
                  <button key={p} className={`page-btn${currentPage === p ? ' active' : ''}`} onClick={() => applyParams({ page: p as number })}>
                    {p}
                  </button>
                )
              )}
              <button className="page-btn" disabled={currentPage === pages} onClick={() => applyParams({ page: currentPage + 1 })}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title={t('salesOrders.list.deleteConfirmTitle')}
        message={deleteTarget ? t('salesOrders.list.deleteConfirmMessage', { number: deleteTarget.so_number }) : ''}
      />
    </div>
  )
}
