import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search, Plus, AlertCircle, ChevronLeft, ChevronRight,
  FileText, RefreshCw, Trash2,
} from 'lucide-react'
import { useRentalContracts } from '@/hooks/useRentals'
import { RentalStatusBadge, RentalContractTypeBadge } from '@/components/rental/RentalStatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import type { RentalContract } from '@/types/rental'
import PageHeader from '@/components/layout/PageHeader'
import '@/styles/shared.css'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtAmount(n: number, currency: string) {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency}`
}

export default function RentalContractListPage() {
  const { t } = useTranslation()
  const {
    contracts, total, pages, page: currentPage,
    params, isLoading, isFetching, error,
    applyParams, refetch, remove,
  } = useRentalContracts({ page: 1, page_size: 20 })

  const navigate = useNavigate()

  const [deleteTarget, setDeleteTarget] = useState<RentalContract | null>(null)
  const [isDeleting, setIsDeleting]     = useState(false)

  const STATUS_OPTIONS = [
    { value: '', label: t('rental.list.allStatuses') },
    { value: 'reservation', label: t('rental.status.reservation') },
    { value: 'draft', label: t('rental.status.draft') },
    { value: 'pending_approval', label: t('rental.status.pendingApproval') },
    { value: 'approved', label: t('rental.status.approved') },
    { value: 'revision', label: t('rental.status.revision') },
    { value: 'delivering', label: t('rental.status.delivering') },
    { value: 'active', label: t('rental.status.active') },
    { value: 'overdue', label: t('rental.status.overdue') },
    { value: 'returning', label: t('rental.status.returning') },
    { value: 'inspecting', label: t('rental.status.inspecting') },
    { value: 'settling', label: t('rental.status.settling') },
    { value: 'closed', label: t('rental.status.closed') },
    { value: 'cancelled', label: t('rental.status.cancelled') },
  ]

  const TYPE_OPTIONS = [
    { value: '', label: t('rental.list.allTypes') },
    { value: 'short_term', label: t('rental.contractType.shortTerm') },
    { value: 'long_term', label: t('rental.contractType.longTerm') },
    { value: 'project', label: t('rental.contractType.project') },
  ]

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    await remove(deleteTarget.id)
    setIsDeleting(false)
    setDeleteTarget(null)
  }

  const hasFilters = params.q || params.status || params.contract_type

  const pageNumbers = (() => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
    if (currentPage <= 4) return [1, 2, 3, 4, 5, '…', pages]
    if (currentPage >= pages - 3) return [1, '…', ...Array.from({ length: 5 }, (_, i) => pages - 4 + i)]
    return [1, '…', currentPage - 1, currentPage, currentPage + 1, '…', pages]
  })()

  return (
    <div>
      <PageHeader title={t('rental.list.title')} subtitle={t('rental.list.totalCount', { count: total })}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => refetch()} disabled={isFetching} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} className={isFetching ? 'spin' : ''} /> {t('rental.list.refresh')}
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/rental-contracts/new')}>
            <Plus size={15} /> {t('rental.list.newContract')}
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
            placeholder={t('rental.list.searchPlaceholder')}
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
          value={params.contract_type ?? ''}
          onChange={(e) => applyParams({ contract_type: (e.target.value || undefined) as never, page: 1 })}
        >
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        {hasFilters && (
          <button
            className="clear-btn"
            onClick={() => applyParams({ q: undefined, status: undefined, contract_type: undefined, page: 1 })}
          >
            {t('common.clearFilters')}
          </button>
        )}

        <span className="toolbar-count">{t('rental.list.resultsCount', { count: total })}</span>
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('rental.list.colContract')}</th>
                <th>{t('common.type')}</th>
                <th>{t('common.status')}</th>
                <th className="col-hide-sm">{t('rental.list.colCustomer')}</th>
                <th className="col-hide-sm">{t('rental.list.colTotalValue')}</th>
                <th className="col-hide-sm">{t('rental.list.colStartDate')}</th>
                <th className="col-hide-sm">{t('rental.list.colEndDate')}</th>
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
              ) : contracts.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="table-empty">
                      <FileText size={36} />
                      <p>{t('rental.list.noContractsFound')}</p>
                      <small>{t('rental.list.createOrAdjust')}</small>
                    </div>
                  </td>
                </tr>
              ) : (
                contracts.map((rc) => (
                  <tr
                    key={rc.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/rental-contracts/${rc.id}`)}
                  >
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{rc.contract_number}</div>
                        <div className="cell-muted" style={{ fontSize: 12 }}>
                          {rc.customer.first_name} {rc.customer.last_name}
                        </div>
                      </div>
                    </td>
                    <td><RentalContractTypeBadge type={rc.contract_type} /></td>
                    <td><RentalStatusBadge status={rc.status} /></td>
                    <td className="cell-muted col-hide-sm">
                      {rc.customer.first_name} {rc.customer.last_name}
                      {rc.customer.company ? ` (${rc.customer.company})` : ''}
                    </td>
                    <td className="cell-muted col-hide-sm cell-mono">
                      {fmtAmount(rc.total_value, rc.currency)}
                    </td>
                    <td className="cell-muted col-hide-sm">{fmtDate(rc.start_date)}</td>
                    <td className="cell-muted col-hide-sm">{fmtDate(rc.end_date)}</td>
                    <td>
                      {(rc.status === 'draft' || rc.status === 'reservation') && (
                        <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="action-btn danger"
                            title={t('common.delete')}
                            onClick={() => setDeleteTarget(rc)}
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
              {t('rental.list.pageOf', { page: currentPage, pages, total })}
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
        title={t('rental.list.deleteConfirmTitle')}
        message={deleteTarget ? t('rental.list.deleteConfirmMessage', { number: deleteTarget.contract_number }) : ''}
      />
    </div>
  )
}
