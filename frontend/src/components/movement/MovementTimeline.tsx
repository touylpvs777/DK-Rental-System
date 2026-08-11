import { useTranslation } from 'react-i18next'
import { MapPin, Clock } from 'lucide-react'
import { MovementStatusBadge } from './MovementStatusBadge'
import type { MovementCheckpoint } from '@/types/movement'
import '@/styles/detail.css'

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function MovementTimeline({ checkpoints }: { checkpoints: MovementCheckpoint[] }) {
  const { t } = useTranslation()
  if (checkpoints.length === 0) return null

  return (
    <div className="detail-specs-section">
      <h2 className="detail-section-title detail-section-title-row">
        <Clock size={16} /> {t('movement.timeline.title')}
      </h2>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 0 }}>
        {checkpoints.map((cp, i) => (
          <div key={cp.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 20 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: i === 0 ? 'var(--color-primary-500)' : 'var(--color-border)',
                border: `2px solid ${i === 0 ? 'var(--color-primary-500)' : 'var(--color-border)'}`,
                zIndex: 1,
              }} />
              {i < checkpoints.length - 1 && (
                <div style={{ width: 2, flex: 1, background: 'var(--color-border)' }} />
              )}
            </div>
            <div style={{ paddingBottom: 16, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <MovementStatusBadge status={cp.to_status} />
                <span className="cell-muted" style={{ fontSize: 12 }}>{fmtTime(cp.recorded_at)}</span>
                {cp.user && <span className="cell-muted" style={{ fontSize: 12 }}>{t('movement.timeline.by', { name: cp.user.full_name ?? cp.user.username })}</span>}
              </div>
              {cp.notes && <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>{cp.notes}</div>}
              {cp.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  <MapPin size={11} /> {cp.location}
                  {cp.latitude && cp.longitude && <span>({cp.latitude.toFixed(4)}, {cp.longitude.toFixed(4)})</span>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
