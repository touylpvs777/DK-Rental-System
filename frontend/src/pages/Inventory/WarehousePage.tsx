import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Plus, RefreshCw } from 'lucide-react'
import { getWarehouses, createWarehouse } from '@/api/inventory'
import { WarehouseGrid, WarehouseGridSkeleton } from '@/modules/inventory'
import Modal from '@/components/ui/Modal'
import { toast } from '@/store/toastStore'
import type { Warehouse as WH } from '@/types/inventory'
import PageHeader from '@/components/layout/PageHeader'
import '@/styles/shared.css'

export default function WarehousePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [items, setItems] = useState<WH[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const load = async () => {
    setIsLoading(true); setError(null)
    try { setItems((await getWarehouses()).data) }
    catch { setError(t('inventory.warehouse.list.loadError')) }
    finally { setIsLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div>
      <PageHeader title={t('inventory.warehouse.title')} subtitle={t('inventory.warehouse.list.subtitle', { count: items.length })}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={load} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} /> {t('inventory.common.refresh')}
          </button>
          <button className="btn btn-primary" onClick={() => setFormOpen(true)}>
            <Plus size={15} /> {t('inventory.warehouse.list.addWarehouse')}
          </button>
        </div>
      </PageHeader>

      {error && <div className="page-error"><AlertCircle size={16} /> {error}</div>}

      {isLoading ? <WarehouseGridSkeleton /> : <WarehouseGrid warehouses={items} onSelect={(w) => navigate(`/inventory/warehouses/${w.id}`)} />}

      <AddWarehouseModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSuccess={load} />
    </div>
  )
}


function AddWarehouseModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({ code: '', name: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { if (isOpen) { setForm({ code: '', name: '', address: '' }); setErr(null) } }, [isOpen])

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code.trim() || !form.name.trim()) { setErr(t('inventory.warehouse.form.codeNameRequired')); return }
    setSaving(true); setErr(null)
    try {
      await createWarehouse({ code: form.code.trim(), name: form.name.trim(), address: form.address.trim() || undefined })
      toast.success(t('inventory.warehouse.form.createSuccess'))
      onClose(); onSuccess()
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setErr(msg ?? t('inventory.warehouse.form.createError'))
    } finally { setSaving(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('inventory.warehouse.list.addWarehouse')} width={460}>
      <form onSubmit={handleSubmit} className="form-grid">
        {err && <div className="page-error" style={{ margin: 0 }}>{err}</div>}
        <div className="form-row-2">
          <div className="form-group">
            <label>{t('inventory.warehouse.form.codeLabel')} <span className="required">*</span></label>
            <input value={form.code} onChange={(e) => set('code', e.target.value)} placeholder={t('inventory.warehouse.form.codePlaceholder')} required />
          </div>
          <div className="form-group">
            <label>{t('common.name')} <span className="required">*</span></label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={t('inventory.warehouse.form.namePlaceholder')} required />
          </div>
        </div>
        <div className="form-group">
          <label>{t('common.address')}</label>
          <textarea value={form.address} onChange={(e) => set('address', e.target.value)} rows={2} placeholder={t('inventory.warehouse.form.addressPlaceholder')} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? t('inventory.warehouse.form.creating') : t('common.create')}</button>
        </div>
      </form>
    </Modal>
  )
}
