import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, AlertCircle, Package } from 'lucide-react'
import { getPart, getBalances, getTransactions } from '@/api/inventory'
import { PartCategoryBadge, StockLevelBadge } from '@/components/inventory/StockBadge'
import type { SparePart, InventoryBalance, InventoryTransaction } from '@/types/inventory'
import '@/pages/Catalog/ProductDetailPage.css'
import '@/styles/detail.css'
import '@/styles/shared.css'

function fmtAmt(n: number) { return n.toLocaleString(undefined, { maximumFractionDigits: 0 }) }
function fmtDateTime(iso: string) { return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }

export default function SparePartDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [part, setPart] = useState<SparePart | null>(null)
  const [balances, setBalances] = useState<InventoryBalance[]>([])
  const [txns, setTxns] = useState<InventoryTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return; setIsLoading(true); setError(null)
    try {
      const pid = Number(id)
      const [pRes, bRes, tRes] = await Promise.all([getPart(pid), getBalances({ spare_part_id: pid }), getTransactions({ spare_part_id: pid })])
      setPart(pRes.data); setBalances(bRes.data); setTxns(tRes.data)
    } catch { setError(t('inventory.spareParts.detail.loadError')) } finally { setIsLoading(false) }
  }, [id, t])
  useEffect(() => { load() }, [load])

  if (isLoading) return <div className="product-detail"><div className="detail-skeleton"><div className="skeleton-cell" style={{ height: 24, width: '60%' }} /></div></div>
  if (error || !part) return <div className="product-detail"><button className="detail-back" onClick={() => navigate('/inventory/parts')}><ChevronLeft size={16} /> {t('common.back')}</button><div className="page-error" style={{ marginTop: 24 }}><AlertCircle size={16} /> {error ?? t('inventory.spareParts.detail.notFound')}</div></div>

  const totalStock = balances.reduce((s, b) => s + b.quantity_on_hand, 0)

  return (
    <div className="product-detail">
      <button className="detail-back" onClick={() => navigate('/inventory/parts')}><ChevronLeft size={16} /> {t('inventory.spareParts.detail.backToList')}</button>

      <div className="detail-header">
        <div>
          <div className="detail-title-row"><h1 className="detail-name">{part.part_number}</h1></div>
          <div className="detail-subtitle">{part.name}</div>
          <div className="detail-badges">
            <PartCategoryBadge category={part.part_category} />
            <StockLevelBadge available={totalStock} minLevel={part.min_stock_level} />
          </div>
        </div>
      </div>

      <div className="detail-summary-grid">
        <div className="detail-summary-card"><div className="detail-summary-label">{t('inventory.spareParts.unitPrice')}</div><div className="detail-summary-value">{fmtAmt(part.unit_price)} {part.currency}</div></div>
        <div className="detail-summary-card"><div className="detail-summary-label">{t('inventory.spareParts.detail.totalStock')}</div><div className="detail-summary-value">{totalStock} {part.unit}</div></div>
        <div className="detail-summary-card"><div className="detail-summary-label">{t('inventory.spareParts.detail.minLevel')}</div><div className="detail-summary-value">{part.min_stock_level}</div></div>
        <div className="detail-summary-card"><div className="detail-summary-label">{t('inventory.spareParts.detail.reorderQty')}</div><div className="detail-summary-value">{part.reorder_quantity}</div></div>
      </div>

      <div className="detail-info-grid">
        <div><dl className="detail-meta">
          {part.brand && <><dt>{t('inventory.spareParts.detail.brand')}</dt><dd>{part.brand.name}</dd></>}
          <dt>{t('inventory.spareParts.unit')}</dt><dd>{part.unit}</dd>
          <dt>{t('inventory.spareParts.detail.leadTime')}</dt><dd>{t('inventory.spareParts.detail.leadTimeDays', { count: part.lead_time_days })}</dd>
        </dl></div>
        <div><dl className="detail-meta">
          <dt>{t('inventory.spareParts.detail.created')}</dt><dd>{new Date(part.created_at).toLocaleDateString()}</dd>
          <dt>{t('inventory.spareParts.detail.active')}</dt><dd>{part.is_active ? t('common.yes') : t('common.no')}</dd>
        </dl></div>
      </div>

      {part.description && <div className="detail-description" style={{ marginTop: 16 }}><div className="detail-section-title">{t('common.description')}</div><p>{part.description}</p></div>}

      {balances.length > 0 && (
        <div className="detail-specs-section" style={{ marginTop: 24 }}>
          <h2 className="detail-section-title"><Package size={16} style={{ verticalAlign: -2, marginRight: 6 }} />{t('inventory.spareParts.detail.stockByWarehouse')}</h2>
          <div className="table-card" style={{ marginTop: 10 }}><table className="data-table">
            <thead><tr><th>{t('inventory.spareParts.detail.columns.warehouse')}</th><th>{t('inventory.spareParts.detail.columns.onHand')}</th><th>{t('inventory.spareParts.detail.columns.reserved')}</th><th>{t('inventory.spareParts.detail.columns.available')}</th></tr></thead>
            <tbody>{balances.map((b) => (
              <tr key={b.id}><td className="cell-desc">{b.warehouse.code} — {b.warehouse.name}</td>
                <td className="cell-mono">{b.quantity_on_hand}</td><td className="cell-mono">{b.quantity_reserved}</td><td className="cell-mono cell-total">{b.quantity_available}</td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}

      {txns.length > 0 && (
        <div className="detail-specs-section">
          <h2 className="detail-section-title">{t('inventory.spareParts.detail.recentTransactions')}</h2>
          <div className="table-card" style={{ marginTop: 10 }}><table className="data-table">
            <thead><tr><th>{t('inventory.spareParts.detail.columns.number')}</th><th>{t('common.type')}</th><th>{t('inventory.spareParts.detail.columns.qty')}</th><th className="col-hide-sm">{t('inventory.spareParts.detail.columns.cost')}</th><th className="col-hide-sm">{t('common.date')}</th></tr></thead>
            <tbody>{txns.slice(0, 20).map((t) => (
              <tr key={t.id}><td className="cell-desc">{t.transaction_number}</td>
                <td className="cell-type">{t.transaction_type}</td>
                <td className="cell-mono">{t.quantity}</td>
                <td className="cell-muted col-hide-sm cell-mono">{fmtAmt(t.total_cost)}</td>
                <td className="cell-muted col-hide-sm">{fmtDateTime(t.created_at)}</td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}
    </div>
  )
}
