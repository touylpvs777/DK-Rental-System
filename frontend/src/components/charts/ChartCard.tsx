import { useTranslation } from 'react-i18next'
import { BarChart2, AlertCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import './ChartCard.css'

export interface ChartCardProps {
  title: string
  sub?: string
  /** Show shimmer skeleton instead of content */
  loading?: boolean
  /** Show red error state */
  error?: string | null
  /** Show empty-state illustration */
  isEmpty?: boolean
  emptyIcon?: LucideIcon
  emptyMessage?: string
  emptySubMessage?: string
  /** Height of skeleton / empty / error placeholder (px) */
  height?: number
  /** Optional action slot (e.g. refresh button) top-right */
  action?: React.ReactNode
  children?: React.ReactNode
}

export default function ChartCard({
  title,
  sub,
  loading = false,
  error,
  isEmpty = false,
  emptyIcon: EmptyIcon = BarChart2,
  emptyMessage,
  emptySubMessage,
  height = 220,
  action,
  children,
}: ChartCardProps) {
  const { t } = useTranslation()
  const resolvedEmptyMessage = emptyMessage ?? t('common.noDataYet')
  const resolvedEmptySubMessage = emptySubMessage ?? t('common.dataWillAppear')
  const showSkeleton  = loading
  const showError     = !loading && !!error
  const showEmpty     = !loading && !error && isEmpty
  const showContent   = !loading && !error && !isEmpty

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div className="chart-card-titles">
          <div className="chart-card-title">{title}</div>
          {sub && <div className="chart-card-sub">{sub}</div>}
        </div>
        {action && <div className="chart-card-action">{action}</div>}
      </div>

      {showSkeleton && (
        <div className="chart-skeleton" style={{ height }} />
      )}

      {showError && (
        <div className="chart-error-state" style={{ height }}>
          <AlertCircle size={28} />
          <p>{error}</p>
        </div>
      )}

      {showEmpty && (
        <div className="chart-empty-state" style={{ height }}>
          <EmptyIcon size={36} />
          <p>{resolvedEmptyMessage}</p>
          <small>{resolvedEmptySubMessage}</small>
        </div>
      )}

      {showContent && children}
    </div>
  )
}
