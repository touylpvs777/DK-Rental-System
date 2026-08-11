import { useState, useEffect, useCallback } from 'react'
import { getSummary } from '@/api/dashboard'
import { getForklifts } from '@/api/forklift'
import { getRentalContracts } from '@/api/rental'
import { getQuotations } from '@/api/quotation'
import { getActivity } from '@/api/activity'
import type { DashboardSummary } from '@/types/dashboard'
import type { Forklift } from '@/types/forklift'
import type { RentalContract } from '@/types/rental'
import type { Quotation } from '@/types/quotation'
import type { ActivityLog } from '@/types/activity'
import type { BarItem } from '@/components/charts/DistributionBarChart'

interface DashboardData {
  summary: DashboardSummary | null
  forklifts: Forklift[]
  contracts: RentalContract[]
  quotations: Quotation[]
  activities: ActivityLog[]

  kpis: {
    totalCustomers: number
    activeRentals: number
    overdueRentals: number
    availableForklifts: number
    totalFleet: number
    activeRevenue: number
    upcomingPm: number
    criticalPm: number
    openQuotations: number
    pipelineValue: number
    upcomingReturns: number
    urgentReturns: number
    fleetUtilization: number
    rentedCount: number
  }

  revenueByMonth: { month: string; revenue: number }[]
  fleetByStatus: { name: string; value: number; color: string }[]
  fleetByFuel: BarItem[]
  fleetByBrand: BarItem[]
  expiringContracts: RentalContract[]
  expiringQuotations: Quotation[]
  pmDueForklifts: Forklift[]

  isLoading: boolean
  error: string | null
  refetch: () => void
}

const STATUS_COLORS: Record<string, string> = {
  in_stock: '#22c55e', rented: '#7c3aed', in_service: '#f59e0b',
  reserved: '#0891b2', sold: '#3b82f6', decommissioned: '#ef4444',
}
const STATUS_LABEL_KEYS: Record<string, string> = {
  in_stock: 'dashboard.fleetStatus.inStock', rented: 'dashboard.fleetStatus.rented', in_service: 'dashboard.fleetStatus.inService',
  reserved: 'dashboard.fleetStatus.reserved', sold: 'dashboard.fleetStatus.sold', decommissioned: 'dashboard.fleetStatus.decommissioned',
}
const FUEL_LABEL_KEYS: Record<string, string> = {
  diesel: 'dashboard.fuelType.diesel', electric: 'dashboard.fuelType.electric',
  lpg: 'dashboard.fuelType.lpg', dual_fuel: 'dashboard.fuelType.dualFuel', unknown: 'dashboard.fuelType.unknown',
}

export function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

type TFunction = (key: string) => string

export function useDashboardData(t: TFunction): DashboardData {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [forklifts, setForklifts] = useState<Forklift[]>([])
  const [contracts, setContracts] = useState<RentalContract[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [sumRes, flRes, rcRes, qtRes, actRes] = await Promise.all([
        getSummary(),
        getForklifts({ page_size: 100 }),
        getRentalContracts({ page_size: 100 }),
        getQuotations({ page_size: 100 }),
        getActivity({ limit: 10 }),
      ])
      setSummary(sumRes.data)
      setForklifts(flRes.data.items)
      setContracts(rcRes.data.items)
      setQuotations(qtRes.data.items)
      setActivities(actRes.data)
    } catch {
      setError(t('dashboard.loadError'))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  const activeContracts = contracts.filter((c) => c.status === 'active')
  const overdueContracts = contracts.filter((c) => c.status === 'overdue')
  const availableFL = forklifts.filter((f) => f.status === 'in_stock')
  const rentedFL = forklifts.filter((f) => f.status === 'rented')
  const pmDue = forklifts.filter((f) => f.current_hour_meter >= 4000)
  const criticalPm = forklifts.filter((f) => f.current_hour_meter >= 4500)
  const openQt = quotations.filter((q) => ['draft', 'under_review', 'sent', 'approved'].includes(q.status))
  const upcomingReturns = activeContracts.filter((c) => daysUntil(c.end_date) <= 30 && daysUntil(c.end_date) > 0)
  const urgentReturns = activeContracts.filter((c) => daysUntil(c.end_date) <= 7 && daysUntil(c.end_date) > 0)

  const revenueByMonth: { month: string; revenue: number }[] = (() => {
    const buckets: Record<string, number> = {}
    for (const c of contracts) {
      if (['active', 'closed', 'overdue'].includes(c.status)) {
        const m = c.start_date.slice(0, 7)
        buckets[m] = (buckets[m] || 0) + c.total_value
      }
    }
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, revenue]) => ({ month, revenue }))
  })()

  const fleetByStatus: { name: string; value: number; color: string }[] = (() => {
    const counts: Record<string, number> = {}
    for (const f of forklifts) counts[f.status] = (counts[f.status] || 0) + 1
    return Object.entries(counts).map(([key, value]) => ({
      name: STATUS_LABEL_KEYS[key] ? t(STATUS_LABEL_KEYS[key]) : key,
      value,
      color: STATUS_COLORS[key] ?? '#94a3b8',
    }))
  })()

  const fleetByFuel: BarItem[] = (() => {
    const counts: Record<string, number> = {}
    for (const f of forklifts) {
      const key = f.fuel_type ?? 'unknown'
      counts[key] = (counts[key] || 0) + 1
    }
    return Object.entries(counts).map(([key, value]) => ({
      key,
      name: FUEL_LABEL_KEYS[key] ? t(FUEL_LABEL_KEYS[key]) : key,
      value,
    }))
  })()

  const fleetByBrand: BarItem[] = (() => {
    const counts: Record<string, number> = {}
    for (const f of forklifts) counts[f.brand?.name ?? 'Unknown'] = (counts[f.brand?.name ?? 'Unknown'] || 0) + 1
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ key: name.toLowerCase().replace(/\s/g, '_'), name, value }))
  })()

  const expiringContracts = [...upcomingReturns].sort((a, b) => daysUntil(a.end_date) - daysUntil(b.end_date)).slice(0, 5)

  const expiringQuotations = openQt
    .filter((q) => q.valid_until && daysUntil(q.valid_until) <= 14 && daysUntil(q.valid_until) > 0)
    .sort((a, b) => daysUntil(a.valid_until!) - daysUntil(b.valid_until!))
    .slice(0, 5)

  const pmDueForklifts = [...pmDue].sort((a, b) => b.current_hour_meter - a.current_hour_meter).slice(0, 5)

  return {
    summary, forklifts, contracts, quotations, activities,
    kpis: {
      totalCustomers: summary?.total_customers ?? 0,
      activeRentals: activeContracts.length,
      overdueRentals: overdueContracts.length,
      availableForklifts: availableFL.length,
      totalFleet: forklifts.length,
      activeRevenue: activeContracts.reduce((s, c) => s + c.total_value, 0),
      upcomingPm: pmDue.length,
      criticalPm: criticalPm.length,
      openQuotations: openQt.length,
      pipelineValue: openQt.reduce((s, q) => s + q.total_amount, 0),
      upcomingReturns: upcomingReturns.length,
      urgentReturns: urgentReturns.length,
      fleetUtilization: forklifts.length ? Math.round((rentedFL.length / forklifts.length) * 100) : 0,
      rentedCount: rentedFL.length,
    },
    revenueByMonth, fleetByStatus, fleetByFuel, fleetByBrand,
    expiringContracts, expiringQuotations, pmDueForklifts,
    isLoading, error, refetch: load,
  }
}
