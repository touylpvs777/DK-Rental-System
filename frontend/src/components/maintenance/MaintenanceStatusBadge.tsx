import { useTranslation } from 'react-i18next'

const STATUS: Record<string, { key: string; color: string; bg: string }> = {
  scheduled:   { key: 'maintenance.status.scheduled', color: 'var(--color-gray-700)',    bg: 'var(--color-gray-100)' },
  due:         { key: 'maintenance.status.due',        color: 'var(--color-warning-700)', bg: 'var(--color-warning-50)' },
  in_progress: { key: 'maintenance.status.inProgress', color: 'var(--color-info-700)',    bg: 'var(--color-info-50)' },
  completed:   { key: 'common.completed',              color: 'var(--color-success-700)', bg: 'var(--color-success-50)' },
  verified:    { key: 'maintenance.status.verified',   color: 'var(--color-primary-700)', bg: 'var(--color-primary-50)' },
  cancelled:   { key: 'common.cancelled',               color: 'var(--color-danger-700)',  bg: 'var(--color-danger-50)' },
}

const TYPE: Record<string, { key: string; color: string; bg: string }> = {
  preventive:  { key: 'maintenance.type.preventive',  color: 'var(--color-primary-700)', bg: 'var(--color-primary-50)' },
  corrective:  { key: 'maintenance.type.corrective',  color: 'var(--color-warning-700)', bg: 'var(--color-warning-50)' },
  emergency:   { key: 'maintenance.type.emergency',   color: 'var(--color-danger-700)',  bg: 'var(--color-danger-50)' },
  inspection:  { key: 'maintenance.type.inspection',  color: 'var(--color-info-700)',    bg: 'var(--color-info-50)' },
}

const PRIORITY: Record<string, { key: string; color: string; bg: string }> = {
  low:      { key: 'maintenance.priority.low',      color: 'var(--color-gray-600)',    bg: 'var(--color-gray-100)' },
  normal:   { key: 'maintenance.priority.normal',   color: 'var(--color-primary-600)', bg: 'var(--color-primary-50)' },
  high:     { key: 'maintenance.priority.high',     color: 'var(--color-warning-700)', bg: 'var(--color-warning-50)' },
  critical: { key: 'maintenance.priority.critical', color: 'var(--color-danger-700)',  bg: 'var(--color-danger-50)' },
}

const badge = (c: { color: string; bg: string }): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
  borderRadius: 'var(--radius-full)', fontSize: 11.5, fontWeight: 600,
  color: c.color, background: c.bg, whiteSpace: 'nowrap',
})

const fallback = { color: 'var(--color-gray-700)', bg: 'var(--color-gray-100)' }

export function WOStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const s = STATUS[status]
  const label = s ? t(s.key) : status
  return <span style={badge(s ?? fallback)}>{label}</span>
}

export function WOTypeBadge({ type }: { type: string }) {
  const { t } = useTranslation()
  const s = TYPE[type]
  const label = s ? t(s.key) : type
  return <span style={badge(s ?? fallback)}>{label}</span>
}

export function WOPriorityBadge({ priority }: { priority: string }) {
  const { t } = useTranslation()
  const s = PRIORITY[priority]
  const label = s ? t(s.key) : priority
  return <span style={badge(s ?? fallback)}>{label}</span>
}
