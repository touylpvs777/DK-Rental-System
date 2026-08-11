import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search, Plus, AlertCircle, ChevronLeft, ChevronRight,
  FileText, RefreshCw, Trash2,
} from 'lucide-react'
import { useQuotations } from '@/hooks/useQuotations'
import { QuotationStatusBadge, QuotationTypeBadge } from '@/components/quotation/QuotationStatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import type { Quotation } from '@/types/quotation'
import PageHeader from '@/components/layout/PageHeader'
import '@/styles/shared.css'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtAmount(n: number, currency: string) {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency}`
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
  const [isDeleting, setIsDeleting]     = useState(false)

  const STATUS_OPTIONS = [
    { value: '', label: t('quotations.list.allStatuses') },
    { value: 'draft', label: t('quotations.status.draft') },
    { value: 'under_review', label: t('quotations.status.underReview') },
    { value: 'approved', label: t('quotations.status.approved') },
    { value: 'sent', label: t('quotations.status.sent') },
    { value: 'accepted', label: t('quotations.status.accepted') },
    { value: 'rejected', label: t('quotations.status.rejected') },
    { value: 'expired', label: t('quotations.status.expired') },
    { value: 'converted', label: t('quotations.status.converted') },
    { value: 'cancelled', label: t('quotations.status.cancelled') },
  ]

  const TYPE_OPTIONS = [
    { value: '', label: t('quotations.list.allTypes') },
    { value: 'rental', label: t('quotations.type.rental') },
    { value: 'sales', label: t('quotations.type.sales') },
    { value: 'service', label: t('quotations.type.service') },
    { value: 'spare_parts', label: t('quotations.type.spareParts') },
  ]

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    await remove(deleteTarget.id)
    setIsDeleting(false)
    setDeleteTarget(null)
  }

  const hasFilters = params.q || params.status || params.quotation_type

  const pageNumbers = (() => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
    if (currentPage <= 4) return [1, 2, 3, 4, 5, '…', pages]
    if (currentPage >= pages - 3) return [1, '…', ...Array.from({ length: 5 }, (_, i) => pages - 4 + i)]
    return [1, '…', currentPage - 1, currentPage, currentPage + 1, '…', pages]
  })()

  return (
    <div>
      <PageHeader title={t('quotations.list.title')} subtitle={t('quotations.list.totalCount', { count: total })}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => refetch()} disabled={isFetching} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} className={isFetching ? 'spin' : ''} /> {t('quotations.list.refresh')}
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/quotations/new')}>
            <Plus size={15} /> {t('quotations.list.newQuotation')}
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
            placeholder={t('quotations.list.searchPlaceholder')}
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

        <select
          className="filter-select"
          value={params.quotation_type ?? ''}
          onChange={(e) => applyParams({ quotation_type: (e.target.value || undefined) as never, page: 1 })}
        >
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {hasFilters && (
          <button
            className="clear-btn"
            onClick={() => applyParams({ q: undefined, status: undefined, quotation_type: undefined, page: 1 })}
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
                <th>{t('quotations.list.colQuotation')}</th>
                <th>{t('common.type')}</th>
                <th>{t('common.status')}</th>
                <th className="col-hide-sm">{t('quotations.list.colCustomer')}</th>
                <th className="col-hide-sm">{t('common.amount')}</th>
                <th className="col-hide-sm">{t('quotations.list.colValidUntil')}</th>
                <th className="col-hide-sm">{t('common.createdAt')}</th>
                <th style={{ width: 50 }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    <td><div className="skeleton-cell" style={{ width: '80%' }} /></td>
                    <td><div className="skeleton-cell" style={{ width: '60px' }} /></td>
                    <td><div className="skeleton-cell" style={{ width: '70px' }} /></td>
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
                      <p>{t('quotations.list.noQuotationsFound')}</p>
                      <small>{t('quotations.list.createOrAdjust')}</small>
                    </div>
                  </td>
                </tr>
              ) : (
                quotations.map((qt) => (
                  <tr
                    key={qt.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/quotations/${qt.id}`)}
                  >
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{qt.quotation_number}</div>
                        <div className="cell-muted" style={{ fontSize: 12 }}>{qt.title}</div>
                      </div>
                    </td>
                    <td><QuotationTypeBadge type={qt.quotation_type} /></td>
                    <td><QuotationStatusBadge status={qt.status} /></td>
                    <td className="cell-muted col-hide-sm">
                      {qt.customer
                        ? `${qt.customer.first_name} ${qt.customer.last_name}`
                        : '—'}
                    </td>
                    <td className="cell-muted col-hide-sm cell-mono">
                      {fmtAmount(qt.total_amount, qt.currency)}
                    </td>
                    <td className="cell-muted col-hide-sm">{fmtDate(qt.valid_until)}</td>
                    <td className="cell-muted col-hide-sm">{fmtDate(qt.created_at)}</td>
                    <td>
                      {qt.status === 'draft' && (
                        <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="action-btn danger"
                            title={t('common.delete')}
                            onClick={() => setDeleteTarget(qt)}
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
        title={t('quotations.list.deleteConfirmTitle')}
        message={deleteTarget ? t('quotations.list.deleteConfirmMessage', { number: deleteTarget.quotation_number }) : ''}
      />
    </div>
  )
}
