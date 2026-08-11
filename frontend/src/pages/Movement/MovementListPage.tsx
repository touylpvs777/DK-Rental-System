import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search, Plus, AlertCircle, RefreshCw, Grid3X3, List,
  ChevronLeft, ChevronRight, ArrowRightLeft,
} from 'lucide-react'
import { useMovements } from '@/hooks/useMovements'
import { MovementStatusBadge, MovementTypeBadge, MovementPriorityBadge } from '@/components/movement/MovementStatusBadge'
import MovementCard from '@/components/movement/MovementCard'
import type { MovementStatus, MovementType as MType } from '@/types/movement'
import PageHeader from '@/components/layout/PageHeader'
import '@/styles/shared.css'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_VALUES: MovementStatus[] = ['draft', 'preparing', 'in_transit', 'delivered', 'completed', 'cancelled']
const TYPE_VALUES: MType[] = ['warehouse_transfer', 'customer_deployment', 'customer_return', 'internal_relocation']

export default function MovementListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [view, setView] = useState<'grid' | 'list'>('list')
  const {
    movements, total, pages, params, isLoading, isFetching, error,
    applyParams: apply, refetch,
  } = useMovements({ page: 1, page_size: 20 })

  const currentPage = params.page ?? 1
  const hasFilters = params.q || params.status || params.movement_type

  return (
    <div>
      <PageHeader title={t('movement.list.title')} subtitle={t('movement.list.totalCount', { count: total })}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => refetch()} disabled={isFetching} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} className={isFetching ? 'spin' : ''} /> {t('movement.list.refresh')}
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/movements/new')}>
            <Plus size={15} /> {t('movement.list.newMovement')}
          </button>
        </div>
      </PageHeader>

      {error && <div className="page-error"><AlertCircle size={16} /> {error}</div>}

      <div className="toolbar">
        <div className="search-wrap">
          <Search size={14} />
          <input
            className="search-input"
            placeholder={t('movement.list.searchPlaceholder')}
            value={params.q ?? ''}
            onChange={(e) => apply({ q: e.target.value || undefined, page: 1 })}
          />
        </div>
        <select className="filter-select" value={params.status ?? ''} onChange={(e) => apply({ status: (e.target.value || undefined) as MovementStatus, page: 1 })}>
          <option value="">{t('movement.list.allStatuses')}</option>
          {STATUS_VALUES.map((v) => <option key={v} value={v}>{t(`movement.status.${v}`)}</option>)}
        </select>
        <select className="filter-select" value={params.movement_type ?? ''} onChange={(e) => apply({ movement_type: (e.target.value || undefined) as MType, page: 1 })}>
          <option value="">{t('movement.list.allTypes')}</option>
          {TYPE_VALUES.map((v) => <option key={v} value={v}>{t(`movement.type.${v}`)}</option>)}
        </select>
        {hasFilters && (
          <button className="clear-btn" onClick={() => apply({ q: undefined, status: undefined, movement_type: undefined, page: 1 })}>{t('common.clearFilters')}</button>
        )}
        <span className="toolbar-count">{t('movement.list.resultsCount', { count: total })}</span>
        <div className="view-toggle">
          <button className={`view-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')} aria-label={t('common.listView')}><List size={14} /></button>
          <button className={`view-btn${view === 'grid' ? ' active' : ''}`} onClick={() => setView('grid')} aria-label={t('common.gridView')}><Grid3X3 size={14} /></button>
        </div>
      </div>

      {view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12, marginTop: 12 }}>
          {isLoading ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ height: 140, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }} />
          )) : movements.map((m) => (
            <MovementCard key={m.id} movement={m} onClick={() => navigate(`/movements/${m.id}`)} />
          ))}
        </div>
      ) : (
        <div className="table-card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('movement.list.colMovement')}</th>
                  <th>{t('common.type')}</th>
                  <th>{t('common.status')}</th>
                  <th className="col-hide-sm">{t('movement.list.colEquipment')}</th>
                  <th className="col-hide-sm">{t('movement.list.colFromTo')}</th>
                  <th className="col-hide-sm">{t('movement.list.colScheduled')}</th>
                  <th className="col-hide-sm">{t('movement.list.colPriority')}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    <td><div className="skeleton-cell" style={{ width: '80%' }} /></td>
                    <td><div className="skeleton-cell" style={{ width: 60 }} /></td>
                    <td><div className="skeleton-cell" style={{ width: 70 }} /></td>
                    <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: '60%' }} /></td>
                    <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: '80%' }} /></td>
                    <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: 80 }} /></td>
                    <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: 50 }} /></td>
                  </tr>
                )) : movements.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="table-empty"><ArrowRightLeft size={36} /><p>{t('movement.list.noMovementsFound')}</p></div>
                  </td></tr>
                ) : movements.map((m) => (
                  <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/movements/${m.id}`)}>
                    <td>
                      <div className="cell-desc">{m.movement_number}</div>
                      {m.customer && <div className="cell-muted cell-sub">{m.customer.first_name} {m.customer.last_name}</div>}
                    </td>
                    <td><MovementTypeBadge type={m.movement_type} /></td>
                    <td><MovementStatusBadge status={m.status} /></td>
                    <td className="cell-muted col-hide-sm cell-sub">{m.forklift.serial_number}</td>
                    <td className="cell-muted col-hide-sm cell-sub">{m.from_location} → {m.to_location}</td>
                    <td className="cell-muted col-hide-sm">{fmtDate(m.scheduled_date)}</td>
                    <td className="col-hide-sm"><MovementPriorityBadge priority={m.priority} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isLoading && pages > 1 && (
            <div className="pagination">
              <span className="pagination-info">{t('movement.list.pageOf', { page: currentPage, pages, total })}</span>
              <div className="pagination-controls">
                <button className="page-btn" disabled={currentPage === 1} onClick={() => apply({ page: currentPage - 1 })}><ChevronLeft size={14} /></button>
                <button className="page-btn" disabled={currentPage === pages} onClick={() => apply({ page: currentPage + 1 })}><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
