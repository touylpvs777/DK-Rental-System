import { ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { POStatusBadge } from '@/components/inventory/StockBadge'
import type { POListItem } from '@/types/inventory'

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
function fmtAmt(n: number) { return n.toLocaleString(undefined, { maximumFractionDigits: 0 }) }

interface Props {
  items: POListItem[]
  total: number
  page: number
  pages: number
  isLoading: boolean
  onPageChange: (p: number) => void
  onRowClick?: (id: number) => void
}

export default function PurchaseOrderTable({ items, total, page, pages, isLoading, onPageChange, onRowClick }: Props) {
  const { t } = useTranslation()
  return (
    <div className="table-card">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('inventory.purchaseOrderTable.poNumber')}</th>
              <th>{t('inventory.purchaseOrderTable.vendor')}</th>
              <th>{t('common.status')}</th>
              <th className="col-hide-sm">{t('inventory.purchaseOrderTable.warehouse')}</th>
              <th className="col-hide-sm">{t('inventory.purchaseOrderTable.orderDate')}</th>
              <th>{t('common.total')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="skeleton-row">
                <td><div className="skeleton-cell" style={{ width: '80%' }} /></td>
                <td><div className="skeleton-cell" style={{ width: '60%' }} /></td>
                <td><div className="skeleton-cell" style={{ width: 70 }} /></td>
                <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: '50%' }} /></td>
                <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: 80 }} /></td>
                <td><div className="skeleton-cell" style={{ width: 60 }} /></td>
              </tr>
            )) : items.length === 0 ? (
              <tr><td colSpan={6}>
                <div className="table-empty"><ShoppingCart size={36} /><p>{t('inventory.purchaseOrderTable.empty')}</p></div>
              </td></tr>
            ) : items.map((po) => (
              <tr key={po.id} onClick={() => onRowClick?.(po.id)} style={onRowClick ? { cursor: 'pointer' } : undefined}>
                <td className="cell-desc">{po.po_number}</td>
                <td><div className="cell-desc">{po.vendor}</div></td>
                <td><POStatusBadge status={po.status} /></td>
                <td className="cell-muted col-hide-sm">{po.warehouse.code}</td>
                <td className="cell-muted col-hide-sm">{fmtDate(po.order_date)}</td>
                <td className="cell-mono cell-total">{fmtAmt(po.total_amount)} {po.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isLoading && pages > 1 && (
        <div className="pagination">
          <span className="pagination-info">{t('inventory.purchaseOrderTable.paginationInfo', { page, pages, total })}</span>
          <div className="pagination-controls">
            <button className="page-btn" disabled={page === 1} onClick={() => onPageChange(page - 1)}><ChevronLeft size={14} /></button>
            <button className="page-btn" disabled={page === pages} onClick={() => onPageChange(page + 1)}><ChevronRight size={14} /></button>
          </div>
        </div>
      )}
    </div>
  )
}
