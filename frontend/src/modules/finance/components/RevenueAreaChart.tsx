import { useTranslation } from 'react-i18next'
import { ChartCard } from '@/components/charts'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { InvoiceOut } from '@/types/billing'

interface Props {
  invoices: InvoiceOut[]
  loading: boolean
  currency: string
}

export default function RevenueAreaChart({ invoices, loading, currency }: Props) {
  const { t } = useTranslation()
  const monthlyData: Record<string, { invoiced: number; paid: number }> = {}

  invoices.forEach((inv) => {
    const d = inv.issue_date || inv.created_at
    const month = d ? d.substring(0, 7) : 'Unknown'
    if (!monthlyData[month]) monthlyData[month] = { invoiced: 0, paid: 0 }
    monthlyData[month].invoiced += inv.total_amount
    monthlyData[month].paid += inv.amount_paid
  })

  const data = Object.keys(monthlyData).sort().slice(-6).map((m) => ({
    month: new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' }),
    invoiced: Math.round(monthlyData[m].invoiced),
    paid: Math.round(monthlyData[m].paid),
  }))

  return (
    <ChartCard title={t('finance.revenueChart.title')} sub={t('finance.revenueChart.subtitle', { currency })} loading={loading} isEmpty={data.length === 0} emptyMessage={t('finance.revenueChart.empty')}>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="finRevInv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="finRevPaid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={50} tickFormatter={(v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`} />
          <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
          <Area type="monotone" dataKey="invoiced" name={t('billing.revenueChart.invoiced')} stroke="#3b82f6" strokeWidth={2} fill="url(#finRevInv)" dot={{ r: 3, fill: '#3b82f6' }} />
          <Area type="monotone" dataKey="paid" name={t('billing.revenueChart.paid')} stroke="#22c55e" strokeWidth={2} fill="url(#finRevPaid)" dot={{ r: 3, fill: '#22c55e' }} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
