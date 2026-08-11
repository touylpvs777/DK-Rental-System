import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { DocumentHeaderFormValues } from '@/schemas/documentEditorSchema'
import './DocumentEditor.css'

interface VehicleInfoSectionProps {
  readOnly: boolean
}

export default function VehicleInfoSection({ readOnly }: VehicleInfoSectionProps) {
  const { t } = useTranslation()
  const { register } = useFormContext<DocumentHeaderFormValues>()

  return (
    <div className="doc-editor-section">
      <h3 className="doc-editor-section-title">{t('documentEditor.vehicle.title')}</h3>
      <div className="doc-editor-vehicle-grid">
        <div className="form-group">
          <label>{t('documentEditor.vehicle.jobNumber')}</label>
          <input {...register('job_number')} disabled={readOnly} />
        </div>
        <div className="form-group">
          <label>{t('documentEditor.vehicle.machine')}</label>
          <input {...register('machine_type')} disabled={readOnly} />
        </div>
        <div className="form-group">
          <label>{t('documentEditor.vehicle.brand')}</label>
          <input {...register('vehicle_make')} disabled={readOnly} />
        </div>
        <div className="form-group">
          <label>{t('documentEditor.vehicle.model')}</label>
          <input {...register('vehicle_model')} disabled={readOnly} />
        </div>
        <div className="form-group">
          <label>{t('documentEditor.vehicle.vin')}</label>
          <input {...register('vehicle_vin')} disabled={readOnly} />
        </div>
        <div className="form-group">
          <label>{t('documentEditor.vehicle.engineNo')}</label>
          <input {...register('vehicle_engine_no')} disabled={readOnly} />
        </div>
        <div className="form-group">
          <label>{t('documentEditor.vehicle.hourMeter')}</label>
          <input
            type="number" step="any" min="0"
            {...register('hour_meter', { setValueAs: (v) => (v === '' ? null : Number(v)) })}
            disabled={readOnly}
          />
        </div>
        <div className="form-group">
          <label>{t('documentEditor.vehicle.plateNumber')}</label>
          <input {...register('vehicle_reg_no')} disabled={readOnly} />
        </div>
        <div className="form-group">
          <label>{t('documentEditor.vehicle.location')}</label>
          <input {...register('location')} disabled={readOnly} />
        </div>
      </div>
    </div>
  )
}
