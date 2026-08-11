import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle, Clock, Wrench } from 'lucide-react'
import type { MaintenanceSchedule } from '@/types/maintenance'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(dueDateStr: string | null) {
  if (!dueDateStr) return false
  return new Date(dueDateStr) < new Date(new Date().toISOString().slice(0, 10))
}

export default function PMCalendar({ schedules }: { schedules: MaintenanceSchedule[] }) {
  const { t } = useTranslation()
  if (schedules.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
        {t('maintenance.schedule.emptyState')}
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
      {schedules.map((s) => {
        const overdue = isOverdue(s.next_due_date)
        return (
          <div key={s.id} style={{
            background: 'var(--color-surface)', border: `1px solid ${overdue ? 'var(--color-danger-300)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-lg)', padding: 14,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--color-text)' }}>{s.plan.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  <Wrench size={11} style={{ verticalAlign: -1, marginRight: 3 }} />
                  {s.forklift.serial_number}
                </div>
              </div>
              {overdue ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 600, color: 'var(--color-danger-700)', background: 'var(--color-danger-50)' }}>
                  <AlertTriangle size={11} /> {t('maintenance.overdue')}
                </span>
              ) : s.times_serviced > 0 ? (
                <CheckCircle size={14} style={{ color: 'var(--color-success-500)' }} />
              ) : (
                <Clock size={14} style={{ color: 'var(--color-text-muted)' }} />
              )}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: 'var(--color-text-muted)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('maintenance.schedule.nextDue')}</div>
                <div style={{ marginTop: 2, fontWeight: 500, color: overdue ? 'var(--color-danger-600)' : 'var(--color-text)' }}>
                  {s.next_due_date ? fmtDate(s.next_due_date) : s.next_due_hours ? `${s.next_due_hours}h` : '—'}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('maintenance.schedule.interval')}</div>
                <div style={{ marginTop: 2 }}>{s.plan.interval_value} {s.plan.interval_type}</div>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('maintenance.schedule.serviced')}</div>
                <div style={{ marginTop: 2 }}>{s.times_serviced}x</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
