import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Forklift, Wrench, Calendar, AlertCircle, ArrowRight, ArrowUp, ArrowDown,
  ChevronRight, Clock, Bell, ClipboardList,
} from 'lucide-react'
import { useCustomUI, type FontSizeTier } from '@/config/customLanguageStore'
import UICustomizerBar from '@/components/ui/UICustomizerBar'
import { useDashboardSummary } from '@/hooks/useDashboard'

const FONT_SIZE_CLASS: Record<FontSizeTier, string> = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
}

// ── Fleet status KPI card ────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string
  sublabel: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
  trend: { direction: 'up' | 'down'; value: string }
  to?: string
}

function KpiCard({ label, value, sublabel, icon: Icon, iconBg, iconColor, trend, to }: KpiCardProps) {
  const fontSize = useCustomUI((s) => s.fontSize)
  const sizeClass = FONT_SIZE_CLASS[fontSize]
  const TrendIcon = trend.direction === 'up' ? ArrowUp : ArrowDown
  const trendColor = trend.direction === 'up'
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-600 dark:text-red-400'

  const content = (
    <>
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon size={22} className={iconColor} strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className={`${sizeClass} font-semibold text-slate-700 dark:text-zinc-300`}>{label}</p>
          <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className={`${sizeClass} truncate text-slate-400 dark:text-zinc-500`}>{sublabel}</p>
        <span className={`flex shrink-0 items-center gap-0.5 text-xs font-semibold ${trendColor}`}>
          <TrendIcon size={12} strokeWidth={2.5} /> {trend.value}
        </span>
      </div>
    </>
  )

  const className = `rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-200 hover:shadow-md dark:border-zinc-800/70 dark:bg-zinc-900 dark:shadow-none ${
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

// ── Shared status badge + urgency tone (used by the fleet panel and both tables) ──

type BadgeTone = 'green' | 'amber' | 'red' | 'blue'

const BADGE_TONE: Record<BadgeTone, string> = {
  green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
}

function StatusBadge({ tone, label }: { tone: BadgeTone; label: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE_TONE[tone]}`}>
      {label}
    </span>
  )
}

type Urgency = 'Overdue' | 'Due Soon' | 'Scheduled'

const URGENCY_BADGE: Record<Urgency, BadgeTone> = {
  Overdue: 'red',
  'Due Soon': 'amber',
  Scheduled: 'blue',
}

// ── Section: Fleet Status & Inspection (Manual Tracking) ───────────────────
// The rental fleet carries no IoT devices — every field here is recorded by
// technicians on paper/checklist at handover and return, not read from a sensor.

interface FleetUnit {
  id: string
  code: string
  model: string
  status: 'ready' | 'on_rent' | 'maintenance'
  hourMeter: number
  hourMeterRecordedAt: string
  nextPmDate: string
  nextPmUrgency: Urgency
  capacity: string
  location: string
}

const FLEET_UNITS: FleetUnit[] = [
  { id: 'F01', code: 'F01', model: 'Toyota 8FG25', status: 'ready', hourMeter: 1248, hourMeterRecordedAt: 'May 9, 2024', nextPmDate: 'Jun 2, 2024', nextPmUrgency: 'Scheduled', capacity: '2.5 Tons', location: 'Warehouse A' },
  { id: 'F02', code: 'F02', model: 'Komatsu FG20', status: 'on_rent', hourMeter: 2103, hourMeterRecordedAt: 'Apr 28, 2024', nextPmDate: 'May 14, 2024', nextPmUrgency: 'Due Soon', capacity: '2.0 Tons', location: 'Site B — Vientiane' },
  { id: 'F03', code: 'F03', model: 'Toyota 8FG25', status: 'maintenance', hourMeter: 3567, hourMeterRecordedAt: 'May 10, 2024', nextPmDate: 'May 8, 2024', nextPmUrgency: 'Overdue', capacity: '2.5 Tons', location: 'Service Bay 2' },
  { id: 'F04', code: 'F04', model: 'RAYMOND 5200', status: 'on_rent', hourMeter: 645, hourMeterRecordedAt: 'May 3, 2024', nextPmDate: 'Jun 20, 2024', nextPmUrgency: 'Scheduled', capacity: '3.0 Tons', location: 'Site C — Pakse' },
]

const FLEET_STATUS_STYLES: Record<FleetUnit['status'], { lo: string; en: string; dot: string; text: string }> = {
  ready: { lo: 'ພ້ອມປ່ອຍເຊົ່າ', en: 'Ready for Rent', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  on_rent: { lo: 'ກຳລັງເຊົ່າ', en: 'On Rent', dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
  maintenance: { lo: 'ຕ້ອງສ້ອມແປງ', en: 'Under Maintenance', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
}

function FleetStat({ icon: Icon, label, value, caption, badge, iconBg, iconColor }: {
  icon: LucideIcon
  label: string
  value: string
  caption?: string
  badge?: ReactNode
  iconBg: string
  iconColor: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white p-2.5 dark:bg-zinc-900">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon size={16} className={iconColor} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 dark:text-zinc-400">{label}</p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-slate-900 dark:text-white">{value}</p>
          {badge}
        </div>
        {caption && <p className="mt-0.5 text-[11px] text-slate-400 dark:text-zinc-500">{caption}</p>}
      </div>
    </div>
  )
}

function DetailField({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-zinc-500">{label}</p>
      <p className={`truncate text-sm font-semibold ${valueClass ?? 'text-slate-800 dark:text-white'}`}>{value}</p>
    </div>
  )
}

function FleetStatusInspectionPanel() {
  const [selectedId, setSelectedId] = useState(FLEET_UNITS[0].id)
  const selected = FLEET_UNITS.find((u) => u.id === selectedId) ?? FLEET_UNITS[0]
  const status = FLEET_STATUS_STYLES[selected.status]

  return (
    <section className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-zinc-800/70 dark:bg-zinc-900 dark:shadow-none">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Fleet Status & Inspection (Manual Tracking)</h3>
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-zinc-400">
          <ClipboardList size={12} /> Recorded by Technicians
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <div className="grid gap-2">
          {FLEET_UNITS.map((u) => {
            const s = FLEET_STATUS_STYLES[u.status]
            const active = u.id === selectedId
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelectedId(u.id)}
                className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition ${
                  active
                    ? 'border-blue-300 bg-blue-50 dark:border-blue-500/40 dark:bg-blue-500/10'
                    : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60'
                }`}
              >
                <img src="/images/mit-fgc15n-33n-tooltips.png" alt={u.model} className="h-10 w-10 shrink-0 rounded-lg bg-slate-100 object-contain p-1 dark:bg-zinc-800" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{u.code} — {u.model}</p>
                  <p className={`mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs font-medium ${s.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} /> {s.lo}
                    <span className="text-slate-400 dark:text-zinc-500">({s.en})</span>
                  </p>
                </div>
                <ChevronRight size={14} className="shrink-0 text-slate-300 dark:text-zinc-600" />
              </button>
            )
          })}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-800/30">
          <p className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">{selected.code} — {selected.model}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[160px_1fr]">
            <img
              src="/images/mit-fgc15n-33n-tooltips.png"
              alt={selected.model}
              className="h-32 w-full rounded-lg border border-slate-200 bg-white object-contain p-2 dark:border-zinc-800 dark:bg-zinc-900 sm:h-full"
            />
            <div className="grid gap-3">
              <FleetStat
                icon={Clock}
                label="Hour Meter (ຊົ່ວໂມງການໃຊ້ງານລ່າສຸດ)"
                value={`${selected.hourMeter.toLocaleString()} hrs`}
                caption={`Last recorded: ${selected.hourMeterRecordedAt}`}
                iconBg="bg-slate-200 dark:bg-zinc-700" iconColor="text-slate-600 dark:text-zinc-300"
              />
              <FleetStat
                icon={Calendar}
                label="Next PM Date (ວັນທີບຳລຸງຮັກສາຄັ້ງຕໍ່ໄປ)"
                value={selected.nextPmDate}
                badge={<StatusBadge tone={URGENCY_BADGE[selected.nextPmUrgency]} label={selected.nextPmUrgency} />}
                iconBg="bg-red-100 dark:bg-red-500/10" iconColor="text-red-600 dark:text-red-400"
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 dark:border-zinc-800 sm:grid-cols-4">
            <DetailField label="Model" value={selected.model} />
            <DetailField label="Capacity" value={selected.capacity} />
            <DetailField label="Location" value={selected.location} />
            <DetailField label="Status" value={`${status.lo} (${status.en})`} valueClass={status.text} />
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Section: Alerts & Notifications (mock — pairs with the fleet status panel) ──

type AlertTone = 'red' | 'amber' | 'blue'

interface AlertItem {
  id: string
  icon: LucideIcon
  tone: AlertTone
  title: string
  message: string
  time: string
}

const ALERTS: AlertItem[] = [
  { id: 'a1', icon: Wrench, tone: 'red', title: 'F03 — Komatsu FG20', message: 'Maintenance required (Hydraulic system)', time: '10:24 AM' },
  { id: 'a2', icon: Clock, tone: 'amber', title: 'F02 — Komatsu FG20', message: 'Hour meter nearing next PM interval', time: '09:50 AM' },
  { id: 'a3', icon: Calendar, tone: 'blue', title: 'F08 — RAYMOND 5200', message: 'Scheduled maintenance tomorrow', time: 'Yesterday' },
]

const ALERT_TONE: Record<AlertTone, { bg: string; iconBg: string }> = {
  red: { bg: 'border-red-100 bg-red-50/60 dark:border-red-500/10 dark:bg-red-500/5', iconBg: 'bg-red-600' },
  amber: { bg: 'border-amber-100 bg-amber-50/60 dark:border-amber-500/10 dark:bg-amber-500/5', iconBg: 'bg-amber-500' },
  blue: { bg: 'border-blue-100 bg-blue-50/60 dark:border-blue-500/10 dark:bg-blue-500/5', iconBg: 'bg-blue-600' },
}

function AlertsPanel() {
  return (
    <section className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-zinc-800/70 dark:bg-zinc-900 dark:shadow-none">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-red-600 dark:text-red-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Alerts & Notifications</h3>
        </div>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold text-white">
          {ALERTS.length}
        </span>
      </div>
      <div className="grid gap-2">
        {ALERTS.map((a) => {
          const tone = ALERT_TONE[a.tone]
          const Icon = a.icon
          return (
            <div key={a.id} className={`flex items-start gap-3 rounded-xl border p-3 ${tone.bg}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone.iconBg}`}>
                <Icon size={14} className="text-white" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-white">{a.title}</p>
                  <span className="shrink-0 text-[11px] text-slate-400 dark:text-zinc-500">{a.time}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-zinc-400">{a.message}</p>
              </div>
            </div>
          )
        })}
      </div>
      <Link to="/iot-management" className="mt-3 flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline dark:text-red-400">
        View All Alerts <ArrowRight size={12} />
      </Link>
    </section>
  )
}

// ── Shared table shell ──────────────────────────────────────────────────────

function TableSection({ title, icon: Icon, iconColor, to, children }: {
  title: string
  icon: LucideIcon
  iconColor: string
  to: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-zinc-800/70 dark:bg-zinc-900 dark:shadow-none">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} className={iconColor} />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        </div>
        <Link to={to} className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline dark:text-red-400">
          View All <ArrowRight size={12} />
        </Link>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  )
}

// ── Section: Recent Rental Orders (mock) ────────────────────────────────────

interface RentalOrderRow {
  id: string
  customer: string
  forklift: string
  period: string
  status: 'Active' | 'Pending'
}

const RENTAL_ORDERS: RentalOrderRow[] = [
  { id: 'RNT-1001', customer: 'Vientiane Construction', forklift: 'F02', period: 'May 1 – 31, 2024', status: 'Active' },
  { id: 'RNT-1002', customer: 'Lao Logistics', forklift: 'F04', period: 'May 3 – 30, 2024', status: 'Active' },
  { id: 'RNT-1003', customer: 'Golden Build Co.', forklift: 'F07', period: 'Apr 28 – May 28, 2024', status: 'Pending' },
  { id: 'RNT-1004', customer: 'VTech Trading', forklift: 'F01', period: 'May 5 – 25, 2024', status: 'Active' },
]

function RecentRentalOrdersTable() {
  return (
    <TableSection title="Recent Rental Orders" icon={ClipboardList} iconColor="text-slate-500 dark:text-zinc-400" to="/rental-contracts">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-zinc-800 dark:text-zinc-500">
            <th className="pb-2 pr-3 font-semibold">Order ID</th>
            <th className="pb-2 pr-3 font-semibold">Customer</th>
            <th className="pb-2 pr-3 font-semibold">Forklift</th>
            <th className="pb-2 pr-3 font-semibold">Rental Period</th>
            <th className="pb-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
          {RENTAL_ORDERS.map((r) => (
            <tr key={r.id}>
              <td className="py-2.5 pr-3 font-semibold text-slate-800 dark:text-white">{r.id}</td>
              <td className="py-2.5 pr-3 text-slate-600 dark:text-zinc-300">{r.customer}</td>
              <td className="py-2.5 pr-3 text-slate-600 dark:text-zinc-300">{r.forklift}</td>
              <td className="py-2.5 pr-3 text-slate-500 dark:text-zinc-400">{r.period}</td>
              <td className="py-2.5"><StatusBadge tone={r.status === 'Active' ? 'green' : 'amber'} label={r.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableSection>
  )
}

// ── Section: Maintenance Schedule (mock) ────────────────────────────────────

interface MaintenanceRow {
  equipment: string
  type: string
  dueDate: string
  status: Urgency
}

const MAINTENANCE_SCHEDULE: MaintenanceRow[] = [
  { equipment: 'F03 — Komatsu FG20', type: 'Service', dueDate: 'May 10, 2024', status: 'Overdue' },
  { equipment: 'F07 — Toyota 8FG25', type: 'Service', dueDate: 'May 12, 2024', status: 'Due Soon' },
  { equipment: 'F09 — RAYMOND', type: 'Inspection', dueDate: 'May 15, 2024', status: 'Scheduled' },
  { equipment: 'F12 — Komatsu', type: 'Service', dueDate: 'May 18, 2024', status: 'Scheduled' },
]

function MaintenanceScheduleTable() {
  return (
    <TableSection title="Maintenance Schedule" icon={Calendar} iconColor="text-red-600 dark:text-red-400" to="/maintenance">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400 dark:border-zinc-800 dark:text-zinc-500">
            <th className="pb-2 pr-3 font-semibold">Equipment</th>
            <th className="pb-2 pr-3 font-semibold">Type</th>
            <th className="pb-2 pr-3 font-semibold">Due Date</th>
            <th className="pb-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
          {MAINTENANCE_SCHEDULE.map((m) => (
            <tr key={m.equipment}>
              <td className="py-2.5 pr-3 font-semibold text-slate-800 dark:text-white">{m.equipment}</td>
              <td className="py-2.5 pr-3 text-slate-600 dark:text-zinc-300">{m.type}</td>
              <td className="py-2.5 pr-3 text-slate-500 dark:text-zinc-400">{m.dueDate}</td>
              <td className="py-2.5"><StatusBadge tone={URGENCY_BADGE[m.status]} label={m.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableSection>
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

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryLoading || !fleet ? (
          <>
            <KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton /><KpiCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              label="Total Fleet"
              value={fleet.total.toLocaleString()}
              sublabel="Forklifts Available"
              icon={Forklift}
              iconBg="bg-red-100 dark:bg-red-500/10"
              iconColor="text-red-600 dark:text-red-400"
              trend={{ direction: 'up', value: '12% vs last month' }}
              to="/equipment"
            />
            <KpiCard
              label="On Rent"
              value={fleet.rented.toLocaleString()}
              sublabel="Currently Rented"
              icon={Forklift}
              iconBg="bg-blue-100 dark:bg-blue-500/10"
              iconColor="text-blue-600 dark:text-blue-400"
              trend={{ direction: 'up', value: '8% vs last month' }}
              to="/rental-contracts"
            />
            <KpiCard
              label="Under Maintenance"
              value={fleet.in_service.toLocaleString()}
              sublabel="Being Serviced"
              icon={Wrench}
              iconBg="bg-purple-100 dark:bg-purple-500/10"
              iconColor="text-purple-600 dark:text-purple-400"
              trend={{ direction: 'down', value: '2% vs last month' }}
              to="/maintenance"
            />
            <KpiCard
              label="Available for Rent"
              value={fleet.in_stock.toLocaleString()}
              sublabel="Ready to Use"
              icon={Calendar}
              iconBg="bg-emerald-100 dark:bg-emerald-500/10"
              iconColor="text-emerald-600 dark:text-emerald-400"
              trend={{ direction: 'up', value: '20% vs last month' }}
              to="/equipment"
            />
          </>
        )}
      </div>

      {/* Fleet Status & Inspection (manual tracking) + Alerts & Notifications */}
      <div className="mt-8 grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2"><FleetStatusInspectionPanel /></div>
        <AlertsPanel />
      </div>

      {/* Recent Rental Orders + Maintenance Schedule */}
      <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <RecentRentalOrdersTable />
        <MaintenanceScheduleTable />
      </div>
    </div>
  )
}
