import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Radio, RefreshCw, Satellite, WifiOff, Cable, Link2, Unlink, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { useForklifts } from '@/hooks/useForklifts'
import { useAuthStore } from '@/store/authStore'
import { Badge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { EquipmentSearch } from '@/modules/equipment'
import LiveMap, { type LiveMapDevice } from '@/components/iot/LiveMap'
import type { Forklift } from '@/types/forklift'
import PageHeader from '@/components/layout/PageHeader'
import './IoTManagementPage.css'
import '@/styles/shared.css'

const IOT_LIVE_WINDOW_MS = 24 * 60 * 60 * 1000

function isIotLive(lastPing: string | null): boolean {
  if (!lastPing) return false
  return Date.now() - new Date(lastPing).getTime() <= IOT_LIVE_WINDOW_MS
}

function fmtPing(iso: string | null): string {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export default function IoTManagementPage() {
  const { t, i18n } = useTranslation()
  const user = useAuthStore((s) => s.user)

  const {
    forklifts, total, pages, page: currentPage,
    params, isLoading, isFetching, error,
    applyParams, refetch, update,
  } = useForklifts({ page: 1, page_size: 50, sort: 'name_en', order: 'asc' })

  const [pairTarget, setPairTarget] = useState<Forklift | null>(null)
  const [unpairTarget, setUnpairTarget] = useState<Forklift | null>(null)
  const [isUnpairing, setIsUnpairing] = useState(false)
  const [detailTarget, setDetailTarget] = useState<Forklift | null>(null)
  const [focusedId, setFocusedId] = useState<number | null>(null)

  const kpis = useMemo(() => {
    const paired = forklifts.filter((f) => f.iot_device_id)
    const live = paired.filter((f) => isIotLive(f.last_telemetry_ping))
    return {
      paired: paired.length,
      live: live.length,
      offline: paired.length - live.length,
      unpaired: forklifts.length - paired.length,
    }
  }, [forklifts])

  const mapDevices = useMemo<LiveMapDevice[]>(() =>
    forklifts
      .filter((f) => typeof f.current_latitude === 'number' && typeof f.current_longitude === 'number')
      .map((f) => ({
        id: f.id,
        name: i18n.language.startsWith('lo') && f.name_lo ? f.name_lo : f.name_en,
        deviceId: f.iot_device_id,
        latitude: f.current_latitude as number,
        longitude: f.current_longitude as number,
        lastUpdate: f.last_location_update,
        isLive: isIotLive(f.last_location_update),
      })),
    [forklifts, i18n.language],
  )

  const handleUnpair = async () => {
    if (!unpairTarget) return
    setIsUnpairing(true)
    await update(unpairTarget.id, { iot_device_id: null })
    setIsUnpairing(false)
    setUnpairTarget(null)
  }

  const handleRowClick = (f: Forklift) => {
    setDetailTarget(f)
    const hasGps = typeof f.current_latitude === 'number' && typeof f.current_longitude === 'number'
    setFocusedId(hasGps ? f.id : null)
  }

  if (!user?.is_superuser) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div>
      <PageHeader title={t('iot.title')} subtitle={t('iot.subtitle')}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={14} className={isFetching ? 'spin' : ''} /> {t('iot.refresh')}
          </button>
        </div>
      </PageHeader>

      {error && <div className="page-error" style={{ marginBottom: 16 }}><WifiOff size={16} /> {error}</div>}

      {/* KPI Strip */}
      <div className="mp-kpi-strip" style={{ marginBottom: 16 }}>
        <div className="mp-kpi-widget" style={{ '--kpi-color': 'var(--color-primary-600)' } as React.CSSProperties}>
          <div className="mp-kpi-header">
            <span className="mp-kpi-label">{t('iot.kpi.totalPaired')}</span>
            <div className="mp-kpi-icon"><Cable size={14} /></div>
          </div>
          <div className="mp-kpi-value">{kpis.paired}</div>
        </div>
        <div className="mp-kpi-widget" style={{ '--kpi-color': 'var(--color-success-600)' } as React.CSSProperties}>
          <div className="mp-kpi-header">
            <span className="mp-kpi-label">{t('iot.kpi.live')}</span>
            <div className="mp-kpi-icon"><Satellite size={14} /></div>
          </div>
          <div className="mp-kpi-value">{kpis.live}</div>
        </div>
        <div className="mp-kpi-widget" style={{ '--kpi-color': 'var(--color-gray-500)' } as React.CSSProperties}>
          <div className="mp-kpi-header">
            <span className="mp-kpi-label">{t('iot.kpi.offline')}</span>
            <div className="mp-kpi-icon"><WifiOff size={14} /></div>
          </div>
          <div className="mp-kpi-value">{kpis.offline}</div>
        </div>
        <div className="mp-kpi-widget" style={{ '--kpi-color': 'var(--color-warning-600)' } as React.CSSProperties}>
          <div className="mp-kpi-header">
            <span className="mp-kpi-label">{t('iot.kpi.unpaired')}</span>
            <div className="mp-kpi-icon"><Unlink size={14} /></div>
          </div>
          <div className="mp-kpi-value">{kpis.unpaired}</div>
        </div>
      </div>

      {/* Live Fleet Map */}
      <div className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-md">
        <div className="mb-2.5 flex items-center gap-2">
          <Satellite size={15} className="text-[var(--color-primary-600)]" />
          <span className="text-[13.5px] font-semibold text-[var(--color-text)]">{t('iot.map.title')}</span>
          <span className="ml-auto text-xs text-[var(--color-text-muted)]">
            {t('iot.map.count', { count: mapDevices.length })}
          </span>
        </div>
        <LiveMap devices={mapDevices} focusId={focusedId} emptyLabel={t('iot.map.empty')} />
      </div>

      {/* Search */}
      <div style={{ marginBottom: 12 }}>
        <EquipmentSearch
          value={params.q ?? ''}
          onChange={(q) => applyParams({ q: q || undefined, page: 1 })}
          placeholder={t('iot.searchPlaceholder')}
        />
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('iot.table.forklift')}</th>
                <th>{t('iot.table.deviceId')}</th>
                <th className="col-hide-sm">{t('iot.table.lastPing')}</th>
                <th>{t('iot.table.status')}</th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="skeleton-row">
                    <td><div className="skeleton-cell" style={{ width: '70%' }} /></td>
                    <td><div className="skeleton-cell" style={{ width: '60%' }} /></td>
                    <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: 40 }} /></td>
                    <td><div className="skeleton-cell" style={{ width: 60 }} /></td>
                    <td><div className="skeleton-cell" style={{ width: 80 }} /></td>
                  </tr>
                ))
              ) : forklifts.length === 0 ? (
                <tr><td colSpan={5}><div className="table-empty"><Radio size={36} /><p>{t('iot.noResults')}</p></div></td></tr>
              ) : forklifts.map((f) => {
                const paired = !!f.iot_device_id
                const live = isIotLive(f.last_telemetry_ping)
                const hasGps = typeof f.current_latitude === 'number' && typeof f.current_longitude === 'number'
                return (
                  <tr
                    key={f.id}
                    onClick={() => handleRowClick(f)}
                    className="cursor-pointer transition-colors hover:bg-[var(--color-bg-subtle)]"
                  >
                    <td>
                      <div className="fleet-row-name">
                        {f.primary_photo_url ? <img src={f.primary_photo_url} alt="" className="fleet-row-thumb" /> : <div className="fleet-row-thumb" />}
                        <div>
                          <div className="fleet-row-name-text">{f.name_en}</div>
                          <div className="fleet-row-model">{f.serial_number}</div>
                        </div>
                      </div>
                    </td>
                    <td className="cell-mono">
                      {f.iot_device_id ?? <span className="cell-muted">{t('iot.notPaired')}</span>}
                    </td>
                    <td className="cell-muted col-hide-sm cell-mono">
                      {f.last_telemetry_ping ? fmtPing(f.last_telemetry_ping) : t('iot.never')}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {paired ? (
                          <span className={`iot-status-pill ${live ? 'live' : 'offline'}`}>
                            <span className="iot-status-dot" />
                            {live ? t('equipment.card.iotLive') : t('equipment.card.iotOffline')}
                          </span>
                        ) : (
                          <Badge variant="gray">{t('iot.notPaired')}</Badge>
                        )}
                        {hasGps && <MapPin size={12} className="text-[var(--color-primary-600)]" />}
                      </div>
                    </td>
                    <td>
                      <div className="row-actions">
                        {paired ? (
                          <button
                            className="action-btn danger"
                            title={t('iot.unpairAction')}
                            onClick={(e) => { e.stopPropagation(); setUnpairTarget(f) }}
                          >
                            <Unlink size={14} />
                          </button>
                        ) : (
                          <button
                            className="action-btn"
                            title={t('iot.pairAction')}
                            onClick={(e) => { e.stopPropagation(); setPairTarget(f) }}
                          >
                            <Link2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!isLoading && pages > 1 && (
        <div className="pagination" style={{ marginTop: 16, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px' }}>
          <span className="pagination-info">{t('equipment.registry.pageInfo', { page: currentPage, pages, total })}</span>
          <div className="pagination-controls">
            <button className="page-btn" disabled={currentPage === 1} onClick={() => applyParams({ page: currentPage - 1 })}><ChevronLeft size={14} /></button>
            <button className="page-btn" disabled={currentPage === pages} onClick={() => applyParams({ page: currentPage + 1 })}><ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      <ForkliftDetailModal
        forklift={detailTarget}
        isOpen={!!detailTarget}
        onClose={() => { setDetailTarget(null); setFocusedId(null) }}
      />

      <PairDeviceModal
        forklift={pairTarget}
        isOpen={!!pairTarget}
        existingDeviceIds={forklifts.filter((f) => f.iot_device_id).map((f) => f.iot_device_id as string)}
        onClose={() => setPairTarget(null)}
        onSubmit={async (deviceId) => {
          if (!pairTarget) return false
          const ok = await update(pairTarget.id, { iot_device_id: deviceId })
          if (ok) setPairTarget(null)
          return ok
        }}
      />

      <ConfirmDialog
        isOpen={!!unpairTarget}
        onClose={() => setUnpairTarget(null)}
        onConfirm={handleUnpair}
        isLoading={isUnpairing}
        title={t('iot.unpairConfirm.title')}
        message={unpairTarget ? t('iot.unpairConfirm.message', { name: unpairTarget.name_en, deviceId: unpairTarget.iot_device_id ?? '' }) : ''}
        confirmLabel={t('iot.unpairAction')}
      />
    </div>
  )
}

interface PairDeviceModalProps {
  forklift: Forklift | null
  isOpen: boolean
  existingDeviceIds: string[]
  onClose: () => void
  onSubmit: (deviceId: string) => Promise<boolean>
}

function PairDeviceModal({ forklift, isOpen, existingDeviceIds, onClose, onSubmit }: PairDeviceModalProps) {
  const { t } = useTranslation()
  const [deviceId, setDeviceId] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = deviceId.trim()
    if (!trimmed) { setErr(t('iot.pairModal.deviceIdRequired')); return }
    if (existingDeviceIds.includes(trimmed)) { setErr(t('iot.pairModal.duplicateError')); return }
    setSaving(true)
    setErr(null)
    const ok = await onSubmit(trimmed)
    setSaving(false)
    if (!ok) setErr(t('iot.pairModal.submitError'))
  }

  return (
    <Modal
      key={`${forklift?.id ?? 'none'}-${isOpen}`}
      isOpen={isOpen}
      onClose={onClose}
      title={t('iot.pairModal.title', { name: forklift?.name_en ?? '' })}
      width={440}
    >
      <form onSubmit={handleSubmit} className="form-grid">
        {err && <div className="page-error" style={{ margin: 0 }}>{err}</div>}
        <div className="form-group">
          <label>{t('iot.pairModal.deviceIdLabel')} <span className="required">*</span></label>
          <input
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder={t('iot.pairModal.deviceIdPlaceholder')}
            autoFocus
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>{t('common.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? t('iot.pairModal.pairing') : t('iot.pairModal.submit')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

interface ForkliftDetailModalProps {
  forklift: Forklift | null
  isOpen: boolean
  onClose: () => void
}

function ForkliftDetailModal({ forklift, isOpen, onClose }: ForkliftDetailModalProps) {
  const { t } = useTranslation()
  if (!forklift) return null

  const paired = !!forklift.iot_device_id
  const live = isIotLive(forklift.last_telemetry_ping)
  const hasGps = typeof forklift.current_latitude === 'number' && typeof forklift.current_longitude === 'number'

  const rows: [string, React.ReactNode][] = [
    [t('iot.table.deviceId'), forklift.iot_device_id ?? t('iot.notPaired')],
    [t('iot.table.lastPing'), forklift.last_telemetry_ping ? fmtPing(forklift.last_telemetry_ping) : t('iot.never')],
    [
      t('iot.table.status'),
      paired ? (
        <span className={`iot-status-pill ${live ? 'live' : 'offline'}`}>
          <span className="iot-status-dot" />
          {live ? t('equipment.card.iotLive') : t('equipment.card.iotOffline')}
        </span>
      ) : (
        <Badge variant="gray">{t('iot.notPaired')}</Badge>
      ),
    ],
    [
      t('iot.detailModal.gpsLabel'),
      hasGps
        ? `${forklift.current_latitude!.toFixed(5)}, ${forklift.current_longitude!.toFixed(5)}`
        : t('iot.detailModal.noGps'),
    ],
  ]
  if (hasGps) {
    rows.push([t('iot.detailModal.lastLocationUpdate'), forklift.last_location_update ? fmtPing(forklift.last_location_update) : t('iot.never')])
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={forklift.name_en} width={420}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {forklift.primary_photo_url
            ? <img src={forklift.primary_photo_url} alt="" className="fleet-row-thumb" style={{ width: 48, height: 48 }} />
            : <div className="fleet-row-thumb" style={{ width: 48, height: 48 }} />}
          <div>
            <div className="fleet-row-name-text">{forklift.name_en}</div>
            <div className="fleet-row-model">{forklift.serial_number}</div>
          </div>
        </div>

        <div className="flex flex-col divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)]">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
              <span className="text-[var(--color-text-muted)]">{label}</span>
              <span className="font-medium text-[var(--color-text)]">{value}</span>
            </div>
          ))}
        </div>

        {hasGps && (
          <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
            <MapPin size={12} className="text-[var(--color-primary-600)]" />
            {t('iot.detailModal.mapCentered')}
          </p>
        )}
      </div>
    </Modal>
  )
}
