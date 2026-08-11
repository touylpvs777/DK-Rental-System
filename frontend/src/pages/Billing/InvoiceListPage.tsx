import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, RefreshCw, ChevronLeft, ChevronRight, FileText, Search, Plus } from 'lucide-react'
import { useInvoices } from '@/hooks/useInvoices'
import { Badge } from '@/components/ui/Badge'
import type { BadgeVariant } from '@/components/ui/Badge'
import PageHeader from '@/components/layout/PageHeader'
import '@/styles/shared.css'

function fmtDate(iso: string | null) { return iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—' }
function fmtAmt(n: number) { return n.toLocaleString(undefined, { maximumFractionDigits: 0 }) }

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'gray', issued: 'blue', sent: 'purple', partially_paid: 'amber',
  paid: 'green', overdue: 'red', cancelled: 'gray', voided: 'gray',
}
const STATUS_LABEL_KEYS: Record<string, string> = {
  draft: 'billing.invoice.status.draft', issued: 'billing.invoice.status.issued',
  sent: 'billing.invoice.status.sent', partially_paid: 'billing.invoice.status.partially_paid',
  paid: 'billing.invoice.status.paid', overdue: 'billing.invoice.status.overdue',
  cancelled: 'billing.invoice.status.cancelled', voided: 'billing.invoice.status.voided',
}
const STATUS_FILTER_VALUES = ['', 'draft', 'issued', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled', 'voided']

export default function InvoiceListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    invoices: items, total, pages, params, isLoading, isFetching, error,
    applyParams, refetch,
  } = useInvoices({ page: 1, page_size: 20 })
  const statusFilter = params.status ?? ''
  const search = params.q ?? ''
  const page = params.page ?? 1

  function InvoiceStatusBadge({ status }: { status: string }) {
    const variant = STATUS_VARIANT[status] ?? ('gray' as BadgeVariant)
    const label = STATUS_LABEL_KEYS[status] ? t(STATUS_LABEL_KEYS[status]) : status
    return <Badge variant={variant}>{label}</Badge>
  }

  return (
    <div>
      <PageHeader title={t('billing.invoice.list.title')} subtitle={t('billing.invoice.list.subtitle', { count: total })}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={14} className={isFetching ? 'spin' : ''} /> {t('billing.common.refresh')}
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/billing/invoices/new')}>
            <Plus size={15} /> {t('billing.invoice.list.newInvoice')}
          </button>
        </div>
      </PageHeader>

      {error && <div className="page-error"><AlertCircle size={16} /> {error}</div>}

      <div className="toolbar">
        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input className="search-input" placeholder={t('billing.invoice.list.searchPlaceholder')} value={search} onChange={(e) => applyParams({ q: e.target.value || undefined, page: 1 })} />
        </div>
        <select className="filter-select" value={statusFilter} onChange={(e) => applyParams({ status: e.target.value || undefined, page: 1 })}>
          {STATUS_FILTER_VALUES.map((v) => (
            <option key={v} value={v}>
              {v === '' ? t('billing.invoice.filter.all') : v === 'partially_paid' ? t('billing.invoice.filter.partially_paid') : t(STATUS_LABEL_KEYS[v])}
            </option>
          ))}
        </select>
        <span className="toolbar-count">{t('billing.invoice.list.resultsCount', { count: total })}</span>
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('billing.invoice.table.number')}</th>
                <th>{t('billing.invoice.table.customer')}</th>
                <th>{t('common.status')}</th>
                <th className="col-hide-sm">{t('billing.invoice.meta.issueDate')}</th>
                <th className="col-hide-sm">{t('billing.invoice.meta.dueDate')}</th>
                <th>{t('common.total')}</th>
                <th className="col-hide-sm">{t('billing.invoice.table.balance')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="skeleton-row">
                  <td><div className="skeleton-cell" style={{ width: '80%' }} /></td>
                  <td><div className="skeleton-cell" style={{ width: '60%' }} /></td>
                  <td><div className="skeleton-cell" style={{ width: 72 }} /></td>
                  <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: 80 }} /></td>
                  <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: 80 }} /></td>
                  <td><div className="skeleton-cell" style={{ width: 70 }} /></td>
                  <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: 70 }} /></td>
                </tr>
              )) : items.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="table-empty"><FileText size={40} /><p>{t('billing.invoice.list.empty')}</p></div>
                </td></tr>
              ) : items.map((inv) => (
                <tr key={inv.id} onClick={() => navigate(`/billing/invoices/${inv.id}`)} style={{ cursor: 'pointer' }}>
                  <td className="cell-desc">{inv.invoice_number}</td>
                  <td>
                    <div className="cell-desc">{inv.customer.first_name} {inv.customer.last_name}</div>
                    {inv.customer.company && <div className="cell-sub cell-muted">{inv.customer.company}</div>}
                  </td>
                  <td><InvoiceStatusBadge status={inv.status} /></td>
                  <td className="cell-muted col-hide-sm">{fmtDate(inv.issue_date)}</td>
                  <td className="cell-muted col-hide-sm">{fmtDate(inv.due_date)}</td>
                  <td className="cell-mono cell-total">{fmtAmt(inv.total_amount)} {inv.currency}</td>
                  <td className="cell-mono col-hide-sm" style={{ color: inv.balance_due > 0 ? 'var(--color-danger-600)' : 'var(--color-success-600)' }}>
                    {fmtAmt(inv.balance_due)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && pages > 1 && (
          <div className="pagination">
            <span className="pagination-info">{t('billing.invoice.pagination.info', { page, pages, total })}</span>
            <div className="pagination-controls">
              <button className="page-btn" disabled={page === 1} onClick={() => applyParams({ page: page - 1 })}><ChevronLeft size={14} /></button>
              {Array.from({ length: Math.min(pages, 5) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i
                if (p < 1 || p > pages) return null
                return <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => applyParams({ page: p })}>{p}</button>
              })}
              <button className="page-btn" disabled={page === pages} onClick={() => applyParams({ page: page + 1 })}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
