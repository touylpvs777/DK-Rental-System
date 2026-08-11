import { useTranslation } from 'react-i18next'

const PO_STATUS: Record<string, { key: string; color: string; bg: string }> = {
  draft:                { key: 'inventory.purchaseOrder.status.draft',     color: 'var(--color-gray-700)',    bg: 'var(--color-gray-100)' },
  ordered:              { key: 'inventory.purchaseOrder.status.ordered',   color: 'var(--color-info-700)',    bg: 'var(--color-info-50)' },
  partially_received:   { key: 'inventory.purchaseOrder.status.partial',   color: 'var(--color-warning-700)', bg: 'var(--color-warning-50)' },
  received:             { key: 'inventory.purchaseOrder.status.received',  color: 'var(--color-success-700)', bg: 'var(--color-success-50)' },
  cancelled:            { key: 'inventory.purchaseOrder.status.cancelled', color: 'var(--color-danger-700)',  bg: 'var(--color-danger-50)' },
}

const CATEGORY_KEYS: Record<string, string> = {
  filter: 'inventory.spareParts.categories.filter', belt: 'inventory.spareParts.categories.belt',
  brake: 'inventory.spareParts.categories.brake', hydraulic: 'inventory.spareParts.categories.hydraulic',
  electrical: 'inventory.spareParts.categories.electrical', engine: 'inventory.spareParts.categories.engine',
  tire: 'inventory.spareParts.categories.tire', chain: 'inventory.spareParts.categories.chain',
  battery: 'inventory.spareParts.categories.battery', lubricant: 'inventory.spareParts.categories.lubricant',
  general: 'inventory.spareParts.categories.general',
}

const badge = (c: { color: string; bg: string }): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
  borderRadius: 'var(--radius-full)', fontSize: 11.5, fontWeight: 600,
  color: c.color, background: c.bg, whiteSpace: 'nowrap',
})

export function POStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const s = PO_STATUS[status] ?? { key: '', color: 'var(--color-gray-700)', bg: 'var(--color-gray-100)' }
  return <span style={badge(s)}>{s.key ? t(s.key) : status}</span>
}

export function StockLevelBadge({ available, minLevel }: { available: number; minLevel: number }) {
  const { t } = useTranslation()
  const isLow = available <= minLevel
  const isOut = available <= 0
  const c = isOut
    ? { color: 'var(--color-danger-700)', bg: 'var(--color-danger-50)' }
    : isLow
    ? { color: 'var(--color-warning-700)', bg: 'var(--color-warning-50)' }
    : { color: 'var(--color-success-700)', bg: 'var(--color-success-50)' }
  const label = isOut ? t('inventory.stockBadge.outOfStock') : isLow ? t('inventory.stockBadge.lowStock') : t('inventory.stockBadge.inStock')
  return <span style={badge(c)}>{label}</span>
}

export function PartCategoryBadge({ category }: { category: string }) {
  const { t } = useTranslation()
  const key = CATEGORY_KEYS[category]
  return (
    <span style={badge({ color: 'var(--color-primary-700)', bg: 'var(--color-primary-50)' })}>
      {key ? t(key) : category}
    </span>
  )
}
