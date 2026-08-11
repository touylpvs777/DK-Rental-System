import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, Plus, Upload, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Package } from 'lucide-react'
import { getParts } from '@/api/inventory'
import { PartCategoryBadge } from '@/components/inventory/StockBadge'
import InventoryImportModal from '@/components/inventory/InventoryImportModal'
import type { SparePart, PartListParams } from '@/types/inventory'
import { resolveMediaUrl } from '@/utils/media'
import PageHeader from '@/components/layout/PageHeader'
import '@/styles/shared.css'
import '@/styles/detail.css'

function fmtAmt(n: number) { return n.toLocaleString(undefined, { maximumFractionDigits: 0 }) }

export default function SparePartListPage() {
  const { t } = useTranslation()
  const CAT_OPTS = [
    { value: '', label: t('inventory.spareParts.categories.all') }, { value: 'filter', label: t('inventory.spareParts.categories.filter') }, { value: 'belt', label: t('inventory.spareParts.categories.belt') },
    { value: 'brake', label: t('inventory.spareParts.categories.brake') }, { value: 'hydraulic', label: t('inventory.spareParts.categories.hydraulic') }, { value: 'electrical', label: t('inventory.spareParts.categories.electrical') },
    { value: 'engine', label: t('inventory.spareParts.categories.engine') }, { value: 'tire', label: t('inventory.spareParts.categories.tire') }, { value: 'battery', label: t('inventory.spareParts.categories.battery') },
    { value: 'lubricant', label: t('inventory.spareParts.categories.lubricant') }, { value: 'general', label: t('inventory.spareParts.categories.general') },
  ]
  const navigate = useNavigate()
  const [items, setItems] = useState<SparePart[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [params, setParams] = useState<PartListParams>({ page: 1, page_size: 20 })
  const [isImportOpen, setImportOpen] = useState(false)

  const load = useCallback(async () => {
    setIsLoading(true); setError(null)
    try { const { data } = await getParts(params); setItems(data.items); setTotal(data.total); setPages(data.pages) }
    catch { setError(t('inventory.spareParts.list.loadError')) } finally { setIsLoading(false) }
  }, [params, t])
  useEffect(() => { load() }, [load])

  const apply = (p: Partial<PartListParams>) => setParams((prev) => ({ ...prev, ...p }))
  const cp = params.page ?? 1

  return (
    <div>
      <PageHeader title={t('inventory.spareParts.list.title')} subtitle={t('inventory.spareParts.list.subtitle', { count: total })}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={load} disabled={isLoading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><RefreshCw size={14} className={isLoading ? 'spin' : ''} /> {t('inventory.common.refresh')}</button>
          <button className="btn btn-ghost" onClick={() => setImportOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Upload size={14} /> {t('inventory.import.button')}</button>
          <button className="btn btn-primary" onClick={() => navigate('/inventory/parts/new')}><Plus size={15} /> {t('inventory.spareParts.list.addPart')}</button>
        </div>
      </PageHeader>
      {error && <div className="page-error"><AlertCircle size={16} /> {error}</div>}
      <InventoryImportModal
        isOpen={isImportOpen}
        onClose={() => setImportOpen(false)}
        onImported={load}
      />
      <div className="toolbar">
        <div className="search-wrap"><Search size={14} /><input className="search-input" placeholder={t('inventory.spareParts.list.searchPlaceholder')} value={params.q ?? ''} onChange={(e) => apply({ q: e.target.value || undefined, page: 1 })} /></div>
        <select className="filter-select" value={params.part_category ?? ''} onChange={(e) => apply({ part_category: e.target.value || undefined, page: 1 })}>{CAT_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <span className="toolbar-count">{t('inventory.common.resultCount', { count: total })}</span>
      </div>
      <div className="table-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>{t('inventory.spareParts.list.columns.partNumber')}</th><th>{t('common.name')}</th><th>{t('common.category')}</th><th className="col-hide-sm">{t('inventory.spareParts.unitPrice')}</th><th className="col-hide-sm">{t('inventory.spareParts.list.columns.minStock')}</th><th className="col-hide-sm">{t('inventory.spareParts.unit')}</th></tr></thead>
            <tbody>
              {isLoading ? Array.from({ length: 8 }).map((_, i) => <tr key={i} className="skeleton-row"><td><div className="skeleton-cell" style={{ width: '80%' }} /></td><td><div className="skeleton-cell" style={{ width: '60%' }} /></td><td><div className="skeleton-cell" style={{ width: 60 }} /></td><td className="col-hide-sm"><div className="skeleton-cell" style={{ width: 60 }} /></td><td className="col-hide-sm"><div className="skeleton-cell" style={{ width: 40 }} /></td><td className="col-hide-sm"><div className="skeleton-cell" style={{ width: 40 }} /></td></tr>) : items.length === 0 ? <tr><td colSpan={6}><div className="table-empty"><p>{t('inventory.spareParts.list.noPartsFound')}</p></div></td></tr> : items.map((p) => (
                <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/inventory/parts/${p.id}`)}>
                  <td className="cell-desc">{p.part_number}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {p.image_url
                        ? <img
                            src={resolveMediaUrl(p.image_url)!}
                            alt={p.name}
                            style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--color-border)', flexShrink: 0 }}
                            loading="lazy"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                          />
                        : <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-subtle)', borderRadius: 4, border: '1px solid var(--color-border)', flexShrink: 0 }}>
                            <Package size={16} style={{ color: 'var(--color-text-muted)' }} />
                          </div>}
                      <div>
                        <div className="cell-desc">{p.name}</div>
                        {p.brand && <div className="cell-muted cell-sub">{p.brand.name}</div>}
                      </div>
                    </div>
                  </td>
                  <td><PartCategoryBadge category={p.part_category} /></td>
                  <td className="cell-muted col-hide-sm cell-mono">{fmtAmt(p.unit_price)} {p.currency}</td>
                  <td className="cell-muted col-hide-sm">{p.min_stock_level}</td>
                  <td className="cell-muted col-hide-sm">{p.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isLoading && pages > 1 && <div className="pagination"><span className="pagination-info">{t('inventory.common.paginationInfo', { page: cp, pages })}</span><div className="pagination-controls"><button className="page-btn" disabled={cp === 1} onClick={() => apply({ page: cp - 1 })}><ChevronLeft size={14} /></button><button className="page-btn" disabled={cp === pages} onClick={() => apply({ page: cp + 1 })}><ChevronRight size={14} /></button></div></div>}
      </div>
    </div>
  )
}
