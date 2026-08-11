import type { ReactNode } from 'react'

interface MarketplaceCardProps {
  title: string
  subtitle?: string
  value?: string
  badge?: ReactNode
  icon?: ReactNode
  thumb?: string
  footer?: ReactNode
  onClick?: () => void
}

export default function MarketplaceCard({
  title, subtitle, value, badge, icon, thumb, footer, onClick,
}: MarketplaceCardProps) {
  const handleKeyDown = onClick ? (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() }
  } : undefined

  return (
    <div
      className="mp-card"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? title : undefined}
    >
      <div className="mp-card-thumb">
        {thumb ? <img src={thumb} alt={title} /> : icon}
      </div>
      <div className="mp-card-body">
        <h3 className="mp-card-title">{title}</h3>
        {subtitle && <p className="mp-card-subtitle">{subtitle}</p>}
        <div className="mp-card-meta">
          {value && <span className="mp-card-value">{value}</span>}
          {badge}
        </div>
      </div>
      {footer && <div className="mp-card-footer">{footer}</div>}
    </div>
  )
}

export function MarketplaceCardSkeleton() {
  return (
    <div className="mp-card-skeleton" aria-hidden="true">
      <div className="mp-card-thumb" />
      <div className="mp-card-body">
        <div className="skeleton-line" style={{ width: '70%', marginBottom: 6 }} />
        <div className="skeleton-line" style={{ width: '50%', marginBottom: 12 }} />
        <div className="skeleton-line" style={{ width: '40%', height: 18 }} />
      </div>
    </div>
  )
}
