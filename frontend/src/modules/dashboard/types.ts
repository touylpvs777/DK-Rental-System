export interface KpiCardData {
  id: string
  label: string
  value: string | number
  icon: string
  color: string
  bg: string
  change?: { value: string; direction: 'up' | 'down' | 'neutral' }
  href?: string
  alert?: { text: string; variant: 'warning' | 'danger' }
}

export interface QuickAction {
  id: string
  label: string
  description: string
  icon: string
  color: string
  href: string
}

export interface ActivityItem {
  id: number
  action: string
  entity_type: string
  entity_id: number | null
  details: Record<string, unknown> | null
  user: { id: number; username: string; full_name: string | null } | null
  created_at: string
}

export interface ChartDataPoint {
  label: string
  value: number
  color?: string
}
