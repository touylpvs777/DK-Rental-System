import { useTranslation } from 'react-i18next'
import { ReceiptText } from 'lucide-react'
import ModulePlaceholderList from '@/components/layout/ModulePlaceholderList'

export default function TaxInvoiceListPage() {
  const { t } = useTranslation()
  return (
    <ModulePlaceholderList
      title={t('taxInvoices.list.title')}
      subtitle={t('taxInvoices.list.subtitle')}
      icon={ReceiptText}
      flow={{
        steps: [
          { labelKey: 'nav.items.invoices', to: '/billing/invoices' },
          { labelKey: 'nav.items.taxInvoices', to: '/billing/tax-invoices' },
        ],
        currentIndex: 1,
      }}
      columns={[
        t('taxInvoices.table.number'),
        t('taxInvoices.table.customer'),
        t('taxInvoices.table.invoiceRef'),
        t('taxInvoices.table.issueDate'),
        t('taxInvoices.table.taxId'),
        t('common.total'),
      ]}
      emptyMessage={t('taxInvoices.list.empty')}
    />
  )
}
