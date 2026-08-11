import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { Forklift, Percent, Wrench, TrendingUp, TrendingDown } from 'lucide-react'
import { MOCK_CONTRACTS, MOCK_CUSTOMERS, MOCK_FORKLIFTS, MOCK_MAINTENANCE_JOBS } from '@/mock/rentalMvpData'
import type { RentalContract, RentalContractStatus } from '@/types/rentalMvp'
import { getHeaderColorClass } from '@/utils/routeHeaderColor'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

const customerById = (id: string) => MOCK_CUSTOMERS.find((c) => c.id === id)
const forkliftById = (id: string) => MOCK_FORKLIFTS.find((f) => f.id === id)

const STATUS_STYLES: Record<RentalContractStatus, string> = {
  Booked: 'bg-sky-500/20 text-sky-400',
  'On Rent': 'bg-green-500/20 text-green-400',
  'Expiring Soon': 'bg-amber-500/20 text-amber-400',
  Overdue: 'bg-red-500/20 text-red-400',
  Returned: 'bg-white/10 text-gray-300',
  Cancelled: 'bg-white/10 text-gray-400',
}

// Reuses the same dashboard.exec.status.* keys as the real /dashboard page
const STATUS_KEYS: Record<RentalContractStatus, string> = {
  Booked: 'dashboard.exec.status.booked',
  'On Rent': 'dashboard.exec.status.onRent',
  'Expiring Soon': 'dashboard.exec.status.expiringSoon',
  Overdue: 'dashboard.exec.status.overdue',
  Returned: 'dashboard.exec.status.returned',
  Cancelled: 'dashboard.exec.status.cancelled',
}

function StatusBadge({ status }: { status: RentalContractStatus }) {
  const { t } = useTranslation()
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {t(STATUS_KEYS[status])}
    </span>
  )
}

interface KpiCardProps {
  label: string
  value: string
  sublabel: string
  icon: React.ElementType
  accent: string
  trend?: 'up' | 'down'
}

function KpiCard({ label, value, sublabel, icon: Icon, accent, trend }: KpiCardProps) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#1c1c1e] p-5 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-300">{label}</p>
          <div className="mt-2 flex items-center gap-2">
            <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
            {trend && (
              trend === 'up'
                ? <TrendingUp size={15} className="text-emerald-400" />
                : <TrendingDown size={15} className="text-red-400" />
            )}
          </div>
          <p className="mt-1 text-xs text-gray-400">{sublabel}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent}`}>
          <Icon size={20} className="text-white" strokeWidth={2} />
        </div>
      </div>
    </div>
  )
}

export default function RentalDashboard() {
  const { t } = useTranslation()
  const headerColorClass = getHeaderColorClass(useLocation().pathname)
  const totalFleet = MOCK_FORKLIFTS.length
  const activeRented = MOCK_FORKLIFTS.filter((f) => f.status === 'On Rent').length
  const utilizationRate = Math.round((activeRented / totalFleet) * 100)
  const pendingMaintenance = MOCK_MAINTENANCE_JOBS.filter((j) => j.status !== 'Completed').length
  const criticalMaintenance = MOCK_MAINTENANCE_JOBS.filter((j) => j.status === 'In Progress').length

  const maintenanceAccent = criticalMaintenance > 0
    ? 'bg-gradient-to-br from-red-500 to-red-700'
    : pendingMaintenance > 0
      ? 'bg-gradient-to-br from-amber-500 to-amber-700'
      : 'bg-gradient-to-br from-slate-500 to-slate-700'

  const contracts: RentalContract[] = MOCK_CONTRACTS

  return (
    <div className="min-h-full bg-[#151515] px-6 py-8 text-white lg:px-10">
      <header className={`mb-8 rounded-2xl px-6 py-5 ${headerColorClass}`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">{t('dashboard.exec.rentalMvpEyebrow')}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">{t('dashboard.exec.rentalMvpTitle')}</h1>
      </header>

      {/* Top Row: Executive KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={t('dashboard.exec.kpi.totalFleet')}
          value={String(totalFleet)}
          sublabel={t('dashboard.exec.kpi.totalFleetSub')}
          icon={Forklift}
          accent="bg-gradient-to-br from-blue-500 to-blue-700"
        />
        <KpiCard
          label={t('dashboard.exec.kpi.activeRented')}
          value={String(activeRented)}
          sublabel={t('dashboard.exec.kpi.activeRentedSub')}
          icon={TrendingUp}
          accent="bg-gradient-to-br from-emerald-500 to-emerald-700"
        />
        <KpiCard
          label={t('dashboard.exec.kpi.utilizationRate')}
          value={`${utilizationRate}%`}
          sublabel={t('dashboard.exec.kpi.utilizationRateSub')}
          icon={Percent}
          accent="bg-gradient-to-br from-violet-500 to-violet-700"
          trend={utilizationRate >= 50 ? 'up' : 'down'}
        />
        <KpiCard
          label={t('dashboard.exec.kpi.pendingMaintenance')}
          value={String(pendingMaintenance)}
          sublabel={criticalMaintenance > 0 ? t('dashboard.exec.kpi.pendingMaintenanceCritical', { count: criticalMaintenance }) : t('dashboard.exec.kpi.pendingMaintenanceSub')}
          icon={Wrench}
          accent={maintenanceAccent}
        />
      </section>

      {/* Active Rental Contracts (Table View) */}
      <section className="mt-8 rounded-2xl border border-white/8 bg-[#1c1c1e] p-5">
        <h2 className="mb-4 text-base font-semibold text-white">{t('dashboard.exec.contracts.title')}</h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-white/8 text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="py-2.5 pr-4 font-medium">{t('dashboard.exec.contracts.columnContractId')}</th>
                <th className="py-2.5 pr-4 font-medium">{t('dashboard.exec.contracts.columnCustomerName')}</th>
                <th className="py-2.5 pr-4 font-medium">{t('dashboard.exec.contracts.columnForkliftModel')}</th>
                <th className="py-2.5 pr-4 font-medium">{t('dashboard.exec.contracts.columnEndDate')}</th>
                <th className="py-2.5 pr-4 font-medium">{t('dashboard.exec.contracts.columnStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => {
                const customer = customerById(contract.customerId)
                const forklift = forkliftById(contract.forkliftAssetId)
                return (
                  <tr key={contract.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                    <td className="py-3 pr-4 font-medium text-gray-100">{contract.contractNumber}</td>
                    <td className="py-3 pr-4 text-gray-100">{customer?.companyName ?? '—'}</td>
                    <td className="py-3 pr-4 text-gray-100">
                      {forklift ? `${forklift.brand} ${forklift.model}` : '—'}
                      <span className="ml-1.5 text-xs text-gray-400">{forklift?.assetCode}</span>
                    </td>
                    <td className="py-3 pr-4 text-gray-100">{formatDate(contract.endDate)}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge status={contract.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
