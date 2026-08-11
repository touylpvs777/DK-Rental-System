import { Wrench, Calendar, User } from 'lucide-react'
import { WOStatusBadge, WOTypeBadge, WOPriorityBadge } from './MaintenanceStatusBadge'
import type { WorkOrder } from '@/types/maintenance'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function WorkOrderCard({ wo, onClick }: { wo: WorkOrder; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)', padding: 16, cursor: 'pointer',
        transition: 'border-color var(--duration-fast), box-shadow var(--duration-fast)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary-300)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>{wo.work_order_number}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>{wo.title}</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <WOStatusBadge status={wo.status} />
          <WOPriorityBadge priority={wo.priority} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12.5, color: 'var(--color-text-muted)' }}>
        <Wrench size={12} />
        <span>{wo.forklift.serial_number} — {wo.forklift.name_en}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <WOTypeBadge type={wo.order_type} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={11} /> {fmtDate(wo.scheduled_date)}</span>
          {wo.technician && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><User size={11} /> {wo.technician.full_name ?? wo.technician.username}</span>}
        </div>
      </div>
    </div>
  )
}
