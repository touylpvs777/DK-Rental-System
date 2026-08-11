import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ReorderAlert as Alert } from '@/types/inventory'

export default function ReorderAlert({ alerts }: { alerts: Alert[] }) {
  const { t } = useTranslation()
  if (alerts.length === 0) return null

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <AlertTriangle size={16} style={{ color: 'var(--color-warning-500)' }} />
        {t('inventory.reorderAlert.title', { count: alerts.length })}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {alerts.map((a) => (
          <div key={`${a.spare_part_id}-${a.warehouse_id}`} style={{
            background: 'var(--color-warning-50)', border: '1px solid var(--color-warning-200)',
            borderRadius: 'var(--radius-lg)', padding: '10px 14px', fontSize: 13,
          }}>
            <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{a.part_number} — {a.name}</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 4 }}>
              {t('inventory.reorderAlert.detail', {
                warehouseCode: a.warehouse_code,
                available: a.quantity_available,
                minLevel: a.min_stock_level,
                reorderQuantity: a.reorder_quantity,
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
