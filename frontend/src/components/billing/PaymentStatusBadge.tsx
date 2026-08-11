import { useTranslation } from 'react-i18next'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  pending:   'amber',
  confirmed: 'green',
  rejected:  'red',
  refunded:  'gray',
}

export default function PaymentStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const variant = STATUS_VARIANTS[status] ?? 'gray'
  return <Badge variant={variant}>{t(`billing.payment.status.${status}`, status)}</Badge>
}
