import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Search, Pencil, Trash2, Tag, AlertCircle } from 'lucide-react'
import { useBrands } from '@/hooks/useBrands'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import type { Brand, BrandCreate, BrandRole, BrandUpdate } from '@/types/catalog'
import PageHeader from '@/components/layout/PageHeader'
import './BrandsPage.css'
import '@/styles/shared.css'

const ROLE_VALUES: BrandRole[] = ['primary', 'parts_only', 'both']

const EMPTY_FORM = { name: '', country: '', website: '', brand_role: 'primary' as BrandRole, description: '' }

function BrandForm({
  isOpen, onClose, onSubmit, brand,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (d: BrandCreate | BrandUpdate) => Promise<boolean>
  brand?: Brand | null
}) {
  const { t } = useTranslation()
  const [form, setForm]         = useState({ ...EMPTY_FORM })
  const [isSaving, setIsSaving] = useState(false)
  const [err, setErr]           = useState<string | null>(null)

  useState(() => {
    if (!isOpen) return
    if (brand) setForm({ name: brand.name, country: brand.country ?? '', website: brand.website ?? '', brand_role: brand.brand_role, description: brand.description ?? '' })
    else setForm({ ...EMPTY_FORM })
    setErr(null)
  })

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const roleLabel = (role: BrandRole) => t(`catalog.brands.roles.${role === 'parts_only' ? 'partsOnly' : role}`)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setErr(t('catalog.brands.form.nameRequired')); return }
    setIsSaving(true)
    setErr(null)
    const ok = await onSubmit({
      name:        form.name.trim(),
      country:     form.country.trim() || undefined,
      website:     form.website.trim() || undefined,
      brand_role:  form.brand_role,
      description: form.description.trim() || undefined,
    })
    setIsSaving(false)
    if (ok) onClose(); else setErr(t('catalog.saveFailed'))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={brand ? t('catalog.brands.editTitle') : t('catalog.brands.newTitle')} width={500}>
      <form onSubmit={handleSubmit} className="form-grid">
        {err && <div className="page-error" style={{ margin: 0 }}>{err}</div>}
        <div className="form-group">
          <label>{t('common.name')} <span className="required">*</span></label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={t('catalog.brands.form.namePlaceholder')} required />
        </div>
        <div className="form-row-2">
          <div className="form-group">
            <label>{t('catalog.brands.form.countryLabel')}</label>
            <input value={form.country} onChange={(e) => set('country', e.target.value)} placeholder={t('catalog.brands.form.countryPlaceholder')} />
          </div>
          <div className="form-group">
            <label>{t('catalog.brands.form.roleLabel')}</label>
            <select value={form.brand_role} onChange={(e) => set('brand_role', e.target.value)}>
              {ROLE_VALUES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>{t('catalog.brands.form.websiteLabel')}</label>
          <input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder={t('catalog.brands.form.websitePlaceholder')} />
        </div>
        <div className="form-group">
          <label>{t('common.description')}</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? t('common.saving') : brand ? t('catalog.saveChanges') : t('catalog.brands.form.createBrand')}</button>
        </div>
      </form>
    </Modal>
  )
}

export default function BrandsPage() {
  const { t } = useTranslation()
  const { brands, isLoading, error, create, update, remove } = useBrands()

  const roleLabel = (role: BrandRole) => t(`catalog.brands.roles.${role === 'parts_only' ? 'partsOnly' : role}`)

  const [search, setSearch]         = useState('')
  const [formOpen, setFormOpen]     = useState(false)
  const [editTarget, setEditTarget] = useState<Brand | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return brands.filter((b) => !q || b.name.toLowerCase().includes(q) || (b.country ?? '').toLowerCase().includes(q))
  }, [brands, search])

  const handleSubmit = async (data: BrandCreate | BrandUpdate): Promise<boolean> => {
    if (editTarget) return update(editTarget.id, data)
    return create(data as BrandCreate)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    await remove(deleteTarget.id)
    setIsDeleting(false)
    setDeleteTarget(null)
  }

  return (
    <div>
      <PageHeader title={t('catalog.brands.title')} subtitle={t('catalog.brands.subtitle', { count: brands.length })}>
        <button className="btn btn-primary" onClick={() => { setEditTarget(null); setFormOpen(true) }}>
          <Plus size={15} /> {t('catalog.brands.newBrand')}
        </button>
      </PageHeader>

      {error && <div className="page-error"><AlertCircle size={16} /> {error}</div>}

      <div className="toolbar">
        <div className="search-wrap">
          <Search size={14} />
          <input className="search-input" placeholder={t('catalog.brands.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="toolbar-count">{t('catalog.resultsCount', { count: filtered.length })}</span>
      </div>

      <div className="table-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('catalog.brands.table.brand')}</th>
                <th>{t('catalog.brands.table.country')}</th>
                <th>{t('catalog.brands.table.role')}</th>
                <th>{t('common.status')}</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    <td><div className="skeleton-cell" style={{ width: '65%' }} /></td>
                    <td><div className="skeleton-cell" style={{ width: '45%' }} /></td>
                    <td><div className="skeleton-cell" style={{ width: '55px' }} /></td>
                    <td><div className="skeleton-cell" style={{ width: '50px' }} /></td>
                    <td><div className="skeleton-cell" style={{ width: '40px' }} /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="table-empty">
                      <Tag size={36} />
                      <p>{t('catalog.brands.empty.title')}</p>
                      <small>{search ? t('common.tryAdjustingFilters') : t('catalog.brands.empty.createHint')}</small>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {b.logo_url
                          ? <img src={b.logo_url} alt={b.name} style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--color-border)' }} />
                          : <div className="brand-avatar">{b.name[0]}</div>
                        }
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{b.name}</div>
                          {b.website && <a href={b.website} target="_blank" rel="noopener noreferrer" className="cell-muted" style={{ fontSize: 11.5 }}>{b.website}</a>}
                        </div>
                      </div>
                    </td>
                    <td className="cell-muted">{b.country ?? '—'}</td>
                    <td>
                      <span className={`role-badge role-${b.brand_role}`}>
                        {roleLabel(b.brand_role)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-dot ${b.is_active ? 'active' : 'inactive'}`}>
                        {b.is_active ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="action-btn" title={t('common.edit')} onClick={() => { setEditTarget(b); setFormOpen(true) }}><Pencil size={14} /></button>
                        <button className="action-btn danger" title={t('common.delete')} onClick={() => setDeleteTarget(b)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <BrandForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        brand={editTarget}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title={t('catalog.brands.deleteDialog.title')}
        message={deleteTarget ? t('catalog.brands.deleteDialog.message', { name: deleteTarget.name }) : ''}
      />
    </div>
  )
}
