import { useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { DocumentHeaderFormValues } from '@/schemas/documentEditorSchema'
import './DocumentEditor.css'

interface DocumentFooterSectionProps {
  readOnly: boolean
  issuedByName?: string
  approvedByName?: string
}

export default function DocumentFooterSection({ readOnly, issuedByName, approvedByName }: DocumentFooterSectionProps) {
  const { t } = useTranslation()
  const { register } = useFormContext<DocumentHeaderFormValues>()

  return (
    <div className="doc-editor-section">
      <div className="form-group">
        <label>{t('documentEditor.footer.remark')}</label>
        <textarea rows={2} {...register('notes')} disabled={readOnly} />
      </div>
      <div className="form-group">
        <label>{t('documentEditor.footer.termsConditions')}</label>
        <textarea rows={3} {...register('terms_conditions')} disabled={readOnly} />
      </div>

      <div className="doc-editor-signatures">
        <div className="doc-editor-signature-block">
          <div className="doc-editor-signature-line" />
          <div className="doc-editor-signature-label">{t('documentEditor.footer.issuedBy')}</div>
          {issuedByName && <div className="doc-editor-signature-name">{issuedByName}</div>}
        </div>
        <div className="doc-editor-signature-block">
          <div className="doc-editor-signature-line" />
          <div className="doc-editor-signature-label">{t('documentEditor.footer.reviewedBy')}</div>
        </div>
        <div className="doc-editor-signature-block">
          <div className="doc-editor-signature-line" />
          <div className="doc-editor-signature-label">{t('documentEditor.footer.approvedBy')}</div>
          {approvedByName && <div className="doc-editor-signature-name">{approvedByName}</div>}
        </div>
        <div className="doc-editor-signature-block">
          <div className="doc-editor-signature-line" />
          <div className="doc-editor-signature-label">{t('documentEditor.footer.customerSignature')}</div>
        </div>
      </div>
    </div>
  )
}
