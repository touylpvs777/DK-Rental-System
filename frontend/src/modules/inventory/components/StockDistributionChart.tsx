import { useTranslation } from 'react-i18next'
import { ChartCard } from '@/components/charts'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const CATEGORY_COLORS: Record<string, string> = {
  filter: '#3b82f6', belt: '#f59e0b', brake: '#ef4444', hydraulic: '#0891b2',
  electrical: '#8b5cf6', engine: '#22c55e', tire: '#64748b', chain: '#d97706',
  battery: '#06b6d4', lubricant: '#7c3aed', general: '#94a3b8',
}

interface StockItem { category: string; count: number }

export default function StockDistributionChart({ data, loading }: { data: StockItem[]; loading: boolean }) {
  const { t } = useTranslation()
  return (
    <ChartCard title={t('inventory.stockDistributionChart.title')} sub={t('inventory.stockDistributionChart.subtitle')} loading={loading} isEmpty={data.length === 0} emptyMessage={t('inventory.stockDistributionChart.empty')}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="category" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={36} />
          <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={600}>
            {data.map((d) => <Cell key={d.category} fill={CATEGORY_COLORS[d.category] || '#94a3b8'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}
