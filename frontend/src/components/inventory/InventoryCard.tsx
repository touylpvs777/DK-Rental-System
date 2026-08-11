import { Package } from 'lucide-react'
import { PartCategoryBadge, StockLevelBadge } from './StockBadge'
import type { SparePart } from '@/types/inventory'

function fmtAmt(n: number) { return n.toLocaleString(undefined, { maximumFractionDigits: 0 }) }

export default function InventoryCard({ part, totalStock, onClick }: { part: SparePart; totalStock?: number; onClick: () => void }) {
  const stock = totalStock ?? 0
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)', padding: 16, cursor: 'pointer',
        transition: 'border-color var(--duration-fast), box-shadow var(--duration-fast)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary-300)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>{part.part_number}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>{part.name}</div>
        </div>
        <StockLevelBadge available={stock} minLevel={part.min_stock_level} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <PartCategoryBadge category={part.part_category} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
          <span><Package size={11} style={{ verticalAlign: -1 }} /> {stock} {part.unit}</span>
          <span>{fmtAmt(part.unit_price)} {part.currency}</span>
        </div>
      </div>
    </div>
  )
}
