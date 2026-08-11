import { useTranslation } from 'react-i18next'
import InvoiceStatusBadge from '@/components/billing/InvoiceStatusBadge'
import type { InvoiceOut } from '@/types/billing'

export default function InvoiceStatusChart({ invoices }: { invoices: InvoiceOut[] }) {
  const { t } = useTranslation()
  const dist = invoices.reduce<Record<string, number>>((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1
    return acc
  }, {})

  const entries = Object.entries(dist).sort((a, b) => b[1] - a[1])
  const total = invoices.length

  return (
    <div className="mp-chart-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span className="mp-chart-title" style={{ marginBottom: 0 }}>{t('finance.invoiceStatusChart.title')}</span>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{t('finance.invoiceStatusChart.totalCount', { count: total })}</span>
      </div>
      {entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>{t('finance.invoiceStatusChart.empty')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map(([status, count]) => {
            const pctVal = total > 0 ? Math.round((count / total) * 100) : 0
            return (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 82 }}><InvoiceStatusBadge status={status} /></div>
                <div style={{ flex: 1, height: 6, background: 'var(--color-bg)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pctVal}%`, background: 'var(--color-primary-400)', borderRadius: 3, transition: 'width 0.4s' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums', minWidth: 28, textAlign: 'right', color: 'var(--color-text)' }}>{count}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
