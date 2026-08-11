import { useTranslation } from 'react-i18next'

const STATUS_MAP: Record<string, { color: string; bg: string }> = {
  draft:      { color: 'var(--color-gray-700)',    bg: 'var(--color-gray-100)' },
  preparing:  { color: 'var(--color-info-700)',    bg: 'var(--color-info-50)' },
  in_transit: { color: 'var(--color-warning-700)', bg: 'var(--color-warning-50)' },
  delivered:  { color: 'var(--color-primary-700)', bg: 'var(--color-primary-50)' },
  completed:  { color: 'var(--color-success-700)', bg: 'var(--color-success-50)' },
  cancelled:  { color: 'var(--color-danger-700)',  bg: 'var(--color-danger-50)' },
}

const TYPE_MAP: Record<string, { color: string; bg: string }> = {
  warehouse_transfer:   { color: 'var(--color-purple-700)',  bg: 'var(--color-purple-50)' },
  customer_deployment:  { color: 'var(--color-primary-700)', bg: 'var(--color-primary-50)' },
  customer_return:      { color: 'var(--color-warning-700)', bg: 'var(--color-warning-50)' },
  internal_relocation:  { color: 'var(--color-info-700)',    bg: 'var(--color-info-50)' },
}

const PRIORITY_MAP: Record<string, { color: string; bg: string }> = {
  low:    { color: 'var(--color-gray-600)',    bg: 'var(--color-gray-100)' },
  normal: { color: 'var(--color-primary-600)', bg: 'var(--color-primary-50)' },
  high:   { color: 'var(--color-warning-700)', bg: 'var(--color-warning-50)' },
  urgent: { color: 'var(--color-danger-700)',  bg: 'var(--color-danger-50)' },
}

const badgeStyle = (c: { color: string; bg: string }): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
  borderRadius: 'var(--radius-full)', fontSize: 11.5, fontWeight: 600,
  color: c.color, background: c.bg, whiteSpace: 'nowrap',
})

export function MovementStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const s = STATUS_MAP[status] ?? { color: 'var(--color-gray-700)', bg: 'var(--color-gray-100)' }
  const label = t(`movement.status.${status}`, { defaultValue: status })
  return <span style={badgeStyle(s)}>{label}</span>
}

export function MovementTypeBadge({ type }: { type: string }) {
  const { t } = useTranslation()
  const s = TYPE_MAP[type] ?? { color: 'var(--color-gray-700)', bg: 'var(--color-gray-100)' }
  const label = t(`movement.type.${type}`, { defaultValue: type })
  return <span style={badgeStyle(s)}>{label}</span>
}

export function MovementPriorityBadge({ priority }: { priority: string }) {
  const { t } = useTranslation()
  const s = PRIORITY_MAP[priority] ?? { color: 'var(--color-gray-600)', bg: 'var(--color-gray-100)' }
  const label = t(`movement.priority.${priority}`, { defaultValue: priority })
  return <span style={badgeStyle(s)}>{label}</span>
}
