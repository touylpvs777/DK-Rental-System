import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { InvoiceEditorFormValues } from '@/schemas/invoiceEditorSchema'
import './DocumentEditor.css'

interface InvoiceFooterSectionProps {
  issuedByName?: string
  approvedByName?: string
}

/** `notes` doubles as the Terms & Conditions print slot for Invoice (no
 *  terms_conditions column exists on this model) — both textareas stay
 *  editable in both create and edit mode, since both are in InvoiceUpdate.
 *  Signature row matches InvoicePrintTemplate's own 3-block convention
 *  (Issued By / Approved By / Received By) instead of the other two
 *  modules' 4-block one, for consistency with Invoice's own print output. */
export default function InvoiceFooterSection({ issuedByName, approvedByName }: InvoiceFooterSectionProps) {
  const { t } = useTranslation()
  const { register } = useFormContext<InvoiceEditorFormValues>()

  return (
    <div className="doc-editor-section">
      <div className="form-group">
        <label>{t('billing.invoice.editor.notesLabel')}</label>
        <textarea rows={3} {...register('notes')} />
      </div>
      <div className="form-group">
        <label>{t('billing.invoice.editor.internalNotesLabel')}</label>
        <textarea rows={2} {...register('internal_notes')} />
      </div>

      <div className="doc-editor-signatures">
        <div className="doc-editor-signature-block">
          <div className="doc-editor-signature-line" />
          <div className="doc-editor-signature-label">{t('documentEditor.footer.issuedBy')}</div>
          {issuedByName && <div className="doc-editor-signature-name">{issuedByName}</div>}
        </div>
        <div className="doc-editor-signature-block">
          <div className="doc-editor-signature-line" />
          <div className="doc-editor-signature-label">{t('documentEditor.footer.approvedBy')}</div>
          {approvedByName && <div className="doc-editor-signature-name">{approvedByName}</div>}
        </div>
        <div className="doc-editor-signature-block">
          <div className="doc-editor-signature-line" />
          <div className="doc-editor-signature-label">{t('billing.invoice.editor.receivedBy')}</div>
        </div>
      </div>
    </div>
  )
}
