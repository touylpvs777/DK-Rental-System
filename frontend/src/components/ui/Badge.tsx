import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

export type BadgeVariant = 'green' | 'amber' | 'gray' | 'blue' | 'red' | 'purple' | 'cyan'

const STYLES: Record<BadgeVariant, CSSProperties> = {
  green:  { background: 'var(--color-badge-green-bg)', color: 'var(--color-badge-green-text)', border: '1px solid var(--color-badge-green-border)' },
  amber:  { background: 'var(--color-badge-amber-bg)', color: 'var(--color-badge-amber-text)', border: '1px solid var(--color-badge-amber-border)' },
  gray:   { background: 'var(--color-badge-gray-bg)', color: 'var(--color-badge-gray-text)', border: '1px solid var(--color-badge-gray-border)' },
  blue:   { background: 'var(--color-badge-blue-bg)', color: 'var(--color-badge-blue-text)', border: '1px solid var(--color-badge-blue-border)' },
  red:    { background: 'var(--color-badge-red-bg)', color: 'var(--color-badge-red-text)', border: '1px solid var(--color-badge-red-border)' },
  purple: { background: 'var(--color-badge-purple-bg)', color: 'var(--color-badge-purple-text)', border: '1px solid var(--color-badge-purple-border)' },
  cyan:   { background: 'var(--color-badge-cyan-bg)', color: 'var(--color-badge-cyan-text)', border: '1px solid var(--color-badge-cyan-border)' },
}

const BASE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 9px',
  borderRadius: 20,
  fontSize: 11.5,
  fontWeight: 600,
  letterSpacing: 0.3,
  whiteSpace: 'nowrap',
}

interface BadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
}

export function Badge({ variant, children }: BadgeProps) {
  return <span style={{ ...BASE, ...STYLES[variant] }}>{children}</span>
}

// Convenience: customer status → badge
export function CustomerStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const map: Record<string, BadgeVariant> = {
    active:   'green',
    prospect: 'amber',
    inactive: 'gray',
    churned:  'red',
  }
  return <Badge variant={map[status] ?? 'gray'}>{t(`customers.status.${status}`, status)}</Badge>
}

// Convenience: lead status → badge
export function LeadStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const map: Record<string, BadgeVariant> = {
    new:       'purple',
    contacted: 'cyan',
    qualified: 'amber',
    proposal:  'blue',
    won:       'green',
    lost:      'red',
  }
  return <Badge variant={map[status] ?? 'gray'}>{t(`leads.status.${status}`, status)}</Badge>
}
