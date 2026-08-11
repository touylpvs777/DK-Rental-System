import { useState, useMemo, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Activity, ChevronLeft, ChevronRight,
  AlertCircle, Clock, User, Layers, FileText, RefreshCw, Globe,
} from 'lucide-react'
import { useActivity, type ActivityFilters } from '@/hooks/useActivity'
import Drawer from '@/components/ui/Drawer'
import PageHeader from '@/components/layout/PageHeader'
import type { ActionType, ActivityLog } from '@/types/activity'
import './ActivityPage.css'

// ── Action config ─────────────────────────────────────────
interface ActionMeta { label: string; color: string; bg: string }

const C = {
  created:  { color: 'var(--color-badge-green-text)',  bg: 'var(--color-badge-green-bg)' },
  updated:  { color: 'var(--color-badge-amber-text)',  bg: 'var(--color-badge-amber-bg)' },
  deleted:  { color: 'var(--color-badge-red-text)',    bg: 'var(--color-badge-red-bg)' },
  status:   { color: 'var(--color-badge-purple-text)', bg: 'var(--color-badge-purple-bg)' },
  info:     { color: 'var(--color-badge-cyan-text)',   bg: 'var(--color-badge-cyan-bg)' },
  primary:  { color: 'var(--color-badge-blue-text)',   bg: 'var(--color-badge-blue-bg)' },
  neutral:  { color: 'var(--color-badge-gray-text)',   bg: 'var(--color-badge-gray-bg)' },
}

const ACTION_META: Record<ActionType, ActionMeta> = {
  user_login:              { label: 'Login',            ...C.primary },
  user_logout:             { label: 'Logout',           ...C.neutral },
  user_created:            { label: 'User Created',     ...C.created },
  user_updated:            { label: 'User Updated',     ...C.updated },
  user_deleted:            { label: 'User Deleted',     ...C.deleted },
  customer_created:        { label: 'Customer Created', ...C.created },
  customer_updated:        { label: 'Customer Updated', ...C.updated },
  customer_deleted:        { label: 'Customer Deleted', ...C.deleted },
  customer_status_changed: { label: 'Status Changed',   ...C.status },
  lead_created:            { label: 'Lead Created',     ...C.created },
  lead_updated:            { label: 'Lead Updated',     ...C.updated },
  lead_deleted:            { label: 'Lead Deleted',     ...C.deleted },
  lead_status_changed:     { label: 'Status Changed',   ...C.status },
  lead_note_added:         { label: 'Note Added',       ...C.info },
  lead_note_deleted:       { label: 'Note Deleted',     ...C.deleted },
  catalog_product_created: { label: 'Product Created',  ...C.created },
  catalog_product_updated: { label: 'Product Updated',  ...C.updated },
  catalog_product_deleted: { label: 'Product Deleted',  ...C.deleted },
  catalog_brand_created:   { label: 'Brand Created',    ...C.created },
  catalog_brand_updated:   { label: 'Brand Updated',    ...C.updated },
  catalog_brand_deleted:   { label: 'Brand Deleted',    ...C.deleted },
  catalog_category_created:{ label: 'Category Created', ...C.created },
  catalog_category_updated:{ label: 'Category Updated', ...C.updated },
  catalog_category_deleted:{ label: 'Category Deleted', ...C.deleted },
  catalog_import_previewed:{ label: 'Import Previewed', ...C.info },
  catalog_import_executed: { label: 'Import Executed',  ...C.status },
  forklift_created:        { label: 'Forklift Added',   ...C.created },
  forklift_updated:        { label: 'Forklift Updated', ...C.updated },
  forklift_deleted:        { label: 'Forklift Deleted', ...C.deleted },
  forklift_status_changed: { label: 'Status Changed',   ...C.status },
  quotation_created:       { label: 'Quote Created',    ...C.created },
  quotation_updated:       { label: 'Quote Updated',    ...C.updated },
  quotation_deleted:       { label: 'Quote Deleted',    ...C.deleted },
  quotation_submitted:     { label: 'Quote Submitted',  ...C.primary },
  quotation_approved:      { label: 'Quote Approved',   ...C.created },
  quotation_revision_requested: { label: 'Revision Requested', ...C.updated },
  quotation_sent:          { label: 'Quote Sent',       ...C.info },
  quotation_accepted:      { label: 'Quote Accepted',   ...C.created },
  quotation_declined:      { label: 'Quote Declined',   ...C.deleted },
  quotation_converted:     { label: 'Quote Converted',  ...C.status },
  quotation_cancelled:     { label: 'Quote Cancelled',  ...C.neutral },
  quotation_reactivated:   { label: 'Quote Reactivated', ...C.info },
  rental_contract_created: { label: 'Contract Created', ...C.created },
  rental_contract_updated: { label: 'Contract Updated', ...C.updated },
  rental_contract_deleted: { label: 'Contract Deleted', ...C.deleted },
  rental_contract_submitted: { label: 'Contract Submitted', ...C.primary },
  rental_contract_approved:  { label: 'Contract Approved',  ...C.created },
  rental_contract_revision:  { label: 'Revision Requested', ...C.updated },
  rental_contract_activated: { label: 'Contract Activated', ...C.status },
  rental_contract_cancelled: { label: 'Contract Cancelled', ...C.neutral },
  rental_contract_closed:    { label: 'Contract Closed',    ...C.neutral },
  rental_return_requested:   { label: 'Return Requested',   ...C.info },
  rental_return_picked_up:   { label: 'Return Picked Up',   ...C.updated },
  rental_return_received:    { label: 'Return Received',    ...C.created },
  rental_return_completed:   { label: 'Return Completed',   ...C.created },
  rental_damage_assessed:    { label: 'Damage Assessed',    ...C.deleted },
  rental_damage_disputed:    { label: 'Damage Disputed',    ...C.updated },
  rental_damage_resolved:    { label: 'Damage Resolved',    ...C.created },
  rental_extension_requested:{ label: 'Extension Requested', ...C.info },
  rental_extension_approved: { label: 'Extension Approved', ...C.created },
  rental_extension_rejected: { label: 'Extension Rejected', ...C.deleted },
  rental_billing_created:    { label: 'Billing Created',    ...C.status },
  invoice_created:          { label: 'Invoice Created',    ...C.created },
  invoice_updated:          { label: 'Invoice Updated',    ...C.updated },
  invoice_issued:           { label: 'Invoice Issued',     ...C.primary },
  invoice_sent:              { label: 'Invoice Sent',       ...C.info },
  invoice_cancelled:         { label: 'Invoice Cancelled',  ...C.neutral },
  invoice_voided:            { label: 'Invoice Voided',     ...C.deleted },
  payment_recorded:          { label: 'Payment Recorded',   ...C.created },
  payment_confirmed:         { label: 'Payment Confirmed',  ...C.created },
  payment_rejected:          { label: 'Payment Rejected',   ...C.deleted },
  payment_allocated:         { label: 'Payment Allocated',  ...C.status },
  deposit_created:           { label: 'Deposit Created',    ...C.created },
  deposit_received:          { label: 'Deposit Received',   ...C.created },
  deposit_refunded:          { label: 'Deposit Refunded',   ...C.neutral },
  deposit_forfeited:         { label: 'Deposit Forfeited',  ...C.deleted },
  deposit_applied:           { label: 'Deposit Applied',    ...C.status },
  revenue_recognized:        { label: 'Revenue Recognized', ...C.created },
  revenue_reversed:          { label: 'Revenue Reversed',   ...C.deleted },
  project_created:           { label: 'Project Created',    ...C.created },
  project_updated:           { label: 'Project Updated',    ...C.updated },
  project_deleted:           { label: 'Project Deleted',    ...C.deleted },
  project_milestone_status_changed: { label: 'Milestone Status Changed', ...C.status },
  setting_updated:           { label: 'Setting Updated',    ...C.updated },
  inventory_import_executed: { label: 'Inventory Imported', ...C.status },
  notification_preference_created: { label: 'Alert Subscribed',   ...C.created },
  notification_preference_updated: { label: 'Alert Preference Updated', ...C.updated },
  notification_preference_deleted: { label: 'Alert Unsubscribed', ...C.deleted },
}

const ENTITY_LABELS: Record<string, string> = {
  user: 'User', customer: 'Customer', lead: 'Lead', note: 'Note',
  invoice: 'Invoice', payment: 'Payment', deposit: 'Deposit',
  revenue_recognition: 'Revenue Recognition',
  project: 'Project', project_milestone: 'Project Milestone',
  setting: 'Setting', inventory_import: 'Inventory Import',
  notification_preference: 'Notification Preference',
}

const ACTION_GROUPS: Record<string, string> = {
  user_login: 'User', user_created: 'User', user_updated: 'User', user_deleted: 'User',
  customer_created: 'Customer', customer_updated: 'Customer',
  customer_deleted: 'Customer', customer_status_changed: 'Customer',
  lead_created: 'Lead', lead_updated: 'Lead', lead_deleted: 'Lead',
  lead_status_changed: 'Lead', lead_note_added: 'Lead', lead_note_deleted: 'Lead',
  invoice_created: 'Billing', invoice_updated: 'Billing', invoice_issued: 'Billing',
  invoice_sent: 'Billing', invoice_cancelled: 'Billing', invoice_voided: 'Billing',
  payment_recorded: 'Billing', payment_confirmed: 'Billing',
  payment_rejected: 'Billing', payment_allocated: 'Billing',
  deposit_created: 'Billing', deposit_received: 'Billing',
  deposit_refunded: 'Billing', deposit_forfeited: 'Billing', deposit_applied: 'Billing',
  revenue_recognized: 'Billing', revenue_reversed: 'Billing',
  project_created: 'Project', project_updated: 'Project', project_deleted: 'Project',
  project_milestone_status_changed: 'Project',
  setting_updated: 'Settings',
  inventory_import_executed: 'Inventory',
  notification_preference_created: 'Notifications',
  notification_preference_updated: 'Notifications',
  notification_preference_deleted: 'Notifications',
}

const PAGE_SIZE = 50

// ── Helpers ───────────────────────────────────────────────
type TFn = (key: string, opts?: Record<string, unknown>) => string

function actionLabel(t: TFn, action: string): string {
  const meta = ACTION_META[action as ActionType]
  if (!meta) return action
  return t(`activity.action.${action}`, { defaultValue: meta.label })
}

function groupLabel(t: TFn, action: string): string {
  const group = ACTION_GROUPS[action]
  if (!group) return '—'
  return t(`activity.group.${group.toLowerCase()}`, { defaultValue: group })
}

function ActionBadge({ action, size = 'sm' }: { action: string; size?: 'sm' | 'lg' }) {
  const { t } = useTranslation()
  const meta = ACTION_META[action as ActionType]
  if (!meta) return <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{action}</span>
  const style: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: size === 'lg' ? '5px 12px' : '2px 9px',
    borderRadius: 20, fontSize: size === 'lg' ? 13 : 11.5,
    fontWeight: 600, letterSpacing: 0.2,
    background: meta.bg, color: meta.color,
    border: `1px solid ${meta.color}28`,
  }
  return (
    <span style={style}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
      {actionLabel(t, action)}
    </span>
  )
}

function userInitials(user: ActivityLog['user']) {
  if (!user) return '?'
  return (user.full_name ?? user.username)
    .split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

function fmtTimestamp(iso: string) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  }
}

function fmtTimestampFull(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

// ── JSON syntax highlighting ──────────────────────────────
function JsonHighlight({ data }: { data: Record<string, unknown> }) {
  const raw = JSON.stringify(data, null, 2)
  const html = raw
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
    .replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
    .replace(/: (true|false)/g, ': <span class="json-bool">$1</span>')
    .replace(/: (null)/g, ': <span class="json-null">$1</span>')

  return (
    <div className="json-block">
      <pre dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}

// ── Details drawer content ────────────────────────────────
function ActivityDetails({ log }: { log: ActivityLog }) {
  const { t } = useTranslation()
  const { details } = log
  const hasDetails = details && Object.keys(details).length > 0
  const isStatusChange = hasDetails && 'from' in details && 'to' in details
  const hasChangedFields =
    hasDetails && 'changed_fields' in details && Array.isArray(details.changed_fields)
  const ts = fmtTimestampFull(log.created_at)

  return (
    <div>
      {/* Action badge */}
      <div style={{ marginBottom: 20 }}>
        <ActionBadge action={log.action} size="lg" />
        <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 6 }}>
          {t('activity.details.group', { group: groupLabel(t, log.action) })}
        </div>
      </div>

      {/* Info rows */}
      <div className="drawer-section">
        <div className="drawer-section-label">{t('activity.details.eventInfo')}</div>
        <div className="drawer-info-grid">
          <div className="drawer-info-row">
            <div className="drawer-info-icon"><Clock size={14} /></div>
            <div className="drawer-info-content">
              <div className="drawer-info-key">{t('activity.table.timestamp')}</div>
              <div className="drawer-info-value">{ts}</div>
            </div>
          </div>

          <div className="drawer-info-row">
            <div className="drawer-info-icon"><User size={14} /></div>
            <div className="drawer-info-content">
              <div className="drawer-info-key">{t('activity.table.user')}</div>
              <div className="drawer-info-value">
                {log.user
                  ? `${log.user.username}${log.user.full_name ? ` (${log.user.full_name})` : ''}`
                  : t('activity.details.systemOrDeletedUser')}
              </div>
            </div>
          </div>

          {log.entity_type && (
            <div className="drawer-info-row">
              <div className="drawer-info-icon"><Layers size={14} /></div>
              <div className="drawer-info-content">
                <div className="drawer-info-key">{t('activity.table.entity')}</div>
                <div className="drawer-info-value">
                  {t(`activity.entity.${log.entity_type}`, { defaultValue: ENTITY_LABELS[log.entity_type] ?? log.entity_type })}
                  {log.entity_id ? ` #${log.entity_id}` : ''}
                </div>
              </div>
            </div>
          )}

          <div className="drawer-info-row">
            <div className="drawer-info-icon"><Globe size={14} /></div>
            <div className="drawer-info-content">
              <div className="drawer-info-key">{t('activity.table.ipAddress')}</div>
              <div className="drawer-info-value">{log.ip_address ?? t('activity.details.ipNotTracked')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="drawer-section">
        <div className="drawer-section-label">{t('activity.details.title')}</div>

        {!hasDetails ? (
          <div className="no-details">{t('activity.details.noneRecorded')}</div>
        ) : isStatusChange ? (
          <div>
            <div className="status-diff">
              <ActionBadge action={`${log.entity_type}_status`} size="sm" />
              <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                {String(details.from)}
              </span>
              <span className="status-diff-arrow">→</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                {String(details.to)}
              </span>
            </div>
            <div style={{ marginTop: 12 }}>
              <JsonHighlight data={details} />
            </div>
          </div>
        ) : hasChangedFields ? (
          <div>
            <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginBottom: 8 }}>
              {t('activity.details.fieldsModified')}
            </div>
            <div className="changed-fields">
              {(details.changed_fields as string[]).map((f) => (
                <span key={f} className="changed-field-chip">{f}</span>
              ))}
            </div>
            <div style={{ marginTop: 12 }}>
              <JsonHighlight data={details} />
            </div>
          </div>
        ) : (
          <JsonHighlight data={details} />
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────
const ALL_ACTIONS = Object.keys(ACTION_META) as ActionType[]
const ENTITY_TYPES = [
  'user', 'customer', 'lead', 'note',
  'invoice', 'payment', 'deposit', 'revenue_recognition',
  'project', 'project_milestone', 'setting', 'inventory_import', 'notification_preference',
]

export default function ActivityPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<ActivityFilters>({})
  const [search, setSearch]   = useState('')
  const [page, setPage]       = useState(1)
  const [selected, setSelected] = useState<ActivityLog | null>(null)

  const { logs, isLoading, isFetching, error, refetch } = useActivity(filters)

  const patchFilter = (patch: Partial<ActivityFilters>) => {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({})
    setSearch('')
    setPage(1)
  }

  const hasActiveFilters =
    !!filters.action || !!filters.entity_type ||
    !!filters.from_date || !!filters.to_date || !!search

  // Client-side search on returned results
  const filtered = useMemo(() => {
    if (!search.trim()) return logs
    const q = search.toLowerCase()
    return logs.filter(
      (l) =>
        (l.user?.username ?? '').toLowerCase().includes(q) ||
        (l.user?.full_name ?? '').toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        actionLabel(t, l.action).toLowerCase().includes(q)
    )
  }, [logs, search, t])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const rows       = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const startRow   = filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0
  const endRow     = Math.min(safePage * PAGE_SIZE, filtered.length)

  const pageNumbers = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (safePage <= 4)   return [1, 2, 3, 4, 5, '…', totalPages]
    if (safePage >= totalPages - 3) return [1, '…', ...Array.from({ length: 5 }, (_, i) => totalPages - 4 + i)]
    return [1, '…', safePage - 1, safePage, safePage + 1, '…', totalPages]
  })()

  return (
    <div>
      {/* Header */}
      <PageHeader title={t('activity.title')} subtitle={t('activity.eventsLoaded', { count: filtered.length })}>
        <button className="btn btn-ghost" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw size={14} className={isFetching ? 'spin' : ''} /> {t('activity.refresh')}
        </button>
      </PageHeader>

      {error && (
        <div className="page-error"><AlertCircle size={16} /> {error}</div>
      )}

      {/* Filter bar */}
      <div className="filter-bar">
        {/* Search */}
        <div className="search-wrap" style={{ maxWidth: 220 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            className="search-input"
            placeholder={t('activity.filters.searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>

        <div className="filter-divider" />

        {/* Action */}
        <div className="filter-group">
          <label>{t('activity.filters.action')}</label>
          <select
            className="filter-select"
            value={filters.action ?? ''}
            onChange={(e) => patchFilter({ action: e.target.value || undefined })}
          >
            <option value="">{t('activity.filters.allActions')}</option>
            {ALL_ACTIONS.map((a) => (
              <option key={a} value={a}>{actionLabel(t, a)} ({groupLabel(t, a)})</option>
            ))}
          </select>
        </div>

        {/* Entity type */}
        <div className="filter-group">
          <label>{t('activity.filters.entityType')}</label>
          <select
            className="filter-select"
            value={filters.entity_type ?? ''}
            onChange={(e) => patchFilter({ entity_type: e.target.value || undefined })}
          >
            <option value="">{t('activity.filters.allEntities')}</option>
            {ENTITY_TYPES.map((et) => (
              <option key={et} value={et}>{t(`activity.entity.${et}`, { defaultValue: ENTITY_LABELS[et] ?? et })}</option>
            ))}
          </select>
        </div>

        <div className="filter-divider" />

        {/* Date range */}
        <div className="filter-group">
          <label>{t('activity.filters.dateFrom')}</label>
          <input
            type="date"
            className="date-input"
            value={filters.from_date ?? ''}
            onChange={(e) => patchFilter({ from_date: e.target.value || undefined })}
          />
        </div>
        <div className="filter-group">
          <label>{t('activity.filters.dateTo')}</label>
          <input
            type="date"
            className="date-input"
            value={filters.to_date ?? ''}
            onChange={(e) => patchFilter({ to_date: e.target.value || undefined })}
          />
        </div>

        {hasActiveFilters && (
          <button className="clear-btn" onClick={clearFilters}>
            {t('common.clearFilters')}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: 140 }}>{t('activity.table.timestamp')}</th>
                <th style={{ minWidth: 130 }}>{t('activity.table.user')}</th>
                <th style={{ minWidth: 160 }}>{t('activity.table.action')}</th>
                <th className="col-hide-sm">{t('activity.table.entity')}</th>
                <th className="col-hide-sm" style={{ width: 80 }}>{t('activity.table.id')}</th>
                <th className="col-hide-sm" style={{ minWidth: 110 }}>{t('activity.table.ipAddress')}</th>
                <th style={{ width: 80 }}>{t('activity.table.details')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="skeleton-row">
                      <td><div className="skeleton-cell" style={{ width: '85%' }} /></td>
                      <td><div className="skeleton-cell" style={{ width: '70%' }} /></td>
                      <td><div className="skeleton-cell" style={{ width: '90px' }} /></td>
                      <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: '60px' }} /></td>
                      <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: '30px' }} /></td>
                      <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: '80px' }} /></td>
                      <td><div className="skeleton-cell" style={{ width: '40px' }} /></td>
                    </tr>
                  ))}
                </>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="table-empty">
                      <Activity size={36} />
                      <p>{t('activity.table.noActivityFound')}</p>
                      <small>{hasActiveFilters ? t('common.tryAdjustingFilters') : t('activity.table.noActivityYet')}</small>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((log) => {
                  const { date, time } = fmtTimestamp(log.created_at)
                  const hasDetails = log.details && Object.keys(log.details).length > 0
                  return (
                    <tr key={log.id}>
                      <td>
                        <div className="ts-date">{date}</div>
                        <div className="ts-time">{time}</div>
                      </td>
                      <td>
                        {log.user ? (
                          <div className="user-cell">
                            <div className="user-avatar-sm">{userInitials(log.user)}</div>
                            <span className="user-name-sm">{log.user.username}</span>
                          </div>
                        ) : (
                          <span className="cell-muted">—</span>
                        )}
                      </td>
                      <td><ActionBadge action={log.action} /></td>
                      <td className="col-hide-sm">
                        {log.entity_type ? (
                          <div className="entity-cell">
                            <span className="entity-type">
                              {t(`activity.entity.${log.entity_type}`, { defaultValue: ENTITY_LABELS[log.entity_type] ?? log.entity_type })}
                            </span>
                          </div>
                        ) : (
                          <span className="cell-muted">—</span>
                        )}
                      </td>
                      <td className="col-hide-sm cell-muted">
                        {log.entity_id ? `#${log.entity_id}` : '—'}
                      </td>
                      <td className="col-hide-sm cell-muted" style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>
                        {log.ip_address ?? '—'}
                      </td>
                      <td>
                        {hasDetails ? (
                          <button className="view-btn" onClick={() => setSelected(log)}>
                            <FileText size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                            {t('common.view')}
                          </button>
                        ) : (
                          <span className="cell-muted" style={{ fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && filtered.length > PAGE_SIZE && (
          <div className="pagination">
            <span className="pagination-info">
              {t('activity.pagination.showing', { start: startRow, end: endRow, total: filtered.length })}
            </span>
            <div className="pagination-controls">
              <button className="page-btn" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>
                <ChevronLeft size={14} />
              </button>
              {pageNumbers.map((p, i) =>
                p === '…' ? (
                  <span key={`e${i}`} className="page-btn" style={{ cursor: 'default', border: 'none' }}>…</span>
                ) : (
                  <button key={p} className={`page-btn${safePage === p ? ' active' : ''}`} onClick={() => setPage(p as number)}>
                    {p}
                  </button>
                )
              )}
              <button className="page-btn" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Drawer */}
      <Drawer
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={t('activity.details.drawerTitle')}
        width={440}
      >
        {selected && <ActivityDetails log={selected} />}
      </Drawer>
    </div>
  )
}
