import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, AlertTriangle, RefreshCw } from 'lucide-react'
import { getBillingSummary, markOverdueInvoices } from '@/api/billing'
import { FinanceKpiStrip, FinanceKpiStripSkeleton, FinanceQuickNav } from '@/modules/finance'
import { toast } from '@/store/toastStore'
import type { BillingDashboardSummary } from '@/types/billing'
import '@/styles/shared.css'

export default function BillingDashboardPage() {
  const { t } = useTranslation()
  const [data, setData] = useState<BillingDashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setIsLoading(true); setError(null)
    try { setData((await getBillingSummary()).data) }
    catch { setError(t('billing.dashboard.loadError')) }
    finally { setIsLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleMarkOverdue = async () => {
    try {
      const { data: res } = await markOverdueInvoices()
      toast.success(t('billing.common.markOverdueSuccess', { count: res.marked_overdue }))
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
            <div className="mp-hero-title">{t('billing.dashboard.title')}</div>
            <div className="mp-hero-sub">{t('billing.dashboard.subtitle')}</div>
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
      {isLoading ? <FinanceKpiStripSkeleton /> : data ? <FinanceKpiStrip data={data} /> : null}

      {/* Quick Navigation */}
      <div className="mp-section">
        <div className="mp-section-header">
          <span className="mp-section-title">{t('billing.dashboard.quickAccess')}</span>
        </div>
        <FinanceQuickNav />
      </div>
    </div>
  )
}
