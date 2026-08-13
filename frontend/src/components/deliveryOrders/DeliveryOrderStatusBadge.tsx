import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'
const variants: Record<string, 'gray' | 'blue' | 'green' | 'red'> = { pending: 'gray', in_transit: 'blue', delivered: 'green', cancelled: 'red' }
export function DeliveryOrderStatusBadge({ status }: { status: string }) { const { t } = useTranslation(); return <Badge variant={variants[status] ?? 'gray'}>{t(`deliveryOrders.status.${status}`, status)}</Badge> }
export function DeliveryOrderTypeBadge({ orderType }: { orderType: string }) { const { t } = useTranslation(); return <Badge variant={orderType === 'return' ? 'purple' : 'cyan'}>{t(`deliveryOrders.orderType.${orderType}`, orderType)}</Badge> }
