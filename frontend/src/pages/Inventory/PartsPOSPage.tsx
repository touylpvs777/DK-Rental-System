import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, ScanBarcode, AlertCircle, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react'
import { getParts, getWarehouses, getBalances } from '@/api/inventory'
import PartPOSCard from '@/components/inventory/PartPOSCard'
import PageHeader from '@/components/layout/PageHeader'
import type { SparePart, PartListParams, Warehouse, InventoryBalance, PartCategory } from '@/types/inventory'
import '@/styles/shared.css'
import './PartsPOSPage.css'

const CATEGORIES: PartCategory[] = [
  'filter', 'belt', 'brake', 'hydraulic', 'electrical', 'engine', 'tire', 'chain', 'battery', 'lubricant', 'general',
]
const PAGE_SIZE = 24
const SEARCH_DEBOUNCE_MS = 350

export default function PartsPOSPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [items, setItems] = useState<SparePart[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [params, setParams] = useState<PartListParams>({ page: 1, page_size: PAGE_SIZE })

  const [searchInput, setSearchInput] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [warehouseId, setWarehouseId] = useState<number | null>(null)
  const [balances, setBalances] = useState<Map<number, InventoryBalance>>(new Map())
  const [balancesLoading, setBalancesLoading] = useState(true)

  const apply = (p: Partial<PartListParams>) => setParams((prev) => ({ ...prev, ...p }))
  const cp = params.page ?? 1

  // Warehouses load once; default to the first active one for the stock badges.
  useEffect(() => {
    getWarehouses().then(({ data }) => {
      setWarehouses(data)
      const firstActive = data.find((w) => w.is_active) ?? data[0]
      if (firstActive) setWarehouseId(firstActive.id)
      else setBalancesLoading(false)
    }).catch(() => setBalancesLoading(false))
  }, [])

  const loadParts = useCallback(async () => {
    setIsLoading(true); setError(null)
    try {
      const { data } = await getParts(params)
      setItems(data.items); setTotal(data.total); setPages(data.pages)
    } catch {
      setError(t('inventory.pos.loadError'))
    } finally {
      setIsLoading(false)
    }
  }, [params, t])
  useEffect(() => { loadParts() }, [loadParts])

  // One batched call per warehouse switch/page load — not per card.
  useEffect(() => {
    if (warehouseId == null) return
    setBalancesLoading(true)
    getBalances({ warehouse_id: warehouseId })
      .then(({ data }) => setBalances(new Map(data.map((b) => [b.spare_part.id, b]))))
      .catch(() => setBalances(new Map()))
      .finally(() => setBalancesLoading(false))
  }, [warehouseId])

  const onSearchChange = (value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => apply({ q: value || undefined, page: 1 }), SEARCH_DEBOUNCE_MS)
  }
  const commitSearchNow = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    apply({ q: searchInput || undefined, page: 1 })
  }

  return (
    <div className="pos-page">
      <PageHeader title={t('inventory.pos.title')} subtitle={t('inventory.pos.subtitle', { count: total })}>
        {warehouses.length > 1 && (
          <select
            className="filter-select"
            value={warehouseId ?? ''}
            onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : null)}
          >
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}
      </PageHeader>

      {error && <div className="page-error"><AlertCircle size={16} /> {error}</div>}

      <div className="pos-search-bar">
        <ScanBarcode size={20} className="pos-search-icon" />
        <input
          autoFocus
          className="pos-search-input"
          placeholder={t('inventory.pos.searchPlaceholder')}
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commitSearchNow() }}
        />
        <Search size={16} className="pos-search-go" onClick={commitSearchNow} />
      </div>

      <div className="pos-category-strip">
        <button
          className={`pos-cat-pill ${!params.part_category ? 'active' : ''}`}
          onClick={() => apply({ part_category: undefined, page: 1 })}
        >
          <LayoutGrid size={14} /> {t('inventory.spareParts.categories.all')}
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`pos-cat-pill ${params.part_category === c ? 'active' : ''}`}
            onClick={() => apply({ part_category: c, page: 1 })}
          >
            {t(`inventory.spareParts.categories.${c}`)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="pos-grid">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="pos-card-skeleton" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="pos-empty">
          <LayoutGrid size={32} />
          <p>{t('inventory.pos.noResults')}</p>
        </div>
      ) : (
        <div className="pos-grid">
          {items.map((part) => (
            <PartPOSCard
              key={part.id}
              part={part}
              balance={balances.get(part.id)}
              balancesLoading={balancesLoading}
              onClick={() => navigate(`/inventory/parts/${part.id}`)}
            />
          ))}
        </div>
      )}

      {!isLoading && pages > 1 && (
        <div className="pagination">
          <span className="pagination-info">{t('inventory.common.paginationInfo', { page: cp, pages })}</span>
          <div className="pagination-controls">
            <button className="page-btn" disabled={cp === 1} onClick={() => apply({ page: cp - 1 })}><ChevronLeft size={14} /></button>
            <button className="page-btn" disabled={cp === pages} onClick={() => apply({ page: cp + 1 })}><ChevronRight size={14} /></button>
          </div>
        </div>
      )}
    </div>
  )
}
