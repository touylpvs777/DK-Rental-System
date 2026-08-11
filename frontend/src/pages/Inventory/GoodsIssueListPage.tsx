import { useTranslation } from 'react-i18next'
import { PackageMinus } from 'lucide-react'
import ModulePlaceholderList from '@/components/layout/ModulePlaceholderList'

export default function GoodsIssueListPage() {
  const { t } = useTranslation()
  return (
    <ModulePlaceholderList
      title={t('goodsIssue.list.title')}
      subtitle={t('goodsIssue.list.subtitle')}
      icon={PackageMinus}
      flow={{
        steps: [
          { labelKey: 'nav.items.deliveryNotes', to: '/inventory/delivery-notes' },
          { labelKey: 'nav.items.goodsIssue', to: '/inventory/goods-issue' },
        ],
        currentIndex: 1,
      }}
      columns={[
        t('goodsIssue.table.number'),
        t('goodsIssue.table.issuedTo'),
        t('goodsIssue.table.dnRef'),
        t('goodsIssue.table.issueDate'),
        t('goodsIssue.table.warehouse'),
        t('common.status'),
      ]}
      emptyMessage={t('goodsIssue.list.empty')}
    />
  )
}
