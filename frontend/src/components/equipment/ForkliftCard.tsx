import { useTranslation } from 'react-i18next'
import { Fuel, Gauge, Calendar, Tag, Zap } from 'lucide-react'
import { ForkliftStatusBadge, ForkliftConditionBadge } from './ForkliftStatusBadge'
import type { Forklift } from '@/types/forklift'
import './ForkliftCard.css'

const IOT_LIVE_WINDOW_MS = 24 * 60 * 60 * 1000

function isIotLive(lastPing: string | null): boolean {
  if (!lastPing) return false
  return Date.now() - new Date(lastPing).getTime() <= IOT_LIVE_WINDOW_MS
}

interface ForkliftCardProps {
  forklift: Forklift
  onClick?: () => void
  onEdit?: () => void
}

const FUEL_LABEL_KEYS: Record<string, string> = {
  electric:  'equipment.fuel.electric',
  diesel:    'equipment.fuel.diesel',
  lpg:       'equipment.fuel.lpg',
  dual_fuel: 'equipment.fuel.dualFuel',
}

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect x="1" y="3" width="22" height="14" rx="2"/%3E%3Cpath d="M5 21h2M17 21h2M6 17v4M18 17v4M3 17h18"/%3E%3C/svg%3E'

export default function ForkliftCard({ forklift, onClick, onEdit }: ForkliftCardProps) {
  const { t } = useTranslation()
  const imgSrc = forklift.primary_photo_url ?? PLACEHOLDER
  const iotLive = isIotLive(forklift.last_telemetry_ping)

  return (
    <div
      className="forklift-card"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="forklift-card-img-wrap">
        <img
          src={imgSrc}
          alt={forklift.name_en}
          className="forklift-card-img"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
        />
        <div className="forklift-card-badges">
          <ForkliftStatusBadge status={forklift.status} />
          {!forklift.is_active && (
            <span className="pc-badge inactive">{t('common.inactive')}</span>
          )}
        </div>
      </div>

      <div className="forklift-card-body">
        {forklift.brand && (
          <div className="forklift-card-brand">{forklift.brand.name}</div>
        )}
        <div className="forklift-card-name">{forklift.name_en}</div>
        <div className="forklift-card-serial">
          <Tag size={11} /> {forklift.serial_number}
        </div>

        <div className="forklift-card-meta">
          <ForkliftConditionBadge condition={forklift.condition} />
          {forklift.fuel_type && (
            <span className="forklift-card-meta-item">
              <Fuel size={11} /> {FUEL_LABEL_KEYS[forklift.fuel_type] ? t(FUEL_LABEL_KEYS[forklift.fuel_type]) : forklift.fuel_type}
            </span>
          )}
          {forklift.capacity_kg != null && (
            <span className="forklift-card-meta-item">
              <Gauge size={11} /> {forklift.capacity_kg.toLocaleString()} kg
            </span>
          )}
          {forklift.year_manufactured && (
            <span className="forklift-card-meta-item">
              <Calendar size={11} /> {forklift.year_manufactured}
            </span>
          )}
        </div>

        <div className="forklift-card-hours">
          <span className="forklift-card-hours-value">
            {t('equipment.card.hoursValue', { count: forklift.current_hour_meter.toLocaleString(undefined, { maximumFractionDigits: 1 }) })}
            {forklift.last_telemetry_ping && (
              <span title={t('equipment.card.iotAutoSynced')}>
                <Zap size={10} />
              </span>
            )}
          </span>
          {forklift.iot_device_id && (
            <span className={`forklift-card-iot ${iotLive ? 'live' : 'offline'}`}>
              <span className="forklift-card-iot-dot" />
              {iotLive ? t('equipment.card.iotLive') : t('equipment.card.iotOffline')}
            </span>
          )}
        </div>
      </div>

      {onEdit && (
        <button
          className="forklift-card-edit"
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          title={t('equipment.card.editForklift')}
        >
          {t('common.edit')}
        </button>
      )}
    </div>
  )
}
