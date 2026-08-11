import { useNavigate } from 'react-router-dom'
import { DollarSign, CreditCard, Clock, AlertTriangle, FileText, Receipt } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { fmtCurrency } from '../utils'
import type { BillingDashboardSummary } from '@/types/billing'

export function FinanceKpiStripSkeleton() {
  return (
    <div className="mp-kpi-strip">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="mp-kpi-widget" style={{ minHeight: 96 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="skeleton-line" style={{ width: '50%', height: 10 }} />
            <div className="skeleton-line" style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)' }} />
          </div>
          <div className="skeleton-line" style={{ width: '40%', height: 22, marginTop: 10 }} />
          <div className="skeleton-line" style={{ width: '55%', height: 10, marginTop: 8 }} />
        </div>
      ))}
    </div>
  )
}

export default function FinanceKpiStrip({ data }: { data: BillingDashboardSummary }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const c = data.currency

  const kpis = [
    { label: t('finance.kpi.totalRevenue'), value: fmtCurrency(data.total_invoiced, c), icon: DollarSign, color: 'var(--color-success-600)', bg: 'var(--color-success-50)', href: '/billing/invoices' },
    { label: t('finance.kpi.collected'), value: fmtCurrency(data.total_paid, c), icon: CreditCard, color: 'var(--color-primary-600)', bg: 'var(--color-primary-50)', href: '/billing/payments' },
    { label: t('finance.kpi.outstanding'), value: fmtCurrency(data.total_outstanding, c), icon: Clock, color: 'var(--color-warning-600)', bg: 'var(--color-warning-50)' },
    { label: t('finance.kpi.overdue'), value: fmtCurrency(data.total_overdue, c), icon: AlertTriangle, color: data.total_overdue > 0 ? 'var(--color-danger-600)' : 'var(--color-success-600)', bg: data.total_overdue > 0 ? 'var(--color-danger-50)' : 'var(--color-success-50)', alert: data.total_overdue > 0 ? t('finance.kpi.pastDue', { amount: fmtCurrency(data.total_overdue, c) }) : undefined },
    { label: t('finance.kpi.invoices'), value: data.invoice_count.toString(), sub: t('finance.kpi.totalIssued'), icon: FileText, color: 'var(--color-info-600)', bg: 'var(--color-info-50)', href: '/billing/invoices' },
    { label: t('finance.kpi.payments'), value: data.payment_count.toString(), sub: t('finance.kpi.received'), icon: Receipt, color: 'var(--color-purple-600)', bg: 'var(--color-purple-50)', href: '/billing/payments' },
  ]

  return (
    <div className="mp-kpi-strip">
      {kpis.map((k) => (
        <div
          key={k.label}
          className="mp-kpi-widget"
          style={{ '--kpi-color': k.color, '--kpi-bg': k.bg, cursor: k.href ? 'pointer' : undefined } as React.CSSProperties}
          onClick={k.href ? () => navigate(k.href!) : undefined}
        >
          <div className="mp-kpi-header">
            <span className="mp-kpi-label">{k.label}</span>
            <div className="mp-kpi-icon"><k.icon size={16} /></div>
          </div>
          <div className="mp-kpi-value">{k.value}</div>
          {k.sub && <div className="mp-kpi-change neutral">{k.sub}</div>}
          {k.alert && (
            <div style={{ marginTop: 4, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--color-danger-50)', color: 'var(--color-danger-600)', border: '1px solid var(--color-danger-200)' }}>
              <AlertTriangle size={10} /> {k.alert}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
