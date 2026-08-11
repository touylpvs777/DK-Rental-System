import { useTranslation } from 'react-i18next'
import { Package, Tag, Wrench, ShoppingCart } from 'lucide-react'
import type { Product } from '@/types/catalog'
import './ProductCard.css'

interface ProductCardProps {
  product: Product
  onClick?: () => void
  onEdit?: () => void
}

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect x="2" y="2" width="20" height="20" rx="2"/%3E%3Cpath d="M7 8h10M7 12h10M7 16h6"/%3E%3C/svg%3E'

export default function ProductCard({ product, onClick, onEdit }: ProductCardProps) {
  const { t } = useTranslation()
  const imgSrc = product.primary_image_url ?? PLACEHOLDER

  return (
    <div className="product-card" onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="product-card-img-wrap">
        <img
          src={imgSrc}
          alt={product.name_en}
          className="product-card-img"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
        />
        <div className="product-card-badges">
          {product.is_featured  && <span className="pc-badge featured">{t('catalog.products.badges.featured')}</span>}
          {product.is_rental    && <span className="pc-badge rental"><Wrench size={10} /> {t('catalog.products.badges.rental')}</span>}
          {product.is_sale      && <span className="pc-badge sale"><ShoppingCart size={10} /> {t('catalog.products.badges.sale')}</span>}
          {!product.is_active   && <span className="pc-badge inactive">{t('common.inactive')}</span>}
        </div>
      </div>

      <div className="product-card-body">
        {product.brand && (
          <div className="product-card-brand">{product.brand.name}</div>
        )}
        <div className="product-card-name">{product.name_en}</div>
        {product.name_lo && <div className="product-card-name-lo">{product.name_lo}</div>}
        {product.model_number && (
          <div className="product-card-model">
            <Tag size={11} /> {product.model_number}
          </div>
        )}
        {product.category && (
          <div className="product-card-category">
            <Package size={11} /> {product.category.name_en}
          </div>
        )}
        <div className="product-card-sku">{t('catalog.products.skuPrefix', { sku: product.sku })}</div>
      </div>

      {onEdit && (
        <button
          className="product-card-edit"
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          title={t('common.edit')}
        >
          {t('common.edit')}
        </button>
      )}
    </div>
  )
}
