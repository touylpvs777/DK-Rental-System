import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  AlertCircle, RefreshCw, Download, TrendingUp, Users,
  Truck, DollarSign, Package, Wrench, BarChart2, PieChart,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePie, Pie, Cell, BarChart, Bar,
} from 'recharts'
import { getSummary, getLeadTrend, getCustomerTrend } from '@/api/dashboard'
import { getBillingSummary, getInvoices } from '@/api/billing'
import { getForklifts } from '@/api/forklift'
import { getRentalContracts } from '@/api/rental'
import { getDashboard as getInventoryDashboard } from '@/api/inventory'
import { downloadReport } from '@/api/reports'
import { toast } from '@/store/toastStore'
import type { DashboardSummary, TrendPoint } from '@/types/dashboard'
import type { BillingDashboardSummary, InvoiceOut } from '@/types/billing'
import type { Forklift } from '@/types/forklift'
import type { DashboardSummary as InventorySummary } from '@/types/inventory'
import '@/styles/shared.css'

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#7c3aed', '#0891b2', '#ef4444', '#64748b']
const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)' }
const TICK = { fontSize: 11, fill: 'var(--color-text-muted)' }
const MONTH_KEYS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function fmtK(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n) }
function fmtAmt(n: number) { return n.toLocaleString(undefined, { maximumFractionDigits: 0 }) }
function fmtPct(n: number) { return `${n.toFixed(1)}%` }
function fmtMonth(m: string, t: TFunction) {
  const [, mo] = m.split('-')
  const key = MONTH_KEYS[parseInt(mo, 10) - 1]
  return key ? t(`executive.chart.months.${key}`) : m
}

interface ExecData {
  summary: DashboardSummary | null
  billing: BillingDashboardSummary | null
  inventory: InventorySummary | null
  forklifts: Forklift[]
  invoices: InvoiceOut[]
  leadTrend: TrendPoint[]
  customerTrend: TrendPoint[]
}

export default function ExecutiveDashboardPage() {
  const { t } = useTranslation()
  const [data, setData] = useState<ExecData>({ summary: null, billing: null, inventory: null, forklifts: [], invoices: [], leadTrend: [], customerTrend: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true); setError(null)
    try {
      const [sumRes, billRes, invRes, flRes, , invDash, ltRes, ctRes] = await Promise.all([
        getSummary(),
        getBillingSummary().catch(() => ({ data: null })),
        getInvoices({ page_size: 100 }).catch(() => ({ data: { items: [] } })),
        getForklifts({ page_size: 200 }),
        getRentalContracts({ page_size: 200 }),
        getInventoryDashboard().catch(() => ({ data: null })),
        getLeadTrend(12),
        getCustomerTrend(12),
      ])
      setData({
        summary: sumRes.data,
        billing: billRes.data as BillingDashboardSummary | null,
        inventory: invDash.data as InventorySummary | null,
        forklifts: flRes.data.items,
        invoices: (invRes.data as { items: InvoiceOut[] }).items ?? [],
        leadTrend: ltRes.data,
        customerTrend: ctRes.data,
      })
    } catch { setError(t('executive.loadFailed')) }
    finally { setIsLoading(false) }
  }, [t])

  useEffect(() => { load() }, [load])

  const exportLabels: Record<'customers' | 'leads' | 'sales', string> = {
    customers: t('executive.export.customers'),
    leads: t('executive.export.leads'),
    sales: t('executive.export.sales'),
  }

  const handleExport = async (type: 'customers' | 'leads' | 'sales', format: 'csv' | 'excel') => {
    try {
      await downloadReport(type, { format }, data.summary)
      toast.success(t('executive.export.downloaded', { report: exportLabels[type] }))
    } catch (e) { toast.error((e as Error).message || t('executive.export.exportFailed')) }
  }

  if (error) return <div className="page-error"><AlertCircle size={16} /> {error}</div>

  const { summary, billing, inventory, forklifts, invoices, leadTrend, customerTrend } = data
  const totalFleet = forklifts.length
  const rented = forklifts.filter(f => f.status === 'rented').length
  const utilization = totalFleet > 0 ? (rented / totalFleet) * 100 : 0

  const statusLabelKeys: Record<string, string> = {
    in_stock: 'equipment.status.inStock',
    sold: 'equipment.status.sold',
    rented: 'equipment.status.rented',
    in_service: 'equipment.status.inService',
    reserved: 'equipment.status.reserved',
    decommissioned: 'equipment.status.decommissioned',
  }

  const fleetByStatus = (() => {
    const counts: Record<string, number> = {}
    forklifts.forEach(f => { counts[f.status] = (counts[f.status] || 0) + 1 })
    return Object.entries(counts).map(([name, value], i) => ({ name: statusLabelKeys[name] ? t(statusLabelKeys[name]) : name.replace('_', ' '), value, color: CHART_COLORS[i % CHART_COLORS.length] }))
  })()

  const revenueByMonth = (() => {
    const buckets: Record<string, { invoiced: number; paid: number }> = {}
    invoices.forEach(inv => {
      const m = (inv.issue_date || inv.created_at)?.substring(0, 7) ?? 'Unknown'
      if (!buckets[m]) buckets[m] = { invoiced: 0, paid: 0 }
      buckets[m].invoiced += inv.total_amount ?? 0
      buckets[m].paid += (inv.total_amount ?? 0) - (inv.balance_due ?? 0)
    })
    return Object.entries(buckets).sort(([a],[b]) => a.localeCompare(b)).slice(-6).map(([month, d]) => ({ month: fmtMonth(month, t), ...d }))
  })()

  return (
    <div>
      <div className="mp-hero">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="mp-hero-title">{t('executive.title')}</div>
            <div className="mp-hero-sub">{t('executive.subtitle')}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => handleExport('sales', 'excel')}>
              <Download size={14} /> {t('executive.export.exportExcel')}
            </button>
            <button className="btn btn-ghost" onClick={load} disabled={isLoading}>
              <RefreshCw size={14} className={isLoading ? 'spin' : ''} /> {t('executive.refresh')}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      {isLoading ? (
        <div className="mp-kpi-strip">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="mp-kpi-widget" style={{ minHeight: 96 }}>
              <div className="skeleton-line" style={{ width: '50%', height: 10 }} />
              <div className="skeleton-line" style={{ width: '40%', height: 22, marginTop: 10 }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mp-kpi-strip">
          <KpiCard icon={DollarSign} label={t('executive.kpi.totalRevenue')} value={billing ? `฿${fmtAmt(billing.total_invoiced)}` : '—'} sub={billing ? t('executive.kpi.invoicesCount', { count: fmtAmt(billing.invoice_count) }) : ''} color="var(--color-success-600)" />
          <KpiCard icon={TrendingUp} label={t('executive.kpi.collectionRate')} value={billing && billing.total_invoiced > 0 ? fmtPct((billing.total_paid / billing.total_invoiced) * 100) : '—'} sub={billing ? t('executive.kpi.collected', { amount: `฿${fmtAmt(billing.total_paid)}` }) : ''} color="var(--color-primary-600)" />
          <KpiCard icon={Truck} label={t('executive.kpi.fleetUtilization')} value={fmtPct(utilization)} sub={t('executive.kpi.rentedOfTotal', { rented, total: totalFleet })} color="var(--color-info-600)" />
          <KpiCard icon={Users} label={t('executive.kpi.customers')} value={summary ? fmtK(summary.total_customers) : '—'} sub={summary ? t('executive.kpi.activeCount', { count: summary.active_customers }) : ''} color="var(--color-purple-600)" />
          <KpiCard icon={Package} label={t('executive.kpi.inventoryValue')} value={inventory ? `฿${fmtAmt(inventory.total_stock_value)}` : '—'} sub={inventory ? t('executive.kpi.partsCount', { count: inventory.total_parts }) : ''} color="var(--color-warning-600)" />
          <KpiCard icon={Wrench} label={t('executive.kpi.conversionRate')} value={summary ? fmtPct(summary.conversion_rate) : '—'} sub={t('executive.kpi.winRate', { rate: summary ? fmtPct(summary.win_rate) : '—' })} color="var(--color-danger-600)" />
        </div>
      )}

      {/* Charts Row 1: Revenue + Fleet */}
      <div className="mp-chart-grid" style={{ marginTop: 20 }}>
        <div className="mp-chart-panel">
          <div className="mp-chart-panel-header"><BarChart2 size={14} /> {t('executive.chart.revenueTrend')}</div>
          {revenueByMonth.length === 0 ? (
            <div className="mp-empty" style={{ minHeight: 200 }}>{t('executive.chart.noRevenueData')}</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueByMonth} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="execRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={TICK} />
                <YAxis tick={TICK} tickFormatter={fmtK} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`฿${fmtAmt(Number(v))}`, '']} />
                <Area type="monotone" dataKey="invoiced" name={t('executive.chart.invoiced')} stroke="#3b82f6" strokeWidth={2} fill="url(#execRevGrad)" />
                <Area type="monotone" dataKey="paid" name={t('executive.chart.collected')} stroke="#22c55e" strokeWidth={2} fill="none" strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mp-chart-panel">
          <div className="mp-chart-panel-header"><PieChart size={14} /> {t('executive.chart.fleetStatus')}</div>
          {fleetByStatus.length === 0 ? (
            <div className="mp-empty" style={{ minHeight: 200 }}>{t('executive.chart.noFleetData')}</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <ResponsiveContainer width="60%" height={200}>
                <RePie>
                  <Pie data={fleetByStatus} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" stroke="none">
                    {fleetByStatus.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </RePie>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {fleetByStatus.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                    <span style={{ color: 'var(--color-text)', textTransform: 'capitalize' }}>{d.name}</span>
                    <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--color-text)' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2: Lead & Customer Trends */}
      <div className="mp-chart-grid" style={{ marginTop: 16 }}>
        <div className="mp-chart-panel">
          <div className="mp-chart-panel-header"><TrendingUp size={14} /> {t('executive.chart.leadPipeline')}</div>
          {leadTrend.length === 0 ? (
            <div className="mp-empty" style={{ minHeight: 180 }}>{t('executive.chart.noLeadData')}</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={leadTrend.map(d => ({ ...d, month: fmtMonth(d.month, t) }))} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={TICK} />
                <YAxis tick={TICK} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" name={t('executive.chart.newLeads')} fill="#7c3aed" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mp-chart-panel">
          <div className="mp-chart-panel-header"><Users size={14} /> {t('executive.chart.customerGrowth')}</div>
          {customerTrend.length === 0 ? (
            <div className="mp-empty" style={{ minHeight: 180 }}>{t('executive.chart.noCustomerData')}</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={customerTrend.map(d => ({ ...d, month: fmtMonth(d.month, t) }))} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="month" tick={TICK} />
                <YAxis tick={TICK} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" name={t('executive.chart.newCustomers')} fill="#0891b2" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Export Section */}
      <div className="mp-card" style={{ marginTop: 20, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 12 }}>{t('executive.export.exportReports')}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={() => handleExport('customers', 'excel')}><Download size={14} /> {t('executive.export.customersExcel')}</button>
          <button className="btn btn-ghost" onClick={() => handleExport('leads', 'excel')}><Download size={14} /> {t('executive.export.leadsExcel')}</button>
          <button className="btn btn-ghost" onClick={() => handleExport('sales', 'excel')}><Download size={14} /> {t('executive.export.salesExcel')}</button>
          <button className="btn btn-ghost" onClick={() => handleExport('customers', 'csv')}><Download size={14} /> {t('executive.export.customersCsv')}</button>
          <button className="btn btn-ghost" onClick={() => handleExport('leads', 'csv')}><Download size={14} /> {t('executive.export.leadsCsv')}</button>
          <button className="btn btn-ghost" onClick={() => handleExport('sales', 'csv')}><Download size={14} /> {t('executive.export.salesCsv')}</button>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, color }: { icon: React.ElementType; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="mp-kpi-widget" style={{ '--kpi-color': color, '--kpi-bg': `color-mix(in srgb, ${color} 10%, transparent)` } as React.CSSProperties}>
      <div className="mp-kpi-header">
        <span className="mp-kpi-label">{label}</span>
        <div className="mp-kpi-icon"><Icon size={16} /></div>
      </div>
      <div className="mp-kpi-value">{value}</div>
      {sub && <div className="mp-kpi-change neutral">{sub}</div>}
    </div>
  )
}
