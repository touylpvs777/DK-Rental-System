import { useTranslation } from 'react-i18next'
import { Printer } from 'lucide-react'

export default function PrintButton({ className = 'btn btn-ghost' }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      <Printer size={14} /> {t('common.print')}
    </button>
  )
}
