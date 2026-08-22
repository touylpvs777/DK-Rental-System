import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Plus, Truck, RefreshCw,
  ChevronLeft, ChevronRight, Pencil, Trash2, Gauge, Clock, Calendar, Wrench,
} from 'lucide-react'
import { useForklifts } from '@/hooks/useForklifts'
import { useBrands } from '@/hooks/useBrands'
import { OperationalStatusBadge, OwnershipStateBadge } from '@/components/equipment/ForkliftStatusBadge'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ViewToggle from '@/components/ui/ViewToggle'
import ForkliftForm from './ForkliftForm'
import {
  EquipmentGrid, EquipmentSearch, EquipmentFilters,
  EquipmentDrawer, EquipmentQuickActions,
} from '@/modules/equipment'
import { toast } from '@/store/toastStore'
import type { Forklift, ForkliftStatus, ForkliftListParams } from '@/types/forklift'
import './EquipmentRegistryPage.css'
import '@/styles/shared.css'

type ViewMode = 'grid' | 'list'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Sample fleet preview (shown only when the registry has zero real rows) ──
// Every id is negative so it can never collide with a real forklift id, and
// so edit/delete can be blocked below instead of silently 404ing against the
// API. Swap this out (or just delete it) once real forklifts are registered.

const SAMPLE_PHOTO = '/images/mit-fgc15n-33n-tooltips.png'

const SAMPLE_FORKLIFTS: Forklift[] = [
  {
    id: -1, serial_number: 'DK-F01-2024', slug: 'toyota-8fg25-f01', internal_code: 'F01',
    name_en: 'Toyota 8FG25', name_lo: null, model_number: '8FG25', model: null,
    brand: { id: -101, name: 'Toyota', slug: 'toyota', logo_url: null, country: 'Japan' },
    customer: null,
    status: 'in_stock', ownership_state: 'rental', condition: 'used',
    fuel_type: 'lpg', capacity_kg: 2500, year_manufactured: 2021,
    current_hour_meter: 1248, meter_hours: 1248, is_active: true,
    primary_photo_url: SAMPLE_PHOTO, iot_device_id: null, last_telemetry_ping: null,
    current_latitude: null, current_longitude: null, last_location_update: null,
    created_at: '2024-01-15T00:00:00Z', updated_at: null,
  },
  {
    id: -2, serial_number: 'DK-F02-2024', slug: 'komatsu-fg20-f02', internal_code: 'F02',
    name_en: 'Komatsu FG20', name_lo: null, model_number: 'FG20', model: null,
    brand: { id: -102, name: 'Komatsu', slug: 'komatsu', logo_url: null, country: 'Japan' },
    customer: { id: -201, first_name: 'Vientiane', last_name: 'Construction', company: 'Vientiane Construction Co.' },
    status: 'rented', ownership_state: 'rental', condition: 'used',
    fuel_type: 'diesel', capacity_kg: 2000, year_manufactured: 2020,
    current_hour_meter: 2103, meter_hours: 2103, is_active: true,
    primary_photo_url: SAMPLE_PHOTO, iot_device_id: null, last_telemetry_ping: null,
    current_latitude: null, current_longitude: null, last_location_update: null,
    created_at: '2024-02-20T00:00:00Z', updated_at: null,
  },
  {
    id: -3, serial_number: 'DK-F03-2024', slug: 'raymond-5200-f03', internal_code: 'F03',
    name_en: 'RAYMOND 5200', name_lo: null, model_number: '5200', model: null,
    brand: { id: -103, name: 'Raymond', slug: 'raymond', logo_url: null, country: 'USA' },
    customer: null,
    status: 'in_service', ownership_state: 'rental', condition: 'used',
    fuel_type: 'electric', capacity_kg: 3000, year_manufactured: 2019,
    current_hour_meter: 3567, meter_hours: 3567, is_active: true,
    primary_photo_url: SAMPLE_PHOTO, iot_device_id: null, last_telemetry_ping: null,
    current_latitude: null, current_longitude: null, last_location_update: null,
    created_at: '2024-03-05T00:00:00Z', updated_at: null,
  },
  {
    id: -4, serial_number: 'DK-F04-2024', slug: 'mitsubishi-fgc15n-33n-f04', internal_code: 'F04',
    name_en: 'Mitsubishi FGC15N-33N', name_lo: null, model_number: 'FGC15N-33N', model: null,
    brand: { id: -104, name: 'Mitsubishi', slug: 'mitsubishi', logo_url: null, country: 'Japan' },
    customer: { id: -202, first_name: 'Golden', last_name: 'Build', company: 'Golden Build Co.' },
    status: 'rented', ownership_state: 'rental', condition: 'new',
    fuel_type: 'lpg', capacity_kg: 1500, year_manufactured: 2022,
    current_hour_meter: 645, meter_hours: 645, is_active: true,
    primary_photo_url: SAMPLE_PHOTO, iot_device_id: null, last_telemetry_ping: null,
    current_latitude: null, current_longitude: null, last_location_update: null,
    created_at: '2024-04-10T00:00:00Z', updated_at: null,
  },
]

const isSampleForklift = (f: Forklift) => f.id < 0

function matchesSampleParams(f: Forklift, params: ForkliftListParams): boolean {
  if (params.status && f.status !== params.status) return false
  if (params.ownership_state && f.ownership_state !== params.ownership_state) return false
  if (params.condition && f.condition !== params.condition) return false
  if (params.fuel_type && f.fuel_type !== params.fuel_type) return false
  if (params.brand_id && f.brand?.id !== params.brand_id) return false
  if (params.q) {
    const q = params.q.toLowerCase()
    const haystack = `${f.name_en} ${f.serial_number} ${f.model_number ?? ''}`.toLowerCase()
    if (!haystack.includes(q)) return false
  }
  return true
}

export default function EquipmentRegistryPage() {
  const { t } = useTranslation()
  const {
    forklifts, total, pages, page: currentPage,
    params, isLoading, isFetching, error,
    applyParams, refetch, create, update, remove,
  } = useForklifts({ page: 1, page_size: 20 })

  const { brands } = useBrands(true)
  const navigate = useNavigate()

  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Forklift | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Forklift | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [drawerTarget, setDrawerTarget] = useState<Forklift | null>(null)

  const openCreate = () => { setEditTarget(null); setFormOpen(true) }
  const openEdit = (f: Forklift) => {
    if (isSampleForklift(f)) { toast.info(t('equipment.registry.sampleRowNotice')); return }
    setEditTarget(f); setFormOpen(true)
  }
  const requestDelete = (f: Forklift) => {
    if (isSampleForklift(f)) { toast.info(t('equipment.registry.sampleRowNotice')); return }
    setDeleteTarget(f)
  }

  const handleFormSubmit = async (data: Record<string, unknown>) => {
    if (editTarget) return update(editTarget.id, data as never)
    return create(data as never)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    await remove(deleteTarget.id)
    setIsDeleting(false)
    setDeleteTarget(null)
  }

  // The registry has zero real rows (fresh DB) — show a labeled sample fleet
  // instead of the bare empty state so the grid/card visuals are previewable.
  const usingSampleData = !isLoading && forklifts.length === 0
  const displayForklifts = usingSampleData
    ? SAMPLE_FORKLIFTS.filter((f) => matchesSampleParams(f, params))
    : forklifts

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: usingSampleData ? SAMPLE_FORKLIFTS.length : total }
    for (const f of displayForklifts) counts[f.status] = (counts[f.status] || 0) + 1
    return counts
  }, [displayForklifts, total, usingSampleData])

  const fleetStats = useMemo(() => {
    if (!displayForklifts.length) return { utilization: 0, avgHours: 0, pmDue: 0, avgAge: 0, criticalPm: 0 }
    const rented = displayForklifts.filter((f) => f.status === 'rented').length
    const avgHours = displayForklifts.reduce((s, f) => s + f.current_hour_meter, 0) / displayForklifts.length
    const pmDue = displayForklifts.filter((f) => f.current_hour_meter >= 4000).length
    const criticalPm = displayForklifts.filter((f) => f.current_hour_meter >= 4500).length
    const currentYear = new Date().getFullYear()
    const ages = displayForklifts.filter((f) => f.year_manufactured).map((f) => currentYear - f.year_manufactured!)
    const avgAge = ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : 0
    return { utilization: Math.round((rented / displayForklifts.length) * 100), avgHours: Math.round(avgHours), pmDue, criticalPm, avgAge: Number(avgAge.toFixed(1)) }
  }, [displayForklifts])

  const activeStatus = (params.status as ForkliftStatus) || null
  const hasFilters = !!(params.q || params.brand_id || params.status || params.fuel_type || params.condition || params.ownership_state)

  const pageNumbers = (() => {
    if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
    if (currentPage <= 4) return [1, 2, 3, 4, 5, '…', pages]
    if (currentPage >= pages - 3) return [1, '…', ...Array.from({ length: 5 }, (_, i) => pages - 4 + i)]
    return [1, '…', currentPage - 1, currentPage, currentPage + 1, '…', pages]
  })()

  return (
    <div>
      {/* Hero Banner */}
      <div className="mp-hero fleet-hero-with-img">
        <img
          src="/images/forklift.svg"
          alt=""
          aria-hidden="true"
          className="fleet-hero-img"
          loading="lazy"
          width={240}
          height={200}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 1 }}>
          <div>
            <div className="mp-hero-title" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {t('equipment.registry.title')}
              {usingSampleData && (
                <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: 0, textTransform: 'none', padding: '2px 8px', borderRadius: 20, background: 'var(--color-warning-50)', color: 'var(--color-warning-700)', border: '1px solid var(--color-warning-200)' }}>
                  {t('reports.syntheticPreview')}
                </span>
              )}
            </div>
            <div className="mp-hero-sub">{t('equipment.registry.subtitle')}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw size={14} className={isFetching ? 'spin' : ''} /> {t('equipment.registry.refresh')}
            </button>
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={15} /> {t('equipment.registry.registerForklift')}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 16, position: 'relative', zIndex: 1 }}>
          <EquipmentSearch
            value={params.q ?? ''}
            onChange={(q) => applyParams({ q: q || undefined, page: 1 })}
            placeholder={t('equipment.registry.searchPlaceholder')}
          />
        </div>
      </div>

      {error && <div className="page-error" style={{ marginBottom: 16 }}><Truck size={16} /> {error}</div>}

      {/* Quick Actions */}
      <div style={{ marginBottom: 16 }}>
        <EquipmentQuickActions onRegister={openCreate} />
      </div>

      {/* Stats Bar */}
      <div className="mp-kpi-strip" style={{ marginBottom: 16 }}>
        <div className="mp-kpi-widget" style={{ '--kpi-color': 'var(--color-primary-600)' } as React.CSSProperties}>
          <div className="mp-kpi-header">
            <span className="mp-kpi-label">{t('equipment.registry.kpi.utilization')}</span>
            <div className="mp-kpi-icon"><Gauge size={14} /></div>
          </div>
          <div className="mp-kpi-value">{fleetStats.utilization}%</div>
        </div>
        <div className="mp-kpi-widget" style={{ '--kpi-color': 'var(--color-info-600)' } as React.CSSProperties}>
          <div className="mp-kpi-header">
            <span className="mp-kpi-label">{t('equipment.registry.kpi.avgHours')}</span>
            <div className="mp-kpi-icon"><Clock size={14} /></div>
          </div>
          <div className="mp-kpi-value">{fleetStats.avgHours.toLocaleString()}</div>
        </div>
        <div className="mp-kpi-widget" style={{ '--kpi-color': 'var(--color-warning-600)' } as React.CSSProperties}>
          <div className="mp-kpi-header">
            <span className="mp-kpi-label">{t('equipment.registry.kpi.pmDue')}</span>
            <div className="mp-kpi-icon"><Wrench size={14} /></div>
          </div>
          <div className="mp-kpi-value">{fleetStats.pmDue}</div>
          {fleetStats.criticalPm > 0 && <div className="mp-kpi-change negative">{t('equipment.registry.kpi.critical', { count: fleetStats.criticalPm })}</div>}
        </div>
        <div className="mp-kpi-widget" style={{ '--kpi-color': 'var(--color-gray-500)' } as React.CSSProperties}>
          <div className="mp-kpi-header">
            <span className="mp-kpi-label">{t('equipment.registry.kpi.avgAge')}</span>
            <div className="mp-kpi-icon"><Calendar size={14} /></div>
          </div>
          <div className="mp-kpi-value">{t('equipment.registry.kpi.years', { count: fleetStats.avgAge })}</div>
        </div>
      </div>

      {/* Filters */}
      <EquipmentFilters
        activeStatus={activeStatus}
        brandId={params.brand_id ? Number(params.brand_id) : null}
        fuelType={(params.fuel_type as string) ?? ''}
        condition={(params.condition as string) ?? ''}
        ownershipState={(params.ownership_state as string) ?? ''}
        statusCounts={statusCounts}
        brands={brands}
        onStatusChange={(s) => applyParams({ status: (s || undefined) as never, page: 1 })}
        onBrandChange={(id) => applyParams({ brand_id: id ?? undefined, page: 1 })}
        onFuelChange={(v) => applyParams({ fuel_type: (v || undefined) as never, page: 1 })}
        onConditionChange={(v) => applyParams({ condition: (v || undefined) as never, page: 1 })}
        onOwnershipChange={(v) => applyParams({ ownership_state: (v || undefined) as never, page: 1 })}
        onClear={() => applyParams({ q: undefined, brand_id: undefined, status: undefined, fuel_type: undefined, condition: undefined, ownership_state: undefined, page: 1 })}
        hasFilters={hasFilters}
      />

      {/* View Toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, marginTop: 12 }}>
        <ViewToggle view={viewMode} onChange={setViewMode} />
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <EquipmentGrid
          forklifts={displayForklifts}
          isLoading={isLoading}
          onView={(f) => setDrawerTarget(f)}
          onEdit={openEdit}
        />
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="table-card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('equipment.registry.table.forklift')}</th>
                  <th>{t('equipment.form.serialNumber')}</th>
                  <th className="col-hide-sm">{t('equipment.registry.table.model')}</th>
                  <th>{t('equipment.registry.table.ownership')}</th>
                  <th>{t('equipment.form.operationalStatus')}</th>
                  <th className="col-hide-sm">{t('equipment.registry.table.hours')}</th>
                  <th className="col-hide-sm">{t('common.createdAt')}</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i} className="skeleton-row">
                      <td><div className="skeleton-cell" style={{ width: '70%' }} /></td>
                      <td><div className="skeleton-cell" style={{ width: '80%' }} /></td>
                      <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: '55%' }} /></td>
                      <td><div className="skeleton-cell" style={{ width: 60 }} /></td>
                      <td><div className="skeleton-cell" style={{ width: 60 }} /></td>
                      <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: 40 }} /></td>
                      <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: 80 }} /></td>
                      <td><div className="skeleton-cell" style={{ width: 40 }} /></td>
                    </tr>
                  ))
                ) : displayForklifts.length === 0 ? (
                  <tr><td colSpan={8}><div className="table-empty"><Truck size={36} /><p>{t('equipment.registry.noForkliftsFound')}</p></div></td></tr>
                ) : displayForklifts.map((f) => (
                  <tr key={f.id} style={{ cursor: 'pointer' }} onClick={() => setDrawerTarget(f)}>
                    <td>
                      <div className="fleet-row-name">
                        {f.primary_photo_url ? <img src={f.primary_photo_url} alt="" className="fleet-row-thumb" /> : <div className="fleet-row-thumb" />}
                        <div>
                          <div className="fleet-row-name-text">{f.name_en}</div>
                          {f.model_number && <div className="fleet-row-model">{f.model_number}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="cell-muted cell-mono">{f.serial_number}</td>
                    <td className="cell-muted col-hide-sm">{f.model?.name ?? f.model_number ?? '—'}</td>
                    <td><OwnershipStateBadge ownershipState={f.ownership_state} /></td>
                    <td><OperationalStatusBadge status={f.status} /></td>
                    <td className="cell-muted col-hide-sm cell-mono">{f.meter_hours.toLocaleString()}</td>
                    <td className="cell-muted col-hide-sm">{fmtDate(f.created_at)}</td>
                    <td>
                      <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="action-btn" title={t('common.edit')} onClick={() => openEdit(f)}><Pencil size={14} /></button>
                        <button className="action-btn danger" title={t('common.delete')} onClick={() => requestDelete(f)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && pages > 1 && (
        <div className="pagination" style={{ marginTop: 16, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px' }}>
          <span className="pagination-info">{t('equipment.registry.pageInfo', { page: currentPage, pages, total })}</span>
          <div className="pagination-controls">
            <button className="page-btn" disabled={currentPage === 1} onClick={() => applyParams({ page: currentPage - 1 })}><ChevronLeft size={14} /></button>
            {pageNumbers.map((p, i) =>
              p === '…' ? <span key={`e-${i}`} className="page-btn" style={{ cursor: 'default', border: 'none' }}>…</span>
              : <button key={p} className={`page-btn${currentPage === p ? ' active' : ''}`} onClick={() => applyParams({ page: p as number })}>{p}</button>
            )}
            <button className="page-btn" disabled={currentPage === pages} onClick={() => applyParams({ page: currentPage + 1 })}><ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {/* Equipment Drawer */}
      <EquipmentDrawer
        forklift={drawerTarget}
        isOpen={!!drawerTarget}
        onClose={() => setDrawerTarget(null)}
        onViewDetail={(id) => navigate(`/equipment/${id}`)}
        onEdit={(f) => openEdit(f)}
      />

      <ForkliftForm isOpen={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleFormSubmit} forklift={editTarget} brands={brands} />
      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} isLoading={isDeleting} title={t('equipment.registry.deleteTitle')} message={deleteTarget ? t('equipment.registry.deleteMessage', { name: deleteTarget.name_en, serial: deleteTarget.serial_number }) : ''} />
    </div>
  )
}
