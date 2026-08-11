import { useTranslation } from 'react-i18next'
import { PackageCheck } from 'lucide-react'
import ModulePlaceholderList from '@/components/layout/ModulePlaceholderList'

export default function GoodsReceiveListPage() {
  const { t } = useTranslation()
  return (
    <ModulePlaceholderList
      title={t('goodsReceive.list.title')}
      subtitle={t('goodsReceive.list.subtitle')}
      icon={PackageCheck}
      flow={{
        steps: [
          { labelKey: 'nav.items.purchaseOrders', to: '/inventory/purchase-orders' },
          { labelKey: 'nav.items.goodsReceive', to: '/inventory/goods-receive' },
        ],
        currentIndex: 1,
      }}
      columns={[
        t('goodsReceive.table.number'),
        t('goodsReceive.table.vendor'),
        t('goodsReceive.table.poRef'),
        t('goodsReceive.table.receivedDate'),
        t('goodsReceive.table.warehouse'),
        t('common.status'),
      ]}
      emptyMessage={t('goodsReceive.list.empty')}
    />
  )
}
