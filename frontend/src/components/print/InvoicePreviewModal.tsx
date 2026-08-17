import { useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { useTranslation } from 'react-i18next'
import { Printer } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import InvoicePrintTemplate, { type InvoicePrintTemplateProps } from './InvoicePrintTemplate'

interface InvoicePreviewModalProps {
  isOpen: boolean
  onClose: () => void
  /** Already-mapped print props (customer/company/totals/items) — computed
   *  once by the caller from its own Invoice + line items, rather than
   *  re-derived here, so there's a single source of truth for that mapping
   *  instead of two places that could drift out of sync. */
  printProps: InvoicePrintTemplateProps
}

export default function InvoicePreviewModal({ isOpen, onClose, printProps }: InvoicePreviewModalProps) {
  const { t } = useTranslation()
  const contentRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: printProps.invoiceNumber || 'Invoice',
  })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('billing.invoice.preview.title', 'Invoice Preview')}
      width={880}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>
            {t('common.close')}
          </button>
          <button className="btn btn-primary" onClick={() => handlePrint()}>
            <Printer size={14} /> {t('common.print')}
          </button>
        </div>
      }
    >
      {/* Gray canvas + horizontal scroll so the fixed 210mm page reads as a
          floating sheet and never gets clipped on narrower viewports —
          the printed node itself still targets the real A4 box via
          InvoicePrintTemplate's own w-[210mm] min-h-[297mm] sizing. */}
      <div className="overflow-x-auto rounded-lg bg-gray-100 p-4 print:overflow-visible print:bg-white print:p-0">
        <div ref={contentRef}>
          <InvoicePrintTemplate {...printProps} />
        </div>
      </div>
    </Modal>
  )
}
