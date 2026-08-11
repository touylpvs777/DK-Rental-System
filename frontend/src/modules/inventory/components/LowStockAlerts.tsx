import { AlertTriangle, ArrowRight, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ReorderAlert } from '@/types/inventory'

export function LowStockAlertsSkeleton() {
  return (
    <div className="mp-chart-panel">
      <div className="skeleton-line" style={{ width: 140, height: 12, marginBottom: 14 }} />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
          <div className="skeleton-line" style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton-line" style={{ width: '60%', height: 12, marginBottom: 6 }} />
            <div className="skeleton-line" style={{ width: '40%', height: 10 }} />
          </div>
          <div className="skeleton-line" style={{ width: 50, height: 20, borderRadius: 'var(--radius-full)' }} />
        </div>
      ))}
    </div>
  )
}

export default function LowStockAlerts({ alerts }: { alerts: ReorderAlert[] }) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  if (alerts.length === 0) {
    return (
      <div className="mp-chart-panel">
        <div className="mp-chart-title">{t('inventory.lowStock.title')}</div>
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
          {t('inventory.lowStock.allHealthy')}
        </div>
      </div>
    )
  }

  return (
    <div className="mp-chart-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangle size={14} style={{ color: 'var(--color-warning-500)' }} />
          <span className="mp-chart-title" style={{ marginBottom: 0 }}>{t('inventory.lowStock.title')}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 'var(--radius-full)', background: 'var(--color-danger-50)', color: 'var(--color-danger-600)', border: '1px solid var(--color-danger-200)' }}>
            {alerts.length}
          </span>
        </div>
        <a className="mp-section-link" onClick={() => navigate('/inventory/parts')}>{t('inventory.lowStock.viewAll')} <ArrowRight size={12} /></a>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {alerts.slice(0, 8).map((a) => {
          const ratio = a.min_stock_level > 0 ? a.quantity_available / a.min_stock_level : 0
          const barColor = ratio <= 0 ? 'var(--color-danger-500)' : ratio < 0.5 ? 'var(--color-warning-500)' : 'var(--color-warning-400)'

          return (
            <div
              key={`${a.spare_part_id}-${a.warehouse_id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px',
                borderBottom: '1px solid var(--color-border)', transition: 'background 0.1s', borderRadius: 'var(--radius)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-subtle)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 'var(--radius-md)', flexShrink: 0,
                background: 'var(--color-warning-50)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Package size={14} style={{ color: 'var(--color-warning-600)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.part_number} — {a.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>
                  {a.warehouse_code} · {t('inventory.lowStock.min')}: {a.min_stock_level} · {t('inventory.lowStock.reorder')}: {a.reorder_quantity}
                </div>
                <div style={{ height: 3, background: 'var(--color-bg)', borderRadius: 2, overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ height: '100%', width: `${Math.min(ratio * 100, 100)}%`, background: barColor, borderRadius: 2 }} />
                </div>
              </div>
              <div style={{
                fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                color: a.quantity_available <= 0 ? 'var(--color-danger-600)' : 'var(--color-warning-600)',
                minWidth: 30, textAlign: 'right',
              }}>
                {a.quantity_available}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
