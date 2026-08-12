import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer,
} from 'recharts'
import type { ProfitTrendPoint, RevenueBreakdown, DashboardRevenueRange } from '@/types/dashboard'

const TOOLTIP_STYLE = {
  contentStyle: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12, padding: '8px 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
  labelStyle: { color: '#475569', marginBottom: 4, fontWeight: 600 },
  itemStyle: { padding: 0 },
}

const lakShort = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(Math.round(v))

function SectionTitle({ title, sub, to }: { title: string; sub?: string; to?: string }) {
  const heading = (
    <h2 className={`flex items-center gap-1.5 text-base font-semibold text-slate-900 dark:text-white ${to ? 'group-hover:text-blue-700' : ''}`}>
      {title}
      {to && <ArrowRight size={14} className="opacity-0 transition-opacity group-hover:opacity-100" />}
    </h2>
  )
  return (
    <div className="mb-4">
      {to ? <Link to={to} className="group inline-flex">{heading}</Link> : heading}
      {sub && <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">{sub}</p>}
    </div>
  )
}

export type ChartMode = 'line' | 'bar' | 'area'

export function ChartTypeToggle({ value, onChange, labels }: { value: ChartMode; onChange: (m: ChartMode) => void; labels: { line: string; bar: string; area: string } }) {
  const options: { key: ChartMode; label: string }[] = [
    { key: 'line', label: labels.line },
    { key: 'bar', label: labels.bar },
    { key: 'area', label: labels.area },
  ]
  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${value === o.key ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:text-slate-800'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

interface ProfitTrendChartProps {
  data: ProfitTrendPoint[]
  to?: string
}

export function ProfitTrendChart({ data, to }: ProfitTrendChartProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<ChartMode>('area')
  const toggleLabels = { line: t('dashboard.erp.chart.line'), bar: t('dashboard.erp.chart.bar'), area: t('dashboard.erp.chart.area') }
  const seriesName = t('dashboard.erp.chart.profitSeries')
  const tooltipFormatter = (value: unknown) => [`₭ ${lakShort(Number(value))}`, seriesName] as [string, string]

  return (
    <section className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/70 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none transition-all duration-200 hover:shadow-md">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <SectionTitle title={t('dashboard.erp.chart.profitTrend')} sub={t('dashboard.erp.chart.last6Months')} to={to} />
        <ChartTypeToggle value={mode} onChange={setMode} labels={toggleLabels} />
      </div>
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          {mode === 'bar' ? (
            <BarChart data={data} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={85} tickFormatter={lakShort} />
              <Tooltip {...TOOLTIP_STYLE} formatter={tooltipFormatter} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="profit" name={seriesName} fill="#34d399" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : mode === 'line' ? (
            <LineChart data={data} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={85} tickFormatter={lakShort} />
              <Tooltip {...TOOLTIP_STYLE} formatter={tooltipFormatter} cursor={{ stroke: 'rgba(0,0,0,0.15)' }} />
              <Line type="monotone" dataKey="profit" name={seriesName} stroke="#34d399" strokeWidth={2.5} dot={{ r: 3, fill: '#34d399', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          ) : (
            <AreaChart data={data} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={85} tickFormatter={lakShort} />
              <Tooltip {...TOOLTIP_STYLE} formatter={tooltipFormatter} cursor={{ stroke: 'rgba(0,0,0,0.15)' }} />
              <Area
                type="monotone"
                dataKey="profit"
                name={seriesName}
                stroke="#34d399"
                strokeWidth={2.5}
                fill="url(#profitFill)"
                dot={{ r: 3, fill: '#34d399', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </section>
  )
}

// Realistic illustrative monthly figures (LAK) purely to demonstrate the
// Line/Bar/Area mode switcher — clearly labeled "Sample Data" in the UI so
// it's never mistaken for the real, API-backed figures shown elsewhere.
const SAMPLE_TREND_DATA = [
  { month: '2026-02', sales: 42_000_000, costs: 27_500_000, profit: 14_500_000 },
  { month: '2026-03', sales: 48_500_000, costs: 29_000_000, profit: 19_500_000 },
  { month: '2026-04', sales: 45_000_000, costs: 31_200_000, profit: 13_800_000 },
  { month: '2026-05', sales: 53_000_000, costs: 33_000_000, profit: 20_000_000 },
  { month: '2026-06', sales: 58_500_000, costs: 34_500_000, profit: 24_000_000 },
  { month: '2026-07', sales: 61_000_000, costs: 36_000_000, profit: 25_000_000 },
]

export function SampleTrendChart({ to }: { to?: string }) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<ChartMode>('line')
  const toggleLabels = { line: t('dashboard.erp.chart.line'), bar: t('dashboard.erp.chart.bar'), area: t('dashboard.erp.chart.area') }
  const salesName = t('dashboard.erp.chart.salesSeries')
  const costsName = t('dashboard.erp.chart.costsSeries')
  const profitName = t('dashboard.erp.chart.profitSeries')

  return (
    <section className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/70 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none transition-all duration-200 hover:shadow-md">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <SectionTitle title={t('dashboard.erp.chart.salesOpsTrend')} sub={t('dashboard.erp.chart.salesOpsTrendSub')} to={to} />
            <span className="mb-4 inline-flex h-fit items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
              {t('dashboard.erp.chart.sampleBadge')}
            </span>
          </div>
        </div>
        <ChartTypeToggle value={mode} onChange={setMode} labels={toggleLabels} />
      </div>
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          {mode === 'bar' ? (
            <BarChart data={SAMPLE_TREND_DATA} margin={{ top: 12, right: 8, left: -8, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={85} tickFormatter={lakShort} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(value) => `₭ ${lakShort(Number(value))}`} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#64748b' }} />
              <Bar dataKey="sales" name={salesName} fill="#60a5fa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="costs" name={costsName} fill="#fbbf24" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" name={profitName} fill="#34d399" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : mode === 'line' ? (
            <LineChart data={SAMPLE_TREND_DATA} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={85} tickFormatter={lakShort} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(value) => `₭ ${lakShort(Number(value))}`} cursor={{ stroke: 'rgba(0,0,0,0.15)' }} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#64748b' }} />
              <Line type="monotone" dataKey="sales" name={salesName} stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="costs" name={costsName} stroke="#fbbf24" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="profit" name={profitName} stroke="#34d399" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          ) : (
            <AreaChart data={SAMPLE_TREND_DATA} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="sampleSalesFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="sampleCostsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="sampleProfitFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={85} tickFormatter={lakShort} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(value) => `₭ ${lakShort(Number(value))}`} cursor={{ stroke: 'rgba(0,0,0,0.15)' }} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#64748b' }} />
              <Area type="monotone" dataKey="sales" name={salesName} stroke="#60a5fa" strokeWidth={2} fill="url(#sampleSalesFill)" />
              <Area type="monotone" dataKey="costs" name={costsName} stroke="#fbbf24" strokeWidth={2} fill="url(#sampleCostsFill)" />
              <Area type="monotone" dataKey="profit" name={profitName} stroke="#34d399" strokeWidth={2} fill="url(#sampleProfitFill)" />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </section>
  )
}

interface RevenueBreakdownChartProps {
  data: RevenueBreakdown
  range: DashboardRevenueRange
  onRangeChange: (range: DashboardRevenueRange) => void
  isFetching?: boolean
  to?: string
}

const REVENUE_COLORS = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24']
const REVENUE_RANGES: DashboardRevenueRange[] = ['week', 'month', 'last_month', 'year', 'all']

function RevenueRangeSelect({ value, onChange, disabled }: { value: DashboardRevenueRange; onChange: (r: DashboardRevenueRange) => void; disabled?: boolean }) {
  const { t } = useTranslation()
  return (
    <select
      className="filter-select"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as DashboardRevenueRange)}
    >
      {REVENUE_RANGES.map((r) => (
        <option key={r} value={r}>{t(`dashboard.erp.chart.timeRange.${r}`)}</option>
      ))}
    </select>
  )
}

export function RevenueBreakdownChart({ data, range, onRangeChange, isFetching, to }: RevenueBreakdownChartProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<ChartMode>('bar')
  const toggleLabels = { line: t('dashboard.erp.chart.line'), bar: t('dashboard.erp.chart.bar'), area: t('dashboard.erp.chart.area') }
  const seriesName = t('dashboard.erp.chart.revenueSeries')
  const chartData = [
    { key: t('dashboard.erp.revenue.vehicleRevenue'), value: data.vehicle_revenue },
    { key: t('dashboard.erp.revenue.serviceRevenue'), value: data.service_revenue },
    { key: t('dashboard.erp.revenue.otherRevenue'), value: data.other_revenue },
  ]

  return (
    <section className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/70 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none transition-all duration-200 hover:shadow-md">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <SectionTitle title={t('dashboard.erp.chart.revenueBreakdown')} sub={t('dashboard.erp.chart.revenueBreakdownSub')} to={to} />
        <div className="flex items-center gap-2">
          <RevenueRangeSelect value={range} onChange={onRangeChange} disabled={isFetching} />
          <ChartTypeToggle value={mode} onChange={setMode} labels={toggleLabels} />
        </div>
      </div>
      <div style={{ height: 260 }} className={`transition-opacity duration-200 ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
        <ResponsiveContainer width="100%" height="100%">
          {mode === 'bar' ? (
            <BarChart data={chartData} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="key" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={85} tickFormatter={lakShort} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(value) => `₭ ${lakShort(Number(value))}`} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="value" name={seriesName} radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={entry.key} fill={REVENUE_COLORS[i % REVENUE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : mode === 'line' ? (
            <LineChart data={chartData} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="key" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={85} tickFormatter={lakShort} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(value) => `₭ ${lakShort(Number(value))}`} cursor={{ stroke: 'rgba(0,0,0,0.15)' }} />
              <Line
                type="monotone"
                dataKey="value"
                name={seriesName}
                stroke="#60a5fa"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueBreakdownFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="key" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={85} tickFormatter={lakShort} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(value) => `₭ ${lakShort(Number(value))}`} cursor={{ stroke: 'rgba(0,0,0,0.15)' }} />
              <Area
                type="monotone"
                dataKey="value"
                name={seriesName}
                stroke="#60a5fa"
                strokeWidth={2.5}
                fill="url(#revenueBreakdownFill)"
                dot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </section>
  )
}

interface ServiceCostChartProps {
  labor: number
  parts: number
  other: number
  to?: string
}

export function ServiceCostChart({ labor, parts, other, to }: ServiceCostChartProps) {
  const { t } = useTranslation()
  const chartData = [
    { key: t('dashboard.erp.service.laborCost'), value: labor },
    { key: t('dashboard.erp.service.partsCost'), value: parts },
    { key: t('dashboard.erp.service.otherServices'), value: other },
  ]

  return (
    <section className="rounded-2xl overflow-hidden bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/70 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none transition-all duration-200 hover:shadow-md">
      <SectionTitle title={t('dashboard.erp.service.title')} to={to} />
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 12, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
            <XAxis dataKey="key" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={85} tickFormatter={lakShort} />
            <Tooltip {...TOOLTIP_STYLE} formatter={(value) => `₭ ${lakShort(Number(value))}`} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
