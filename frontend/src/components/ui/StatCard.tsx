import { TrendingUp, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import './StatCard.css'

export interface StatCardProps {
  label: string
  value: number | string
  icon: LucideIcon
  accent?: string
  iconBg?: string
  sublabel?: string
  /** Apply smaller font size for percentage strings */
  isRate?: boolean
  /**
   * Period-over-period delta percentage.
   * Positive → green up arrow · Negative → red down arrow · 0/undefined → hidden.
   */
  trend?: number
  trendLabel?: string
}

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'var(--color-primary)',
  iconBg = 'var(--color-primary-light)',
  sublabel,
  isRate = false,
  trend,
  trendLabel,
}: StatCardProps) {
  const hasTrend = trend !== undefined && trend !== null
  const isUp     = hasTrend && trend! > 0
  const isDown   = hasTrend && trend! < 0

  return (
    <div
      className="stat-card"
      style={{ '--stat-accent': accent, '--stat-icon-bg': iconBg } as React.CSSProperties}
    >
      <div className="stat-card-header">
        <span className="stat-card-label">{label}</span>
        <div className="stat-card-icon">
          <Icon size={18} />
        </div>
      </div>

      <div className={`stat-card-value${isRate ? ' is-rate' : ''}`}>{value}</div>

      {sublabel && <p className="stat-card-sub">{sublabel}</p>}

      {hasTrend && (
        <div className={`stat-card-trend ${isUp ? 'trend-up' : isDown ? 'trend-down' : 'trend-neutral'}`}>
          {isUp   && <TrendingUp   size={11} />}
          {isDown && <TrendingDown size={11} />}
          <span>
            {trend! > 0 ? '+' : ''}{trend!.toFixed(1)}%
            {trendLabel ? ` ${trendLabel}` : ''}
          </span>
        </div>
      )}
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="stat-card skeleton-card">
      <div className="stat-card-header">
        <div className="skeleton-line h-3 w-60" />
        <div className="skeleton-line h-10" />
      </div>
      <div className="skeleton-line h-7 w-40" />
    </div>
  )
}
