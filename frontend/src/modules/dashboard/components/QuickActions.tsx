import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ClipboardList, Truck, Receipt, ShoppingCart, Wrench,
} from 'lucide-react'
import ScrollRow from '@/components/ui/ScrollRow'

const ACTIONS = [
  { id: 'rental', labelKey: 'dashboard.quickAction.createRental', descKey: 'dashboard.quickAction.createRentalDesc', icon: ClipboardList, color: 'var(--color-primary-600)', href: '/rental-contracts/new' },
  { id: 'equipment', labelKey: 'dashboard.quickAction.addEquipment', descKey: 'dashboard.quickAction.addEquipmentDesc', icon: Truck, color: 'var(--color-info-600)', href: '/equipment' },
  { id: 'invoice', labelKey: 'dashboard.quickAction.createInvoice', descKey: 'dashboard.quickAction.createInvoiceDesc', icon: Receipt, color: 'var(--color-success-600)', href: '/billing/invoices' },
  { id: 'po', labelKey: 'dashboard.quickAction.purchaseOrder', descKey: 'dashboard.quickAction.purchaseOrderDesc', icon: ShoppingCart, color: 'var(--color-warning-600)', href: '/inventory/purchase-orders' },
  { id: 'maintenance', labelKey: 'dashboard.quickAction.maintenance', descKey: 'dashboard.quickAction.maintenanceDesc', icon: Wrench, color: 'var(--color-purple-600)', href: '/maintenance' },
]

export default function QuickActions() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <ScrollRow title={t('dashboard.quickActions')}>
      {ACTIONS.map((a) => (
        <div
          key={a.id}
          className="mp-card"
          onClick={() => navigate(a.href)}
          style={{ cursor: 'pointer', width: 176 }}
        >
          <div className="mp-card-body" style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-lg)',
              background: `color-mix(in srgb, ${a.color} 14%, transparent)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <a.icon size={19} style={{ color: a.color }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{t(a.labelKey)}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{t(a.descKey)}</div>
            </div>
          </div>
        </div>
      ))}
    </ScrollRow>
  )
}
