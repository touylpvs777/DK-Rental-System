import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

export interface TrendLineChartProps {
  /** Array of { month: "YYYY-MM", count: number } — already formatted is fine too */
  data: Array<Record<string, number | string>>
  /** Key to use for the X axis (default "month") */
  xKey?: string
  /** Key to use for the Y axis value (default "count") */
  dataKey?: string
  /** Series label shown in tooltip */
  name: string
  /** Line + dot color */
  color?: string
  height?: number
}

const TICK = { fontSize: 11, fill: '#94a3b8' } as const
const TOOLTIP_CONTENT_STYLE = {
  fontSize: 12,
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
} as const

export default function TrendLineChart({
  data,
  xKey = 'month',
  dataKey = 'count',
  name,
  color = '#2563eb',
  height = 200,
}: TrendLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey={xKey} tick={TICK} />
        <YAxis tick={TICK} allowDecimals={false} />
        <Tooltip
          contentStyle={TOOLTIP_CONTENT_STYLE}
          labelStyle={{ fontWeight: 600, color: 'var(--color-chart-label)' }}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          name={name}
          stroke={color}
          strokeWidth={2.5}
          dot={{ r: 3, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
