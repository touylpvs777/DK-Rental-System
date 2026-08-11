import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  UserPlus, Search, Pencil, Trash2, Users,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { useCustomers } from '@/hooks/useCustomers'
import { CustomerStatusBadge } from '@/components/ui/Badge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import CustomerForm from './CustomerForm'
import type { Customer, CustomerCreate, CustomerStatus } from '@/types/customer'
import PageHeader from '@/components/layout/PageHeader'
import './CustomersPage.css'

const PAGE_SIZE = 20

type SortField = 'name' | 'created_at'
type SortDir   = 'asc' | 'desc'

function initials(c: Customer) {
  return `${c.first_name[0] ?? ''}${c.last_name[0] ?? ''}`.toUpperCase()
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface SortIconProps { field: SortField; active: SortField; dir: SortDir }
function SortIndicator({ field, active, dir }: SortIconProps) {
  const on = field === active
  return (
    <span className={`sort-icon${on ? ' active' : ''}`}>
      <ChevronUp  size={10} style={{ opacity: on && dir === 'asc'  ? 1 : 0.35 }} />
      <ChevronDown size={10} style={{ opacity: on && dir === 'desc' ? 1 : 0.35 }} />
    </span>
  )
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="skeleton-row">
          <td><div className="skeleton-cell" style={{ width: '60%' }} /></td>
          <td><div className="skeleton-cell" style={{ width: '75%' }} /></td>
          <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: '55%' }} /></td>
          <td><div className="skeleton-cell" style={{ width: '50px' }} /></td>
          <td><div className="skeleton-cell" style={{ width: '60px' }} /></td>
          <td><div className="skeleton-cell" style={{ width: '40px' }} /></td>
        </tr>
      ))}
    </>
  )
}

export default function CustomersPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { customers, isLoading, error, create, update, remove } = useCustomers()

  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'all'>('all')
  const [sortField, setSortField]       = useState<SortField>('name')
  const [sortDir, setSortDir]           = useState<SortDir>('asc')
  const [page, setPage]                 = useState(1)
  const [formOpen, setFormOpen]         = useState(false)
  const [editTarget, setEditTarget]     = useState<Customer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const [isDeleting, setIsDeleting]     = useState(false)

  // ── Derived list ──────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let list = customers.filter((c) => {
      const matchSearch =
        !q ||
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        (c.email   ?? '').toLowerCase().includes(q) ||
        (c.phone   ?? '').toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q)
      const matchStatus = statusFilter === 'all' || c.status === statusFilter
      return matchSearch && matchStatus
    })
    list = [...list].sort((a, b) => {
      if (sortField === 'name') {
        const av = `${a.first_name} ${a.last_name}`
        const bv = `${b.first_name} ${b.last_name}`
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      const at = new Date(a.created_at).getTime()
      const bt = new Date(b.created_at).getTime()
      return sortDir === 'asc' ? at - bt : bt - at
    })
    return list
  }, [customers, search, statusFilter, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const rows       = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const startRow   = filtered.length ? (safePage - 1) * PAGE_SIZE + 1 : 0
  const endRow     = Math.min(safePage * PAGE_SIZE, filtered.length)

  // ── Sort toggle ───────────────────────────────────────────
  const toggleSort = (f: SortField) => {
    if (sortField === f) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(f); setSortDir('asc') }
    setPage(1)
  }

  // ── Handlers ─────────────────────────────────────────────
  const openCreate = () => { setEditTarget(null); setFormOpen(true) }
  const openEdit   = (c: Customer) => { setEditTarget(c); setFormOpen(true) }

  const handleFormSubmit = async (data: CustomerCreate) => {
    if (editTarget) return update(editTarget.id, data)
    return create(data)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    await remove(deleteTarget.id)
    setIsDeleting(false)
    setDeleteTarget(null)
  }

  // ── Pagination pages ──────────────────────────────────────
  const pageNumbers = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    if (safePage <= 4)   return [1, 2, 3, 4, 5, '…', totalPages]
    if (safePage >= totalPages - 3) return [1, '…', ...Array.from({ length: 5 }, (_, i) => totalPages - 4 + i)]
    return [1, '…', safePage - 1, safePage, safePage + 1, '…', totalPages]
  })()

  return (
    <div>
      {/* Header */}
      <PageHeader title={t('customers.list.title')} subtitle={t('customers.list.totalCount', { count: customers.length })}>
        <button className="btn btn-primary" onClick={openCreate}>
          <UserPlus size={15} /> {t('customers.list.newCustomer')}
        </button>
      </PageHeader>

      {/* Error */}
      {error && (
        <div className="page-error">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <Search size={14} />
          <input
            className="search-input"
            placeholder={t('customers.list.searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as CustomerStatus | 'all'); setPage(1) }}
        >
          <option value="all">{t('customers.list.allStatuses')}</option>
          <option value="prospect">{t('customers.status.prospect')}</option>
          <option value="active">{t('customers.status.active')}</option>
          <option value="inactive">{t('customers.status.inactive')}</option>
          <option value="churned">{t('customers.status.churned')}</option>
        </select>
        <span className="toolbar-count">{t('customers.list.resultsCount', { count: filtered.length })}</span>
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => toggleSort('name')}>
                  {t('customers.list.colCustomer')} <SortIndicator field="name" active={sortField} dir={sortDir} />
                </th>
                <th>{t('common.email')}</th>
                <th className="col-hide-sm">{t('common.phone')}</th>
                <th>{t('common.status')}</th>
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
                      <Users size={36} />
                      <p>{t('customers.list.noCustomersFound')}</p>
                      <small>{search || statusFilter !== 'all' ? t('common.tryAdjustingFilters') : t('customers.list.createFirstCustomer')}</small>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div
                        className="customer-name-cell"
                        role="link"
                        tabIndex={0}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/customers/${c.id}`)}
                        onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/customers/${c.id}`) }}
                      >
                        <div className="customer-avatar">{initials(c)}</div>
                        <div>
                          <div className="customer-full-name">{c.first_name} {c.last_name}</div>
                          {c.company && <div className="customer-company">{c.company}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="cell-muted">{c.email ?? '—'}</td>
                    <td className="cell-muted col-hide-sm">{c.phone ?? '—'}</td>
                    <td><CustomerStatusBadge status={c.status} /></td>
                    <td className="cell-muted col-hide-sm">{fmtDate(c.created_at)}</td>
                    <td>
                      <div className="row-actions">
                        <button className="action-btn" title={t('common.edit')} onClick={() => openEdit(c)}>
                          <Pencil size={14} />
                        </button>
                        <button className="action-btn danger" title={t('common.delete')} onClick={() => setDeleteTarget(c)}>
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
              {t('customers.list.showingRange', { start: startRow, end: endRow, total: filtered.length })}
            </span>
            <div className="pagination-controls">
              <button className="page-btn" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>
                <ChevronLeft size={14} />
              </button>
              {pageNumbers.map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="page-btn" style={{ cursor: 'default', border: 'none' }}>…</span>
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
      <CustomerForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        customer={editTarget}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title={t('customers.list.deleteTitle')}
        message={
          deleteTarget
            ? t('customers.list.deleteMessage', { name: `${deleteTarget.first_name} ${deleteTarget.last_name}` })
            : ''
        }
      />
    </div>
  )
}
