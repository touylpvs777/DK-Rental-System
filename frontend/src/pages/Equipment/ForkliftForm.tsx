import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import type { Forklift } from '@/types/forklift'
import type { Brand } from '@/types/catalog'
import '@/styles/shared.css'

interface ForkliftFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: Record<string, unknown>) => Promise<boolean>
  forklift?: Forklift | null
  brands: Brand[]
}

const EMPTY = {
  serial_number: '',
  name_en: '',
  name_lo: '',
  model_number: '',
  internal_code: '',
  brand_id: '',
  status: 'in_stock',
  ownership_state: 'for_sale',
  condition: 'new',
  fuel_type: '',
  capacity_kg: '',
  year_manufactured: '',
  purchase_date: '',
  warranty_expiry: '',
  initial_hour_meter: '0',
  current_hour_meter: '0',
  notes: '',
  is_active: true,
}

const STATUS_OPTIONS = [
  { value: 'in_stock', labelKey: 'equipment.status.inStock' },
  { value: 'sold', labelKey: 'equipment.status.sold' },
  { value: 'rented', labelKey: 'equipment.status.rented' },
  { value: 'in_service', labelKey: 'equipment.status.inService' },
  { value: 'reserved', labelKey: 'equipment.status.reserved' },
  { value: 'decommissioned', labelKey: 'equipment.status.decommissioned' },
]

const OWNERSHIP_OPTIONS = [
  { value: 'for_sale', labelKey: 'equipment.ownership.forSale' },
  { value: 'rental', labelKey: 'equipment.ownership.rental' },
  { value: 'customer_owned', labelKey: 'equipment.ownership.customerOwned' },
  { value: 'retired', labelKey: 'equipment.ownership.retired' },
]

const CONDITION_OPTIONS = [
  { value: 'new', labelKey: 'equipment.condition.new' },
  { value: 'used', labelKey: 'equipment.condition.used' },
  { value: 'refurbished', labelKey: 'equipment.condition.refurbished' },
]

const FUEL_OPTIONS = [
  { value: '', labelKey: 'equipment.fuel.notSpecified' },
  { value: 'electric', labelKey: 'equipment.fuel.electric' },
  { value: 'diesel', labelKey: 'equipment.fuel.diesel' },
  { value: 'lpg', labelKey: 'equipment.fuel.lpg' },
  { value: 'dual_fuel', labelKey: 'equipment.fuel.dualFuel' },
]

export default function ForkliftForm({
  isOpen,
  onClose,
  onSubmit,
  forklift,
  brands,
}: ForkliftFormProps) {
  const { t } = useTranslation()
  const [form, setForm]         = useState({ ...EMPTY })
  const [isSaving, setIsSaving] = useState(false)
  const [err, setErr]           = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    if (forklift) {
      setForm({
        serial_number:      forklift.serial_number,
        name_en:            forklift.name_en,
        name_lo:            forklift.name_lo ?? '',
        model_number:       forklift.model_number ?? '',
        internal_code:      forklift.internal_code ?? '',
        brand_id:           forklift.brand?.id?.toString() ?? '',
        status:             forklift.status,
        ownership_state:    forklift.ownership_state,
        condition:          forklift.condition,
        fuel_type:          forklift.fuel_type ?? '',
        capacity_kg:        forklift.capacity_kg?.toString() ?? '',
        year_manufactured:  forklift.year_manufactured?.toString() ?? '',
        purchase_date:      '',
        warranty_expiry:    '',
        initial_hour_meter: '0',
        current_hour_meter: forklift.current_hour_meter.toString(),
        notes:              '',
        is_active:          forklift.is_active,
      })
    } else {
      setForm({ ...EMPTY })
    }
    setErr(null)
  }, [isOpen, forklift])

  const set = (key: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.serial_number.trim()) { setErr(t('equipment.form.serialRequired')); return }
    if (!form.name_en.trim()) { setErr(t('equipment.form.nameRequired')); return }

    setIsSaving(true)
    setErr(null)

    const payload: Record<string, unknown> = {
      serial_number:      form.serial_number.trim(),
      name_en:            form.name_en.trim(),
      name_lo:            form.name_lo.trim() || undefined,
      model_number:       form.model_number.trim() || undefined,
      internal_code:      form.internal_code.trim() || undefined,
      brand_id:           form.brand_id ? Number(form.brand_id) : null,
      status:             form.status,
      ownership_state:    form.ownership_state,
      condition:          form.condition,
      fuel_type:          form.fuel_type || null,
      capacity_kg:        form.capacity_kg ? Number(form.capacity_kg) : null,
      year_manufactured:  form.year_manufactured ? Number(form.year_manufactured) : null,
      current_hour_meter: form.current_hour_meter ? Number(form.current_hour_meter) : 0,
      notes:              form.notes.trim() || undefined,
      is_active:          form.is_active,
    }

    if (!forklift) {
      payload.initial_hour_meter = form.initial_hour_meter ? Number(form.initial_hour_meter) : 0
      if (form.purchase_date) payload.purchase_date = form.purchase_date
      if (form.warranty_expiry) payload.warranty_expiry = form.warranty_expiry
    }

    const ok = await onSubmit(payload)
    setIsSaving(false)
    if (ok) onClose()
    else setErr(t('equipment.form.saveFailed'))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={forklift ? t('equipment.form.editTitle') : t('equipment.form.registerTitle')}
      width={660}
    >
      <form onSubmit={handleSubmit} className="form-grid">
        {err && <div className="page-error" style={{ margin: 0 }}>{err}</div>}

        {/* Row 1: Serial + Name */}
        <div className="form-row-2">
          <div className="form-group">
            <label>{t('equipment.form.serialNumber')} <span className="required">*</span></label>
            <input
              value={form.serial_number}
              onChange={(e) => set('serial_number', e.target.value)}
              placeholder={t('equipment.form.serialNumberPlaceholder')}
              required
              disabled={!!forklift}
            />
          </div>
          <div className="form-group">
            <label>{t('equipment.form.nameEnglish')} <span className="required">*</span></label>
            <input
              value={form.name_en}
              onChange={(e) => set('name_en', e.target.value)}
              placeholder={t('equipment.form.nameEnglishPlaceholder')}
              required
            />
          </div>
        </div>

        {/* Row 2: Name Lao + Internal Code */}
        <div className="form-row-2">
          <div className="form-group">
            <label>{t('equipment.form.nameLao')}</label>
            <input
              value={form.name_lo}
              onChange={(e) => set('name_lo', e.target.value)}
              placeholder="ຊື່ລົດຍົກ"
            />
          </div>
          <div className="form-group">
            <label>{t('equipment.form.internalCode')}</label>
            <input
              value={form.internal_code}
              onChange={(e) => set('internal_code', e.target.value)}
              placeholder={t('equipment.form.internalCodePlaceholder')}
            />
          </div>
        </div>

        {/* Row 3: Brand + Model Number */}
        <div className="form-row-2">
          <div className="form-group">
            <label>{t('equipment.form.brand')}</label>
            <select value={form.brand_id} onChange={(e) => set('brand_id', e.target.value)}>
              <option value="">{t('equipment.form.noBrand')}</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>{t('equipment.form.modelNumber')}</label>
            <input
              value={form.model_number}
              onChange={(e) => set('model_number', e.target.value)}
              placeholder={t('equipment.form.modelNumberPlaceholder')}
            />
          </div>
        </div>

        {/* Row 4: Status + Condition */}
        <div className="form-row-2">
          <div className="form-group">
            <label>{t('equipment.form.operationalStatus')}</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>{t('equipment.form.condition')}</label>
            <select value={form.condition} onChange={(e) => set('condition', e.target.value)}>
              {CONDITION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
            </select>
          </div>
        </div>

        {/* Row 4b: Ownership State */}
        <div className="form-row-2">
          <div className="form-group">
            <label>{t('equipment.form.ownershipState')} <span className="required">*</span></label>
            <select value={form.ownership_state} onChange={(e) => set('ownership_state', e.target.value)} required>
              {OWNERSHIP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
            </select>
          </div>
        </div>

        {/* Row 5: Fuel + Capacity */}
        <div className="form-row-2">
          <div className="form-group">
            <label>{t('equipment.form.fuelType')}</label>
            <select value={form.fuel_type} onChange={(e) => set('fuel_type', e.target.value)}>
              {FUEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>{t('equipment.form.capacityKg')}</label>
            <input
              type="number"
              value={form.capacity_kg}
              onChange={(e) => set('capacity_kg', e.target.value)}
              placeholder={t('equipment.form.capacityKgPlaceholder')}
              min="0"
            />
          </div>
        </div>

        {/* Row 6: Year + Hour Meter */}
        <div className="form-row-2">
          <div className="form-group">
            <label>{t('equipment.form.yearManufactured')}</label>
            <input
              type="number"
              value={form.year_manufactured}
              onChange={(e) => set('year_manufactured', e.target.value)}
              placeholder={t('equipment.form.yearManufacturedPlaceholder')}
              min="1900"
              max="2100"
            />
          </div>
          <div className="form-group">
            <label>{forklift ? t('equipment.form.currentHourMeter') : t('equipment.form.initialHourMeter')}</label>
            <input
              type="number"
              value={forklift ? form.current_hour_meter : form.initial_hour_meter}
              onChange={(e) => set(forklift ? 'current_hour_meter' : 'initial_hour_meter', e.target.value)}
              placeholder="0"
              min="0"
              step="0.1"
            />
          </div>
        </div>

        {/* Row 7: Purchase Date + Warranty (create only) */}
        {!forklift && (
          <div className="form-row-2">
            <div className="form-group">
              <label>{t('equipment.form.purchaseDate')}</label>
              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) => set('purchase_date', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>{t('equipment.form.warrantyExpiry')}</label>
              <input
                type="date"
                value={form.warranty_expiry}
                onChange={(e) => set('warranty_expiry', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="form-group">
          <label>{t('common.notes')}</label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={2}
            placeholder={t('equipment.form.notesPlaceholder')}
          />
        </div>

        {/* Active flag */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set('is_active', e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            {t('common.active')}
          </label>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving ? t('common.saving') : forklift ? t('equipment.form.saveChanges') : t('equipment.form.registerTitle')}
          </button>
        </div>
      </form>
    </Modal>
  )
}
