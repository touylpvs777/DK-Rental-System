import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Plus, RefreshCw, ChevronLeft, ChevronRight, CreditCard, Search } from 'lucide-react'
import { getPayments } from '@/api/billing'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import type { PaymentOut } from '@/types/billing'
import PageHeader from '@/components/layout/PageHeader'
import '@/styles/shared.css'

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
function fmtAmt(n: number) { return n.toLocaleString(undefined, { maximumFractionDigits: 0 }) }

const PAY_STATUS_VARIANTS: Record<string, BadgeVariant> = {
  pending: 'amber', confirmed: 'green', rejected: 'red', refunded: 'gray',
}
const STATUSES = ['pending', 'confirmed', 'rejected', 'refunded']
const METHODS = ['cash', 'bank_transfer', 'check', 'credit_card', 'mobile_payment']

export default function PaymentListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [items, setItems] = useState<PaymentOut[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setIsLoading(true); setError(null)
    try {
      const { data } = await getPayments({
        payment_status: statusFilter || undefined, payment_method: methodFilter || undefined,
        q: search || undefined, page, page_size: 20,
      })
      setItems(data.items); setTotal(data.total); setPages(data.pages)
    } catch { setError(t('billing.payment.toast.loadPaymentsFailed')) }
    finally { setIsLoading(false) }
  }, [statusFilter, methodFilter, search, page, t])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <PageHeader title={t('billing.payment.list.title')} subtitle={t('billing.payment.list.subtitle', { count: total })}>
        <button className="btn btn-ghost" onClick={load} disabled={isLoading}>
          <RefreshCw size={14} className={isLoading ? 'spin' : ''} /> {t('billing.common.refresh')}
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/billing/payments/new')}>
          <Plus size={14} /> {t('billing.payment.list.newPayment')}
        </button>
      </PageHeader>

      {error && <div className="page-error"><AlertCircle size={16} /> {error}</div>}

      <div className="toolbar">
        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input className="search-input" placeholder={t('billing.payment.searchPlaceholder')} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">{t('billing.payment.statusFilter.all')}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`billing.payment.status.${s}`, s)}</option>)}
        </select>
        <select className="filter-select" value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setPage(1) }}>
          <option value="">{t('billing.payment.methodFilter.all')}</option>
          {METHODS.map((m) => <option key={m} value={m}>{t(`billing.payment.method.${m}Short`, t(`billing.payment.method.${m}`, m))}</option>)}
        </select>
        <span className="toolbar-count">{t('billing.payment.list.resultsCount', { count: total })}</span>
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('billing.payment.table.number')}</th>
                <th>{t('billing.payment.table.customer')}</th>
                <th>{t('billing.payment.fields.method')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.amount')}</th>
                <th className="col-hide-sm">{t('common.date')}</th>
                <th className="col-hide-sm">{t('billing.payment.fields.reference')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td><div className="skeleton-cell" style={{ width: '80%' }} /></td>
                  <td><div className="skeleton-cell" style={{ width: '60%' }} /></td>
                  <td><div className="skeleton-cell" style={{ width: 80 }} /></td>
                  <td><div className="skeleton-cell" style={{ width: 72 }} /></td>
                  <td><div className="skeleton-cell" style={{ width: 70 }} /></td>
                  <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: 80 }} /></td>
                  <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: 70 }} /></td>
                </tr>
              )) : items.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="table-empty"><CreditCard size={40} /><p>{t('billing.payment.empty')}</p></div>
                </td></tr>
              ) : items.map((p) => {
                const variant = PAY_STATUS_VARIANTS[p.payment_status] ?? 'gray'
                return (
                  <tr key={p.id} onClick={() => navigate(`/billing/payments/${p.id}`)} style={{ cursor: 'pointer' }}>
                    <td className="cell-desc">{p.payment_number}</td>
                    <td>
                      <div className="cell-desc">{p.customer.first_name} {p.customer.last_name}</div>
                      {p.customer.company && <div className="cell-sub cell-muted">{p.customer.company}</div>}
                    </td>
                    <td className="cell-muted cell-type">{t(`billing.payment.method.${p.payment_method}Short`, t(`billing.payment.method.${p.payment_method}`, p.payment_method))}</td>
                    <td><Badge variant={variant}>{t(`billing.payment.status.${p.payment_status}`, p.payment_status)}</Badge></td>
                    <td className="cell-mono cell-total">{fmtAmt(p.amount)} {p.currency}</td>
                    <td className="cell-muted col-hide-sm">{fmtDate(p.payment_date)}</td>
                    <td className="cell-muted col-hide-sm">{p.reference_number || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!isLoading && pages > 1 && (
          <div className="pagination">
            <span className="pagination-info">{t('billing.payment.pagination.pageOf', { page, pages, total })}</span>
            <div className="pagination-controls">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={14} /></button>
              {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i
                if (p < 1 || p > pages) return null
                return <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              })}
              <button className="page-btn" disabled={page === pages} onClick={() => setPage(page + 1)}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
