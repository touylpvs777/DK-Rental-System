import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, AlertCircle, Warehouse as WarehouseIcon, MapPin, User, Phone } from 'lucide-react'
import { getWarehouse, getBalances } from '@/api/inventory'
import type { Warehouse, InventoryBalance } from '@/types/inventory'
import '@/pages/Catalog/ProductDetailPage.css'
import '@/styles/detail.css'
import '@/styles/shared.css'

export default function WarehouseDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null)
  const [balances, setBalances] = useState<InventoryBalance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return; setIsLoading(true); setError(null)
    try {
      const wid = Number(id)
      const [wRes, bRes] = await Promise.all([getWarehouse(wid), getBalances({ warehouse_id: wid })])
      setWarehouse(wRes.data); setBalances(bRes.data)
    } catch { setError(t('inventory.warehouse.detail.loadError')) } finally { setIsLoading(false) }
  }, [id, t])
  useEffect(() => { load() }, [load])

  if (isLoading) return <div className="product-detail"><div className="detail-skeleton"><div className="skeleton-cell" style={{ height: 24, width: '60%' }} /></div></div>
  if (error || !warehouse) return <div className="product-detail"><button className="detail-back" onClick={() => navigate('/inventory/warehouses')}><ChevronLeft size={16} /> {t('common.back')}</button><div className="page-error" style={{ marginTop: 24 }}><AlertCircle size={16} /> {error ?? t('inventory.warehouse.detail.notFound')}</div></div>

  const totalStock = balances.reduce((s, b) => s + b.quantity_on_hand, 0)

  return (
    <div className="product-detail">
      <button className="detail-back" onClick={() => navigate('/inventory/warehouses')}><ChevronLeft size={16} /> {t('inventory.warehouse.detail.backToList')}</button>

      <div className="detail-header">
        <div>
          <div className="detail-title-row"><h1 className="detail-name">{warehouse.name}</h1></div>
          <div className="detail-subtitle">{warehouse.code}</div>
          <div className="detail-badges">
            {!warehouse.is_active && <span className="cpc-badge inactive">{t('common.inactive')}</span>}
          </div>
        </div>
      </div>

      <div className="detail-summary-grid">
        <div className="detail-summary-card"><div className="detail-summary-label">{t('inventory.warehouse.detail.distinctParts')}</div><div className="detail-summary-value">{balances.length}</div></div>
        <div className="detail-summary-card"><div className="detail-summary-label">{t('inventory.warehouse.detail.totalStock')}</div><div className="detail-summary-value">{totalStock}</div></div>
      </div>

      <div className="detail-info-grid">
        <div><dl className="detail-meta">
          {warehouse.address && <><dt><MapPin size={12} style={{ verticalAlign: -1, marginRight: 4 }} />{t('inventory.warehouse.detail.address')}</dt><dd>{warehouse.address}</dd></>}
        </dl></div>
        <div><dl className="detail-meta">
          {warehouse.contact_name && <><dt><User size={12} style={{ verticalAlign: -1, marginRight: 4 }} />{t('inventory.warehouse.detail.contactName')}</dt><dd>{warehouse.contact_name}</dd></>}
          {warehouse.contact_phone && <><dt><Phone size={12} style={{ verticalAlign: -1, marginRight: 4 }} />{t('inventory.warehouse.detail.contactPhone')}</dt><dd>{warehouse.contact_phone}</dd></>}
        </dl></div>
      </div>

      <div className="detail-specs-section" style={{ marginTop: 24 }}>
        <h2 className="detail-section-title"><WarehouseIcon size={16} style={{ verticalAlign: -2, marginRight: 6 }} />{t('inventory.warehouse.detail.stockTitle')}</h2>
        {balances.length === 0 ? (
          <div className="table-empty" style={{ marginTop: 10 }}><p>{t('inventory.warehouse.detail.noStock')}</p></div>
        ) : (
          <div className="table-card" style={{ marginTop: 10 }}><table className="data-table">
            <thead><tr>
              <th>{t('inventory.warehouse.detail.columns.part')}</th>
              <th>{t('inventory.spareParts.detail.columns.onHand')}</th>
              <th>{t('inventory.spareParts.detail.columns.reserved')}</th>
              <th>{t('inventory.spareParts.detail.columns.available')}</th>
            </tr></thead>
            <tbody>{balances.map((b) => (
              <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/inventory/parts/${b.spare_part.id}`)}>
                <td className="cell-desc">{b.spare_part.part_number} — {b.spare_part.name}</td>
                <td className="cell-mono">{b.quantity_on_hand}</td>
                <td className="cell-mono">{b.quantity_reserved}</td>
                <td className="cell-mono cell-total">{b.quantity_available}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </div>
  )
}
