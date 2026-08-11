import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, ChevronRight, ChevronDown, Pencil, Trash2, Layers, AlertCircle } from 'lucide-react'
import { useCategories } from '@/hooks/useCategories'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import type { CategoryCreate, CategoryUpdate, ProductCategory } from '@/types/catalog'
import PageHeader from '@/components/layout/PageHeader'
import './CategoriesPage.css'
import '@/styles/shared.css'

function CategoryForm({
  isOpen, onClose, onSubmit, category, flat,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (d: CategoryCreate | CategoryUpdate) => Promise<boolean>
  category?: ProductCategory | null
  flat: ProductCategory[]
}) {
  const { t } = useTranslation()
  const [form, setForm]         = useState({ name_en: '', name_lo: '', parent_id: '', description: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [err, setErr]           = useState<string | null>(null)

  useState(() => {
    if (!isOpen) return
    if (category) setForm({ name_en: category.name_en, name_lo: category.name_lo ?? '', parent_id: category.parent_id?.toString() ?? '', description: category.description ?? '' })
    else setForm({ name_en: '', name_lo: '', parent_id: '', description: '' })
    setErr(null)
  })

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name_en.trim()) { setErr(t('catalog.categories.form.nameRequired')); return }
    setIsSaving(true)
    setErr(null)
    const ok = await onSubmit({
      name_en:     form.name_en.trim(),
      name_lo:     form.name_lo.trim() || undefined,
      parent_id:   form.parent_id ? Number(form.parent_id) : undefined,
      description: form.description.trim() || undefined,
    })
    setIsSaving(false)
    if (ok) onClose(); else setErr(t('catalog.saveFailed'))
  }

  const eligible = flat.filter((c) => c.level < 3 && (!category || c.id !== category.id))

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={category ? t('catalog.categories.editTitle') : t('catalog.categories.newTitle')} width={500}>
      <form onSubmit={handleSubmit} className="form-grid">
        {err && <div className="page-error" style={{ margin: 0 }}>{err}</div>}
        <div className="form-row-2">
          <div className="form-group">
            <label>{t('catalog.categories.form.nameEnLabel')} <span className="required">*</span></label>
            <input value={form.name_en} onChange={(e) => set('name_en', e.target.value)} placeholder={t('catalog.categories.form.namePlaceholder')} required />
          </div>
          <div className="form-group">
            <label>{t('catalog.categories.form.nameLoLabel')}</label>
            <input value={form.name_lo} onChange={(e) => set('name_lo', e.target.value)} placeholder="ຊື່ໝວດ" />
          </div>
        </div>
        <div className="form-group">
          <label>{t('catalog.categories.form.parentLabel')}</label>
          <select value={form.parent_id} onChange={(e) => set('parent_id', e.target.value)}>
            <option value="">{t('catalog.categories.form.topLevelOption')}</option>
            {eligible.map((c) => {
              const pad = '  '.repeat(c.level - 1)
              return <option key={c.id} value={c.id}>{pad}{c.name_en}</option>
            })}
          </select>
        </div>
        <div className="form-group">
          <label>{t('common.description')}</label>
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? t('common.saving') : category ? t('catalog.saveChanges') : t('catalog.categories.form.createCategory')}</button>
        </div>
      </form>
    </Modal>
  )
}

interface TreeNodeProps {
  node: ProductCategory
  depth: number
  onEdit: (c: ProductCategory) => void
  onDelete: (c: ProductCategory) => void
}

function TreeNode({ node, depth, onEdit, onDelete }: TreeNodeProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)
  const hasChildren = node.children?.length > 0

  const typeLabel = node.level === 1 ? t('catalog.categories.types.division')
    : node.level === 2 ? t('catalog.categories.types.category')
    : t('catalog.categories.types.subCategory')

  return (
    <>
      <tr className={`cat-row level-${depth}`}>
        <td>
          <div className="cat-name-cell" style={{ paddingLeft: depth * 20 }}>
            {hasChildren ? (
              <button className="cat-toggle" onClick={() => setOpen(!open)}>
                {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
            ) : (
              <span className="cat-toggle-placeholder" />
            )}
            <span className={`cat-level-dot level-${depth}`} />
            <div>
              <div className="cat-name">{node.name_en}</div>
              {node.name_lo && <div className="cat-name-lo">{node.name_lo}</div>}
            </div>
          </div>
        </td>
        <td className="cell-muted">
          {t('catalog.categories.levelLine', { level: node.level, type: typeLabel })}
        </td>
        <td>
          <span className={`status-dot ${node.is_active ? 'active' : 'inactive'}`}>
            {node.is_active ? t('common.active') : t('common.inactive')}
          </span>
        </td>
        <td className="cell-muted">{node.children?.length ?? 0}</td>
        <td>
          <div className="row-actions">
            <button className="action-btn" title={t('common.edit')} onClick={() => onEdit(node)}><Pencil size={14} /></button>
            <button className="action-btn danger" title={t('common.delete')} onClick={() => onDelete(node)}><Trash2 size={14} /></button>
          </div>
        </td>
      </tr>
      {open && hasChildren && node.children.map((child) => (
        <TreeNode key={child.id} node={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </>
  )
}

export default function CategoriesPage() {
  const { t } = useTranslation()
  const { tree, flat, isLoading, error, create, update, remove } = useCategories()

  const [formOpen, setFormOpen]         = useState(false)
  const [editTarget, setEditTarget]     = useState<ProductCategory | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductCategory | null>(null)
  const [isDeleting, setIsDeleting]     = useState(false)

  const handleSubmit = async (data: CategoryCreate | CategoryUpdate): Promise<boolean> => {
    if (editTarget) return update(editTarget.id, data)
    return create(data as CategoryCreate)
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
      <PageHeader title={t('catalog.categories.title')} subtitle={t('catalog.categories.subtitle', { count: flat.length })}>
        <button className="btn btn-primary" onClick={() => { setEditTarget(null); setFormOpen(true) }}>
          <Plus size={15} /> {t('catalog.categories.newCategory')}
        </button>
      </PageHeader>

      {error && <div className="page-error"><AlertCircle size={16} /> {error}</div>}

      <div className="table-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('catalog.categories.table.category')}</th>
                <th>{t('catalog.categories.table.level')}</th>
                <th>{t('common.status')}</th>
                <th>{t('catalog.categories.table.children')}</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    <td><div className="skeleton-cell" style={{ width: '65%' }} /></td>
                    <td><div className="skeleton-cell" style={{ width: '55%' }} /></td>
                    <td><div className="skeleton-cell" style={{ width: '50px' }} /></td>
                    <td><div className="skeleton-cell" style={{ width: '30px' }} /></td>
                    <td><div className="skeleton-cell" style={{ width: '40px' }} /></td>
                  </tr>
                ))
              ) : tree.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="table-empty">
                      <Layers size={36} />
                      <p>{t('catalog.categories.empty.title')}</p>
                      <small>{t('catalog.categories.empty.createHint')}</small>
                    </div>
                  </td>
                </tr>
              ) : (
                tree.map((node) => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    onEdit={(c) => { setEditTarget(c); setFormOpen(true) }}
                    onDelete={(c) => setDeleteTarget(c)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CategoryForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        category={editTarget}
        flat={flat}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title={t('catalog.categories.deleteDialog.title')}
        message={deleteTarget ? t('catalog.categories.deleteDialog.message', { name: deleteTarget.name_en }) : ''}
      />
    </div>
  )
}
