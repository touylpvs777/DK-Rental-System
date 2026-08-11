import { useTranslation } from 'react-i18next'
import { ForkliftStatusBadge } from './ForkliftStatusBadge'
import { ArrowRight } from 'lucide-react'
import type { ForkliftStatusHistoryEntry } from '@/types/forklift'
import './StatusTimeline.css'

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function StatusTimeline({ history }: { history: ForkliftStatusHistoryEntry[] }) {
  const { t } = useTranslation()
  if (!history.length) {
    return (
      <div className="timeline-empty">
        {t('equipment.timeline.noHistory')}
      </div>
    )
  }

  return (
    <div className="timeline">
      {history.map((h, i) => (
        <div key={h.id} className="timeline-entry">
          <div className="timeline-rail">
            <div className={`timeline-dot${i === 0 ? ' latest' : ''}`} />
            {i < history.length - 1 && <div className="timeline-line" />}
          </div>
          <div className="timeline-content">
            <div className="timeline-date">{fmtDateTime(h.changed_at)}</div>
            <div className="timeline-card">
              <div className="timeline-badges">
                {h.from_status ? <ForkliftStatusBadge status={h.from_status} /> : <span className="timeline-initial">—</span>}
                <ArrowRight size={14} className="timeline-arrow" />
                <ForkliftStatusBadge status={h.to_status} />
              </div>
              {h.reason && <div className="timeline-reason">{h.reason}</div>}
              <div className="timeline-user">
                {h.user?.full_name ?? h.user?.username ?? t('equipment.timeline.system')}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
