import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, RefreshCw, FileSpreadsheet, Search } from 'lucide-react'
import { getInvoices } from '@/api/billing'
import StatementTable from '@/components/billing/StatementTable'
import { fmtAmt } from '@/modules/finance'
import type { InvoiceOut } from '@/types/billing'
import '@/styles/shared.css'

export default function StatementPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<InvoiceOut[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setIsLoading(true); setError(null)
    try {
      const { data } = await getInvoices({ page_size: 100, sort: 'issue_date', order: 'asc', q: search || undefined })
      setInvoices(data.items)
    } catch { setError(t('billing.statement.loadError')) }
    finally { setIsLoading(false) }
  }, [search, t])

  useEffect(() => { load() }, [load])

  const totalCharges = invoices.reduce((s, i) => s + i.total_amount, 0)
  const totalPayments = invoices.reduce((s, i) => s + i.amount_paid, 0)
  const totalBalance = invoices.reduce((s, i) => s + i.balance_due, 0)
  const currency = invoices[0]?.currency ?? 'LAK'

  return (
    <div>
      {/* Hero */}
      <div className="mp-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="mp-hero-title">{t('billing.statement.title')}</div>
            <div className="mp-hero-sub">{t('billing.statement.subtitle')}</div>
          </div>
          <button className="btn btn-ghost" onClick={load} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} /> {t('billing.common.refresh')}
          </button>
        </div>
      </div>

      {error && <div className="page-error"><AlertCircle size={16} /> {error}</div>}

      {/* Summary Strip */}
      <div className="mp-kpi-strip" style={{ marginBottom: 16 }}>
        <div className="mp-kpi-widget" style={{ '--kpi-color': 'var(--color-primary-600)' } as React.CSSProperties}>
          <div className="mp-kpi-label">{t('billing.statement.totalCharges')}</div>
          <div className="mp-kpi-value">{fmtAmt(totalCharges, 2)} {currency}</div>
        </div>
        <div className="mp-kpi-widget" style={{ '--kpi-color': 'var(--color-success-600)' } as React.CSSProperties}>
          <div className="mp-kpi-label">{t('billing.statement.totalPayments')}</div>
          <div className="mp-kpi-value">{fmtAmt(totalPayments, 2)} {currency}</div>
        </div>
        <div className="mp-kpi-widget" style={{ '--kpi-color': totalBalance > 0 ? 'var(--color-danger-600)' : 'var(--color-success-600)' } as React.CSSProperties}>
          <div className="mp-kpi-label">{t('billing.statement.outstandingBalance')}</div>
          <div className="mp-kpi-value" style={{ color: totalBalance > 0 ? 'var(--color-danger-600)' : 'var(--color-success-600)' }}>
            {fmtAmt(totalBalance, 2)} {currency}
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-wrap">
          <Search size={15} className="search-icon" />
          <input className="search-input" placeholder={t('billing.statement.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="toolbar-count">{t('billing.statement.entriesCount', { count: invoices.length })}</span>
      </div>

      {isLoading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>{t('billing.statement.loading')}</div>
      ) : invoices.length === 0 ? (
        <div className="mp-empty">
          <div className="mp-empty-icon"><FileSpreadsheet size={28} /></div>
          <div className="mp-empty-title">{t('billing.statement.noEntries')}</div>
          <div className="mp-empty-sub">{t('billing.statement.emptySub')}</div>
        </div>
      ) : (
        <StatementTable invoices={invoices} onRowClick={(id) => navigate(`/billing/invoices/${id}`)} />
      )}
    </div>
  )
}
