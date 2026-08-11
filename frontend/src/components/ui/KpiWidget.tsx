import type { ReactNode } from 'react'

interface KpiWidgetProps {
  label: string
  value: string | number
  sub?: string
  icon?: ReactNode
  color?: string
  bg?: string
  change?: { value: string; direction: 'positive' | 'negative' | 'neutral' }
  onClick?: () => void
}

export default function KpiWidget({ label, value, sub, icon, color, bg, change, onClick }: KpiWidgetProps) {
  return (
    <div
      className="mp-kpi-widget"
      style={{ '--kpi-color': color || 'var(--color-primary-600)', '--kpi-bg': bg || 'var(--color-primary-50)', cursor: onClick ? 'pointer' : undefined } as React.CSSProperties}
      onClick={onClick}
    >
      <div className="mp-kpi-header">
        <span className="mp-kpi-label">{label}</span>
        {icon && <div className="mp-kpi-icon">{icon}</div>}
      </div>
      <div className="mp-kpi-value">{value}</div>
      {(sub || change) && (
        <div className={`mp-kpi-change ${change?.direction ?? 'neutral'}`}>
          {change ? change.value : sub}
        </div>
      )}
    </div>
  )
}

export function KpiWidgetSkeleton() {
  return (
    <div className="mp-kpi-widget" style={{ minHeight: 90 }}>
      <div className="skeleton-line" style={{ width: '60%', height: 12, marginBottom: 12 }} />
      <div className="skeleton-line" style={{ width: '40%', height: 22 }} />
    </div>
  )
}
