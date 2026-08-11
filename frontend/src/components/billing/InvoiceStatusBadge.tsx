import { useTranslation } from 'react-i18next'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  draft:          'gray',
  issued:         'blue',
  sent:           'purple',
  partially_paid: 'amber',
  paid:           'green',
  overdue:        'red',
  cancelled:      'gray',
  voided:         'gray',
}

export default function InvoiceStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const variant = STATUS_VARIANTS[status] ?? 'gray'
  return <Badge variant={variant}>{t(`billing.invoice.status.${status}`, status)}</Badge>
}
