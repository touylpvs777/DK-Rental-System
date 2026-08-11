import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'

type BadgeVariant = 'green' | 'amber' | 'gray' | 'blue' | 'red' | 'purple' | 'cyan'

const STATUS_MAP: Record<string, BadgeVariant> = {
  draft:        'gray',
  under_review: 'amber',
  approved:     'blue',
  revision:     'purple',
  sent:         'cyan',
  accepted:     'green',
  rejected:     'red',
  expired:      'gray',
  converted:    'green',
  cancelled:    'gray',
}

const STATUS_KEYS: Record<string, string> = {
  draft:        'quotations.status.draft',
  under_review: 'quotations.status.underReview',
  approved:     'quotations.status.approved',
  revision:     'quotations.status.revision',
  sent:         'quotations.status.sent',
  accepted:     'quotations.status.accepted',
  rejected:     'quotations.status.rejected',
  expired:      'quotations.status.expired',
  converted:    'quotations.status.converted',
  cancelled:    'quotations.status.cancelled',
}

const TYPE_MAP: Record<string, BadgeVariant> = {
  rental:      'blue',
  sales:       'green',
  service:     'amber',
  spare_parts: 'purple',
}

const TYPE_KEYS: Record<string, string> = {
  rental:      'quotations.type.rental',
  sales:       'quotations.type.sales',
  service:     'quotations.type.service',
  spare_parts: 'quotations.type.spareParts',
}

export function QuotationStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  return <Badge variant={STATUS_MAP[status] ?? 'gray'}>{STATUS_KEYS[status] ? t(STATUS_KEYS[status]) : status}</Badge>
}

export function QuotationTypeBadge({ type }: { type: string }) {
  const { t } = useTranslation()
  return <Badge variant={TYPE_MAP[type] ?? 'gray'}>{TYPE_KEYS[type] ? t(TYPE_KEYS[type]) : type}</Badge>
}
