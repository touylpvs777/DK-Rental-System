import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { InvoiceEditorFormValues } from '@/schemas/invoiceEditorSchema'
import './DocumentEditor.css'

interface InvoiceVehicleInfoSectionProps {
  /** Vehicle/job fields are create-time-only for Invoice — InvoiceUpdate
   *  doesn't accept them, so they're permanently read-only once saved. */
  isNew: boolean
}

/** Invoice's model only has 6 vehicle/equipment fields (no machine_type,
 *  hour_meter, or location, unlike Quotation/SalesOrder's 9) — a dedicated
 *  section rather than reusing VehicleInfoSection, which would otherwise
 *  render 3 inputs that map to nothing on save. */
export default function InvoiceVehicleInfoSection({ isNew }: InvoiceVehicleInfoSectionProps) {
  const { t } = useTranslation()
  const { register } = useFormContext<InvoiceEditorFormValues>()

  return (
    <div className="doc-editor-section">
      <h3 className="doc-editor-section-title">{t('documentEditor.vehicle.title')}</h3>
      <div className="doc-editor-vehicle-grid">
        <div className="form-group">
          <label>{t('documentEditor.vehicle.jobNumber')}</label>
          <input {...register('job_number')} disabled={!isNew} />
        </div>
        <div className="form-group">
          <label>{t('documentEditor.vehicle.brand')}</label>
          <input {...register('vehicle_make')} disabled={!isNew} />
        </div>
        <div className="form-group">
          <label>{t('documentEditor.vehicle.model')}</label>
          <input {...register('vehicle_model')} disabled={!isNew} />
        </div>
        <div className="form-group">
          <label>{t('documentEditor.vehicle.vin')}</label>
          <input {...register('vehicle_vin')} disabled={!isNew} />
        </div>
        <div className="form-group">
          <label>{t('documentEditor.vehicle.engineNo')}</label>
          <input {...register('vehicle_engine_no')} disabled={!isNew} />
        </div>
        <div className="form-group">
          <label>{t('documentEditor.vehicle.plateNumber')}</label>
          <input {...register('vehicle_reg_no')} disabled={!isNew} />
        </div>
      </div>
    </div>
  )
}
