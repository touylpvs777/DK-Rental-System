import type { AxiosError } from 'axios'
import type { TrendPoint } from '@/types/dashboard'

/**
 * Calls apiFn; on 404 / 501 / 503 silently returns mockData.
 * Re-throws on auth errors (401/403) and real server errors (5xx except 503).
 */
export async function withMockFallback<T>(
  apiFn: () => Promise<{ data: T }>,
  mockData: T,
): Promise<{ data: T }> {
  try {
    return await apiFn()
  } catch (err) {
    const status = (err as AxiosError).response?.status
    if (!status || status === 404 || status === 501 || status === 503) {
      return { data: mockData }
    }
    throw err
  }
}

/**
 * Generate a deterministic bell-curve trend across `months` months.
 * Uses a sine wave so the shape is always plausible without randomness.
 */
export function generateMockTrend(total: number, months = 12): TrendPoint[] {
  const now = new Date()
  const base = Math.max(total, months) / months
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const factor = 0.5 + 0.9 * Math.sin(((i + 0.5) / months) * Math.PI)
    return { month, count: Math.max(0, Math.round(base * factor)) }
  })
}

/**
 * Convert a Record<key, count> into the [{name, value, key}] format
 * expected by the bar chart components.
 */
export function recordToBarData(
  record: Record<string, number>,
  labelMap: Record<string, string> = {},
  order?: string[],
): Array<{ name: string; value: number; key: string }> {
  const keys = order ? order.filter(k => k in record) : Object.keys(record)
  return keys.map(key => ({
    key,
    value: record[key],
    name: labelMap[key] ?? (key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')),
  }))
}

/** Build a client-side CSV blob from row arrays */
export function buildCSV(headers: string[], rows: (string | number)[][]): Blob {
  const escape = (v: string | number) => {
    const s = String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const lines = [headers, ...rows].map(r => r.map(escape).join(','))
  return new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
}
