import { useMemo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Truck, CheckCircle2, Send, ClipboardCheck, FileText,
  AlertCircle, AlertTriangle, ArrowRight, Radio,
  Thermometer, MapPinOff, BatteryWarning, WifiOff,
} from 'lucide-react'
import { useCustomUI, type FontSizeTier } from '@/config/customLanguageStore'
import UICustomizerBar from '@/components/ui/UICustomizerBar'
import { useDashboardSummary } from '@/hooks/useDashboard'
import { useShiftHandovers } from '@/hooks/useShiftHandovers'
import { shiftLabel } from '@/utils/shiftHandoverLabels'
import type { ShiftHandover } from '@/types/shiftHandover'
import type { DashboardDeliveryOrderBrief, DashboardQuotationBrief } from '@/types/dashboard'

const FONT_SIZE_CLASS: Record<FontSizeTier, string> = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ── Fleet status KPI card ────────────────────────────────────────────────────

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
  return <div className="h-[104px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-zinc-800 dark:bg-zinc-900" />
}

// ── Panel shell (shared by the two side-by-side sections) ──────────────────

function Panel({ title, icon: Icon, accent, action, children }: {
  title: string
  icon: LucideIcon
  accent: string
  action?: { label: string; to: string }
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-zinc-800/70 dark:bg-zinc-900 dark:shadow-none">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accent}`}>
            <Icon size={16} className="text-white" strokeWidth={2} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        </div>
        {action && (
          <Link to={action.to} className="flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400">
            {action.label} <ArrowRight size={12} />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

function EmptyState({ icon: Icon, message }: { icon: LucideIcon; message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-slate-400 dark:text-zinc-500">
      <Icon size={28} />
      <p className="text-sm">{message}</p>
    </div>
  )
}

// ── Section B: Recent Issues (Shift Handovers) ──────────────────────────────

function RecentIssueRow({ handover }: { handover: ShiftHandover }) {
  const { t } = useTranslation()
  return (
    <Link
      to={`/shift-handovers/${handover.id}`}
      className="block rounded-xl border border-amber-100 bg-amber-50/60 p-3 transition hover:bg-amber-50 dark:border-amber-500/10 dark:bg-amber-500/5 dark:hover:bg-amber-500/10"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-800 dark:text-white">
            {handover.forklift.serial_number} — {handover.forklift.name_en}
          </div>
          <div className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
            {shiftLabel(t, handover.shift_name)} · {fmtDateTime(handover.handover_datetime)}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
          {t('shiftHandover.statusOptions.issuesFound', 'Issues Found')}
        </span>
      </div>
      {handover.issues_description && (
        <p className="mt-1.5 line-clamp-1 text-xs text-slate-600 dark:text-zinc-400">{handover.issues_description}</p>
      )}
    </Link>
  )
}

function RecentIssuesPanel() {
  const { t } = useTranslation()
  const { handovers, isLoading, error } = useShiftHandovers({ skip: 0, limit: 20 })
  const recentIssues = useMemo(
    () => handovers.filter((h) => h.checklist_status === 'Issues Found').slice(0, 5),
    [handovers],
  )

  return (
    <Panel
      title={t('dashboard.fleetOps.issues.title')}
      icon={ClipboardCheck}
      accent="bg-gradient-to-br from-amber-500 to-amber-700"
      action={{ label: t('dashboard.fleetOps.issues.viewAll'), to: '/shift-handovers' }}
    >
      {error ? (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={14} /> {t('dashboard.fleetOps.issues.loadError')}
        </div>
      ) : isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : recentIssues.length === 0 ? (
        <EmptyState icon={CheckCircle2} message={t('dashboard.fleetOps.issues.empty')} />
      ) : (
        <div className="grid gap-2">
          {recentIssues.map((h) => <RecentIssueRow key={h.id} handover={h} />)}
        </div>
      )}
    </Panel>
  )
}

// ── Section C: Pending Deliveries & Returns (Delivery Orders quote-to-cash pipeline) ──

function PendingDeliveryRow({ order }: { order: DashboardDeliveryOrderBrief }) {
  const { t } = useTranslation()
  const isReturn = order.order_type === 'return'
  return (
    <Link
      to={`/delivery-orders/${order.id}`}
      className={`block rounded-xl border p-3 transition ${
        isReturn
          ? 'border-purple-100 bg-purple-50/60 hover:bg-purple-50 dark:border-purple-500/10 dark:bg-purple-500/5 dark:hover:bg-purple-500/10'
          : 'border-cyan-100 bg-cyan-50/60 hover:bg-cyan-50 dark:border-cyan-500/10 dark:bg-cyan-500/5 dark:hover:bg-cyan-500/10'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-800 dark:text-white">
            {order.do_no} · {order.contract_number}
          </div>
          <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-zinc-400">
            {order.customer_name}{order.forklift ? ` — ${order.forklift.serial_number} ${order.forklift.name_en}` : ''}
          </div>
          <div className="mt-0.5 text-xs text-slate-400 dark:text-zinc-500">{fmtDateTime(order.delivery_date)}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          isReturn
            ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300'
            : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300'
        }`}
        >
          {t(`deliveryOrders.orderType.${order.order_type}`, order.order_type)}
        </span>
      </div>
    </Link>
  )
}

function PendingDeliveriesPanel() {
  const { t } = useTranslation()
  const { data: summary, isLoading, error } = useDashboardSummary()
  const orders = useMemo(
    () => [...(summary?.recent_pending_deliveries ?? []), ...(summary?.recent_pending_returns ?? [])]
      .sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime()),
    [summary],
  )

  return (
    <Panel
      title={t('dashboard.fleetOps.deliveries.title')}
      icon={Truck}
      accent="bg-gradient-to-br from-cyan-500 to-cyan-700"
      action={{ label: t('dashboard.fleetOps.deliveries.viewAll'), to: '/delivery-orders' }}
    >
      {error ? (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={14} /> {t('dashboard.fleetOps.deliveries.loadError')}
        </div>
      ) : isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState icon={CheckCircle2} message={t('dashboard.fleetOps.deliveries.empty')} />
      ) : (
        <div className="grid gap-2">
          {orders.map((o) => <PendingDeliveryRow key={o.id} order={o} />)}
        </div>
      )}
    </Panel>
  )
}

// ── Section D: Pending Quotations (quote-to-cash pipeline) ─────────────────

function PendingQuotationRow({ quotation }: { quotation: DashboardQuotationBrief }) {
  return (
    <Link
      to={`/quotations/${quotation.id}`}
      className="block rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 transition hover:bg-emerald-50 dark:border-emerald-500/10 dark:bg-emerald-500/5 dark:hover:bg-emerald-500/10"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-800 dark:text-white">{quotation.quotation_no}</div>
          <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-zinc-400">{quotation.customer_name}</div>
          <div className="mt-0.5 text-xs text-slate-400 dark:text-zinc-500">{fmtDateTime(quotation.created_at)}</div>
        </div>
        <span className="shrink-0 text-sm font-semibold text-slate-700 dark:text-zinc-300">
          {quotation.rental_price.toLocaleString()}
        </span>
      </div>
    </Link>
  )
}

function PendingQuotationsPanel() {
  const { t } = useTranslation()
  const { data: summary, isLoading, error } = useDashboardSummary()
  const quotations = summary?.pending_quotations ?? []

  return (
    <Panel
      title={t('dashboard.fleetOps.quotations.title')}
      icon={FileText}
      accent="bg-gradient-to-br from-emerald-500 to-emerald-700"
      action={{ label: t('dashboard.fleetOps.quotations.viewAll'), to: '/quotations' }}
    >
      {error ? (
        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
          <AlertCircle size={14} /> {t('dashboard.fleetOps.quotations.loadError')}
        </div>
      ) : isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-slate-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : quotations.length === 0 ? (
        <EmptyState icon={CheckCircle2} message={t('dashboard.fleetOps.quotations.empty')} />
      ) : (
        <div className="grid gap-2">
          {quotations.map((q) => <PendingQuotationRow key={q.id} quotation={q} />)}
        </div>
      )}
    </Panel>
  )
}

// ── Section E: IoT Safety Alerts (mock data — live IoT alerting isn't wired up yet) ──

type AlertType = 'overheat' | 'geofence' | 'battery' | 'offline'
type AlertSeverity = 'critical' | 'warning'

interface MockAlert {
  id: number
  type: AlertType
  severity: AlertSeverity
  forklift: string
  minutesAgo?: number
  hoursAgo?: number
}

const ALERT_ICONS: Record<AlertType, LucideIcon> = {
  overheat: Thermometer,
  geofence: MapPinOff,
  battery: BatteryWarning,
  offline: WifiOff,
}

const MOCK_ALERTS: MockAlert[] = [
  { id: 1, type: 'overheat', severity: 'critical', forklift: 'Forklift #03', minutesAgo: 8 },
  { id: 2, type: 'geofence', severity: 'warning', forklift: 'Forklift #07', minutesAgo: 34 },
  { id: 3, type: 'battery', severity: 'warning', forklift: 'Forklift #12', minutesAgo: 52 },
  { id: 4, type: 'offline', severity: 'critical', forklift: 'Forklift #05', hoursAgo: 2 },
]

function AlertRow({ alert }: { alert: MockAlert }) {
  const { t } = useTranslation()
  const Icon = ALERT_ICONS[alert.type]
  const isCritical = alert.severity === 'critical'
  const time = alert.hoursAgo != null
    ? t('dashboard.fleetOps.alerts.hoursAgo', { count: alert.hoursAgo })
    : t('dashboard.fleetOps.alerts.minutesAgo', { count: alert.minutesAgo })

  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 ${
      isCritical
        ? 'border-red-100 bg-red-50/60 dark:border-red-500/10 dark:bg-red-500/5'
        : 'border-amber-100 bg-amber-50/60 dark:border-amber-500/10 dark:bg-amber-500/5'
    }`}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
        isCritical ? 'bg-red-600' : 'bg-amber-500'
      }`}
      >
        <Icon size={15} className="text-white" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-slate-800 dark:text-white">
            {t(`dashboard.fleetOps.alerts.items.${alert.type}`, { forklift: alert.forklift })}
          </p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            isCritical
              ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
          }`}
          >
            {t(`dashboard.fleetOps.alerts.severity.${alert.severity}`)}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">{time}</p>
      </div>
    </div>
  )
}

function IoTSafetyAlertsPanel() {
  const { t } = useTranslation()
  return (
    <Panel
      title={t('dashboard.fleetOps.alerts.title')}
      icon={Radio}
      accent="bg-gradient-to-br from-red-500 to-red-700"
      action={{ label: t('nav.items.iotTelemetry'), to: '/iot-management' }}
    >
      <div className="mb-3 flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-500">
        <AlertTriangle size={12} /> {t('dashboard.fleetOps.alerts.mockNotice')}
      </div>
      <div className="grid gap-2">
        {MOCK_ALERTS.map((a) => <AlertRow key={a.id} alert={a} />)}
      </div>
    </Panel>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t } = useTranslation()
  const fontSize = useCustomUI((s) => s.fontSize)
  const sizeClass = FONT_SIZE_CLASS[fontSize]

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useDashboardSummary()
  const fleet = summary?.fleet

  return (
    <div className="min-h-full py-8">
      {/* Header: premium DK Blue enterprise banner */}
      <header className="mb-8 rounded-2xl border border-blue-800 bg-[#003366] px-6 py-6 shadow-sm sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={`${sizeClass} font-semibold uppercase tracking-wider text-blue-200`}>{t('dashboard.fleetOps.eyebrow')}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">{t('dashboard.fleetOps.title')}</h1>
            <p className="mt-2 max-w-2xl text-xs text-blue-200 sm:text-sm">{t('dashboard.fleetOps.subtitle')}</p>
          </div>
          <UICustomizerBar />
        </div>
      </header>

      {summaryError && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          <AlertCircle size={16} /> {summaryError}
        </div>
      )}

      {/* Section A — Fleet Status Overview */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">{t('dashboard.fleetOps.overview.title')}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryLoading || !fleet ? (
            <>
              <KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton />
            </>
          ) : (
            <>
              <KpiCard
                label={t('dashboard.fleetOps.overview.totalForklifts')}
                value={fleet.total.toLocaleString()}
                icon={Truck}
                accent="bg-gradient-to-br from-slate-500 to-slate-700"
                to="/equipment"
              />
              <KpiCard
                label={t('dashboard.fleetOps.overview.readyForRent')}
                value={fleet.in_stock.toLocaleString()}
                icon={CheckCircle2}
                accent="bg-gradient-to-br from-emerald-500 to-emerald-700"
                to="/equipment"
              />
              <KpiCard
                label={t('dashboard.fleetOps.overview.currentlyRented')}
                value={fleet.rented.toLocaleString()}
                icon={Send}
                accent="bg-gradient-to-br from-blue-500 to-blue-700"
                to="/rental-contracts"
              />
              <KpiCard
                label={t('dashboard.fleetOps.overview.pendingInspection')}
                value={fleet.in_service.toLocaleString()}
                icon={ClipboardCheck}
                accent="bg-gradient-to-br from-amber-500 to-amber-700"
                to="/maintenance"
              />
            </>
          )}
        </div>
      </section>

      {/* Section B + C — Recent Issues / Pending Deliveries & Returns */}
      <div className="mt-8 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <RecentIssuesPanel />
        <PendingDeliveriesPanel />
      </div>

      {/* Section D + E — Pending Quotations / IoT Safety Alerts */}
      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <PendingQuotationsPanel />
        <IoTSafetyAlertsPanel />
      </div>
    </div>
  )
}
