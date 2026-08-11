import { Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import EquipmentCard, { EquipmentCardSkeleton } from './EquipmentCard'
import type { Forklift } from '@/types/forklift'

interface Props {
  forklifts: Forklift[]
  isLoading: boolean
  onView: (f: Forklift) => void
  onEdit: (f: Forklift) => void
}

export default function EquipmentGrid({ forklifts, isLoading, onView, onEdit }: Props) {
  const { t } = useTranslation()
  if (isLoading) {
    return (
      <div className="mp-grid">
        {Array.from({ length: 8 }).map((_, i) => <EquipmentCardSkeleton key={i} />)}
      </div>
    )
  }

  if (forklifts.length === 0) {
    return (
      <div className="mp-empty">
        <div className="mp-empty-icon"><Truck size={28} /></div>
        <div className="mp-empty-title">{t('equipment.filters.noneFound')}</div>
        <div className="mp-empty-sub">{t('equipment.filters.noneFoundHint')}</div>
      </div>
    )
  }

  return (
    <div className="mp-grid">
      {forklifts.map((f) => (
        <EquipmentCard
          key={f.id}
          forklift={f}
          onClick={() => onView(f)}
          onEdit={() => onEdit(f)}
        />
      ))}
    </div>
  )
}
