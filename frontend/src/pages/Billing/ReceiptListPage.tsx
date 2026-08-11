import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search, Plus, AlertCircle, ChevronLeft, ChevronRight,
  BadgeCheck, RefreshCw, Trash2,
} from 'lucide-react'
import { useReceipts } from '@/hooks/useReceipts'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import type { Receipt } from '@/types/receipt'
import PageHeader from '@/components/layout/PageHeader'
import '@/styles/shared.css'

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'gray', confirmed: 'blue', cancelled: 'gray',
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtAmount(n: number, currency: string) {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency}`
}

export default function ReceiptListPage() {
  const { t } = useTranslation()
  const {
    receipts, total, pages, page: currentPage,
    params, isLoading, isFetching, error,
    applyParams, refetch, remove,
  } = useReceipts({ page: 1, page_size: 20 })

  const navigate = useNavigate()

  const [deleteTarget, setDeleteTarget] = useState<Receipt | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const STATUS_OPTIONS = [
    { value: '', label: t('receipts.list.allStatuses') },
    { value: 'draft', label: t('receipts.status.draft') },
    { value: 'confirmed', label: t('receipts.status.confirmed') },
    { value: 'cancelled', label: t('receipts.status.cancelled') },
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
      <PageHeader title={t('receipts.list.title')} subtitle={t('receipts.list.totalCount', { count: total })}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => refetch()} disabled={isFetching} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} className={isFetching ? 'spin' : ''} /> {t('quotations.list.refresh')}
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/billing/receipts/new')}>
            <Plus size={15} /> {t('receipts.list.newReceipt')}
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
            placeholder={t('receipts.list.searchPlaceholder')}
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
                <th>{t('receipts.table.number')}</th>
                <th>{t('common.status')}</th>
                <th className="col-hide-sm">{t('receipts.table.customer')}</th>
                <th className="col-hide-sm">{t('receipts.table.invoiceRef')}</th>
                <th className="col-hide-sm">{t('common.amount')}</th>
                <th className="col-hide-sm">{t('receipts.table.paymentDate')}</th>
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
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="table-empty">
                      <BadgeCheck size={36} />
                      <p>{t('receipts.list.empty')}</p>
                      <small>{t('receipts.list.createOrAdjust')}</small>
                    </div>
                  </td>
                </tr>
              ) : (
                receipts.map((r) => (
                  <tr
                    key={r.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/billing/receipts/${r.id}`)}
                  >
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.receipt_number}</div>
                    </td>
                    <td><Badge variant={STATUS_VARIANT[r.status] ?? 'gray'}>{t(`receipts.status.${r.status}`, r.status)}</Badge></td>
                    <td className="cell-muted col-hide-sm">
                      {r.customer ? `${r.customer.first_name} ${r.customer.last_name}` : '—'}
                    </td>
                    <td className="cell-muted col-hide-sm">{r.invoice?.invoice_number ?? '—'}</td>
                    <td className="cell-muted col-hide-sm cell-mono">
                      {fmtAmount(r.amount_received, r.currency)}
                    </td>
                    <td className="cell-muted col-hide-sm">{fmtDate(r.payment_date)}</td>
                    <td>
                      {r.status === 'draft' && (
                        <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="action-btn danger"
                            title={t('common.delete')}
                            onClick={() => setDeleteTarget(r)}
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
        title={t('receipts.list.deleteConfirmTitle')}
        message={deleteTarget ? t('receipts.list.deleteConfirmMessage', { number: deleteTarget.receipt_number }) : ''}
      />
    </div>
  )
}
