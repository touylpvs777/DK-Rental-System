import { useTranslation } from 'react-i18next'
import { fmtAmt } from '../utils'
import type { BillingDashboardSummary } from '@/types/billing'

export default function CollectionRateGauge({ data }: { data: BillingDashboardSummary }) {
  const { t } = useTranslation()
  const rate = data.total_invoiced > 0 ? (data.total_paid / data.total_invoiced) * 100 : 0
  const rateColor = rate >= 80 ? 'var(--color-success-500)' : rate >= 50 ? 'var(--color-warning-500)' : 'var(--color-danger-500)'

  const circumference = 2 * Math.PI * 54
  const dashOffset = circumference - (circumference * Math.min(rate, 100)) / 100

  return (
    <div className="mp-chart-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span className="mp-chart-title" style={{ alignSelf: 'flex-start' }}>{t('finance.collectionRate.title')}</span>

      <div style={{ position: 'relative', width: 140, height: 140, margin: '8px 0' }}>
        <svg width="140" height="140" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="54" fill="none" stroke="var(--color-bg)" strokeWidth="8" />
          <circle
            cx="60" cy="60" r="54" fill="none" stroke={rateColor} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: rateColor }}>{Math.round(rate)}%</div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{t('finance.collectionRate.collected')}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)' }}>{fmtAmt(data.total_paid)}</div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>{t('finance.collectionRate.collected')}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)' }}>{fmtAmt(data.total_invoiced)}</div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>{t('finance.collectionRate.invoiced')}</div>
        </div>
      </div>
    </div>
  )
}
