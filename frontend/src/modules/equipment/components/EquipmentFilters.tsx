import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ForkliftStatus } from '@/types/forklift'

interface BrandOption { id: number; name: string }

interface Props {
  activeStatus: ForkliftStatus | null
  brandId: number | null
  fuelType: string
  condition: string
  ownershipState: string
  statusCounts: Record<string, number>
  brands: BrandOption[]
  onStatusChange: (status: ForkliftStatus | null) => void
  onBrandChange: (id: number | null) => void
  onFuelChange: (fuel: string) => void
  onConditionChange: (cond: string) => void
  onOwnershipChange: (ownership: string) => void
  onClear: () => void
  hasFilters: boolean
}

const STATUS_COLORS: Record<string, string> = {
  in_stock: '#22c55e', rented: '#7c3aed', in_service: '#f59e0b',
  reserved: '#0891b2', sold: '#3b82f6', decommissioned: '#ef4444',
}

export default function EquipmentFilters({
  activeStatus, brandId, fuelType, condition, ownershipState, statusCounts, brands,
  onStatusChange, onBrandChange, onFuelChange, onConditionChange, onOwnershipChange, onClear, hasFilters,
}: Props) {
  const { t } = useTranslation()
  const STATUS_LABELS: Record<string, string> = {
    in_stock: t('equipment.status.inStock'), rented: t('equipment.status.rented'), in_service: t('equipment.filters.statusShort.inService'),
    reserved: t('equipment.status.reserved'), sold: t('equipment.status.sold'), decommissioned: t('equipment.filters.statusShort.decommissioned'),
  }
  const FUEL_OPTS = [
    { value: '', label: t('equipment.filters.allFuelTypes') }, { value: 'electric', label: t('equipment.fuel.electric') },
    { value: 'diesel', label: t('equipment.fuel.diesel') }, { value: 'lpg', label: t('equipment.fuel.lpg') }, { value: 'dual_fuel', label: t('equipment.fuel.dualFuel') },
  ]
  const COND_OPTS = [
    { value: '', label: t('equipment.filters.allConditions') }, { value: 'new', label: t('equipment.condition.new') },
    { value: 'used', label: t('equipment.condition.used') }, { value: 'refurbished', label: t('equipment.condition.refurbished') },
  ]
  const OWNERSHIP_OPTS = [
    { value: '', label: t('equipment.filters.allOwnership') }, { value: 'for_sale', label: t('equipment.ownership.forSale') },
    { value: 'rental', label: t('equipment.ownership.rental') }, { value: 'customer_owned', label: t('equipment.ownership.customerOwned') },
    { value: 'retired', label: t('equipment.ownership.retired') },
  ]
  const allStatuses = ['in_stock', 'rented', 'in_service', 'reserved', 'sold', 'decommissioned'] as ForkliftStatus[]

  return (
    <div>
      {/* Status Strip */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        <button
          onClick={() => onStatusChange(null)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            minWidth: 72, padding: '10px 14px', border: `1px solid ${!activeStatus ? 'var(--color-primary-300)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-md)', background: !activeStatus ? 'var(--color-primary-50)' : 'var(--color-surface)',
            cursor: 'pointer', flexShrink: 0, transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          <span style={{ fontSize: 17, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)' }}>{statusCounts.all || 0}</span>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--color-text-muted)' }}>{t('common.all')}</span>
        </button>
        {allStatuses.map((s) => (
          <button
            key={s}
            onClick={() => onStatusChange(activeStatus === s ? null : s)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              minWidth: 72, padding: '10px 14px', border: `1px solid ${activeStatus === s ? 'var(--color-primary-300)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-md)', background: activeStatus === s ? 'var(--color-primary-50)' : 'var(--color-surface)',
              cursor: 'pointer', flexShrink: 0, transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[s] }} />
              <span style={{ fontSize: 17, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)' }}>{statusCounts[s] || 0}</span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--color-text-muted)' }}>{STATUS_LABELS[s]}</span>
          </button>
        ))}
      </div>

      {/* Dropdown Filters */}
      <div className="toolbar" style={{ marginBottom: 0 }}>
        <select className="filter-select" value={brandId ?? ''} onChange={(e) => onBrandChange(e.target.value ? Number(e.target.value) : null)}>
          <option value="">{t('equipment.filters.allBrands')}</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="filter-select" value={fuelType} onChange={(e) => onFuelChange(e.target.value)}>
          {FUEL_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="filter-select" value={condition} onChange={(e) => onConditionChange(e.target.value)}>
          {COND_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="filter-select" value={ownershipState} onChange={(e) => onOwnershipChange(e.target.value)}>
          {OWNERSHIP_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {hasFilters && (
          <button className="clear-btn" onClick={onClear}><X size={12} /> {t('equipment.filters.clear')}</button>
        )}
        <span className="toolbar-count">{t('equipment.filters.countLabel', { count: statusCounts.all || 0 })}</span>
      </div>
    </div>
  )
}
