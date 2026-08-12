import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  DollarSign, TrendingUp, CreditCard, AlertCircle, ArrowRight,
  Wrench, Cog, Layers,
} from 'lucide-react'
import { useCustomUI, type FontSizeTier } from '@/config/customLanguageStore'
import UICustomizerBar from '@/components/ui/UICustomizerBar'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import type { DashboardRevenueRange } from '@/types/dashboard'
import { ProfitTrendChart, RevenueBreakdownChart, ServiceCostChart, SampleTrendChart } from './ErpCharts'
import IoTWidget from './IoTWidget'

const lakFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const formatLak = (v: number) => `₭ ${lakFormatter.format(Math.round(v))}`

const FONT_SIZE_CLASS: Record<FontSizeTier, string> = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
}

type Tab = 'financial' | 'service'

interface KpiCardProps {
  label: string
  value: string
  sublabel?: string
  icon: LucideIcon
  accent: string
  to?: string
}

function KpiCard({ label, value, sublabel, icon: Icon, accent, to }: KpiCardProps) {
  const { t } = useTranslation()
  const fontSize = useCustomUI((s) => s.fontSize)
  const sizeClass = FONT_SIZE_CLASS[fontSize]

  const content = (
    <>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className={`${sizeClass} text-slate-500 dark:text-zinc-400`}>{label}</p>
          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
          {sublabel && <p className={`mt-1 ${sizeClass} text-slate-500 dark:text-zinc-400`}>{sublabel}</p>}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
          <Icon size={20} className="text-white" strokeWidth={2} />
        </div>
      </div>
      {to && (
        <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-blue-700 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          {t('dashboard.erp.viewDetails')} <ArrowRight size={12} />
        </p>
      )}
    </>
  )

  const className = `group rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/70 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none transition-all duration-200 hover:shadow-md ${
    to ? 'cursor-pointer' : ''
  }`

  return to ? (
    <Link to={to} className={className}>{content}</Link>
  ) : (
    <div className={className}>{content}</div>
  )
}

function KpiCardSkeleton() {
  return <div className="h-[104px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 py-2.5 text-sm last:border-0">
      <span className="text-slate-500 dark:text-zinc-400">{label}</span>
      <span className="font-semibold text-slate-900 dark:text-white">{value}</span>
    </div>
  )
}

function MetricPanel({
  title, icon: Icon, accent, rows, to,
}: {
  title: string
  icon: LucideIcon
  accent: string
  rows: { label: string; value: string }[]
  to?: string
}) {
  const { t } = useTranslation()

  const content = (
    <>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent}`}>
            <Icon size={16} className="text-white" strokeWidth={2} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        </div>
        {to && (
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-700 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {t('dashboard.erp.viewDetails')} <ArrowRight size={12} />
          </span>
        )}
      </div>
      <div>
        {rows.map((r) => <MetricRow key={r.label} label={r.label} value={r.value} />)}
      </div>
    </>
  )

  const className = `group block rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/70 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none transition-all duration-200 hover:shadow-md ${
    to ? 'cursor-pointer' : ''
  }`

  return to ? (
    <Link to={to} className={className}>{content}</Link>
  ) : (
    <div className={className}>{content}</div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'border border-blue-700 bg-blue-700 text-white shadow-sm'
          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  )
}

const ROLLUP_SOURCES: { key: string; to: string }[] = [
  { key: 'invoices', to: '/billing/invoices' },
  { key: 'workOrders', to: '/maintenance/work-orders' },
  { key: 'payments', to: '/billing/payments' },
]

export default function DashboardPage() {
  const { t } = useTranslation()
  const fontSize = useCustomUI((s) => s.fontSize)
  const sizeClass = FONT_SIZE_CLASS[fontSize]

  const [tab, setTab] = useState<Tab>('financial')
  const [revenueRange, setRevenueRange] = useState<DashboardRevenueRange>('all')
  const { data, trend, isLoading, isFetching, error } = useDashboardStats(revenueRange)

  return (
    <div className="min-h-full py-8">
      {/* Header: premium DK Blue enterprise banner */}
      <header className="mb-8 rounded-2xl border border-blue-800 bg-[#003366] px-6 py-6 shadow-sm sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={`${sizeClass} font-semibold uppercase tracking-wider text-blue-200`}>{t('dashboard.erp.eyebrow')}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">{t('dashboard.erp.title')}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-blue-200">
              <span className="font-medium">{t('dashboard.erp.rollupCaption')}</span>
              {ROLLUP_SOURCES.map((src, i) => (
                <span key={src.key} className="flex items-center gap-1.5">
                  <Link to={src.to} className="font-semibold text-blue-100 underline-offset-2 transition-colors hover:text-white hover:underline">
                    {t(`dashboard.erp.sources.${src.key}`)}
                  </Link>
                  {i < ROLLUP_SOURCES.length - 1 && <span className="text-blue-400/50">·</span>}
                </span>
              ))}
            </div>
          </div>
          <UICustomizerBar />
        </div>
      </header>

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Headline KPIs (always visible) — top-level rollup numbers */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading || !data ? (
          <>
            <KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              label={t('dashboard.erp.hero.netSales')}
              value={formatLak(data.sales.net_sales)}
              sublabel={t('dashboard.erp.sales.invoiceCount', { count: data.sales.invoice_count })}
              icon={DollarSign}
              accent="bg-gradient-to-br from-blue-500 to-blue-700"
              to="/billing/invoices"
            />
            <KpiCard
              label={t('dashboard.erp.hero.netProfit')}
              value={formatLak(data.net_profit)}
              icon={TrendingUp}
              accent={data.net_profit >= 0 ? 'bg-gradient-to-br from-emerald-500 to-emerald-700' : 'bg-gradient-to-br from-red-500 to-red-700'}
              to="/billing"
            />
            <KpiCard
              label={t('dashboard.erp.hero.outstandingBalance')}
              value={formatLak(data.credit.outstanding_balance)}
              icon={CreditCard}
              accent="bg-gradient-to-br from-violet-500 to-violet-700"
              to="/billing"
            />
          </>
        )}
      </section>

      {/* Tabs */}
      <div className="mt-8 flex gap-3">
        <TabButton active={tab === 'financial'} onClick={() => setTab('financial')}>{t('dashboard.erp.tabs.financial')}</TabButton>
        <TabButton active={tab === 'service'} onClick={() => setTab('service')}>{t('dashboard.erp.tabs.service')}</TabButton>
      </div>

      {!isLoading && data && (
        <div className="mt-6">
          {tab === 'financial' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <MetricPanel
                  title={t('dashboard.erp.sales.title')}
                  icon={DollarSign}
                  accent="bg-gradient-to-br from-blue-500 to-blue-700"
                  to="/billing/invoices"
                  rows={[
                    { label: t('dashboard.erp.sales.totalSales'), value: formatLak(data.sales.total_sales) },
                    { label: t('dashboard.erp.sales.totalDiscount'), value: formatLak(data.sales.total_discount) },
                    { label: t('dashboard.erp.sales.totalTax'), value: formatLak(data.sales.total_tax) },
                    { label: t('dashboard.erp.sales.netSales'), value: formatLak(data.sales.net_sales) },
                    { label: t('dashboard.erp.sales.amountReceived'), value: formatLak(data.sales.amount_received) },
                  ]}
                />
                <MetricPanel
                  title={t('dashboard.erp.profit.title')}
                  icon={TrendingUp}
                  accent="bg-gradient-to-br from-emerald-500 to-emerald-700"
                  to="/billing"
                  rows={[
                    { label: t('dashboard.erp.profit.profitPerInvoice'), value: formatLak(data.profit.profit_per_invoice) },
                    { label: t('dashboard.erp.profit.dailyProfit'), value: formatLak(data.profit.daily_profit) },
                    { label: t('dashboard.erp.profit.monthlyProfit'), value: formatLak(data.profit.monthly_profit) },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr] lg:items-start">
                <MetricPanel
                  title={t('dashboard.erp.credit.title')}
                  icon={CreditCard}
                  accent="bg-gradient-to-br from-violet-500 to-violet-700"
                  to="/billing"
                  rows={[
                    { label: t('dashboard.erp.credit.totalCustomerDebt'), value: formatLak(data.credit.total_customer_debt) },
                    { label: t('dashboard.erp.credit.totalPaid'), value: formatLak(data.credit.total_paid) },
                    { label: t('dashboard.erp.credit.outstandingBalance'), value: formatLak(data.credit.outstanding_balance) },
                  ]}
                />
                <RevenueBreakdownChart
                  data={data.revenue_breakdown}
                  range={revenueRange}
                  onRangeChange={setRevenueRange}
                  isFetching={isFetching}
                  to="/reports"
                />
              </div>

              <SampleTrendChart to="/reports" />
              <ProfitTrendChart data={trend} to="/reports" />
            </div>
          )}

          {tab === 'service' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label={t('dashboard.erp.service.laborCost')} value={formatLak(data.service.labor_cost)} icon={Wrench} accent="bg-gradient-to-br from-orange-500 to-orange-700" to="/maintenance/work-orders" />
                <KpiCard label={t('dashboard.erp.service.partsCost')} value={formatLak(data.service.parts_cost)} icon={Cog} accent="bg-gradient-to-br from-cyan-500 to-cyan-700" to="/maintenance/work-orders" />
                <KpiCard label={t('dashboard.erp.service.otherServices')} value={formatLak(data.service.other_services)} icon={Layers} accent="bg-gradient-to-br from-violet-500 to-violet-700" to="/maintenance/work-orders" />
                <KpiCard label={t('dashboard.erp.service.grandTotal')} value={formatLak(data.service.grand_total)} icon={TrendingUp} accent="bg-gradient-to-br from-emerald-500 to-emerald-700" to="/maintenance/work-orders" />
              </div>

              <ServiceCostChart labor={data.service.labor_cost} parts={data.service.parts_cost} other={data.service.other_services} to="/maintenance/work-orders" />

              <IoTWidget />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
