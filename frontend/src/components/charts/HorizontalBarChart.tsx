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
import type { BarItem } from './DistributionBarChart'

export interface HorizontalBarChartProps {
  /** Horizontal bar chart data */
  data: BarItem[]
  colorMap?: Record<string, string>
  defaultColor?: string
  label: string
  /** Width reserved for Y-axis labels */
  labelWidth?: number
  height?: number
}

const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
} as const

export default function HorizontalBarChart({
  data,
  colorMap = {},
  defaultColor = '#94a3b8',
  label,
  labelWidth = 84,
  height = 200,
}: HorizontalBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={labelWidth}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: '#f8fafc' }}
          labelStyle={{ fontWeight: 600, color: 'var(--color-chart-label)' }}
        />
        <Bar dataKey="value" name={label} radius={[0, 4, 4, 0]}>
          {data.map(entry => (
            <Cell key={entry.key} fill={colorMap[entry.key] ?? defaultColor} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
