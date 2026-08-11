import { useTranslation } from 'react-i18next'
import { Truck, MapPin, Calendar, ArrowRight } from 'lucide-react'
import { MovementStatusBadge, MovementTypeBadge, MovementPriorityBadge } from './MovementStatusBadge'
import type { Movement } from '@/types/movement'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function MovementCard({ movement, onClick }: { movement: Movement; onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)', padding: 16, cursor: 'pointer',
        transition: 'border-color var(--duration-fast), box-shadow var(--duration-fast)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary-300)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>{movement.movement_number}</div>
          <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 2 }}>
            <Truck size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
            {movement.forklift.serial_number} — {movement.forklift.name_en}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <MovementStatusBadge status={movement.status} />
          <MovementPriorityBadge priority={movement.priority} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 13, color: 'var(--color-text-secondary)' }}>
        <MapPin size={13} />
        <span>{movement.from_location}</span>
        <ArrowRight size={13} />
        <span>{movement.to_location}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <MovementTypeBadge type={movement.movement_type} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-muted)' }}>
          <Calendar size={12} /> {fmtDate(movement.scheduled_date)}
        </div>
      </div>

      {movement.customer && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
          {t('movement.card.customer', { name: `${movement.customer.first_name} ${movement.customer.last_name}` })}
          {movement.customer.company ? ` (${movement.customer.company})` : ''}
        </div>
      )}
    </div>
  )
}
