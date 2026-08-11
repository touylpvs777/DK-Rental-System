import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  TrendingUp, Search, Pencil, Trash2,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { useLeads } from '@/hooks/useLeads'
import { LeadStatusBadge } from '@/components/ui/Badge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import LeadForm from './LeadForm'
import type { Lead, LeadCreate, LeadStatus, LeadSource } from '@/types/lead'
import PageHeader from '@/components/layout/PageHeader'
import './LeadsPage.css'

const PAGE_SIZE = 20

type SortField = 'title' | 'value' | 'created_at'
type SortDir   = 'asc' | 'desc'

// Maps LeadSource values to the camelCase key suffix used under leads.source.*
const SOURCE_KEY: Record<LeadSource, string> = {
  website: 'website', referral: 'referral', cold_call: 'coldCall',
  email: 'email', social_media: 'socialMedia', other: 'other',
}

const ALL_STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: '#7c3aed', contacted: '#0891b2', qualified: '#d97706',
  proposal: '#2563eb', won: '#16a34a', lost: '#dc2626',
}

function fmtValue(v: number | null) {
  if (v == null) return null
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v)
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface SortIconProps { field: SortField; active: SortField; dir: SortDir }
function SortIndicator({ field, active, dir }: SortIconProps) {
  const on = field === active
  return (
    <span className={`sort-icon${on ? ' active' : ''}`}>
      <ChevronUp   size={10} style={{ opacity: on && dir === 'asc'  ? 1 : 0.35 }} />
      <ChevronDown size={10} style={{ opacity: on && dir === 'desc' ? 1 : 0.35 }} />
    </span>
  )
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="skeleton-row">
          <td><div className="skeleton-cell" style={{ width: '65%' }} /></td>
          <td><div className="skeleton-cell" style={{ width: '70px' }} /></td>
          <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: '60px' }} /></td>
          <td><div className="skeleton-cell" style={{ width: '55px' }} /></td>
          <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: '80px' }} /></td>
          <td><div className="skeleton-cell" style={{ width: '50px' }} /></td>
        </tr>
      ))}
    </>
  )
}

export default function LeadsPage() {
  const { t } = useTranslation()
  const { leads, isLoading, error, create, update, remove } = useLeads()

  const [search, setSearch]               = useState('')
  const [statusFilter, setStatusFilter]   = useState<LeadStatus | 'all'>('all')
  const [sourceFilter, setSourceFilter]   = useState<LeadSource | 'all'>('all')
  const [sortField, setSortField]         = useState<SortField>('created_at')
  const [sortDir, setSortDir]             = useState<SortDir>('desc')
  const [page, setPage]                   = useState(1)
  const [formOpen, setFormOpen]           = useState(false)
  const [editTarget, setEditTarget]       = useState<Lead | null>(null)
  const [deleteTarget, setDeleteTarget]   = useState<Lead | null>(null)
  const [isDeleting, setDeleting]         = useState(false)

  // Status counts for pipeline bar
  const statusCounts = useMemo(() =>
    ALL_STATUSES.reduce<Record<string, number>>((acc, s) => {
      acc[s] = leads.filter((l) => l.status === s).length
      return acc
    }, {}),
  [leads])

  // Filtered + sorted list
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let list = leads.filter((l) => {
      const matchSearch =
        !q || l.title.toLowerCase().includes(q) ||
        (l.description ?? '').toLowerCase().includes(q)
      const matchStatus = statusFilter === 'all' || l.status === statusFilter
      const matchSource = sourceFilter === 'all' || l.source === sourceFilter
      return matchSearch && matchStatus && matchSource
    })
    list = [...list].sort((a, b) => {
      if (sortField === 'title') {
        return sortDir === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title)
      }
      if (sortField === 'value') {
        const av = a.value ?? -1, bv = b.value ?? -1
        return sortDir === 'asc' ? av - bv : bv - av
      }
      const at = new Date(a.created_at).getTime()
      const bt = new Date(b.created_at).getTime()
      return sortDir === 'asc' ? at - bt : bt - at
    })
    return list
  }, [leads, search, statusFilter, sourceFilter, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const rows       = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const startRow   = filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0
  const endRow     = Math.min(safePage * PAGE_SIZE, filtered.length)

  const toggleSort = (f: SortField) => {
    if (sortField === f) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(f); setSortDir('asc') }
    setPage(1)
  }

  const openCreate = () => { setEditTarget(null); setFormOpen(true) }
  const openEdit   = (l: Lead) => { setEditTarget(l); setFormOpen(true) }

  const handleFormSubmit = async (data: LeadCreate) => {
    if (editTarget) return update(editTarget.id, data)
    return create(data)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    await remove(deleteTarget.id)
    setDeleting(false)
    setDeleteTarget(null)
  }

  const pageNumbers = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (safePage <= 4)   return [1, 2, 3, 4, 5, '…', totalPages]
    if (safePage >= totalPages - 3) return [1, '…', ...Array.from({ length: 5 }, (_, i) => totalPages - 4 + i)]
    return [1, '…', safePage - 1, safePage, safePage + 1, '…', totalPages]
  })()

  return (
    <div>
      {/* Header */}
      <PageHeader title={t('leads.list.title')} subtitle={t('leads.list.totalCount', { count: leads.length })}>
        <button className="btn btn-primary" onClick={openCreate}>
          <TrendingUp size={15} /> {t('leads.list.newLead')}
        </button>
      </PageHeader>

      {error && (
        <div className="page-error"><AlertCircle size={16} /> {error}</div>
      )}

      {/* Pipeline status bar */}
      <div className="pipeline-bar">
        <button
          className={`pipeline-chip${statusFilter === 'all' ? ' active-chip' : ''}`}
          onClick={() => { setStatusFilter('all'); setPage(1) }}
        >
          {t('common.all')}
          <span className="pipeline-chip-count">{leads.length}</span>
        </button>
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            className={`pipeline-chip${statusFilter === s ? ' active-chip' : ''}`}
            onClick={() => { setStatusFilter(s); setPage(1) }}
            style={statusFilter === s ? { '--color-primary': STATUS_COLORS[s], '--color-primary-light': `${STATUS_COLORS[s]}18` } as React.CSSProperties : {}}
          >
            {t(`leads.status.${s}`)}
            <span className="pipeline-chip-count">{statusCounts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <Search size={14} />
          <input
            className="search-input"
            placeholder={t('leads.list.searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="filter-select"
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value as LeadSource | 'all'); setPage(1) }}
        >
          <option value="all">{t('leads.list.allSources')}</option>
          {Object.entries(SOURCE_KEY).map(([v, key]) => (
            <option key={v} value={v}>{t(`leads.source.${key}`)}</option>
          ))}
        </select>
        <span className="toolbar-count">{t('leads.list.resultsCount', { count: filtered.length })}</span>
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => toggleSort('title')}>
                  {t('leads.list.colLead')} <SortIndicator field="title" active={sortField} dir={sortDir} />
                </th>
                <th>{t('common.status')}</th>
                <th className="col-hide-sm">{t('leads.list.colSource')}</th>
                <th className="sortable" onClick={() => toggleSort('value')}>
                  {t('leads.list.colValue')} <SortIndicator field="value" active={sortField} dir={sortDir} />
                </th>
                <th className="sortable col-hide-sm" onClick={() => toggleSort('created_at')}>
                  {t('common.createdAt')} <SortIndicator field="created_at" active={sortField} dir={sortDir} />
                </th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className="table-empty">
                      <TrendingUp size={36} />
                      <p>{t('leads.list.noLeadsFound')}</p>
                      <small>
                        {search || statusFilter !== 'all' || sourceFilter !== 'all'
                          ? t('common.tryAdjustingFilters')
                          : t('leads.list.createFirstLead')}
                      </small>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div className="lead-title-cell">
                        <span className="lead-title">{l.title}</span>
                        {l.description && (
                          <span className="lead-desc">{l.description}</span>
                        )}
                      </div>
                    </td>
                    <td><LeadStatusBadge status={l.status} /></td>
                    <td className="cell-muted col-hide-sm">
                      {l.source ? t(`leads.source.${SOURCE_KEY[l.source]}`) : '—'}
                    </td>
                    <td>
                      {fmtValue(l.value)
                        ? <span className="lead-value">{fmtValue(l.value)}</span>
                        : <span className="lead-value empty">—</span>
                      }
                    </td>
                    <td className="cell-muted col-hide-sm">{fmtDate(l.created_at)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="action-btn" title={t('common.edit')} onClick={() => openEdit(l)}>
                          <Pencil size={14} />
                        </button>
                        <button className="action-btn danger" title={t('common.delete')} onClick={() => setDeleteTarget(l)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && filtered.length > PAGE_SIZE && (
          <div className="pagination">
            <span className="pagination-info">
              {t('leads.list.showingRange', { start: startRow, end: endRow, total: filtered.length })}
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

      {/* Create / Edit modal */}
      <LeadForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        lead={editTarget}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title={t('leads.list.deleteTitle')}
        message={
          deleteTarget
            ? t('leads.list.deleteMessage', { title: deleteTarget.title })
            : ''
        }
      />
    </div>
  )
}
