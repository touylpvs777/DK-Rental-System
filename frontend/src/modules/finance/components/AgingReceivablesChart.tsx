import { useTranslation } from 'react-i18next'
import { fmtAmt } from '../utils'
import type { InvoiceOut } from '@/types/billing'

interface Props {
  invoices: InvoiceOut[]
  currency: string
}

interface Bucket { label: string; amount: number; count: number; color: string }

export default function AgingReceivablesChart({ invoices, currency }: Props) {
  const { t } = useTranslation()
  const today = new Date()
  const buckets: Bucket[] = [
    { label: t('billing.aging.buckets.current'), amount: 0, count: 0, color: 'var(--color-success-500)' },
    { label: t('billing.aging.buckets.days1to30'), amount: 0, count: 0, color: 'var(--color-info-500)' },
    { label: t('billing.aging.buckets.days31to60'), amount: 0, count: 0, color: 'var(--color-warning-500)' },
    { label: t('billing.aging.buckets.days61to90'), amount: 0, count: 0, color: 'var(--color-warning-600)' },
    { label: t('billing.aging.buckets.days90plus'), amount: 0, count: 0, color: 'var(--color-danger-500)' },
  ]

  invoices
    .filter((inv) => inv.balance_due > 0 && ['issued', 'sent', 'partially_paid', 'overdue'].includes(inv.status))
    .forEach((inv) => {
      const due = inv.due_date ? new Date(inv.due_date) : new Date(inv.created_at)
      const days = Math.floor((today.getTime() - due.getTime()) / 86_400_000)
      const idx = days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4
      buckets[idx].amount += inv.balance_due
      buckets[idx].count += 1
    })

  const maxAmt = Math.max(...buckets.map((b) => b.amount), 1)
  const totalOutstanding = buckets.reduce((s, b) => s + b.amount, 0)

  return (
    <div className="mp-chart-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="mp-chart-title" style={{ marginBottom: 0 }}>{t('billing.aging.title')}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: totalOutstanding > 0 ? 'var(--color-danger-600)' : 'var(--color-success-600)' }}>
          {fmtAmt(totalOutstanding)} {currency}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {buckets.map((b) => (
          <div key={b.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{b.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: b.amount > 0 ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                {fmtAmt(b.amount)}{b.count > 0 ? ` (${b.count})` : ''}
              </span>
            </div>
            <div style={{ height: 6, background: 'var(--color-bg)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(b.amount / maxAmt) * 100}%`, background: b.color, borderRadius: 3, transition: 'width 0.4s ease' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
