import { useTranslation } from 'react-i18next'
import type { InvoiceOut } from '@/types/billing'

function fmtAmt(n: number) { return n.toLocaleString(undefined, { maximumFractionDigits: 0 }) }

interface Props {
  invoices: InvoiceOut[]
  currency: string
}

export default function RevenueChart({ invoices }: Props) {
  const { t } = useTranslation()
  const monthlyData: Record<string, { invoiced: number; paid: number }> = {}

  invoices.forEach((inv) => {
    const d = inv.issue_date || inv.created_at
    const month = d ? d.substring(0, 7) : 'Unknown'
    if (!monthlyData[month]) monthlyData[month] = { invoiced: 0, paid: 0 }
    monthlyData[month].invoiced += inv.total_amount
    monthlyData[month].paid += inv.amount_paid
  })

  const months = Object.keys(monthlyData).sort().slice(-6)
  const maxValue = Math.max(...months.map((m) => monthlyData[m].invoiced), 1)

  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)', padding: '18px 20px',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--color-text-muted)', marginBottom: 16 }}>
        {t('billing.revenueChart.title')}
      </div>
      {months.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13, padding: '20px 0' }}>{t('billing.revenueChart.empty')}</div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
          {months.map((m) => {
            const d = monthlyData[m]
            const invH = (d.invoiced / maxValue) * 100
            const paidH = (d.paid / maxValue) * 100
            const label = new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' })
            return (
              <div key={m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 100, width: '100%', justifyContent: 'center' }}>
                  <div style={{ width: '35%', height: `${invH}%`, minHeight: 2, background: 'var(--color-primary-400)', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} title={t('billing.revenueChart.invoicedTooltip', { amount: fmtAmt(d.invoiced) })} />
                  <div style={{ width: '35%', height: `${paidH}%`, minHeight: 2, background: 'var(--color-success-400)', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} title={t('billing.revenueChart.paidTooltip', { amount: fmtAmt(d.paid) })} />
                </div>
                <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 500 }}>{label}</span>
              </div>
            )
          })}
        </div>
      )}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-primary-400)' }} />
          <span style={{ color: 'var(--color-text-muted)' }}>{t('billing.revenueChart.invoiced')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-success-400)' }} />
          <span style={{ color: 'var(--color-text-muted)' }}>{t('billing.revenueChart.paid')}</span>
        </div>
      </div>
    </div>
  )
}
