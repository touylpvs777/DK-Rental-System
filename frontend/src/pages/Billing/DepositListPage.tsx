import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Landmark } from 'lucide-react'
import { getDeposits } from '@/api/billing'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import type { DepositOut } from '@/types/billing'
import PageHeader from '@/components/layout/PageHeader'
import '@/styles/shared.css'

function fmtDate(iso: string | null) { return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' }
function fmtAmt(n: number) { return n.toLocaleString(undefined, { maximumFractionDigits: 0 }) }

const DEP_STATUS_VARIANT: Record<string, BadgeVariant> = {
  pending: 'amber', received: 'blue', partially_refunded: 'purple',
  refunded: 'green', forfeited: 'red', applied: 'cyan',
}
const DEP_STATUS_LABEL_KEYS: Record<string, string> = {
  pending: 'billing.deposit.status.pending', received: 'billing.deposit.status.received',
  partially_refunded: 'billing.deposit.status.partiallyRefunded', refunded: 'billing.deposit.status.refunded',
  forfeited: 'billing.deposit.status.forfeited', applied: 'billing.deposit.status.applied',
}
const STATUS_FILTER_VALUES = ['', 'pending', 'received', 'partially_refunded', 'refunded', 'forfeited', 'applied']
const TYPE_FILTER_VALUES = ['', 'security', 'advance', 'guarantee']

export default function DepositListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [items, setItems] = useState<DepositOut[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setIsLoading(true); setError(null)
    try {
      const { data } = await getDeposits({ deposit_status: statusFilter || undefined, deposit_type: typeFilter || undefined, page, page_size: 20 })
      setItems(data.items); setTotal(data.total); setPages(data.pages)
    } catch { setError(t('billing.deposit.list.loadError')) }
    finally { setIsLoading(false) }
  }, [statusFilter, typeFilter, page, t])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <PageHeader title={t('billing.deposit.list.title')} subtitle={t('billing.deposit.list.subtitle', { count: total })}>
        <button className="btn btn-ghost" onClick={load} disabled={isLoading}>
          <RefreshCw size={14} className={isLoading ? 'spin' : ''} /> {t('billing.common.refresh')}
        </button>
      </PageHeader>

      {error && <div className="page-error"><AlertCircle size={16} /> {error}</div>}

      <div className="toolbar">
        <select className="filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
          {STATUS_FILTER_VALUES.map((v) => (
            <option key={v} value={v}>{v === '' ? t('billing.deposit.status.all') : t(DEP_STATUS_LABEL_KEYS[v])}</option>
          ))}
        </select>
        <select className="filter-select" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}>
          {TYPE_FILTER_VALUES.map((v) => (
            <option key={v} value={v}>{t(v === '' ? 'billing.deposit.type.all' : `billing.deposit.type.${v}`)}</option>
          ))}
        </select>
        <span className="toolbar-count">{t('billing.deposit.list.resultsCount', { count: total })}</span>
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('billing.deposit.table.number')}</th>
                <th>{t('billing.deposit.table.customer')}</th>
                <th className="col-hide-sm">{t('billing.deposit.table.contract')}</th>
                <th>{t('common.type')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.amount')}</th>
                <th className="col-hide-sm">{t('billing.deposit.table.received')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td><div className="skeleton-cell" style={{ width: '80%' }} /></td>
                  <td><div className="skeleton-cell" style={{ width: '60%' }} /></td>
                  <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: '50%' }} /></td>
                  <td><div className="skeleton-cell" style={{ width: 65 }} /></td>
                  <td><div className="skeleton-cell" style={{ width: 72 }} /></td>
                  <td><div className="skeleton-cell" style={{ width: 70 }} /></td>
                  <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: 80 }} /></td>
                </tr>
              )) : items.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="table-empty"><Landmark size={40} /><p>{t('billing.deposit.list.empty')}</p></div>
                </td></tr>
              ) : items.map((d) => {
                const variant = DEP_STATUS_VARIANT[d.deposit_status] ?? ('gray' as BadgeVariant)
                const label = DEP_STATUS_LABEL_KEYS[d.deposit_status] ? t(DEP_STATUS_LABEL_KEYS[d.deposit_status]) : d.deposit_status
                return (
                  <tr key={d.id} onClick={() => navigate(`/billing/deposits/${d.id}`)} style={{ cursor: 'pointer' }}>
                    <td className="cell-desc">{d.deposit_number}</td>
                    <td>
                      <div className="cell-desc">{d.customer.first_name} {d.customer.last_name}</div>
                      {d.customer.company && <div className="cell-sub cell-muted">{d.customer.company}</div>}
                    </td>
                    <td className="cell-muted col-hide-sm">{d.contract.contract_number}</td>
                    <td className="cell-muted cell-type">{d.deposit_type}</td>
                    <td><Badge variant={variant}>{label}</Badge></td>
                    <td className="cell-mono cell-total">{fmtAmt(d.amount)} {d.currency}</td>
                    <td className="cell-muted col-hide-sm">{fmtDate(d.received_date)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!isLoading && pages > 1 && (
          <div className="pagination">
            <span className="pagination-info">{t('billing.deposit.pagination.info', { page, pages, total })}</span>
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
