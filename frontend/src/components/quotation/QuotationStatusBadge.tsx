import { useTranslation } from 'react-i18next'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'

const STATUS_MAP: Record<string, BadgeVariant> = {
  draft:    'gray',
  sent:     'blue',
  approved: 'green',
  rejected: 'red',
}

const STATUS_KEYS: Record<string, string> = {
  draft:    'quotation.status.draft',
  sent:     'quotation.status.sent',
  approved: 'quotation.status.approved',
  rejected: 'quotation.status.rejected',
}

export function QuotationStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  return <Badge variant={STATUS_MAP[status] ?? 'gray'}>{t(STATUS_KEYS[status] ?? status, status)}</Badge>
}
