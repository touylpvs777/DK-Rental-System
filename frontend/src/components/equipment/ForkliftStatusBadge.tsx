import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'

type BadgeVariant = 'green' | 'amber' | 'gray' | 'blue' | 'red' | 'purple' | 'cyan'

const STATUS_MAP: Record<string, BadgeVariant> = {
  in_stock:        'green',
  sold:            'blue',
  rented:          'purple',
  in_service:      'amber',
  reserved:        'cyan',
  decommissioned:  'red',
}

const STATUS_LABEL_KEYS: Record<string, string> = {
  in_stock:       'equipment.status.inStock',
  sold:           'equipment.status.sold',
  rented:         'equipment.status.rented',
  in_service:     'equipment.status.inService',
  reserved:       'equipment.status.reserved',
  decommissioned: 'equipment.status.decommissioned',
}

const CONDITION_MAP: Record<string, BadgeVariant> = {
  new:          'green',
  used:         'amber',
  refurbished:  'blue',
}

const CONDITION_LABEL_KEYS: Record<string, string> = {
  new:         'equipment.condition.new',
  used:        'equipment.condition.used',
  refurbished: 'equipment.condition.refurbished',
}

export function ForkliftStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  return (
    <Badge variant={STATUS_MAP[status] ?? 'gray'}>
      {STATUS_LABEL_KEYS[status] ? t(STATUS_LABEL_KEYS[status]) : status}
    </Badge>
  )
}

// Derived 4-value Operational Status (Asset Registry spec: available / on_rent /
// in_service / sold), projected from the raw 6-value ForkliftStatus below.
// The raw `status` field/enum remains the single source of truth and still
// drives the create/edit form and the rental workflow state machine
// untouched — this map is purely a display-layer projection for the Asset
// Registry table, not a second stored field.
type OperationalStatus = 'available' | 'on_rent' | 'in_service' | 'sold'

const OPERATIONAL_STATUS_PROJECTION: Record<string, OperationalStatus> = {
  in_stock:       'available',
  reserved:       'available',
  rented:         'on_rent',
  in_service:     'in_service',
  sold:           'sold',
  // No distinct terminal bucket exists in the 4-value spec; decommissioned
  // units are off-fleet, closest in kind to "sold" (no longer operational).
  decommissioned: 'sold',
}

function deriveOperationalStatus(status: string): OperationalStatus {
  return OPERATIONAL_STATUS_PROJECTION[status] ?? 'available'
}

const OPERATIONAL_STATUS_MAP: Record<OperationalStatus, BadgeVariant> = {
  available:  'green',
  on_rent:    'purple',
  in_service: 'amber',
  sold:       'blue',
}

const OPERATIONAL_STATUS_LABEL_KEYS: Record<OperationalStatus, string> = {
  available:  'equipment.operationalStatus.available',
  on_rent:    'equipment.operationalStatus.onRent',
  in_service: 'equipment.operationalStatus.inService',
  sold:       'equipment.operationalStatus.sold',
}

export function OperationalStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation()
  const derived = deriveOperationalStatus(status)
  return (
    <Badge variant={OPERATIONAL_STATUS_MAP[derived]}>
      {t(OPERATIONAL_STATUS_LABEL_KEYS[derived])}
    </Badge>
  )
}

const OWNERSHIP_MAP: Record<string, BadgeVariant> = {
  for_sale:        'blue',
  rental:          'purple',
  customer_owned:  'green',
  retired:         'gray',
}

const OWNERSHIP_LABEL_KEYS: Record<string, string> = {
  for_sale:       'equipment.ownership.forSale',
  rental:         'equipment.ownership.rental',
  customer_owned: 'equipment.ownership.customerOwned',
  retired:        'equipment.ownership.retired',
}

export function OwnershipStateBadge({ ownershipState }: { ownershipState: string }) {
  const { t } = useTranslation()
  return (
    <Badge variant={OWNERSHIP_MAP[ownershipState] ?? 'gray'}>
      {OWNERSHIP_LABEL_KEYS[ownershipState] ? t(OWNERSHIP_LABEL_KEYS[ownershipState]) : ownershipState}
    </Badge>
  )
}

export function ForkliftConditionBadge({ condition }: { condition: string }) {
  const { t } = useTranslation()
  return (
    <Badge variant={CONDITION_MAP[condition] ?? 'gray'}>
      {CONDITION_LABEL_KEYS[condition] ? t(CONDITION_LABEL_KEYS[condition]) : condition}
    </Badge>
  )
}
