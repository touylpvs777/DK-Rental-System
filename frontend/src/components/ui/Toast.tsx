import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useToastStore } from '@/store/toastStore'
import './Toast.css'

const ICONS = {
  success: <CheckCircle size={16} />,
  error:   <XCircle size={16} />,
  info:    <Info size={16} />,
}

export default function ToastContainer() {
  const { t } = useTranslation()
  const { toasts, remove } = useToastStore()

  return (
    <div className="toast-container" role="status" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
          <span className="toast-icon">{ICONS[toast.type]}</span>
          <span className="toast-msg">{toast.message}</span>
          <button className="toast-close" onClick={() => remove(toast.id)} aria-label={t('common.dismissNotification')}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
