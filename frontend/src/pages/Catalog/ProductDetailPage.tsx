import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, Tag, Package, Wrench, ShoppingCart, Star, AlertCircle } from 'lucide-react'
import { getProduct } from '@/api/catalog'
import ProductImageGallery from '@/components/catalog/ProductImageGallery'
import SpecTable from '@/components/catalog/SpecTable'
import type { ProductDetail } from '@/types/catalog'
import './ProductDetailPage.css'

function Badge({ label, color, icon: Icon }: { label: string; color: string; icon?: React.ElementType }) {
  return (
    <span className="detail-badge" style={{ '--badge-color': color } as React.CSSProperties}>
      {Icon && <Icon size={11} />} {label}
    </span>
  )
}

export default function ProductDetailPage() {
  const { t } = useTranslation()
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()

  const [product, setProduct]     = useState<ProductDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setIsLoading(true)
    setError(null)
    getProduct(Number(id))
      .then(({ data }) => { if (!cancelled) setProduct(data) })
      .catch(() => { if (!cancelled) setError(t('catalog.productDetail.loadError')) })
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [id, t])

  if (isLoading) {
    return (
      <div className="product-detail">
        <div className="detail-skeleton">
          <div className="skeleton-cell" style={{ height: 18, width: '30%', marginBottom: 24 }} />
          <div className="detail-skeleton-body">
            <div className="skeleton-cell detail-skeleton-img" />
            <div className="detail-skeleton-info">
              <div className="skeleton-cell" style={{ height: 12, width: '50%' }} />
              <div className="skeleton-cell" style={{ height: 24, width: '80%', marginTop: 8 }} />
              <div className="skeleton-cell" style={{ height: 14, width: '40%', marginTop: 12 }} />
              <div className="skeleton-cell" style={{ height: 12, width: '65%', marginTop: 20 }} />
              <div className="skeleton-cell" style={{ height: 12, width: '55%', marginTop: 6 }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="product-detail">
        <button className="detail-back" onClick={() => navigate('/catalog')}>
          <ChevronLeft size={16} /> {t('catalog.productDetail.backToCatalog')}
        </button>
        <div className="page-error" style={{ marginTop: 24 }}>
          <AlertCircle size={16} /> {error ?? t('catalog.productDetail.notFound')}
        </div>
      </div>
    )
  }

  return (
    <div className="product-detail">
      {/* Back */}
      <button className="detail-back" onClick={() => navigate('/catalog')}>
        <ChevronLeft size={16} /> {t('catalog.productDetail.backToCatalog')}
      </button>

      {/* Main content */}
      <div className="detail-layout">
        {/* Gallery */}
        <div className="detail-gallery-col">
          <ProductImageGallery images={product.images} productName={product.name_en} />
        </div>

        {/* Info */}
        <div className="detail-info-col">
          {/* Brand */}
          {product.brand && (
            <div className="detail-brand">{product.brand.name}</div>
          )}

          {/* Name */}
          <h1 className="detail-name">{product.name_en}</h1>
          {product.name_lo && <div className="detail-name-lo">{product.name_lo}</div>}

          {/* Badges */}
          <div className="detail-badges">
            {product.is_sale      && <Badge label={t('catalog.products.forSale')}   color="#15803d" icon={ShoppingCart} />}
            {product.is_rental    && <Badge label={t('catalog.products.forRental')} color="#1d4ed8" icon={Wrench} />}
            {product.is_featured  && <Badge label={t('catalog.products.featured')}  color="#b45309" icon={Star} />}
            {!product.is_active   && <Badge label={t('common.inactive')}            color="#64748b" />}
          </div>

          {/* Key fields */}
          <dl className="detail-meta">
            {product.sku && (
              <>
                <dt><Tag size={13} /> {t('catalog.products.table.sku')}</dt>
                <dd className="cell-mono">{product.sku}</dd>
              </>
            )}
            {product.model_number && (
              <>
                <dt><Package size={13} /> {t('catalog.productDetail.model')}</dt>
                <dd>{product.model_number}</dd>
              </>
            )}
            {product.category && (
              <>
                <dt>{t('common.category')}</dt>
                <dd>{product.category.name_en}</dd>
              </>
            )}
          </dl>

          {/* Description */}
          {product.description_en && (
            <div className="detail-description">
              <div className="detail-section-title">{t('common.description')}</div>
              <p>{product.description_en}</p>
            </div>
          )}

          {/* Compat brands */}
          {product.compat_brands.length > 0 && (
            <div className="detail-compat">
              <div className="detail-section-title">{t('catalog.productDetail.compatibleWith')}</div>
              <div className="compat-list">
                {product.compat_brands.map((cb) => (
                  <span key={cb.id} className="compat-chip">
                    {cb.brand.name}
                    {cb.notes && <em> ({cb.notes})</em>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Specs */}
      {Object.keys(product.specs_grouped).length > 0 && (
        <div className="detail-specs-section">
          <h2 className="detail-section-title">{t('catalog.productDetail.specifications')}</h2>
          <SpecTable specsGrouped={product.specs_grouped} />
        </div>
      )}
    </div>
  )
}
