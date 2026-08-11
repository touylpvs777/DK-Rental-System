import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Modal from './Modal'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  isLoading?: boolean
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  isLoading = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation()
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width={420}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={isLoading}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? t('common.deleting') : (confirmLabel ?? t('common.delete'))}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 9,
          background: 'var(--color-danger-50)', color: 'var(--color-danger-600)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <AlertTriangle size={20} />
        </div>
        <p style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.6, paddingTop: 6 }}>
          {message}
        </p>
      </div>
    </Modal>
  )
}
