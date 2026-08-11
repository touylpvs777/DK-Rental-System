import { useTranslation } from 'react-i18next'

const STATUS_COLOR: Record<string, { color: string; bg: string }> = {
  draft:        { color: 'var(--color-gray-700)',    bg: 'var(--color-gray-100)' },
  survey:       { color: 'var(--color-info-700)',    bg: 'var(--color-info-50)' },
  design:       { color: 'var(--color-info-700)',    bg: 'var(--color-info-50)' },
  boq_approved: { color: 'var(--color-primary-700)', bg: 'var(--color-primary-50)' },
  installation: { color: 'var(--color-warning-700)', bg: 'var(--color-warning-50)' },
  handover:     { color: 'var(--color-warning-700)', bg: 'var(--color-warning-50)' },
  completed:    { color: 'var(--color-success-700)', bg: 'var(--color-success-50)' },
}

const MILESTONE_COLOR: Record<string, { color: string; bg: string }> = {
  pending:     { color: 'var(--color-gray-700)',    bg: 'var(--color-gray-100)' },
  in_progress: { color: 'var(--color-info-700)',    bg: 'var(--color-info-50)' },
  completed:   { color: 'var(--color-success-700)', bg: 'var(--color-success-50)' },
}

const badge = (c: { color: string; bg: string }): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
  borderRadius: 'var(--radius-full)', fontSize: 11.5, fontWeight: 600,
  color: c.color, background: c.bg, whiteSpace: 'nowrap',
})

const fallbackColor = { color: 'var(--color-gray-700)', bg: 'var(--color-gray-100)' }

export function ProjectStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const c = STATUS_COLOR[status] ?? fallbackColor
  const label = STATUS_COLOR[status] ? t(`projects.status.${status}`) : status
  return <span style={badge(c)}>{label}</span>
}

export function MilestoneStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const c = MILESTONE_COLOR[status] ?? fallbackColor
  const label = MILESTONE_COLOR[status] ? t(`projects.milestoneStatus.${status}`) : status
  return <span style={badge(c)}>{label}</span>
}
