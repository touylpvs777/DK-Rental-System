import { Fuel, Gauge, Calendar, Tag, User, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Drawer from '@/components/ui/Drawer'
import { ForkliftStatusBadge, ForkliftConditionBadge } from '@/components/equipment/ForkliftStatusBadge'
import type { Forklift } from '@/types/forklift'

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="1"%3E%3Crect x="1" y="3" width="22" height="14" rx="2"/%3E%3Cpath d="M5 21h2M17 21h2M6 17v4M18 17v4M3 17h18"/%3E%3C/svg%3E'

interface Props {
  forklift: Forklift | null
  isOpen: boolean
  onClose: () => void
  onViewDetail: (id: number) => void
  onEdit: (f: Forklift) => void
}

export default function EquipmentDrawer({ forklift, isOpen, onClose, onViewDetail, onEdit }: Props) {
  const { t } = useTranslation()
  if (!forklift) return null

  const FUEL_LABELS: Record<string, string> = {
    electric: t('equipment.fuel.electric'),
    diesel: t('equipment.fuel.diesel'),
    lpg: t('equipment.fuel.lpg'),
    dual_fuel: t('equipment.fuel.dualFuel'),
  }
  const pct = Math.min((forklift.current_hour_meter / 5000) * 100, 100)
  const barColor = pct < 60 ? 'var(--color-success-500)' : pct < 85 ? 'var(--color-warning-500)' : 'var(--color-danger-500)'

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={forklift.name_en} width={420}>
      {/* Image */}
      <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 16, aspectRatio: '16/9', background: 'var(--color-bg-subtle)' }}>
        <img
          src={forklift.primary_photo_url ?? PLACEHOLDER}
          alt={forklift.name_en}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
        />
      </div>

      {/* Status + Condition */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        <ForkliftStatusBadge status={forklift.status} />
        <ForkliftConditionBadge condition={forklift.condition} />
      </div>

      {/* Info Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', fontSize: 13 }}>
        <span style={{ color: 'var(--color-text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}><Tag size={12} /> {t('equipment.card.serial')}</span>
        <span style={{ fontWeight: 600 }}>{forklift.serial_number}</span>

        {forklift.model_number && <>
          <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>{t('equipment.detail.model')}</span>
          <span>{forklift.model_number}</span>
        </>}

        {forklift.brand && <>
          <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>{t('equipment.card.brand')}</span>
          <span>{forklift.brand.name}</span>
        </>}

        {forklift.fuel_type && <>
          <span style={{ color: 'var(--color-text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}><Fuel size={12} /> {t('equipment.card.fuel')}</span>
          <span>{FUEL_LABELS[forklift.fuel_type] ?? forklift.fuel_type}</span>
        </>}

        {forklift.capacity_kg != null && <>
          <span style={{ color: 'var(--color-text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}><Gauge size={12} /> {t('equipment.detail.capacity')}</span>
          <span>{forklift.capacity_kg.toLocaleString()} kg</span>
        </>}

        {forklift.year_manufactured && <>
          <span style={{ color: 'var(--color-text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {t('equipment.detail.year')}</span>
          <span>{forklift.year_manufactured}</span>
        </>}

        {forklift.customer && <>
          <span style={{ color: 'var(--color-text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}><User size={12} /> {t('equipment.card.customer')}</span>
          <span>{forklift.customer.first_name} {forklift.customer.last_name}</span>
        </>}
      </div>

      {/* Hour Meter */}
      <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} /> {t('equipment.detail.hourMeter')}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: barColor }}>{t('equipment.card.hoursValue', { count: forklift.current_hour_meter.toLocaleString() })}</span>
        </div>
        <div style={{ height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width 0.4s' }} />
        </div>
        <div style={{ textAlign: 'right', fontSize: 10.5, color: 'var(--color-text-muted)', marginTop: 3 }}>{t('equipment.detail.pctOfThreshold', { pct: Math.round(pct), threshold: '5,000' })} {t('equipment.detail.serviceInterval')}</div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { onClose(); onViewDetail(forklift.id) }}>{t('common.viewDetails')}</button>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { onClose(); onEdit(forklift) }}>{t('common.edit')}</button>
      </div>
    </Drawer>
  )
}
