import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import ImageUpload from '@/components/ui/ImageUpload'
import { getProduct, addProductImage, updateProductImage } from '@/api/catalog'
import { toast } from '@/store/toastStore'
import type { UploadResult } from '@/api/upload'
import type { Product, Brand, ProductCategory, ProductImage } from '@/types/catalog'
import '@/styles/shared.css'

interface ProductFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => Promise<Product | null>
  product?: Product | null
  brands: Brand[]
  categories: ProductCategory[]
}

const EMPTY = {
  name_en: '',
  name_lo: '',
  sku: '',
  model_number: '',
  brand_id: '',
  category_id: '',
  description_en: '',
  is_active: true,
  is_featured: false,
  is_sale: true,
  is_rental: false,
  is_used_available: false,
  is_service_item: false,
}

export default function ProductForm({
  isOpen,
  onClose,
  onSubmit,
  product,
  brands,
  categories,
}: ProductFormProps) {
  const { t } = useTranslation()
  const [form, setForm]         = useState({ ...EMPTY })
  const [isSaving, setIsSaving] = useState(false)
  const [err, setErr]           = useState<string | null>(null)

  // The product's image is a separate gallery sub-resource on the backend
  // (`primary_image_url` is derived server-side from `ProductImage` rows, not
  // a plain create/update field) — tracked independently of `form` and only
  // acted on at submit time if the user actually touched it.
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null)
  const [imageTouched, setImageTouched] = useState(false)
  const [existingImages, setExistingImages] = useState<ProductImage[]>([])

  useEffect(() => {
    if (!isOpen) return
    if (product) {
      setForm({
        name_en:           product.name_en,
        name_lo:           product.name_lo ?? '',
        sku:               product.sku,
        model_number:      product.model_number ?? '',
        brand_id:          product.brand?.id?.toString() ?? '',
        category_id:       product.category?.id?.toString() ?? '',
        description_en:    '',
        is_active:         product.is_active,
        is_featured:       product.is_featured,
        is_sale:           product.is_sale,
        is_rental:         product.is_rental,
        is_used_available: product.is_used_available,
        is_service_item:   product.is_service_item,
      })
      setPendingImageUrl(product.primary_image_url ?? null)
      setImageTouched(false)
      setExistingImages([])
      // Needed only to unset any prior primary image(s) if the user uploads
      // a new one — `Product` (the list-row shape passed in as `product`)
      // doesn't carry the full image gallery, only `ProductDetail` does.
      getProduct(product.id)
        .then(({ data }) => setExistingImages(data.images))
        .catch(() => { /* non-fatal — worst case a stale primary lingers in the gallery */ })
    } else {
      setForm({ ...EMPTY })
      setPendingImageUrl(null)
      setImageTouched(false)
      setExistingImages([])
    }
    setErr(null)
  }, [isOpen, product])

  const set = (key: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleImageUploaded = (result: UploadResult) => {
    setPendingImageUrl(result.url)
    setImageTouched(true)
  }
  const handleImageRemoved = () => {
    setPendingImageUrl(null)
    setImageTouched(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name_en.trim()) { setErr(t('catalog.products.form.nameRequired')); return }
    setIsSaving(true)
    setErr(null)
    const payload: Record<string, unknown> = {
      name_en:           form.name_en.trim(),
      name_lo:           form.name_lo.trim() || undefined,
      model_number:      form.model_number.trim() || undefined,
      brand_id:          form.brand_id ? Number(form.brand_id) : null,
      category_id:       form.category_id ? Number(form.category_id) : null,
      description_en:    form.description_en.trim() || undefined,
      is_active:         form.is_active,
      is_featured:       form.is_featured,
      is_sale:           form.is_sale,
      is_rental:         form.is_rental,
      is_used_available: form.is_used_available,
      is_service_item:   form.is_service_item,
    }
    if (!product && form.sku.trim()) payload.sku = form.sku.trim()

    const saved = await onSubmit(payload)
    if (!saved) {
      setIsSaving(false)
      setErr(t('catalog.products.form.saveFailed'))
      return
    }

    if (imageTouched) {
      try {
        const stalePrimaries = existingImages.filter((img) => img.is_primary)
        await Promise.all(
          stalePrimaries.map((img) => updateProductImage(saved.id, img.id, { is_primary: false })),
        )
        if (pendingImageUrl) {
          await addProductImage(saved.id, { image_url: pendingImageUrl, is_primary: true })
        }
      } catch {
        toast.error(t('catalog.products.form.imageSaveFailed'))
      }
    }

    setIsSaving(false)
    onClose()
  }

  const FLAGS: [string, string][] = [
    ['is_active',         t('common.active')],
    ['is_sale',           t('catalog.products.forSale')],
    ['is_rental',         t('catalog.products.forRental')],
    ['is_featured',       t('catalog.products.featured')],
    ['is_used_available', t('catalog.products.form.usedAvailable')],
    ['is_service_item',   t('catalog.products.form.serviceItem')],
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? t('catalog.products.editTitle') : t('catalog.products.newTitle')}
      width={620}
    >
      <form onSubmit={handleSubmit} className="form-grid">
        {err && <div className="page-error" style={{ margin: 0 }}>{err}</div>}

        <div className="form-group">
          <label>{t('catalog.products.form.imageLabel')}</label>
          <ImageUpload
            initialImageUrl={product?.primary_image_url}
            onUploaded={handleImageUploaded}
            onRemoved={handleImageRemoved}
          />
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label>{t('catalog.products.form.nameEnLabel')} <span className="required">*</span></label>
            <input
              value={form.name_en}
              onChange={(e) => set('name_en', e.target.value)}
              placeholder={t('catalog.products.form.nameEnPlaceholder')}
              required
            />
          </div>
          <div className="form-group">
            <label>{t('catalog.products.form.nameLoLabel')}</label>
            <input
              value={form.name_lo}
              onChange={(e) => set('name_lo', e.target.value)}
              placeholder="ຊື່ສິນຄ້າ"
            />
          </div>
        </div>

        <div className="form-row-2">
          {!product && (
            <div className="form-group">
              <label>{t('catalog.products.table.sku')}</label>
              <input
                value={form.sku}
                onChange={(e) => set('sku', e.target.value)}
                placeholder={t('catalog.products.form.skuPlaceholder')}
              />
            </div>
          )}
          <div className="form-group">
            <label>{t('catalog.products.form.modelNumberLabel')}</label>
            <input
              value={form.model_number}
              onChange={(e) => set('model_number', e.target.value)}
              placeholder={t('catalog.products.form.modelNumberPlaceholder')}
            />
          </div>
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label>{t('catalog.products.form.brandLabel')}</label>
            <select value={form.brand_id} onChange={(e) => set('brand_id', e.target.value)}>
              <option value="">{t('catalog.products.form.noBrandOption')}</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>{t('common.category')}</label>
            <select value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
              <option value="">{t('catalog.products.form.noCategoryOption')}</option>
              {categories.map((c) => {
                const d = (c as never as { _depth: number })._depth ?? 0
                return <option key={c.id} value={c.id}>{'  '.repeat(d)}{c.name_en}</option>
              })}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>{t('common.description')}</label>
          <textarea
            value={form.description_en}
            onChange={(e) => set('description_en', e.target.value)}
            rows={3}
            placeholder={t('catalog.products.form.descriptionPlaceholder')}
          />
        </div>

        {/* Flags */}
        <div>
          <label style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--color-text)', display: 'block', marginBottom: 8 }}>
            {t('catalog.products.form.attributesLabel')}
          </label>
          <div className="product-flags">
            {FLAGS.map(([key, label]) => (
              <label key={key} className="flag-check">
                <input
                  type="checkbox"
                  checked={!!form[key as keyof typeof form]}
                  onChange={(e) => set(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? t('common.saving') : product ? t('catalog.saveChanges') : t('catalog.products.form.createProduct')}
          </button>
        </div>
      </form>

      <style>{`
        .product-flags { display: flex; flex-wrap: wrap; gap: 10px; }
        .flag-check {
          display: flex; align-items: center; gap: 5px;
          font-size: 13px; cursor: pointer; user-select: none;
        }
        .flag-check input { cursor: pointer; }
      `}</style>
    </Modal>
  )
}
