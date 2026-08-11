import { Warehouse as WarehouseIcon, MapPin, Phone, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Warehouse } from '@/types/inventory'

export function WarehouseGridSkeleton() {
  return (
    <div className="mp-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="mp-card-skeleton">
          <div className="mp-card-body">
            <div className="skeleton-line" style={{ width: '30%', height: 10, marginBottom: 8 }} />
            <div className="skeleton-line" style={{ width: '70%', height: 14, marginBottom: 6 }} />
            <div className="skeleton-line" style={{ width: '50%', height: 10 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function WarehouseGrid({ warehouses, onSelect }: { warehouses: Warehouse[]; onSelect?: (w: Warehouse) => void }) {
  const { t } = useTranslation()
  if (warehouses.length === 0) {
    return (
      <div className="mp-empty">
        <div className="mp-empty-icon"><WarehouseIcon size={28} /></div>
        <div className="mp-empty-title">{t('inventory.warehouseGrid.noneFound')}</div>
        <div className="mp-empty-sub">{t('inventory.warehouseGrid.noneFoundHint')}</div>
      </div>
    )
  }

  return (
    <div className="mp-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {warehouses.map((w) => (
        <div key={w.id} className="mp-card" onClick={() => onSelect?.(w)} style={{ cursor: onSelect ? 'pointer' : undefined }}>
          <div className="mp-card-body" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <WarehouseIcon size={18} style={{ color: 'var(--color-primary-600)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{w.name}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-primary-500)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{w.code}</div>
              </div>
              {!w.is_active && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 'var(--radius-full)', background: 'var(--color-danger-50)', color: 'var(--color-danger-600)' }}>{t('common.inactive')}</span>
              )}
            </div>

            {w.address && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                <MapPin size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ lineHeight: 1.4 }}>{w.address}</span>
              </div>
            )}
            {w.contact_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                <User size={12} style={{ flexShrink: 0 }} />
                <span>{w.contact_name}</span>
              </div>
            )}
            {w.contact_phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-muted)' }}>
                <Phone size={12} style={{ flexShrink: 0 }} />
                <span>{w.contact_phone}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
