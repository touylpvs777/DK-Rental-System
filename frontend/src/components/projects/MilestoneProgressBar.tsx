import { useTranslation } from 'react-i18next'

interface Props {
  completed: number
  total: number
}

export function MilestoneProgressBar({ completed, total }: Props) {
  const { t } = useTranslation()
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const color = pct === 100 ? 'var(--color-success-600, #22c55e)' : 'var(--color-primary-600, #2563eb)'

  return (
    <div style={{ minWidth: 110 }}>
      <div style={{ height: 5, borderRadius: 3, background: 'var(--color-bg-subtle, #eee)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: color }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>
        <span>{t('projects.milestonesOf', { completed, total })}</span>
        <span>{pct}%</span>
      </div>
    </div>
  )
}
