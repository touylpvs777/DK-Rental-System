import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, Plus, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Grid3X3, List } from 'lucide-react'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { WOStatusBadge, WOTypeBadge, WOPriorityBadge } from '@/components/maintenance/MaintenanceStatusBadge'
import WorkOrderCard from '@/components/maintenance/WorkOrderCard'
import type { WOStatus } from '@/types/maintenance'
import PageHeader from '@/components/layout/PageHeader'
import '@/styles/shared.css'
import '@/styles/detail.css'

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }

export default function WorkOrderListPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const STATUS_OPTS = [
    { value: '', label: t('maintenance.workOrders.list.allStatuses') }, { value: 'scheduled', label: t('maintenance.status.scheduled') },
    { value: 'due', label: t('maintenance.status.due') }, { value: 'in_progress', label: t('maintenance.status.inProgress') },
    { value: 'completed', label: t('common.completed') }, { value: 'verified', label: t('maintenance.status.verified') },
    { value: 'cancelled', label: t('common.cancelled') },
  ]
  const TYPE_OPTS = [
    { value: '', label: t('maintenance.workOrders.list.allTypes') }, { value: 'preventive', label: t('maintenance.type.preventive') },
    { value: 'corrective', label: t('maintenance.type.corrective') }, { value: 'emergency', label: t('maintenance.type.emergency') },
    { value: 'inspection', label: t('maintenance.type.inspection') },
  ]
  const [view, setView] = useState<'list' | 'grid'>('list')
  const {
    workOrders: items, total, pages, params, isLoading, isFetching, error,
    applyParams: apply, refetch,
  } = useWorkOrders({ page: 1, page_size: 20 })
  const cp = params.page ?? 1

  return (
    <div>
      <PageHeader title={t('maintenance.workOrders.list.title')} subtitle={t('maintenance.workOrders.list.subtitle', { count: total })}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => refetch()} disabled={isFetching} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><RefreshCw size={14} className={isFetching ? 'spin' : ''} /> {t('maintenance.actions.refresh')}</button>
          <button className="btn btn-primary" onClick={() => navigate('/maintenance/work-orders/new')}><Plus size={15} /> {t('maintenance.workOrders.list.newWorkOrder')}</button>
        </div>
      </PageHeader>

      {error && <div className="page-error"><AlertCircle size={16} /> {error}</div>}

      <div className="toolbar">
        <div className="search-wrap"><Search size={14} /><input className="search-input" placeholder={t('maintenance.workOrders.list.searchPlaceholder')} value={params.q ?? ''} onChange={(e) => apply({ q: e.target.value || undefined, page: 1 })} /></div>
        <select className="filter-select" value={params.status ?? ''} onChange={(e) => apply({ status: (e.target.value || undefined) as WOStatus, page: 1 })}>{STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <select className="filter-select" value={params.order_type ?? ''} onChange={(e) => apply({ order_type: e.target.value || undefined, page: 1 })}>{TYPE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <span className="toolbar-count">{t('maintenance.workOrders.list.resultsCount', { count: total })}</span>
        <div className="view-toggle">
          <button className={`view-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}><List size={14} /></button>
          <button className={`view-btn${view === 'grid' ? ' active' : ''}`} onClick={() => setView('grid')}><Grid3X3 size={14} /></button>
        </div>
      </div>

      {view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12, marginTop: 12 }}>
          {isLoading ? Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ height: 130, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }} />) : items.map((wo) => <WorkOrderCard key={wo.id} wo={wo} onClick={() => navigate(`/maintenance/work-orders/${wo.id}`)} />)}
        </div>
      ) : (
        <div className="table-card">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>{t('maintenance.workOrders.list.columns.workOrder')}</th><th>{t('common.type')}</th><th>{t('common.status')}</th><th className="col-hide-sm">{t('maintenance.workOrders.detail.fields.equipment')}</th><th className="col-hide-sm">{t('maintenance.status.scheduled')}</th><th className="col-hide-sm">{t('maintenance.workOrders.list.columns.priority')}</th></tr></thead>
              <tbody>
                {isLoading ? Array.from({ length: 8 }).map((_, i) => <tr key={i} className="skeleton-row"><td><div className="skeleton-cell" style={{ width: '80%' }} /></td><td><div className="skeleton-cell" style={{ width: 60 }} /></td><td><div className="skeleton-cell" style={{ width: 70 }} /></td><td className="col-hide-sm"><div className="skeleton-cell" style={{ width: '60%' }} /></td><td className="col-hide-sm"><div className="skeleton-cell" style={{ width: 80 }} /></td><td className="col-hide-sm"><div className="skeleton-cell" style={{ width: 50 }} /></td></tr>) : items.length === 0 ? <tr><td colSpan={6}><div className="table-empty"><p>{t('common.noResultsFound')}</p></div></td></tr> : items.map((wo) => (
                  <tr key={wo.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/maintenance/work-orders/${wo.id}`)}>
                    <td><div className="cell-desc">{wo.work_order_number}</div><div className="cell-muted cell-sub">{wo.title}</div></td>
                    <td><WOTypeBadge type={wo.order_type} /></td>
                    <td><WOStatusBadge status={wo.status} /></td>
                    <td className="cell-muted col-hide-sm cell-sub">{wo.forklift.serial_number}</td>
                    <td className="cell-muted col-hide-sm">{fmtDate(wo.scheduled_date)}</td>
                    <td className="col-hide-sm"><WOPriorityBadge priority={wo.priority} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!isLoading && pages > 1 && (
            <div className="pagination">
              <span className="pagination-info">{t('maintenance.workOrders.list.paginationInfo', { page: cp, pages, total })}</span>
              <div className="pagination-controls">
                <button className="page-btn" disabled={cp === 1} onClick={() => apply({ page: cp - 1 })}><ChevronLeft size={14} /></button>
                <button className="page-btn" disabled={cp === pages} onClick={() => apply({ page: cp + 1 })}><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
