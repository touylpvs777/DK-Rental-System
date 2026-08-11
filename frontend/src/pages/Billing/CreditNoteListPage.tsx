import { useTranslation } from 'react-i18next'
import { Undo2 } from 'lucide-react'
import ModulePlaceholderList from '@/components/layout/ModulePlaceholderList'

export default function CreditNoteListPage() {
  const { t } = useTranslation()
  return (
    <ModulePlaceholderList
      title={t('creditNotes.list.title')}
      subtitle={t('creditNotes.list.subtitle')}
      icon={Undo2}
      flow={{
        steps: [
          { labelKey: 'nav.items.invoices', to: '/billing/invoices' },
          { labelKey: 'nav.items.creditNotes', to: '/billing/credit-notes' },
        ],
        currentIndex: 1,
      }}
      columns={[
        t('creditNotes.table.number'),
        t('creditNotes.table.customer'),
        t('creditNotes.table.issueDate'),
        t('creditNotes.table.relatedInvoice'),
        t('common.total'),
      ]}
      emptyMessage={t('creditNotes.list.empty')}
    />
  )
}
