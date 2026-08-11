import type { KpiCardData } from '../types'

interface DashboardKpis {
  totalCustomers: number
  activeRentals: number
  overdueRentals: number
  availableForklifts: number
  totalFleet: number
  activeRevenue: number
  upcomingPm: number
  criticalPm: number
  openQuotations: number
  fleetUtilization: number
  rentedCount: number
}

interface BillingSummary {
  total_invoiced: number
  total_outstanding: number
  total_overdue: number
  invoice_count: number
  currency: string
}

interface InventorySummary {
  low_stock_count: number
}

type TFunction = (key: string, opts?: Record<string, unknown>) => string

export function buildKpiCards(
  kpis: DashboardKpis,
  billing: BillingSummary | null,
  inventory: InventorySummary | null,
  t: TFunction,
): KpiCardData[] {
  const fmt = (n: number) => n.toLocaleString()
  const fmtAmt = (n: number, c: string) => `${n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}K` : fmt(n)} ${c}`

  return [
    {
      id: 'revenue',
      label: t('dashboard.kpi.totalRevenue'),
      value: billing ? fmtAmt(billing.total_invoiced, billing.currency) : '—',
      icon: 'DollarSign',
      color: 'var(--color-success-600)',
      bg: 'var(--color-success-50)',
      href: '/billing/invoices',
    },
    {
      id: 'active-rentals',
      label: t('dashboard.kpi.activeRentals'),
      value: fmt(kpis.activeRentals),
      icon: 'ClipboardList',
      color: 'var(--color-primary-600)',
      bg: 'var(--color-primary-50)',
      href: '/rental-contracts',
      alert: kpis.overdueRentals > 0 ? { text: t('dashboard.kpi.overdueCount', { count: kpis.overdueRentals }), variant: 'danger' } : undefined,
    },
    {
      id: 'fleet-util',
      label: t('dashboard.kpi.fleetUtilization'),
      value: `${kpis.fleetUtilization.toFixed(0)}%`,
      icon: 'Truck',
      color: 'var(--color-info-600)',
      bg: 'var(--color-info-50)',
      href: '/equipment',
      change: { value: t('dashboard.kpi.rentedOfFleet', { rented: kpis.rentedCount, total: kpis.totalFleet }), direction: 'neutral' },
    },
    {
      id: 'maintenance',
      label: t('dashboard.kpi.maintenanceDue'),
      value: fmt(kpis.upcomingPm),
      icon: 'Wrench',
      color: 'var(--color-warning-600)',
      bg: 'var(--color-warning-50)',
      href: '/maintenance',
      alert: kpis.criticalPm > 0 ? { text: t('dashboard.kpi.criticalCount', { count: kpis.criticalPm }), variant: 'danger' } : undefined,
    },
    {
      id: 'low-stock',
      label: t('dashboard.kpi.lowStock'),
      value: inventory ? fmt(inventory.low_stock_count) : '—',
      icon: 'AlertTriangle',
      color: inventory && inventory.low_stock_count > 0 ? 'var(--color-danger-600)' : 'var(--color-gray-500)',
      bg: inventory && inventory.low_stock_count > 0 ? 'var(--color-danger-50)' : 'var(--color-gray-50)',
      href: '/inventory',
    },
    {
      id: 'outstanding',
      label: t('dashboard.kpi.outstandingInvoices'),
      value: billing ? fmtAmt(billing.total_outstanding, billing.currency) : '—',
      icon: 'FileText',
      color: billing && billing.total_overdue > 0 ? 'var(--color-danger-600)' : 'var(--color-purple-600)',
      bg: billing && billing.total_overdue > 0 ? 'var(--color-danger-50)' : 'var(--color-purple-50)',
      href: '/billing/invoices',
      alert: billing && billing.total_overdue > 0 ? { text: t('dashboard.kpi.amountOverdue', { amount: fmtAmt(billing.total_overdue, billing.currency) }), variant: 'danger' } : undefined,
    },
  ]
}
