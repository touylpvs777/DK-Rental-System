import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/Badge'
import PageHeader from '@/components/layout/PageHeader'
import DocumentFlowStrip, { type DocumentFlowStep } from '@/components/layout/DocumentFlowStrip'
import '@/styles/shared.css'

interface ModulePlaceholderListProps {
  title: string
  subtitle?: string
  icon: React.ElementType
  columns: string[]
  emptyMessage: string
  /** Where this document sits in the wider ERP flow, e.g. Quotation → Sales Order → Delivery Note. */
  flow?: { steps: DocumentFlowStep[]; currentIndex: number }
}

/**
 * Standard skeleton for a document module whose backend/workflow isn't built
 * yet: DK Blue header (via PageHeader), a "Coming Soon" badge, a document-flow
 * strip linking to related modules, and an empty data table with the columns
 * the real module will use once wired up.
 */
export default function ModulePlaceholderList({ title, subtitle, icon: Icon, columns, emptyMessage, flow }: ModulePlaceholderListProps) {
  const { t } = useTranslation()

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle}>
        <Badge variant="amber">{t('modulePlaceholder.badge')}</Badge>
      </PageHeader>

      {flow && <DocumentFlowStrip steps={flow.steps} currentIndex={flow.currentIndex} />}

      <div className="table-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={columns.length}>
                  <div className="table-empty">
                    <Icon size={40} />
                    <p>{emptyMessage}</p>
                    <small>{t('modulePlaceholder.emptyHint')}</small>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
