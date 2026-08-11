import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, RefreshCw, ChevronLeft, ChevronRight, CreditCard, Search, CheckCircle, XCircle } from 'lucide-react'
import { getPayments, confirmPayment, rejectPayment } from '@/api/billing'
import PaymentStatusBadge from '@/components/billing/PaymentStatusBadge'
import { toast } from '@/store/toastStore'
import type { PaymentOut } from '@/types/billing'
import PageHeader from '@/components/layout/PageHeader'
import '@/styles/shared.css'

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
function fmtAmt(n: number) { return n.toLocaleString(undefined, { maximumFractionDigits: 0 }) }

const STATUSES = ['pending', 'confirmed', 'rejected', 'refunded']
const METHODS = ['cash', 'bank_transfer', 'check', 'credit_card', 'mobile_payment']

export default function PaymentPage() {
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
  const [busy, setBusy] = useState<number | null>(null)

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

  const quickAction = async (id: number, label: string, fn: () => Promise<unknown>) => {
    setBusy(id)
    try { await fn(); toast.success(label); await load() }
    catch { toast.error(t('billing.payment.toast.actionFailed', { action: label })) }
    finally { setBusy(null) }
  }

  return (
    <div>
      <PageHeader title={t('billing.payment.list.title')} subtitle={t('billing.payment.list.subtitle', { count: total })}>
        <button className="btn btn-ghost" onClick={load} disabled={isLoading}>
          <RefreshCw size={14} className={isLoading ? 'spin' : ''} /> {t('billing.common.refresh')}
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
                <th className="col-hide-sm">{t('billing.payment.fields.method')}</th>
                <th>{t('common.status')}</th>
                <th>{t('common.amount')}</th>
                <th className="col-hide-sm">{t('common.date')}</th>
                <th className="col-hide-sm">{t('billing.payment.fields.reference')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  {Array.from({ length: 8 }).map((__, j) => <td key={j} className={j > 4 ? 'col-hide-sm' : ''}><div className="skeleton-cell" style={{ width: j === 0 ? '80%' : 70 }} /></td>)}
                </tr>
              )) : items.length === 0 ? (
                <tr><td colSpan={8}><div className="table-empty"><CreditCard size={40} /><p>{t('billing.payment.empty')}</p></div></td></tr>
              ) : items.map((p) => (
                <tr key={p.id}>
                  <td className="cell-desc" style={{ cursor: 'pointer', color: 'var(--color-primary-600)' }} onClick={() => navigate(`/billing/payments/${p.id}`)}>{p.payment_number}</td>
                  <td>
                    <div className="cell-desc">{p.customer.first_name} {p.customer.last_name}</div>
                    {p.customer.company && <div className="cell-sub cell-muted">{p.customer.company}</div>}
                  </td>
                  <td className="cell-muted cell-type col-hide-sm">{t(`billing.payment.method.${p.payment_method}Short`, t(`billing.payment.method.${p.payment_method}`, p.payment_method))}</td>
                  <td><PaymentStatusBadge status={p.payment_status} /></td>
                  <td className="cell-mono cell-total">{fmtAmt(p.amount)} {p.currency}</td>
                  <td className="cell-muted col-hide-sm">{fmtDate(p.payment_date)}</td>
                  <td className="cell-muted col-hide-sm">{p.reference_number || '—'}</td>
                  <td>
                    {p.payment_status === 'pending' && (
                      <div className="row-actions">
                        <button className="action-btn" title={t('common.confirm')} disabled={busy === p.id} onClick={() => quickAction(p.id, t('billing.payment.toast.confirmed'), () => confirmPayment(p.id))}>
                          <CheckCircle size={15} />
                        </button>
                        <button className="action-btn danger" title={t('billing.payment.actions.reject')} disabled={busy === p.id} onClick={() => quickAction(p.id, t('billing.payment.toast.rejected'), () => rejectPayment(p.id))}>
                          <XCircle size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && pages > 1 && (
          <div className="pagination">
            <span className="pagination-info">{t('billing.payment.pagination.pageOf', { page, pages, total })}</span>
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
