import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'

type BadgeVariant = 'green' | 'amber' | 'gray' | 'blue' | 'red' | 'purple' | 'cyan'

const STATUS_MAP: Record<string, BadgeVariant> = {
  reservation:       'gray',
  draft:             'gray',
  pending_approval:  'amber',
  approved:          'blue',
  revision:          'purple',
  delivering:        'cyan',
  active:            'green',
  overdue:           'red',
  returning:         'amber',
  inspecting:        'cyan',
  settling:          'purple',
  closed:            'green',
  cancelled:         'gray',
}

const STATUS_KEYS: Record<string, string> = {
  reservation:       'rental.status.reservation',
  draft:             'rental.status.draft',
  pending_approval:  'rental.status.pendingApproval',
  approved:          'rental.status.approved',
  revision:          'rental.status.revision',
  delivering:        'rental.status.delivering',
  active:            'rental.status.active',
  overdue:           'rental.status.overdue',
  returning:         'rental.status.returning',
  inspecting:        'rental.status.inspecting',
  settling:          'rental.status.settling',
  closed:            'rental.status.closed',
  cancelled:         'rental.status.cancelled',
}

const CONTRACT_TYPE_MAP: Record<string, BadgeVariant> = {
  short_term: 'blue',
  long_term:  'green',
  project:    'purple',
}

const CONTRACT_TYPE_KEYS: Record<string, string> = {
  short_term: 'rental.contractType.shortTerm',
  long_term:  'rental.contractType.longTerm',
  project:    'rental.contractType.project',
}

export function RentalStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  return <Badge variant={STATUS_MAP[status] ?? 'gray'}>{STATUS_KEYS[status] ? t(STATUS_KEYS[status]) : status}</Badge>
}

export function RentalContractTypeBadge({ type }: { type: string }) {
  const { t } = useTranslation()
  return <Badge variant={CONTRACT_TYPE_MAP[type] ?? 'gray'}>{CONTRACT_TYPE_KEYS[type] ? t(CONTRACT_TYPE_KEYS[type]) : type}</Badge>
}
