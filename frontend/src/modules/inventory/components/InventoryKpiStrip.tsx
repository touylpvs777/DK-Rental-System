import { useNavigate } from 'react-router-dom'
import { Package, Warehouse, DollarSign, AlertTriangle, ShoppingCart, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DashboardSummary } from '@/types/inventory'

function fmtAmt(n: number) { return n.toLocaleString(undefined, { maximumFractionDigits: 0 }) }

export function InventoryKpiStripSkeleton() {
  return (
    <div className="mp-kpi-strip">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="mp-kpi-widget" style={{ minHeight: 90 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="skeleton-line" style={{ width: '50%', height: 10 }} />
            <div className="skeleton-line" style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)' }} />
          </div>
          <div className="skeleton-line" style={{ width: '35%', height: 22, marginTop: 10 }} />
        </div>
      ))}
    </div>
  )
}

export default function InventoryKpiStrip({ data }: { data: DashboardSummary }) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const kpis = [
    { label: t('inventory.kpi.spareParts'), value: data.total_parts.toString(), icon: Package, color: 'var(--color-primary-600)', bg: 'var(--color-primary-50)', onClick: () => navigate('/inventory/parts') },
    { label: t('inventory.kpi.warehouses'), value: data.total_warehouses.toString(), icon: Warehouse, color: 'var(--color-info-600)', bg: 'var(--color-info-50)', onClick: () => navigate('/inventory/warehouses') },
    { label: t('inventory.kpi.stockValue'), value: `${fmtAmt(data.total_stock_value)} ${data.currency}`, icon: DollarSign, color: 'var(--color-success-600)', bg: 'var(--color-success-50)' },
    { label: t('inventory.kpi.lowStock'), value: data.low_stock_count.toString(), icon: AlertTriangle, color: data.low_stock_count > 0 ? 'var(--color-danger-600)' : 'var(--color-success-600)', bg: data.low_stock_count > 0 ? 'var(--color-danger-50)' : 'var(--color-success-50)', alert: data.low_stock_count > 0 ? t('inventory.kpi.belowMinimum', { count: data.low_stock_count }) : undefined },
    { label: t('inventory.kpi.pendingPOs'), value: data.pending_po_count.toString(), icon: ShoppingCart, color: 'var(--color-warning-600)', bg: 'var(--color-warning-50)', onClick: () => navigate('/inventory/purchase-orders') },
  ]

  return (
    <div className="mp-kpi-strip">
      {kpis.map((k) => (
        <div
          key={k.label}
          className="mp-kpi-widget"
          style={{ '--kpi-color': k.color, '--kpi-bg': k.bg, cursor: k.onClick ? 'pointer' : undefined } as React.CSSProperties}
          onClick={k.onClick}
        >
          <div className="mp-kpi-header">
            <span className="mp-kpi-label">{k.label}</span>
            <div className="mp-kpi-icon"><k.icon size={16} /></div>
          </div>
          <div className="mp-kpi-value">{k.value}</div>
          {k.alert && <div className="mp-kpi-change negative"><AlertTriangle size={10} /> {k.alert}</div>}
          {k.onClick && !k.alert && <div className="mp-kpi-change neutral" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>{t('common.view')} <ArrowRight size={10} /></div>}
        </div>
      ))}
    </div>
  )
}
