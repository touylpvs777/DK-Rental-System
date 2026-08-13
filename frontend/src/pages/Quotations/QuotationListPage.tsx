import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search, Plus, AlertCircle, ChevronLeft, ChevronRight,
  FileText, RefreshCw, Trash2,
} from 'lucide-react'
import { useQuotations } from '@/hooks/useQuotations'
import { QuotationStatusBadge } from '@/components/quotation/QuotationStatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import type { Quotation, QuotationStatus } from '@/types/quotation'
import PageHeader from '@/components/layout/PageHeader'
import '@/styles/shared.css'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtAmount(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export default function QuotationListPage() {
  const { t } = useTranslation()
  const {
    quotations, total, pages, page: currentPage,
    params, isLoading, isFetching, error,
    applyParams, refetch, remove,
  } = useQuotations({ page: 1, page_size: 20 })

  const navigate = useNavigate()

  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const STATUS_OPTIONS: { value: '' | QuotationStatus; label: string }[] = [
    { value: '', label: t('quotation.list.allStatuses', 'All statuses') },
    { value: 'draft', label: t('quotation.status.draft') },
    { value: 'sent', label: t('quotation.status.sent') },
    { value: 'approved', label: t('quotation.status.approved') },
    { value: 'rejected', label: t('quotation.status.rejected') },
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
      <PageHeader title={t('quotation.list.title', 'Quotations')} subtitle={t('quotation.list.totalCount', '{{count}} quotations', { count: total })}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => refetch()} disabled={isFetching} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} className={isFetching ? 'spin' : ''} /> {t('common.refresh')}
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/quotations/new')}>
            <Plus size={15} /> {t('quotation.list.newQuotation', 'New Quotation')}
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
            placeholder={t('quotation.list.searchPlaceholder', 'Search by quotation no…')}
            value={params.q ?? ''}
            onChange={(e) => applyParams({ q: e.target.value || undefined, page: 1 })}
          />
        </div>

        <select
          className="filter-select"
          value={params.status ?? ''}
          onChange={(e) => applyParams({ status: (e.target.value || undefined) as QuotationStatus | undefined, page: 1 })}
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {hasFilters && (
          <button className="clear-btn" onClick={() => applyParams({ q: undefined, status: undefined, page: 1 })}>
            {t('common.clearFilters')}
          </button>
        )}

        <span className="toolbar-count">{t('quotation.list.resultsCount', '{{count}} results', { count: total })}</span>
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('quotation.list.colQuotationNo', 'Quotation No')}</th>
                <th>{t('common.status')}</th>
                <th className="col-hide-sm">{t('quotation.list.colCustomer', 'Customer')}</th>
                <th className="col-hide-sm">{t('quotation.list.colForklift', 'Forklift')}</th>
                <th className="col-hide-sm">{t('quotation.list.colRentalPrice', 'Rental Price')}</th>
                <th className="col-hide-sm">{t('quotation.list.colStartDate', 'Start Date')}</th>
                <th className="col-hide-sm">{t('quotation.list.colEndDate', 'End Date')}</th>
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
                    <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: '80px' }} /></td>
                    <td><div className="skeleton-cell" style={{ width: '20px' }} /></td>
                  </tr>
                ))
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="table-empty">
                      <FileText size={36} />
                      <p>{t('quotation.list.noQuotationsFound', 'No quotations found.')}</p>
                      <small>{t('quotation.list.createOrAdjust', 'Create a new quotation or adjust your filters.')}</small>
                    </div>
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/quotations/${q.id}`)}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{q.quotation_no}</div>
                    </td>
                    <td><QuotationStatusBadge status={q.status} /></td>
                    <td className="cell-muted col-hide-sm">
                      {q.customer.first_name} {q.customer.last_name}
                      {q.customer.company ? ` (${q.customer.company})` : ''}
                    </td>
                    <td className="cell-muted col-hide-sm">
                      {q.forklift ? `${q.forklift.serial_number} — ${q.forklift.name_en}` : '—'}
                    </td>
                    <td className="cell-muted col-hide-sm cell-mono">{fmtAmount(q.rental_price)}</td>
                    <td className="cell-muted col-hide-sm">{fmtDate(q.expected_start_date)}</td>
                    <td className="cell-muted col-hide-sm">{fmtDate(q.expected_end_date)}</td>
                    <td>
                      {q.status === 'draft' && (
                        <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="action-btn danger"
                            title={t('common.delete')}
                            onClick={() => setDeleteTarget(q)}
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
              {t('quotation.list.pageOf', 'Page {{page}} of {{pages}} ({{total}} total)', { page: currentPage, pages, total })}
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
        title={t('quotation.list.deleteConfirmTitle', 'Delete quotation')}
        message={deleteTarget ? t('quotation.list.deleteConfirmMessage', 'Delete quotation {{number}}? This cannot be undone.', { number: deleteTarget.quotation_no }) : ''}
      />
    </div>
  )
}
