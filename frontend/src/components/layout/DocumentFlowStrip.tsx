import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

export interface DocumentFlowStep {
  /** Reuses the existing nav.items.* i18n keys so no new translations are needed per step. */
  labelKey: string
  to: string
}

interface DocumentFlowStripProps {
  steps: DocumentFlowStep[]
  /** Index into `steps` for the document the user is currently viewing. */
  currentIndex: number
}

const pillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 9px',
  borderRadius: 20,
  fontSize: 11.5,
  fontWeight: 600,
  letterSpacing: 0.3,
  whiteSpace: 'nowrap',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  color: 'var(--color-text-muted)',
  textDecoration: 'none',
}

/**
 * Shows where a document sits in the wider ERP flow (e.g. Quotation → Sales
 * Order → Delivery Note), with every non-current step a real, working link
 * to that module's list page. Reused across scaffolded modules so the
 * relationship stays visible even before there are live linked records.
 */
export default function DocumentFlowStrip({ steps, currentIndex }: DocumentFlowStripProps) {
  const { t } = useTranslation()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--color-text-muted)', marginRight: 2 }}>
        {t('documentFlow.title')}
      </span>
      {steps.map((step, i) => (
        <span key={step.to} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <ChevronRight size={14} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />}
          {i === currentIndex ? (
            <Badge variant="blue">{t(step.labelKey)}</Badge>
          ) : (
            <Link to={step.to} style={pillStyle}>{t(step.labelKey)}</Link>
          )}
        </span>
      ))}
    </div>
  )
}
