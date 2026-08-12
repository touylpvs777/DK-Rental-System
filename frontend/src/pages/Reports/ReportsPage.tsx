import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Users, UserCheck, Truck, ClipboardList,
  Download, FileText, FileSpreadsheet, RefreshCw, AlertCircle,
} from 'lucide-react'
import { StatCard, StatCardSkeleton } from '@/components/ui/StatCard'
import PrintButton from '@/components/ui/PrintButton'
import { ChartCard, TrendLineChart } from '@/components/charts'
import { useDashboardSummary, useCustomerTrend } from '@/hooks/useDashboard'
import { downloadReport, type ReportFormat } from '@/api/reports'
import { toast } from '@/store/toastStore'
import PageHeader from '@/components/layout/PageHeader'
import './ReportsPage.css'

// ── Helpers ───────────────────────────────────────────────────
function fmtMonth(m: string) {
  const [y, mo] = m.split('-')
  return `${new Date(+y, +mo - 1, 1).toLocaleDateString('en-US', { month: 'short' })} '${y.slice(2)}`
}

// ── Section title ─────────────────────────────────────────────
function SectionHeading({ children }: { children: React.ReactNode }) {
  return <div className="rp-section-heading">{children}</div>
}

// ── Main page ─────────────────────────────────────────────────
export default function ReportsPage() {
  const { t } = useTranslation()
  const summary   = useDashboardSummary()
  const custTrend = useCustomerTrend(12)

  const [exportFormat, setExportFormat] = useState<ReportFormat>('csv')
  const [fromDate, setFromDate]         = useState('')
  const [toDate, setToDate]             = useState('')
  const [downloading, setDownloading]   = useState(false)

  const s = summary.data

  // Refresh all data sources
  const refetchAll = useCallback(() => {
    summary.refetch()
    custTrend.refetch()
  }, [summary, custTrend])

  // Download with client-side fallback
  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadReport(
        'customers',
        { format: exportFormat, from_date: fromDate || undefined, to_date: toDate || undefined },
        s,                    // pass summary for CSV fallback
      )
      toast.success(t('reports.downloadSuccess', { type: t('reports.customers') }))
    } catch (err) {
      const msg = (err as Error).message ?? t('reports.downloadError', { type: t('reports.customers') })
      toast.error(msg)
    } finally {
      setDownloading(false)
    }
  }

  // Prepare chart data
  const custTrendData = custTrend.data.map(p => ({ ...p, month: fmtMonth(p.month) }))

  const anyFetching = summary.isFetching || custTrend.isFetching

  return (
    <div className="rp-page">

      {/* ── Header ────────────────────────────────────── */}
      <PageHeader
        title={t('reports.title')}
        subtitle={t('reports.subtitle', 'Fleet, rental, and customer analytics with data exports')}
        style={{ marginBottom: 28 }}
      >
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
                label={t('reports.totalCustomers')}
                value={s?.total_customers ?? 0}
                icon={Users}
                accent="#2563eb" iconBg="#eff6ff"
              />
              <StatCard
                label={t('reports.activeCustomers')}
                value={s?.active_customers ?? 0}
                icon={UserCheck}
                accent="#16a34a" iconBg="#f0fdf4"
              />
              <StatCard
                label={t('reports.fleetSize', 'Fleet Size')}
                value={s?.fleet.total ?? 0}
                icon={Truck}
                accent="#7c3aed" iconBg="#f5f3ff"
                sublabel={t('reports.fleetSizeSub', 'Total registered forklifts')}
              />
              <StatCard
                label={t('reports.activeRentals', 'Active Rentals')}
                value={s?.active_rental_contracts ?? 0}
                icon={ClipboardList}
                accent="#d97706" iconBg="#fffbeb"
                sublabel={t('reports.activeRentalsSub', 'Contracts currently on-hire')}
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
            <button
              className="export-btn"
              onClick={handleDownload}
              disabled={downloading}
              style={{ '--btn-icon-bg': '#eff6ff', '--btn-icon-color': '#2563eb' } as React.CSSProperties}
            >
              <span className="export-btn-icon">
                {exportFormat === 'excel' ? <FileSpreadsheet size={13} /> : <FileText size={13} />}
              </span>
              {downloading ? t('reports.downloading') : `${t('reports.customers')} ${exportFormat.toUpperCase()}`}
              <Download size={12} />
            </button>
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
          {custTrend.isMock && (
            <span className="rp-mock-badge">{t('reports.syntheticPreview')}</span>
          )}
        </SectionHeading>
        <div className="rp-chart-grid">
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

    </div>
  )
}
