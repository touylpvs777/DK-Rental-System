import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { getBillingSummary, getInvoices, getPayments, markOverdueInvoices } from '@/api/billing'
import {
  FinanceKpiStrip, FinanceKpiStripSkeleton,
  RevenueAreaChart, AgingReceivablesChart,
  InvoiceStatusChart, CollectionRateGauge,
  RecentInvoices, RecentPayments,
} from '@/modules/finance'
import { toast } from '@/store/toastStore'
import type { BillingDashboardSummary, InvoiceOut, PaymentOut } from '@/types/billing'
import '@/styles/shared.css'

export default function FinanceDashboardPage() {
  const { t } = useTranslation()
  const [summary, setSummary] = useState<BillingDashboardSummary | null>(null)
  const [recentInvoices, setRecentInvoices] = useState<InvoiceOut[]>([])
  const [allInvoices, setAllInvoices] = useState<InvoiceOut[]>([])
  const [recentPayments, setRecentPayments] = useState<PaymentOut[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true); setError(null)
    try {
      const [sumRes, invRes, allRes, payRes] = await Promise.all([
        getBillingSummary(),
        getInvoices({ page_size: 6, sort: 'created_at', order: 'desc' }),
        getInvoices({ page_size: 100 }),
        getPayments({ page_size: 5, sort: 'created_at', order: 'desc' }),
      ])
      setSummary(sumRes.data)
      setRecentInvoices(invRes.data.items)
      setAllInvoices(allRes.data.items)
      setRecentPayments(payRes.data.items)
    } catch { setError(t('billing.finance.loadError')) }
    finally { setIsLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleMarkOverdue = async () => {
    try {
      const { data } = await markOverdueInvoices()
      toast.success(t('billing.common.markOverdueSuccess', { count: data.marked_overdue }))
      await load()
    } catch { toast.error(t('billing.common.markOverdueError')) }
  }

  if (error) return <div className="page-error"><AlertCircle size={16} /> {error}</div>

  return (
    <div>
      {/* Hero */}
      <div className="mp-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="mp-hero-title">{t('billing.finance.title')}</div>
            <div className="mp-hero-sub">{t('billing.finance.subtitle')}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={handleMarkOverdue}>
              <AlertTriangle size={14} /> {t('billing.common.markOverdue')}
            </button>
            <button className="btn btn-ghost" onClick={load} disabled={isLoading}>
              <RefreshCw size={14} className={isLoading ? 'spin' : ''} /> {t('billing.common.refresh')}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      {isLoading ? <FinanceKpiStripSkeleton /> : summary ? <FinanceKpiStrip data={summary} /> : null}

      {/* Charts Row 1: Revenue + Aging */}
      <div className="mp-chart-grid" style={{ marginTop: 16 }}>
        <RevenueAreaChart invoices={allInvoices} loading={isLoading} currency={summary?.currency ?? 'LAK'} />
        {summary && <AgingReceivablesChart invoices={allInvoices} currency={summary.currency} />}
      </div>

      {/* Charts Row 2: Collection Rate + Status Distribution */}
      <div className="mp-chart-grid" style={{ marginTop: 16 }}>
        {summary && <CollectionRateGauge data={summary} />}
        <InvoiceStatusChart invoices={allInvoices} />
      </div>

      {/* Recent Activity Row */}
      <div className="mp-chart-grid" style={{ marginTop: 16 }}>
        <RecentInvoices invoices={recentInvoices} />
        <RecentPayments payments={recentPayments} />
      </div>
    </div>
  )
}
