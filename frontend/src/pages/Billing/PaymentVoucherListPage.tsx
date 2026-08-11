import { useTranslation } from 'react-i18next'
import { Banknote } from 'lucide-react'
import ModulePlaceholderList from '@/components/layout/ModulePlaceholderList'

export default function PaymentVoucherListPage() {
  const { t } = useTranslation()
  return (
    <ModulePlaceholderList
      title={t('paymentVouchers.list.title')}
      subtitle={t('paymentVouchers.list.subtitle')}
      icon={Banknote}
      flow={{
        steps: [
          { labelKey: 'nav.items.purchaseOrders', to: '/inventory/purchase-orders' },
          { labelKey: 'nav.items.goodsReceive', to: '/inventory/goods-receive' },
          { labelKey: 'nav.items.paymentVouchers', to: '/billing/payment-vouchers' },
        ],
        currentIndex: 2,
      }}
      columns={[
        t('paymentVouchers.table.number'),
        t('paymentVouchers.table.vendor'),
        t('paymentVouchers.table.poRef'),
        t('paymentVouchers.table.paymentDate'),
        t('paymentVouchers.table.method'),
        t('common.amount'),
      ]}
      emptyMessage={t('paymentVouchers.list.empty')}
    />
  )
}
