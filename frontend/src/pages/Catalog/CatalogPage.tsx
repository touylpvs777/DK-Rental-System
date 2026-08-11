import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Plus, Upload, LayoutGrid, List, AlertCircle,
  ChevronLeft, ChevronRight, Package, RefreshCw,
  Pencil, Trash2,
} from 'lucide-react'
import { useCatalog } from '@/hooks/useCatalog'
import { useBrands } from '@/hooks/useBrands'
import { useCategories } from '@/hooks/useCategories'
import {
  HeroBanner, CategorySlider, BrandShowcase,
  MegaMenuBar, CatalogProductCard,
} from '@/components/catalog/CatalogComponents'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ProductForm from './ProductForm'
import type { Product } from '@/types/catalog'
import { resolveMediaUrl } from '@/utils/media'
import './CatalogPage.css'
import '@/styles/shared.css'

type ViewMode = 'grid' | 'list'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function CatalogPage() {
  const { t } = useTranslation()
  const {
    products, total, pages, page: currentPage,
    params, isLoading, isFetching, error,
    applyParams, refetch, create, update, remove,
  } = useCatalog({ page: 1, page_size: 20 })

  const { brands } = useBrands(true)
  const { tree, treeFlattened } = useCategories()

  const navigate = useNavigate()

  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const openCreate = () => { setEditTarget(null); setFormOpen(true) }
  const openEdit = (p: Product) => { setEditTarget(p); setFormOpen(true) }

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    if (editTarget) return update(editTarget.id, data as never)
    return create(data as never)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    await remove(deleteTarget.id)
    setIsDeleting(false)
    setDeleteTarget(null)
  }

  const activeCategoryId = params.category_id ?? null
  const activeBrandId = params.brand_id ?? null

  const handleSearch = (q: string) => applyParams({ q: q || undefined, page: 1 })
  const handleCategoryFilter = (id: number | null) => applyParams({ category_id: id ?? undefined, page: 1 })
  const handleBrandFilter = (id: number | null) => applyParams({ brand_id: id ?? undefined, page: 1 })

  const hasFilters = params.q || params.brand_id || params.category_id || params.is_rental || params.is_sale || params.is_featured

  const pageNumbers = (() => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
    if (currentPage <= 4) return [1, 2, 3, 4, 5, '…', pages]
    if (currentPage >= pages - 3) return [1, '…', ...Array.from({ length: 5 }, (_, i) => pages - 4 + i)]
    return [1, '…', currentPage - 1, currentPage, currentPage + 1, '…', pages]
  })()

  return (
    <div>
      {/* Hero Banner */}
      <HeroBanner
        total={total}
        searchValue={params.q ?? ''}
        onSearch={handleSearch}
        onCategoryFilter={handleCategoryFilter}
        categories={treeFlattened}
      />

      {/* Category Slider */}
      <CategorySlider
        categories={treeFlattened}
        activeCategoryId={activeCategoryId}
        onSelect={handleCategoryFilter}
      />

      {/* Brand Showcase */}
      <BrandShowcase
        brands={brands}
        activeBrandId={activeBrandId}
        onSelect={handleBrandFilter}
      />

      {/* Mega Menu Bar */}
      <MegaMenuBar
        categories={tree}
        activeCategoryId={activeCategoryId}
        onCategorySelect={handleCategoryFilter}
      />

      {error && (
        <div className="page-error" style={{ marginBottom: 16 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="catalog-toolbar">
        <select
          className="filter-select"
          value={
            params.is_rental === true ? 'rental'
            : params.is_sale === true ? 'sale'
            : params.is_featured === true ? 'featured'
            : ''
          }
          onChange={(e) => {
            const v = e.target.value
            applyParams({
              is_rental: v === 'rental' ? true : undefined,
              is_sale: v === 'sale' ? true : undefined,
              is_featured: v === 'featured' ? true : undefined,
              page: 1,
            })
          }}
        >
          <option value="">{t('catalog.products.filterAllTypes')}</option>
          <option value="sale">{t('catalog.products.forSale')}</option>
          <option value="rental">{t('catalog.products.forRental')}</option>
          <option value="featured">{t('catalog.products.featured')}</option>
        </select>

        {hasFilters && (
          <button
            className="clear-btn"
            onClick={() => applyParams({ q: undefined, brand_id: undefined, category_id: undefined, is_rental: undefined, is_sale: undefined, is_featured: undefined, page: 1 })}
          >
            {t('common.clearFilters')}
          </button>
        )}

        <button className="btn btn-ghost" onClick={() => refetch()} disabled={isFetching} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} className={isFetching ? 'spin' : ''} /> {t('catalog.products.refresh')}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/catalog/import')} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Upload size={14} /> {t('inventory.import.button')}
        </button>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> {t('catalog.products.newProduct')}
        </button>

        <span className="catalog-toolbar-count">{t('catalog.products.productCount', { count: total })}</span>

        <div className="catalog-view-toggle">
          <button className={`catalog-view-btn${viewMode === 'grid' ? ' active' : ''}`} onClick={() => setViewMode('grid')} title={t('common.gridView')}><LayoutGrid size={15} /></button>
          <button className={`catalog-view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')} title={t('common.listView')}><List size={15} /></button>
        </div>
      </div>

      {/* Active Filter Pills */}
      {hasFilters && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {params.q && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-100)', borderRadius: 'var(--radius-full)', fontSize: 12, color: 'var(--color-primary-700)' }}>
              {t('catalog.products.pillSearch', { query: params.q })}
              <button onClick={() => applyParams({ q: undefined, page: 1 })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1 }}>×</button>
            </span>
          )}
          {params.brand_id && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-100)', borderRadius: 'var(--radius-full)', fontSize: 12, color: 'var(--color-primary-700)' }}>
              {t('catalog.products.pillBrand', { name: brands.find((b) => b.id === params.brand_id)?.name ?? params.brand_id })}
              <button onClick={() => applyParams({ brand_id: undefined, page: 1 })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1 }}>×</button>
            </span>
          )}
          {params.category_id && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-100)', borderRadius: 'var(--radius-full)', fontSize: 12, color: 'var(--color-primary-700)' }}>
              {t('catalog.products.pillCategory', { name: treeFlattened.find((c) => c.id === params.category_id)?.name_en ?? params.category_id })}
              <button onClick={() => applyParams({ category_id: undefined, page: 1 })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1 }}>×</button>
            </span>
          )}
          {(params.is_sale || params.is_rental || params.is_featured) && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-100)', borderRadius: 'var(--radius-full)', fontSize: 12, color: 'var(--color-primary-700)' }}>
              {params.is_sale ? t('catalog.products.forSale') : params.is_rental ? t('catalog.products.forRental') : t('catalog.products.featured')}
              <button onClick={() => applyParams({ is_sale: undefined, is_rental: undefined, is_featured: undefined, page: 1 })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1 }}>×</button>
            </span>
          )}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="catalog-product-grid">
          {isLoading ? (
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="catalog-skeleton">
                <div className="catalog-skeleton-img" />
                <div className="catalog-skeleton-body">
                  <div className="skeleton-cell" style={{ height: 12, width: '60%' }} />
                  <div className="skeleton-cell" style={{ height: 14, width: '85%', marginTop: 4 }} />
                  <div className="skeleton-cell" style={{ height: 10, width: '45%', marginTop: 4 }} />
                </div>
              </div>
            ))
          ) : products.length === 0 ? (
            <div className="catalog-product-empty">
              <Package size={40} />
              <p>{t('catalog.products.empty.title')}</p>
              <small>{t('catalog.products.empty.hint')}</small>
            </div>
          ) : (
            products.map((p) => (
              <CatalogProductCard
                key={p.id}
                product={p}
                onClick={() => navigate(`/catalog/products/${p.id}`)}
                onEdit={() => openEdit(p)}
              />
            ))
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="table-card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('catalog.products.table.product')}</th>
                  <th>{t('catalog.products.table.sku')}</th>
                  <th className="col-hide-sm">{t('catalog.products.table.brand')}</th>
                  <th className="col-hide-sm">{t('common.category')}</th>
                  <th>{t('common.type')}</th>
                  <th className="col-hide-sm">{t('common.createdAt')}</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="skeleton-row">
                      <td><div className="skeleton-cell" style={{ width: '70%' }} /></td>
                      <td><div className="skeleton-cell" style={{ width: '60%' }} /></td>
                      <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: '55%' }} /></td>
                      <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: '60%' }} /></td>
                      <td><div className="skeleton-cell" style={{ width: '50px' }} /></td>
                      <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: '80px' }} /></td>
                      <td><div className="skeleton-cell" style={{ width: '40px' }} /></td>
                    </tr>
                  ))
                ) : products.length === 0 ? (
                  <tr><td colSpan={7}><div className="table-empty"><Package size={36} /><p>{t('catalog.products.empty.title')}</p></div></td></tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/catalog/products/${p.id}`)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {p.primary_image_url
                            ? <img
                                src={resolveMediaUrl(p.primary_image_url)!}
                                alt={p.name_en}
                                style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--color-border)' }}
                                loading="lazy"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                              />
                            : <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-subtle)', borderRadius: 4, border: '1px solid var(--color-border)' }}>
                                <Package size={16} style={{ color: 'var(--color-text-muted)' }} />
                              </div>}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name_en}</div>
                            {p.model_number && <div className="cell-muted" style={{ fontSize: 12 }}>{p.model_number}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="cell-muted cell-mono">{p.sku}</td>
                      <td className="cell-muted col-hide-sm">{p.brand?.name ?? '—'}</td>
                      <td className="cell-muted col-hide-sm">{p.category?.name_en ?? '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {p.is_sale && <span className="cpc-badge sale">{t('catalog.products.badges.sale')}</span>}
                          {p.is_rental && <span className="cpc-badge rental">{t('catalog.products.badges.rental')}</span>}
                          {p.is_featured && <span className="cpc-badge featured">{t('catalog.products.badges.featured')}</span>}
                          {!p.is_active && <span className="cpc-badge inactive">{t('common.inactive')}</span>}
                        </div>
                      </td>
                      <td className="cell-muted col-hide-sm">{fmtDate(p.created_at)}</td>
                      <td>
                        <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                          <button className="action-btn" title={t('common.edit')} onClick={() => openEdit(p)}><Pencil size={14} /></button>
                          <button className="action-btn danger" title={t('common.delete')} onClick={() => setDeleteTarget(p)}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!isLoading && pages > 1 && (
            <div className="pagination">
              <span className="pagination-info">{t('catalog.pageOf', { page: currentPage, pages, total })}</span>
              <div className="pagination-controls">
                <button className="page-btn" disabled={currentPage === 1} onClick={() => applyParams({ page: currentPage - 1 })}><ChevronLeft size={14} /></button>
                {pageNumbers.map((p, i) =>
                  p === '…' ? <span key={`e-${i}`} className="page-btn" style={{ cursor: 'default', border: 'none' }}>…</span>
                  : <button key={p} className={`page-btn${currentPage === p ? ' active' : ''}`} onClick={() => applyParams({ page: p as number })}>{p}</button>
                )}
                <button className="page-btn" disabled={currentPage === pages} onClick={() => applyParams({ page: currentPage + 1 })}><ChevronRight size={14} /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid Pagination */}
      {viewMode === 'grid' && !isLoading && pages > 1 && (
        <div className="pagination" style={{ marginTop: 16, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px' }}>
          <span className="pagination-info">{t('catalog.pageOf', { page: currentPage, pages, total })}</span>
          <div className="pagination-controls">
            <button className="page-btn" disabled={currentPage === 1} onClick={() => applyParams({ page: currentPage - 1 })}><ChevronLeft size={14} /></button>
            {pageNumbers.map((p, i) =>
              p === '…' ? <span key={`e-${i}`} className="page-btn" style={{ cursor: 'default', border: 'none' }}>…</span>
              : <button key={p} className={`page-btn${currentPage === p ? ' active' : ''}`} onClick={() => applyParams({ page: p as number })}>{p}</button>
            )}
            <button className="page-btn" disabled={currentPage === pages} onClick={() => applyParams({ page: currentPage + 1 })}><ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      <ProductForm isOpen={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleFormSubmit} product={editTarget} brands={brands} categories={treeFlattened} />
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} isLoading={isDeleting} title={t('catalog.products.deleteDialog.title')} message={deleteTarget ? t('catalog.products.deleteDialog.message', { name: deleteTarget.name_en }) : ''} />
    </div>
  )
}
