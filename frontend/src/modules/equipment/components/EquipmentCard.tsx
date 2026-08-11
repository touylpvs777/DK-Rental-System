import { Fuel, Gauge, Calendar, Tag, User, Eye, Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ForkliftStatusBadge, ForkliftConditionBadge, OwnershipStateBadge } from '@/components/equipment/ForkliftStatusBadge'
import type { Forklift } from '@/types/forklift'

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="1"%3E%3Crect x="1" y="3" width="22" height="14" rx="2"/%3E%3Cpath d="M5 21h2M17 21h2M6 17v4M18 17v4M3 17h18"/%3E%3C/svg%3E'

interface Props {
  forklift: Forklift
  onClick?: () => void
  onEdit?: () => void
  compact?: boolean
}

export default function EquipmentCard({ forklift, onClick, onEdit, compact }: Props) {
  const { t } = useTranslation()
  const FUEL_LABELS: Record<string, string> = {
    electric: t('equipment.fuel.electric'),
    diesel: t('equipment.fuel.diesel'),
    lpg: t('equipment.fuel.lpg'),
    dual_fuel: t('equipment.fuel.dualFuel'),
  }
  const pct = Math.min((forklift.current_hour_meter / 5000) * 100, 100)
  const barColor = pct < 60 ? 'var(--color-success-500)' : pct < 85 ? 'var(--color-warning-500)' : 'var(--color-danger-500)'

  return (
    <div
      className={`mp-card${!forklift.is_active ? ' inactive' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick() } : undefined}
      style={!forklift.is_active ? { opacity: 0.6 } : undefined}
    >
      {/* Thumbnail */}
      {!compact && (
        <div className="mp-card-thumb" style={{ aspectRatio: '4/3' }}>
          <img
            src={forklift.primary_photo_url ?? PLACEHOLDER}
            alt={forklift.name_en}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          />
          <div style={{ position: 'absolute', top: 8, left: 8 }}>
            <ForkliftStatusBadge status={forklift.status} />
          </div>
          <div style={{ position: 'absolute', top: 8, right: 8 }}>
            <ForkliftConditionBadge condition={forklift.condition} />
          </div>
        </div>
      )}

      {/* Body */}
      <div className="mp-card-body" style={{ padding: compact ? '12px 14px' : undefined }}>
        {compact && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            <ForkliftStatusBadge status={forklift.status} />
            <ForkliftConditionBadge condition={forklift.condition} />
            <OwnershipStateBadge ownershipState={forklift.ownership_state} />
          </div>
        )}

        {forklift.brand && (
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--color-primary-500)', marginBottom: 2 }}>
            {forklift.brand.name}
          </div>
        )}
        <h3 className="mp-card-title">{forklift.name_en}</h3>
        <p className="mp-card-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Tag size={10} /> {forklift.serial_number}
          {forklift.model_number && <span> · {forklift.model_number}</span>}
        </p>

        {/* Meta chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, alignItems: 'center' }}>
          {!compact && <OwnershipStateBadge ownershipState={forklift.ownership_state} />}
          {forklift.fuel_type && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--color-bg-subtle)', padding: '2px 7px', borderRadius: 'var(--radius-full)' }}>
              <Fuel size={10} /> {FUEL_LABELS[forklift.fuel_type] ?? forklift.fuel_type}
            </span>
          )}
          {forklift.capacity_kg != null && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--color-bg-subtle)', padding: '2px 7px', borderRadius: 'var(--radius-full)' }}>
              <Gauge size={10} /> {forklift.capacity_kg.toLocaleString()} kg
            </span>
          )}
          {forklift.year_manufactured && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--color-text-muted)', background: 'var(--color-bg-subtle)', padding: '2px 7px', borderRadius: 'var(--radius-full)' }}>
              <Calendar size={10} /> {forklift.year_manufactured}
            </span>
          )}
        </div>

        {/* Hour meter */}
        <div style={{ marginTop: 10 }}>
          <div style={{ height: 4, background: 'var(--color-bg-subtle)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 2, transition: 'width 0.4s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 10.5, color: 'var(--color-text-muted)' }}>
            <span>{t('equipment.card.hoursValue', { count: forklift.current_hour_meter.toLocaleString() })}</span>
            <span style={{ color: barColor, fontWeight: 600 }}>{Math.round(pct)}%</span>
          </div>
        </div>

        {/* Customer */}
        {forklift.customer && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 11, color: 'var(--color-text-muted)' }}>
            <User size={10} />
            {forklift.customer.first_name} {forklift.customer.last_name}
          </div>
        )}
      </div>

      {/* Action footer */}
      {(onClick || onEdit) && (
        <div className="mp-card-footer">
          {onClick && (
            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onClick() }} style={{ fontSize: 11.5, padding: '4px 10px' }}>
              <Eye size={12} /> {t('common.view')}
            </button>
          )}
          {onEdit && (
            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); onEdit() }} style={{ fontSize: 11.5, padding: '4px 10px' }}>
              <Pencil size={12} /> {t('common.edit')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function EquipmentCardSkeleton({ compact }: { compact?: boolean }) {
  return (
    <div className="mp-card-skeleton">
      {!compact && <div className="mp-card-thumb" style={{ aspectRatio: '4/3' }} />}
      <div className="mp-card-body">
        <div className="skeleton-line" style={{ width: '40%', height: 10, marginBottom: 6 }} />
        <div className="skeleton-line" style={{ width: '70%', height: 14, marginBottom: 4 }} />
        <div className="skeleton-line" style={{ width: '50%', height: 10, marginBottom: 10 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          <div className="skeleton-line" style={{ width: 60, height: 18, borderRadius: 9999 }} />
          <div className="skeleton-line" style={{ width: 50, height: 18, borderRadius: 9999 }} />
        </div>
        <div className="skeleton-line" style={{ width: '100%', height: 4, marginTop: 10, borderRadius: 2 }} />
      </div>
    </div>
  )
}
