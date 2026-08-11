import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, RefreshCw, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react'
import { getRecognitions, recognizeRevenue, reverseRevenue } from '@/api/billing'
import type { RevenueRecognitionOut } from '@/types/billing'
import PageHeader from '@/components/layout/PageHeader'
import '@/styles/shared.css'

function fmtDate(iso: string | null) { return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' }
function fmtAmt(n: number) { return n.toLocaleString(undefined, { maximumFractionDigits: 0 }) }

const STATUS_COLORS: Record<string, string> = { scheduled: '#f59e0b', recognized: '#10b981', reversed: '#ef4444' }
const TYPE_LABEL_KEYS: Record<string, string> = {
  rental_income: 'billing.revenue.typeLabels.rentalIncome',
  service_fee: 'billing.revenue.typeLabels.serviceFee',
  penalty_fee: 'billing.revenue.typeLabels.penaltyFee',
  damage_recovery: 'billing.revenue.typeLabels.damageRecovery',
  deposit_forfeiture: 'billing.revenue.typeLabels.depositForfeiture',
}

function StatusBadge({ status }: { status: string }) {
  return <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, background: `${STATUS_COLORS[status] || '#6b7280'}18`, color: STATUS_COLORS[status] || '#6b7280' }}>{status}</span>
}

const STATUS_OPT_KEYS = [
  { value: '', labelKey: 'billing.revenue.statusOptions.all' },
  { value: 'scheduled', labelKey: 'billing.revenue.statusOptions.scheduled' },
  { value: 'recognized', labelKey: 'billing.revenue.statusOptions.recognized' },
  { value: 'reversed', labelKey: 'billing.revenue.statusOptions.reversed' },
]

const TYPE_OPT_KEYS = [
  { value: '', labelKey: 'billing.revenue.typeOptions.all' },
  { value: 'rental_income', labelKey: 'billing.revenue.typeOptions.rentalIncome' },
  { value: 'service_fee', labelKey: 'billing.revenue.typeOptions.serviceFee' },
  { value: 'penalty_fee', labelKey: 'billing.revenue.typeOptions.penaltyFee' },
  { value: 'damage_recovery', labelKey: 'billing.revenue.typeOptions.damageRecovery' },
  { value: 'deposit_forfeiture', labelKey: 'billing.revenue.typeOptions.depositForfeiture' },
]

export default function RevenueRecognitionPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState<RevenueRecognitionOut[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState<number | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true); setError(null)
    try {
      const { data } = await getRecognitions({ recognition_status: statusFilter || undefined, recognition_type: typeFilter || undefined, page, page_size: 20 })
      setItems(data.items); setTotal(data.total); setPages(data.pages)
    } catch { setError(t('billing.revenue.loadError')) }
    finally { setIsLoading(false) }
  }, [statusFilter, typeFilter, page, t])

  useEffect(() => { load() }, [load])

  const handleAction = async (id: number, fn: (id: number) => Promise<unknown>) => {
    setBusy(id)
    try { await fn(id); await load() }
    catch { alert(t('billing.revenue.actionError')) }
    finally { setBusy(null) }
  }

  return (
    <div>
      <PageHeader title={t('billing.revenue.title')} subtitle={t('billing.revenue.entriesCount', { count: total })}>
        <button className="btn btn-ghost" onClick={load} disabled={isLoading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} className={isLoading ? 'spin' : ''} /> {t('billing.common.refresh')}
        </button>
      </PageHeader>

      {error && <div className="page-error"><AlertCircle size={16} /> {error}</div>}

      <div className="toolbar">
        <select className="filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
          {STATUS_OPT_KEYS.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
        </select>
        <select className="filter-select" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}>
          {TYPE_OPT_KEYS.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
        </select>
        <span className="toolbar-count">{t('billing.revenue.resultsCount', { count: total })}</span>
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('billing.revenue.columns.number')}</th>
                <th>{t('common.type')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.date')}</th>
                <th>{t('common.amount')}</th>
                <th className="col-hide-sm">{t('billing.revenue.columns.period')}</th>
                <th className="col-hide-sm">{t('common.description')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td><div className="skeleton-cell" style={{ width: '80%' }} /></td>
                  <td><div className="skeleton-cell" style={{ width: 80 }} /></td>
                  <td><div className="skeleton-cell" style={{ width: 70 }} /></td>
                  <td><div className="skeleton-cell" style={{ width: 80 }} /></td>
                  <td><div className="skeleton-cell" style={{ width: 60 }} /></td>
                  <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: 100 }} /></td>
                  <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: '60%' }} /></td>
                  <td><div className="skeleton-cell" style={{ width: 60 }} /></td>
                </tr>
              )) : items.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="table-empty"><TrendingUp size={36} style={{ opacity: 0.3, marginBottom: 8 }} /><p>{t('billing.revenue.empty')}</p></div>
                </td></tr>
              ) : items.map((r) => (
                <tr key={r.id}>
                  <td className="cell-desc">{r.recognition_number}</td>
                  <td className="cell-muted">{TYPE_LABEL_KEYS[r.recognition_type] ? t(TYPE_LABEL_KEYS[r.recognition_type]) : r.recognition_type}</td>
                  <td><StatusBadge status={r.recognition_status} /></td>
                  <td className="cell-muted">{fmtDate(r.recognition_date)}</td>
                  <td className="cell-mono cell-total">{fmtAmt(r.amount)} {r.currency}</td>
                  <td className="cell-muted col-hide-sm">{r.period_start ? `${fmtDate(r.period_start)} — ${fmtDate(r.period_end)}` : '—'}</td>
                  <td className="cell-muted col-hide-sm" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description || '—'}</td>
                  <td>
                    {r.recognition_status === 'scheduled' && (
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px' }} disabled={busy === r.id} onClick={() => handleAction(r.id, recognizeRevenue)}>{t('billing.revenue.recognize')}</button>
                    )}
                    {r.recognition_status === 'recognized' && (
                      <button className="btn btn-secondary" style={{ fontSize: 11, padding: '2px 8px', color: 'var(--color-danger-500)' }} disabled={busy === r.id} onClick={() => handleAction(r.id, reverseRevenue)}>{t('billing.revenue.reverse')}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && pages > 1 && (
          <div className="pagination">
            <span className="pagination-info">{t('billing.revenue.paginationInfo', { page, pages, total })}</span>
            <div className="pagination-controls">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={14} /></button>
              <button className="page-btn" disabled={page === pages} onClick={() => setPage(page + 1)}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
