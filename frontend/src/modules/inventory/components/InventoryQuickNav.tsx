import { useNavigate } from 'react-router-dom'
import { Package, Warehouse, ShoppingCart, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function InventoryQuickNav() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const NAV_ITEMS = [
    { id: 'parts', label: t('inventory.quickNav.parts.label'), desc: t('inventory.quickNav.parts.desc'), icon: Package, color: 'var(--color-primary-600)', href: '/inventory/parts' },
    { id: 'warehouses', label: t('inventory.quickNav.warehouses.label'), desc: t('inventory.quickNav.warehouses.desc'), icon: Warehouse, color: 'var(--color-info-600)', href: '/inventory/warehouses' },
    { id: 'po', label: t('inventory.quickNav.purchaseOrders.label'), desc: t('inventory.quickNav.purchaseOrders.desc'), icon: ShoppingCart, color: 'var(--color-warning-600)', href: '/inventory/purchase-orders' },
    { id: 'catalog', label: t('inventory.quickNav.catalog.label'), desc: t('inventory.quickNav.catalog.desc'), icon: Package, color: 'var(--color-purple-600)', href: '/catalog' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
      {NAV_ITEMS.map((item) => (
        <div key={item.id} className="mp-card" onClick={() => navigate(item.href)} style={{ cursor: 'pointer' }}>
          <div className="mp-card-body" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 'var(--radius-md)',
                background: `color-mix(in srgb, ${item.color} 12%, transparent)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <item.icon size={16} style={{ color: item.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{item.desc}</div>
              </div>
              <ArrowRight size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
