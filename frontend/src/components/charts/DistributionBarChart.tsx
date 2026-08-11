import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'

export interface BarItem {
  key: string
  name: string
  value: number
}

export interface DistributionBarChartProps {
  /** Vertical bar chart data */
  data: BarItem[]
  /** Maps item.key → hex color */
  colorMap?: Record<string, string>
  defaultColor?: string
  /** Tooltip series label */
  label: string
  height?: number
}

const TICK = { fontSize: 11, fill: '#94a3b8' } as const
const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
} as const

export default function DistributionBarChart({
  data,
  colorMap = {},
  defaultColor = '#94a3b8',
  label,
  height = 200,
}: DistributionBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="name" tick={TICK} />
        <YAxis tick={TICK} allowDecimals={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: '#f8fafc' }}
          labelStyle={{ fontWeight: 600, color: 'var(--color-chart-label)' }}
        />
        <Bar dataKey="value" name={label} radius={[4, 4, 0, 0]}>
          {data.map(entry => (
            <Cell key={entry.key} fill={colorMap[entry.key] ?? defaultColor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
