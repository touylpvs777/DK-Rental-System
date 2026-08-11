import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Trophy, Users, Percent, Award,
  Download, FileText, TrendingUp as TrendingUpIcon,
  FileSpreadsheet, RefreshCw, Clock, AlertCircle,
} from 'lucide-react'
import { StatCard, StatCardSkeleton } from '@/components/ui/StatCard'
import PrintButton from '@/components/ui/PrintButton'
import {
  ChartCard,
  TrendLineChart,
  DistributionBarChart,
  HorizontalBarChart,
} from '@/components/charts'
import { useDashboardSummary, useLeadTrend, useCustomerTrend, useLeadMetrics } from '@/hooks/useDashboard'
import { downloadReport, type ReportFormat } from '@/api/reports'
import { recordToBarData } from '@/utils/mockAdapter'
import { PLANNED_MODULES } from '@/modules/registry'
import { toast } from '@/store/toastStore'
import PageHeader from '@/components/layout/PageHeader'
import './ReportsPage.css'

// ── Color maps ────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  new:       '#7c3aed',
  contacted: '#0891b2',
  qualified: '#d97706',
  proposal:  '#2563eb',
  won:       '#16a34a',
  lost:      '#dc2626',
}
const SOURCE_COLORS: Record<string, string> = {
  website:      '#2563eb',
  referral:     '#16a34a',
  cold_call:    '#d97706',
  email:        '#0891b2',
  social_media: '#7c3aed',
  other:        '#94a3b8',
}
const SOURCE_LABEL_KEYS: Record<string, string> = {
  website:      'reports.sourceLabels.website',
  referral:     'reports.sourceLabels.referral',
  cold_call:    'reports.sourceLabels.coldCall',
  email:        'reports.sourceLabels.email',
  social_media: 'reports.sourceLabels.socialMedia',
  other:        'reports.sourceLabels.other',
}
const STATUS_LABEL_KEYS: Record<string, string> = {
  new:       'dashboard.kpi.new',
  contacted: 'dashboard.kpi.contacted',
  qualified: 'dashboard.kpi.qualified',
  proposal:  'dashboard.kpi.proposal',
  won:       'dashboard.kpi.won',
  lost:      'dashboard.kpi.lost',
}
const STATUS_ORDER = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

// ── Helpers ───────────────────────────────────────────────────
function fmtMonth(m: string) {
  const [y, mo] = m.split('-')
  return `${new Date(+y, +mo - 1, 1).toLocaleDateString('en-US', { month: 'short' })} '${y.slice(2)}`
}
const rate = (n: number) => `${n.toFixed(1)}%`

// ── Section title ─────────────────────────────────────────────
function SectionHeading({ children }: { children: React.ReactNode }) {
  return <div className="rp-section-heading">{children}</div>
}

// ── Metric row in the conversion table ────────────────────────
interface MetricRowProps {
  label: string
  value: string
  color: string
  filled: number    // 0-100
  detail: string
  description: string
}
function MetricRow({ label, value, color, filled, detail, description }: MetricRowProps) {
  return (
    <tr>
      <td><strong>{label}</strong></td>
      <td><span className="metric-value" style={{ color }}>{value}</span></td>
      <td style={{ minWidth: 160 }}>
        <div className="metric-bar-wrap">
          <div className="metric-bar-track">
            <div className="metric-bar-fill" style={{ width: `${Math.min(filled, 100)}%`, background: color }} />
          </div>
          <span className="metric-bar-detail">{detail}</span>
        </div>
      </td>
      <td className="cell-muted rp-hide-sm">{description}</td>
    </tr>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function ReportsPage() {
  const { t } = useTranslation()
  const summary   = useDashboardSummary()
  const leadTrend = useLeadTrend(12)
  const custTrend = useCustomerTrend(12)
  const metrics   = useLeadMetrics()

  const [exportFormat, setExportFormat] = useState<ReportFormat>('csv')
  const [fromDate, setFromDate]         = useState('')
  const [toDate, setToDate]             = useState('')
  const [downloading, setDownloading]   = useState<string | null>(null)

  const s = summary.data

  const EXPORT_TYPES = [
    { type: 'customers' as const, labelKey: 'reports.customers', iconBg: '#eff6ff', iconColor: '#2563eb', Icon: Users },
    { type: 'leads'     as const, labelKey: 'reports.leads',     iconBg: '#f0fdf4', iconColor: '#16a34a', Icon: TrendingUpIcon },
    { type: 'sales'     as const, labelKey: 'reports.sales',     iconBg: '#fffbeb', iconColor: '#d97706', Icon: exportFormat === 'excel' ? FileSpreadsheet : FileText },
  ]

  // Refresh all data sources
  const refetchAll = useCallback(() => {
    summary.refetch()
    leadTrend.refetch()
    custTrend.refetch()
    metrics.refetch()
  }, [summary, leadTrend, custTrend, metrics])

  // Download with client-side fallback
  const handleDownload = async (type: 'customers' | 'leads' | 'sales') => {
    setDownloading(type)
    try {
      await downloadReport(
        type,
        { format: exportFormat, from_date: fromDate || undefined, to_date: toDate || undefined },
        s,                    // pass summary for CSV fallback
      )
      toast.success(t('reports.downloadSuccess', { type: t(`reports.${type}`) }))
    } catch (err) {
      const msg = (err as Error).message ?? t('reports.downloadError', { type: t(`reports.${type}`) })
      toast.error(msg)
    } finally {
      setDownloading(null)
    }
  }

  // Prepare chart data
  const leadTrendData = leadTrend.data.map(p => ({ ...p, month: fmtMonth(p.month) }))
  const custTrendData = custTrend.data.map(p => ({ ...p, month: fmtMonth(p.month) }))

  const statusLabels = Object.fromEntries(
    Object.entries(STATUS_LABEL_KEYS).map(([key, labelKey]) => [key, t(labelKey)]),
  )
  const sourceLabels = Object.fromEntries(
    Object.entries(SOURCE_LABEL_KEYS).map(([key, labelKey]) => [key, t(labelKey)]),
  )

  const statusChartData = metrics.data
    ? recordToBarData(metrics.data.by_status, statusLabels, STATUS_ORDER)
    : []
  const sourceChartData = metrics.data
    ? recordToBarData(metrics.data.by_source, sourceLabels)
    : []

  // Drives the refresh button's disabled/spin state — isFetching (not
  // isLoading) so it also reflects background/manual refetches, matching
  // the button's old behavior under the hand-rolled hooks.
  const anyFetching = summary.isFetching || leadTrend.isFetching || custTrend.isFetching || metrics.isFetching

  return (
    <div className="rp-page">

      {/* ── Header ────────────────────────────────────── */}
      <PageHeader title={t('reports.title')} subtitle={t('reports.subtitle')} style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <PrintButton />
          <button
            className="btn btn-ghost"
            onClick={refetchAll}
            disabled={anyFetching}
            style={{ gap: 6 }}
          >
            <RefreshCw size={14} className={anyFetching ? 'spin' : ''} />
            {t('reports.refresh')}
          </button>
        </div>
      </PageHeader>

      {/* Global error */}
      {summary.error && (
        <div className="page-error" style={{ marginBottom: 24 }}>
          <AlertCircle size={16} />
          {summary.error}
          <button className="clear-btn" onClick={() => summary.refetch()} style={{ marginLeft: 'auto' }}>{t('reports.retry')}</button>
        </div>
      )}

      {/* ── 1. Key Metrics ─────────────────────────── */}
      <div className="rp-section">
        <SectionHeading>{t('reports.keyMetrics')}</SectionHeading>
        <div className="rp-stat-grid">
          {summary.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          ) : (
            <>
              <StatCard
                label={t('reports.wonLeads')}
                value={s?.won_leads ?? 0}
                icon={Trophy}
                accent="#16a34a" iconBg="#f0fdf4"
              />
              <StatCard
                label={t('reports.totalCustomers')}
                value={s?.total_customers ?? 0}
                icon={Users}
                accent="#2563eb" iconBg="#eff6ff"
              />
              <StatCard
                label={t('reports.conversionRate')}
                value={rate(s?.conversion_rate ?? 0)}
                icon={Percent}
                accent="#7c3aed" iconBg="#f5f3ff"
                sublabel={t('reports.wonOverTotalLeads')}
                isRate
              />
              <StatCard
                label={t('reports.winRate')}
                value={rate(s?.win_rate ?? 0)}
                icon={Award}
                accent="#16a34a" iconBg="#f0fdf4"
                sublabel={t('reports.wonOverWonPlusLost')}
                isRate
              />
            </>
          )}
        </div>
      </div>

      {/* ── 2. Export ──────────────────────────────── */}
      <div className="rp-section">
        <SectionHeading>{t('reports.exportData')}</SectionHeading>
        <div className="export-card">
          <div className="export-card-title">{t('reports.downloadReports')}</div>

          <div className="export-controls">
            <div className="export-field">
              <label>{t('reports.format')}</label>
              <select
                className="filter-select"
                value={exportFormat}
                onChange={e => setExportFormat(e.target.value as ReportFormat)}
              >
                <option value="csv">{t('reports.formatCsv')}</option>
                <option value="excel">{t('reports.formatExcel')}</option>
              </select>
            </div>

            <div className="export-field">
              <label>{t('reports.fromDate')}</label>
              <input
                type="date" className="date-input"
                value={fromDate} onChange={e => setFromDate(e.target.value)}
              />
            </div>

            <div className="export-field">
              <label>{t('reports.toDate')}</label>
              <input
                type="date" className="date-input"
                value={toDate} onChange={e => setToDate(e.target.value)}
              />
            </div>

            {(fromDate || toDate) && (
              <button className="clear-btn" onClick={() => { setFromDate(''); setToDate('') }}>
                {t('reports.clearDates')}
              </button>
            )}
          </div>

          <div className="export-buttons">
            {EXPORT_TYPES.map(({ type, labelKey, iconBg, iconColor, Icon }) => (
              <button
                key={type}
                className="export-btn"
                onClick={() => handleDownload(type)}
                disabled={!!downloading}
                style={{ '--btn-icon-bg': iconBg, '--btn-icon-color': iconColor } as React.CSSProperties}
              >
                <span className="export-btn-icon"><Icon size={13} /></span>
                {downloading === type ? t('reports.downloading') : `${t(labelKey)} ${exportFormat.toUpperCase()}`}
                <Download size={12} />
              </button>
            ))}
          </div>

          <p className="export-note">
            {t('reports.exportNote')}
          </p>
        </div>
      </div>

      {/* ── 3. Trends ──────────────────────────────── */}
      <div className="rp-section">
        <SectionHeading>
          {t('reports.trends')}
          {(leadTrend.isMock || custTrend.isMock) && (
            <span className="rp-mock-badge">{t('reports.syntheticPreview')}</span>
          )}
        </SectionHeading>
        <div className="rp-chart-grid">
          <ChartCard
            title={t('reports.leadVolume')}
            sub={t('reports.leadVolumeSub')}
            loading={leadTrend.isLoading}
            isEmpty={!leadTrend.isLoading && leadTrendData.length === 0}
            emptyMessage={t('reports.noLeadTrend')}
            emptySubMessage={t('reports.leadTrendWillAppear')}
          >
            <TrendLineChart
              data={leadTrendData}
              color="#2563eb"
              name={t('reports.leads')}
            />
          </ChartCard>

          <ChartCard
            title={t('reports.customerGrowth')}
            sub={t('reports.customerGrowthSub')}
            loading={custTrend.isLoading}
            isEmpty={!custTrend.isLoading && custTrendData.length === 0}
            emptyMessage={t('reports.noCustomerTrend')}
            emptySubMessage={t('reports.customerTrendWillAppear')}
          >
            <TrendLineChart
              data={custTrendData}
              color="#16a34a"
              name={t('reports.customers')}
            />
          </ChartCard>
        </div>
      </div>

      {/* ── 4. Lead Analysis ───────────────────────── */}
      <div className="rp-section">
        <SectionHeading>{t('reports.leadAnalysis')}</SectionHeading>
        <div className="rp-chart-grid">
          <ChartCard
            title={t('reports.statusDistribution')}
            sub={t('reports.statusDistributionSub')}
            loading={metrics.isLoading}
            isEmpty={!metrics.isLoading && statusChartData.length === 0}
            emptyMessage={t('reports.noStatusData')}
            emptySubMessage={t('reports.createLeadsToSeeDistribution')}
          >
            <DistributionBarChart
              data={statusChartData}
              colorMap={STATUS_COLORS}
              label={t('reports.leads')}
            />
          </ChartCard>

          <ChartCard
            title={t('reports.sourceBreakdown')}
            sub={t('reports.sourceBreakdownSub')}
            loading={metrics.isLoading}
            isEmpty={!metrics.isLoading && sourceChartData.length === 0}
            emptyMessage={t('reports.noSourceData')}
            emptySubMessage={t('reports.addSourceWhenCreating')}
          >
            <HorizontalBarChart
              data={sourceChartData}
              colorMap={SOURCE_COLORS}
              label={t('reports.leads')}
              labelWidth={88}
            />
          </ChartCard>
        </div>
      </div>

      {/* ── 5. Conversion Metrics ──────────────────── */}
      <div className="rp-section">
        <SectionHeading>{t('reports.conversionMetrics')}</SectionHeading>
        <div className="rp-table-card">
          <table className="metrics-table">
            <thead>
              <tr>
                <th>{t('reports.metric')}</th>
                <th>{t('reports.rate')}</th>
                <th>{t('reports.breakdown')}</th>
                <th className="rp-hide-sm">{t('reports.formula')}</th>
              </tr>
            </thead>
            <tbody>
              {summary.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    <td><div className="skeleton-cell" style={{ width: '55%' }} /></td>
                    <td><div className="skeleton-cell" style={{ width: 52, height: 22 }} /></td>
                    <td><div className="skeleton-cell" style={{ height: 6, borderRadius: 3 }} /></td>
                    <td className="rp-hide-sm"><div className="skeleton-cell" style={{ width: '75%' }} /></td>
                  </tr>
                ))
              ) : (
                <>
                  <MetricRow
                    label={t('reports.conversionRate')}
                    value={rate(s?.conversion_rate ?? 0)}
                    color="#7c3aed"
                    filled={s?.conversion_rate ?? 0}
                    detail={`${s?.won_leads ?? 0} / ${s?.total_leads ?? 0}`}
                    description={t('reports.wonOverTotalFormula')}
                  />
                  <MetricRow
                    label={t('reports.winRate')}
                    value={rate(s?.win_rate ?? 0)}
                    color="#16a34a"
                    filled={s?.win_rate ?? 0}
                    detail={`${s?.won_leads ?? 0} / ${(s?.won_leads ?? 0) + (s?.lost_leads ?? 0)}`}
                    description={t('reports.wonOverWonLostFormula')}
                  />
                  <MetricRow
                    label={t('reports.lostRate')}
                    value={rate(s?.lost_rate ?? 0)}
                    color="#dc2626"
                    filled={s?.lost_rate ?? 0}
                    detail={`${s?.lost_leads ?? 0} / ${(s?.won_leads ?? 0) + (s?.lost_leads ?? 0)}`}
                    description={t('reports.lostOverWonLostFormula')}
                  />
                  <MetricRow
                    label={t('reports.activeCustomers')}
                    value={String(s?.active_customers ?? 0)}
                    color="#2563eb"
                    filled={s?.total_customers ? (s.active_customers / s.total_customers) * 100 : 0}
                    detail={`${s?.active_customers ?? 0} / ${s?.total_customers ?? 0}`}
                    description={t('reports.activeOverTotalFormula')}
                  />
                  <MetricRow
                    label={t('reports.leadsInPipeline')}
                    value={String((s?.new_leads ?? 0) + (s?.contacted_leads ?? 0) + (s?.qualified_leads ?? 0) + (s?.proposal_leads ?? 0))}
                    color="#d97706"
                    filled={s?.total_leads
                      ? (((s.new_leads + s.contacted_leads + s.qualified_leads + s.proposal_leads) / s.total_leads) * 100)
                      : 0}
                    detail={t('reports.ofTotal', { count: s?.total_leads ?? 0 })}
                    description={t('reports.pipelineFormula')}
                  />
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 6. Roadmap ─────────────────────────────── */}
      <div className="rp-section">
        <SectionHeading>{t('reports.moduleRoadmap')}</SectionHeading>
        <div className="rp-roadmap-grid">
          {PLANNED_MODULES.map(mod => (
            <div key={mod.id} className="rp-roadmap-card">
              <div className="rp-roadmap-card-top">
                <div
                  className="rp-roadmap-dot"
                  style={{ background: mod.color + '22', borderColor: mod.color + '55' }}
                >
                  <Clock size={14} style={{ color: mod.color }} />
                </div>
                <span className="rp-roadmap-version">{mod.plannedVersion}</span>
              </div>
              <div className="rp-roadmap-label">{t(`reports.modules.${mod.id}.label`, mod.label)}</div>
              <div className="rp-roadmap-desc">{t(`reports.modules.${mod.id}.description`, mod.description)}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
