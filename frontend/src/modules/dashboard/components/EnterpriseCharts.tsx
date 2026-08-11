import { useTranslation } from 'react-i18next'
import { ChartCard } from '@/components/charts'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'

interface RevenueData { month: string; amount: number }
interface StatusData { name: string; value: number; color: string }

const COLORS = ['#22c55e', '#7c3aed', '#f59e0b', '#0891b2', '#3b82f6', '#ef4444', '#64748b']

export function RevenueAreaChart({
  data, loading,
}: {
  data: RevenueData[]
  loading: boolean
}) {
  const { t } = useTranslation()
  return (
    <ChartCard title={t('dashboard.chart.revenueTrend')} sub={t('dashboard.chart.revenueTrendSub')} loading={loading} isEmpty={data.length === 0} emptyMessage={t('dashboard.chart.noRevenueData')}>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={50} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} />
          <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
          <Area type="monotone" dataKey="amount" stroke="#22c55e" strokeWidth={2} fill="url(#revGrad)" dot={{ r: 3, fill: '#22c55e' }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function RentalTrendChart({
  data, loading,
}: {
  data: { month: string; count: number }[]
  loading: boolean
}) {
  const { t } = useTranslation()
  return (
    <ChartCard title={t('dashboard.chart.rentalTrend')} sub={t('dashboard.chart.rentalTrendSub')} loading={loading} isEmpty={data.length === 0} emptyMessage={t('dashboard.chart.noRentalData')}>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="rentalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={36} />
          <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
          <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#rentalGrad)" dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export function FleetUtilizationDonut({
  data, loading,
}: {
  data: StatusData[]
  loading: boolean
}) {
  const { t } = useTranslation()
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <ChartCard title={t('dashboard.chart.fleetUtilization')} sub={t('dashboard.chart.fleetUtilizationSub')} loading={loading} isEmpty={data.length === 0} emptyMessage={t('dashboard.chart.noFleetData')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', width: 160, height: 160, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={72} dataKey="value" stroke="none" animationDuration={600}>
                {data.map((d, i) => <Cell key={d.name} fill={d.color || COLORS[i % COLORS.length]} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)' }}>{total}</div>
            <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{t('dashboard.chart.total')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
          {data.map((d, i) => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color || COLORS[i % COLORS.length], flexShrink: 0 }} />
              <span style={{ flex: 1, color: 'var(--color-text-secondary)' }}>{d.name}</span>
              <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--color-text)' }}>{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  )
}

export function MaintenanceCostChart({
  data, loading,
}: {
  data: { month: string; cost: number }[]
  loading: boolean
}) {
  const { t } = useTranslation()
  return (
    <ChartCard title={t('dashboard.chart.maintenanceCost')} sub={t('dashboard.chart.maintenanceCostSub')} loading={loading} isEmpty={data.length === 0} emptyMessage={t('dashboard.chart.noMaintenanceCostData')}>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="maintGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={50} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} />
          <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
          <Area type="monotone" dataKey="cost" stroke="#f59e0b" strokeWidth={2} fill="url(#maintGrad)" dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
