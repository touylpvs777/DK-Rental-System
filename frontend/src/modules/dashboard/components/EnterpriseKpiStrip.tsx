import { useNavigate } from 'react-router-dom'
import {
  DollarSign, ClipboardList, Truck, Wrench, AlertTriangle, FileText,
} from 'lucide-react'
import type { KpiCardData } from '../types'

const ICON_MAP: Record<string, React.ElementType> = {
  DollarSign, ClipboardList, Truck, Wrench, AlertTriangle, FileText,
}

function EnterpriseKpiCard({ kpi }: { kpi: KpiCardData }) {
  const navigate = useNavigate()
  const Icon = ICON_MAP[kpi.icon] || FileText

  return (
    <div
      className="mp-kpi-widget"
      style={{ '--kpi-color': kpi.color, '--kpi-bg': kpi.bg, cursor: kpi.href ? 'pointer' : undefined } as React.CSSProperties}
      onClick={kpi.href ? () => navigate(kpi.href!) : undefined}
    >
      <div className="mp-kpi-header">
        <span className="mp-kpi-label">{kpi.label}</span>
        <div className="mp-kpi-icon"><Icon size={16} /></div>
      </div>
      <div className="mp-kpi-value">{kpi.value}</div>
      {kpi.change && (
        <div className={`mp-kpi-change ${kpi.change.direction === 'up' ? 'positive' : kpi.change.direction === 'down' ? 'negative' : 'neutral'}`}>
          {kpi.change.value}
        </div>
      )}
      {kpi.alert && (
        <div style={{
          marginTop: 6, fontSize: 11, fontWeight: 600, padding: '2px 8px',
          borderRadius: 'var(--radius-full)', display: 'inline-flex', alignItems: 'center', gap: 4,
          background: kpi.alert.variant === 'danger' ? 'var(--color-danger-50)' : 'var(--color-warning-50)',
          color: kpi.alert.variant === 'danger' ? 'var(--color-danger-600)' : 'var(--color-warning-600)',
          border: `1px solid ${kpi.alert.variant === 'danger' ? 'var(--color-danger-200)' : 'var(--color-warning-200)'}`,
        }}>
          <AlertTriangle size={10} /> {kpi.alert.text}
        </div>
      )}
    </div>
  )
}

export function EnterpriseKpiStripSkeleton() {
  return (
    <div className="mp-kpi-strip">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="mp-kpi-widget" style={{ minHeight: 100 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div className="skeleton-line" style={{ width: '50%', height: 10 }} />
            <div className="skeleton-line" style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)' }} />
          </div>
          <div className="skeleton-line" style={{ width: '35%', height: 22, marginTop: 10 }} />
          <div className="skeleton-line" style={{ width: '60%', height: 10, marginTop: 8 }} />
        </div>
      ))}
    </div>
  )
}

export default function EnterpriseKpiStrip({ kpis }: { kpis: KpiCardData[] }) {
  return (
    <div className="mp-kpi-strip">
      {kpis.map((kpi) => <EnterpriseKpiCard key={kpi.id} kpi={kpi} />)}
    </div>
  )
}
