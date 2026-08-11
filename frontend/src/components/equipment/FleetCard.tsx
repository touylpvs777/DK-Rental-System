import { useTranslation } from 'react-i18next'
import { Fuel, Gauge, Calendar, Tag, User } from 'lucide-react'
import { ForkliftStatusBadge, ForkliftConditionBadge } from './ForkliftStatusBadge'
import type { Forklift } from '@/types/forklift'
import './FleetCard.css'

interface FleetCardProps {
  forklift: Forklift
  onClick?: () => void
  onEdit?: () => void
}

const FUEL_LABEL_KEYS: Record<string, string> = {
  electric: 'equipment.fuel.electric', diesel: 'equipment.fuel.diesel', lpg: 'equipment.fuel.lpg', dual_fuel: 'equipment.fuel.dualFuel',
}

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect x="1" y="3" width="22" height="14" rx="2"/%3E%3Cpath d="M5 21h2M17 21h2M6 17v4M18 17v4M3 17h18"/%3E%3C/svg%3E'

function HourMeterBar({ current, threshold = 5000 }: { current: number; threshold?: number }) {
  const { t } = useTranslation()
  const pct = Math.min((current / threshold) * 100, 100)
  const color = pct < 60 ? 'var(--color-success-500)' : pct < 85 ? 'var(--color-warning-500)' : 'var(--color-danger-500)'
  return (
    <div className="fleet-hour-bar">
      <div className="fleet-hour-bar-track">
        <div className="fleet-hour-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="fleet-hour-bar-label">
        <span>{t('equipment.card.hoursValue', { count: current.toLocaleString() })}</span>
        <span style={{ color }}>{Math.round(pct)}%</span>
      </div>
    </div>
  )
}

export default function FleetCard({ forklift, onClick, onEdit }: FleetCardProps) {
  const { t } = useTranslation()
  const imgSrc = forklift.primary_photo_url ?? PLACEHOLDER

  return (
    <div
      className={`fleet-card${!forklift.is_active ? ' inactive' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick() } : undefined}
    >
      <div className="fleet-card-img-wrap">
        <img
          src={imgSrc}
          alt={forklift.name_en}
          className="fleet-card-img"
          loading="lazy"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
        />
        <div className="fleet-card-badges">
          <ForkliftStatusBadge status={forklift.status} />
        </div>
        <div className="fleet-card-badges-right">
          <ForkliftConditionBadge condition={forklift.condition} />
        </div>
      </div>

      <div className="fleet-card-body">
        {forklift.brand && (
          <div className="fleet-card-brand">{forklift.brand.name}</div>
        )}
        <div className="fleet-card-name">{forklift.name_en}</div>
        <div className="fleet-card-serial">
          <Tag size={11} /> {forklift.serial_number}
          {forklift.model_number && <span> · {forklift.model_number}</span>}
        </div>

        <div className="fleet-card-meta">
          {forklift.fuel_type && (
            <span className="fleet-card-chip">
              <Fuel size={11} /> {FUEL_LABEL_KEYS[forklift.fuel_type] ? t(FUEL_LABEL_KEYS[forklift.fuel_type]) : forklift.fuel_type}
            </span>
          )}
          {forklift.capacity_kg != null && (
            <span className="fleet-card-chip">
              <Gauge size={11} /> {forklift.capacity_kg.toLocaleString()} kg
            </span>
          )}
          {forklift.year_manufactured && (
            <span className="fleet-card-chip">
              <Calendar size={11} /> {forklift.year_manufactured}
            </span>
          )}
        </div>

        <HourMeterBar current={forklift.current_hour_meter} />

        {forklift.customer && (
          <div className="fleet-card-customer">
            <User size={11} />
            {forklift.customer.first_name} {forklift.customer.last_name}
            {forklift.customer.company && <span> ({forklift.customer.company})</span>}
          </div>
        )}
      </div>

      {onEdit && (
        <div className="fleet-card-actions">
          <button className="fleet-card-action" onClick={(e) => { e.stopPropagation(); onClick?.() }}>{t('common.view')}</button>
          <button className="fleet-card-action" onClick={(e) => { e.stopPropagation(); onEdit() }}>{t('common.edit')}</button>
        </div>
      )}
    </div>
  )
}
