import { useNavigate } from 'react-router-dom'
import { Plus, Wrench, ArrowRightLeft, ClipboardList } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Props {
  onRegister: () => void
}

export default function EquipmentQuickActions({ onRegister }: Props) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const ACTIONS = [
    { id: 'register', label: t('equipment.quickActions.register.label'), desc: t('equipment.quickActions.register.desc'), icon: Plus, color: 'var(--color-primary-600)' },
    { id: 'movement', label: t('equipment.quickActions.movement.label'), desc: t('equipment.quickActions.movement.desc'), icon: ArrowRightLeft, color: 'var(--color-info-600)', href: '/movements/new' },
    { id: 'maintenance', label: t('equipment.quickActions.maintenance.label'), desc: t('equipment.quickActions.maintenance.desc'), icon: Wrench, color: 'var(--color-warning-600)', href: '/maintenance' },
    { id: 'rental', label: t('equipment.quickActions.rental.label'), desc: t('equipment.quickActions.rental.desc'), icon: ClipboardList, color: 'var(--color-success-600)', href: '/rental-contracts/new' },
  ]

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {ACTIONS.map((a) => (
        <button
          key={a.id}
          className="btn btn-ghost"
          onClick={() => a.href ? navigate(a.href) : onRegister()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
        >
          <a.icon size={14} style={{ color: a.color }} /> {a.label}
        </button>
      ))}
    </div>
  )
}
