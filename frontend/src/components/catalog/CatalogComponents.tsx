import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Search, Package, Tag, Layers, Wrench, Truck, ShoppingCart, Star,
  Menu, ChevronDown,
} from 'lucide-react'
import type { Product, Brand, ProductCategory } from '@/types/catalog'
import { resolveMediaUrl } from '@/utils/media'
import './CatalogComponents.css'

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  forklifts: Truck, forklift: Truck,
  parts: Wrench, spare: Wrench,
  warehouse: Package, equipment: Package,
  attachment: Layers, accessories: Layers,
  service: Wrench,
}

function getCategoryIcon(name: string): React.ElementType {
  const lower = name.toLowerCase()
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon
  }
  return Package
}

/* ================================================================
   Hero Banner
   ================================================================ */

interface HeroBannerProps {
  total: number
  searchValue: string
  onSearch: (q: string) => void
  onCategoryFilter: (id: number | null) => void
  categories: ProductCategory[]
}

export function HeroBanner({ total, searchValue, onSearch, onCategoryFilter, categories }: HeroBannerProps) {
  const { t } = useTranslation()
  const topCats = categories.filter((c) => c.parent_id === null).slice(0, 3)

  return (
    <div className="catalog-hero">
      <div className="catalog-hero-top">
        <div>
          <div className="catalog-hero-brand">{t('common.brandName')}</div>
          <h1>{t('catalog.hero.title')}</h1>
          <p className="catalog-hero-sub">
            {t('catalog.hero.subtitle')}
          </p>
        </div>
        <div className="catalog-hero-actions">
          {topCats.map((c) => (
            <button key={c.id} className="catalog-hero-cta" onClick={() => onCategoryFilter(c.id)}>
              {c.name_en}
            </button>
          ))}
        </div>
      </div>
      <div className="catalog-hero-search">
        <Search size={18} />
        <input
          placeholder={t('catalog.hero.searchPlaceholder', { count: total.toLocaleString() })}
          value={searchValue}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
    </div>
  )
}

/* ================================================================
   Category Slider
   ================================================================ */

interface CategorySliderProps {
  categories: ProductCategory[]
  activeCategoryId: number | null
  onSelect: (id: number | null) => void
}

export function CategorySlider({ categories, activeCategoryId, onSelect }: CategorySliderProps) {
  const { t } = useTranslation()
  const topLevel = categories.filter((c) => c.parent_id === null)
  if (!topLevel.length) return null

  return (
    <div className="cat-slider">
      <div className="cat-slider-title">{t('catalog.categorySlider.title')}</div>
      <div className="cat-slider-track">
        {topLevel.map((cat) => {
          const Icon = getCategoryIcon(cat.name_en)
          return (
            <button
              key={cat.id}
              className={`cat-slider-card${activeCategoryId === cat.id ? ' active' : ''}`}
              onClick={() => onSelect(activeCategoryId === cat.id ? null : cat.id)}
            >
              <div className="cat-slider-icon"><Icon size={20} /></div>
              <span className="cat-slider-label">{cat.name_en}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================
   Brand Showcase
   ================================================================ */

const COUNTRY_FLAGS: Record<string, string> = {
  japan: '🇯🇵', germany: '🇩🇪', sweden: '🇸🇪', usa: '🇺🇸', china: '🇨🇳',
  korea: '🇰🇷', italy: '🇮🇹', france: '🇫🇷', uk: '🇬🇧', laos: '🇱🇦', thailand: '🇹🇭',
}

interface BrandShowcaseProps {
  brands: Brand[]
  activeBrandId: number | null
  onSelect: (id: number | null) => void
}

export function BrandShowcase({ brands, activeBrandId, onSelect }: BrandShowcaseProps) {
  const { t } = useTranslation()
  if (!brands.length) return null

  return (
    <div className="brand-showcase">
      <div className="brand-showcase-header">
        <span className="brand-showcase-title">{t('catalog.brandShowcase.title')}</span>
        <Link to="/catalog/brands" className="brand-showcase-link">{t('catalog.viewAll')}</Link>
      </div>
      <div className="brand-showcase-track">
        {brands.map((b) => {
          const flag = b.country ? COUNTRY_FLAGS[b.country.toLowerCase()] : null
          return (
            <button
              key={b.id}
              className={`brand-card${activeBrandId === b.id ? ' active' : ''}`}
              onClick={() => onSelect(activeBrandId === b.id ? null : b.id)}
            >
              <div className="brand-card-logo">
                {b.logo_url ? (
                  <img src={b.logo_url} alt={b.name} />
                ) : (
                  <div className="brand-card-initial">{b.name.charAt(0)}</div>
                )}
              </div>
              <span className="brand-card-name">{b.name}</span>
              {(flag || b.country) && (
                <span className="brand-card-country">{flag} {b.country}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ================================================================
   Mega Menu Bar
   ================================================================ */

interface MegaMenuBarProps {
  categories: ProductCategory[]
  activeCategoryId: number | null
  onCategorySelect: (id: number | null) => void
}

export function MegaMenuBar({ categories, activeCategoryId, onCategorySelect }: MegaMenuBarProps) {
  const { t } = useTranslation()
  const [panelOpen, setPanelOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const topLevel = categories.filter((c) => c.parent_id === null)

  useEffect(() => {
    if (!panelOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setPanelOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [panelOpen])

  const selectAndClose = (id: number | null) => {
    onCategorySelect(id)
    setPanelOpen(false)
  }

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <div className="mega-bar">
        <button className="mega-bar-trigger" onClick={() => setPanelOpen((v) => !v)}>
          <Menu size={16} />
          {t('catalog.megaMenu.allCategories')}
          <ChevronDown size={14} style={{ transform: panelOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        </button>
        {topLevel.map((cat) => (
          <button
            key={cat.id}
            className={`mega-bar-tab${activeCategoryId === cat.id ? ' active' : ''}`}
            onClick={() => onCategorySelect(activeCategoryId === cat.id ? null : cat.id)}
          >
            {cat.name_en}
          </button>
        ))}
      </div>

      {panelOpen && (
        <>
          <div className="mega-overlay" onClick={() => setPanelOpen(false)} />
          <div className="mega-panel">
            {topLevel.map((cat) => {
              const Icon = getCategoryIcon(cat.name_en)
              return (
                <div key={cat.id}>
                  <div className="mega-col-title"><Icon size={14} /> {cat.name_en}</div>
                  {cat.children?.map((child) => (
                    <button key={child.id} className="mega-col-link" onClick={() => selectAndClose(child.id)}>
                      {child.name_en}
                    </button>
                  ))}
                  <button className="mega-col-link" style={{ color: 'var(--color-primary)', fontWeight: 500, marginTop: 4 }}
                    onClick={() => selectAndClose(cat.id)}>
                    {t('catalog.viewAll')}
                  </button>
                </div>
              )
            })}
            <div className="mega-footer">
              <button className="mega-footer-link" onClick={() => selectAndClose(null)}>
                {t('catalog.browseAllProducts')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ================================================================
   Catalog Product Card
   ================================================================ */

interface CatalogProductCardProps {
  product: Product
  onClick?: () => void
  onEdit?: () => void
}

export function CatalogProductCard({ product, onClick, onEdit }: CatalogProductCardProps) {
  const { t } = useTranslation()
  const [imgFailed, setImgFailed] = useState(false)
  const resolvedSrc = resolveMediaUrl(product.primary_image_url)
  const showImage = Boolean(resolvedSrc) && !imgFailed

  return (
    <div
      className={`cpc${!product.is_active ? ' inactive' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter') onClick() } : undefined}
    >
      <div className="cpc-img-wrap">
        {showImage ? (
          <img src={resolvedSrc!} alt={product.name_en} className="cpc-img" loading="lazy"
            onError={() => setImgFailed(true)} />
        ) : (
          <div className="cpc-img-placeholder">
            <Package size={48} strokeWidth={1.5} />
          </div>
        )}
        <div className="cpc-badges">
          {product.is_sale && <span className="cpc-badge sale"><ShoppingCart size={10} /> {t('catalog.products.badges.sale')}</span>}
          {product.is_rental && <span className="cpc-badge rental"><Wrench size={10} /> {t('catalog.products.badges.rental')}</span>}
          {!product.is_active && <span className="cpc-badge inactive">{t('common.inactive')}</span>}
        </div>
        {product.is_featured && (
          <div className="cpc-star"><Star size={14} /></div>
        )}
      </div>

      <div className="cpc-body">
        {product.brand && <div className="cpc-brand">{product.brand.name}</div>}
        <div className="cpc-name">{product.name_en}</div>
        {product.model_number && (
          <div className="cpc-model"><Tag size={11} /> {product.model_number}</div>
        )}
        <div className="cpc-sku">{t('catalog.products.skuPrefix', { sku: product.sku })}</div>
        {product.category && (
          <div className="cpc-category"><Package size={10} /> {product.category.name_en}</div>
        )}
      </div>

      {onEdit && (
        <div className="cpc-actions">
          <button className="cpc-action-btn" onClick={(e) => { e.stopPropagation(); onClick?.() }}>{t('common.view')}</button>
          <button className="cpc-action-btn" onClick={(e) => { e.stopPropagation(); onEdit() }}>{t('common.edit')}</button>
        </div>
      )}
    </div>
  )
}
