import { Package } from 'lucide-react'
import { resolveMediaUrl } from '@/utils/media'
import { PartCategoryBadge, StockLevelBadge } from '@/components/inventory/StockBadge'
import type { SparePart, InventoryBalance } from '@/types/inventory'
import './PartPOSCard.css'

function fmtPrice(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface PartPOSCardProps {
  part: SparePart
  /** Undefined while balances are still loading for the active warehouse. */
  balance: InventoryBalance | undefined
  balancesLoading: boolean
  onClick: () => void
}

export default function PartPOSCard({ part, balance, balancesLoading, onClick }: PartPOSCardProps) {
  const imgSrc = resolveMediaUrl(part.image_url)

  return (
    <button type="button" className="pos-card" onClick={onClick}>
      <div className="pos-card-media">
        {imgSrc
          ? <img
              src={imgSrc}
              alt={part.name}
              loading="lazy"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          : <Package size={40} className="pos-card-media-fallback" />}
        <span className="pos-card-category"><PartCategoryBadge category={part.part_category} /></span>
        {!balancesLoading && balance && (
          <span className="pos-card-stock"><StockLevelBadge available={balance.quantity_available} minLevel={part.min_stock_level} /></span>
        )}
      </div>
      <div className="pos-card-body">
        <div className="pos-card-name" title={part.name}>{part.name}</div>
        <div className="pos-card-partno">{part.part_number}</div>
        <div className="pos-card-footer">
          <span className="pos-card-price">{fmtPrice(part.unit_price)} <span className="pos-card-currency">{part.currency}</span></span>
          {!balancesLoading && balance && <span className="pos-card-qty">{balance.quantity_available} {part.unit}</span>}
        </div>
      </div>
    </button>
  )
}
