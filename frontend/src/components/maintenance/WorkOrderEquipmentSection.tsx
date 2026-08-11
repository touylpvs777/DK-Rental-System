import { useTranslation } from 'react-i18next'
import type { ForkliftBrief } from '@/types/maintenance'
import '@/components/documents/DocumentEditor.css'

interface WorkOrderEquipmentSectionProps {
  forklift: ForkliftBrief | null
  hourMeterAtService?: number | null
}

/**
 * Work Order references a structured Forklift asset record (picked via
 * AssetSelect at creation, locked afterward per WorkOrderUpdate) rather than
 * the free-text vehicle snapshot fields Quotation/SalesOrder/Invoice use —
 * so this is a read-only summary card, not a form section.
 */
export default function WorkOrderEquipmentSection({ forklift, hourMeterAtService }: WorkOrderEquipmentSectionProps) {
  const { t } = useTranslation()
  if (!forklift) return null

  return (
    <div className="doc-editor-section">
      <h3 className="doc-editor-section-title">{t('maintenance.workOrders.detail.fields.equipment')}</h3>
      <div className="doc-editor-vehicle-grid">
        <div><span style={{ color: 'var(--color-text-muted)' }}>{t('maintenance.workOrders.editor.serialNumber')}:</span> {forklift.serial_number}</div>
        <div><span style={{ color: 'var(--color-text-muted)' }}>{t('maintenance.workOrders.editor.equipmentName')}:</span> {forklift.name_en}</div>
        <div><span style={{ color: 'var(--color-text-muted)' }}>{t('maintenance.workOrders.editor.currentHourMeter')}:</span> {forklift.current_hour_meter}</div>
        {hourMeterAtService != null && (
          <div><span style={{ color: 'var(--color-text-muted)' }}>{t('maintenance.workOrders.detail.fields.hourMeter')}:</span> {hourMeterAtService}</div>
        )}
      </div>
    </div>
  )
}
