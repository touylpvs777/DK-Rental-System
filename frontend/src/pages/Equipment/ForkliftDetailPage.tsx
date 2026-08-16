import { useState, useEffect, useCallback, Fragment } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft, Fuel, Gauge, Calendar, Clock, MapPin,
  AlertCircle, FileText, Wrench, User, Shield, Zap,
} from 'lucide-react'
import { getForklift } from '@/api/forklift'
import { ForkliftStatusBadge, ForkliftConditionBadge } from '@/components/equipment/ForkliftStatusBadge'
import PhotoGallery from '@/components/equipment/PhotoGallery'
import StatusTimeline from '@/components/equipment/StatusTimeline'
import { useWorkOrders } from '@/hooks/useWorkOrders'
import { useForkliftHourMeterLogs } from '@/hooks/useForkliftHourMeterLogs'
import { WOStatusBadge, WOTypeBadge, WOPriorityBadge } from '@/components/maintenance/MaintenanceStatusBadge'
import type { ForkliftDetail } from '@/types/forklift'
import './ForkliftDetailPage.css'
import '@/styles/shared.css'

const FUEL_LABEL_KEYS: Record<string, string> = { electric: 'equipment.fuel.electric', diesel: 'equipment.fuel.diesel', lpg: 'equipment.fuel.lpg', dual_fuel: 'equipment.fuel.dualFuel' }

const IOT_LIVE_WINDOW_MS = 24 * 60 * 60 * 1000

function isIotLive(lastPing: string | null): boolean {
  if (!lastPing) return false
  return Date.now() - new Date(lastPing).getTime() <= IOT_LIVE_WINDOW_MS
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

type TabId = 'overview' | 'photos' | 'timeline' | 'documents' | 'contracts' | 'workOrders'

export default function ForkliftDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [forklift, setForklift] = useState<ForkliftDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const hash = window.location.hash.slice(1) as TabId
    return ['overview', 'photos', 'timeline', 'documents', 'contracts', 'workOrders'].includes(hash) ? hash : 'overview'
  })

  const load = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await getForklift(Number(id))
      setForklift(data)
    } catch {
      setError(t('equipment.detail.notFoundOrFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [id, t])

  useEffect(() => { load() }, [load])

  const {
    workOrders: forkliftWorkOrders, total: workOrdersTotal,
    isLoading: workOrdersLoading, error: workOrdersError,
  } = useWorkOrders({ forklift_id: Number(id), page_size: 20 })

  const {
    logs: hourMeterLogs, isLoading: hourMeterLogsLoading, error: hourMeterLogsError,
  } = useForkliftHourMeterLogs(Number(id))

  const switchTab = (tab: TabId) => {
    setActiveTab(tab)
    window.history.replaceState(null, '', `#${tab}`)
  }

  if (isLoading) {
    return (
      <div className="forklift-detail">
        <div className="fd-skeleton">
          <div className="skeleton-cell" style={{ height: 18, width: '30%', marginBottom: 24 }} />
          <div className="fd-skeleton-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="skeleton-cell" style={{ height: 12, width: '50%' }} />
              <div className="skeleton-cell" style={{ height: 24, width: '80%' }} />
              <div className="skeleton-cell" style={{ height: 14, width: '40%' }} />
            </div>
            <div>
              <div className="skeleton-cell" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !forklift) {
    return (
      <div className="forklift-detail">
        <button className="fd-back" onClick={() => navigate('/equipment')}><ChevronLeft size={16} /> {t('equipment.detail.backToEquipment')}</button>
        <div className="page-error" style={{ marginTop: 24 }}><AlertCircle size={16} /> {error ?? t('equipment.detail.notFound')}</div>
      </div>
    )
  }

  const primaryPhoto = forklift.photos.find((p) => p.is_primary) ?? forklift.photos[0]
  const hoursUsed = forklift.current_hour_meter - forklift.initial_hour_meter
  const daysSinceCreated = Math.max(1, Math.ceil((Date.now() - new Date(forklift.created_at).getTime()) / 86400000))
  const dailyAvg = hoursUsed / daysSinceCreated
  const threshold = 5000
  const pct = Math.min((forklift.current_hour_meter / threshold) * 100, 100)
  const barColor = pct < 60 ? 'var(--color-success-500)' : pct < 85 ? 'var(--color-warning-500)' : 'var(--color-danger-500)'

  const warrantyExpired = forklift.warranty_expiry ? new Date(forklift.warranty_expiry) < new Date() : null
  const iotLive = isIotLive(forklift.last_telemetry_ping)

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'overview', label: t('equipment.detail.tabs.overview') },
    { id: 'photos', label: t('equipment.detail.tabs.photos'), count: forklift.photos.length },
    { id: 'timeline', label: t('equipment.detail.tabs.timeline'), count: forklift.recent_status_history.length },
    { id: 'documents', label: t('equipment.detail.tabs.documents'), count: forklift.documents.length },
    { id: 'contracts', label: t('equipment.detail.tabs.contracts') },
    { id: 'workOrders', label: t('equipment.detail.tabs.workOrders'), count: workOrdersTotal },
  ]

  return (
    <div className="forklift-detail">
      <button className="fd-back" onClick={() => navigate('/equipment')}><ChevronLeft size={16} /> {t('equipment.detail.backToEquipment')}</button>

      {/* Asset Header */}
      <div className="fd-header">
        <div className="fd-header-left">
          {primaryPhoto ? (
            <img src={primaryPhoto.thumbnail_url ?? primaryPhoto.image_url} alt={forklift.name_en} className="fd-header-avatar" />
          ) : (
            <div className="fd-header-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
              <Wrench size={24} />
            </div>
          )}
          <div className="fd-header-info">
            {forklift.brand && <div className="fd-header-brand">{forklift.brand.name}</div>}
            <div className="fd-header-name">{forklift.name_en}</div>
            <div className="fd-header-meta">
              <span>{t('equipment.detail.serialAbbrev')}: {forklift.serial_number}</span>
              {forklift.year_manufactured && <span>· {forklift.year_manufactured}</span>}
              {forklift.fuel_type && <span>· {FUEL_LABEL_KEYS[forklift.fuel_type] ? t(FUEL_LABEL_KEYS[forklift.fuel_type]) : forklift.fuel_type}</span>}
            </div>
            <div className="fd-header-badges">
              <ForkliftStatusBadge status={forklift.status} />
              <ForkliftConditionBadge condition={forklift.condition} />
              {!forklift.is_active && (
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: 'var(--color-gray-100)', color: 'var(--color-gray-500)', border: '1px solid var(--color-gray-200)' }}>{t('common.inactive')}</span>
              )}
            </div>
          </div>
        </div>
        <div className="fd-header-actions">
          <button className="btn btn-primary" onClick={() => navigate(`/rental-contracts/new`)}><FileText size={14} /> {t('equipment.detail.newContract')}</button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="fd-tabs">
        {tabs.map((tab) => (
          <button key={tab.id} className={`fd-tab${activeTab === tab.id ? ' active' : ''}`} onClick={() => switchTab(tab.id)}>
            {tab.label}
            {tab.count != null && <span className="fd-tab-count">({tab.count})</span>}
          </button>
        ))}
      </div>

      {/* ═══ Overview Tab ═══ */}
      {activeTab === 'overview' && (
        <div className="fd-overview">
          <div className="fd-main">
            {/* Specifications */}
            <div className="fd-card">
              <div className="fd-card-header"><Wrench size={16} /> {t('equipment.detail.specifications')}</div>
              <div className="fd-card-body">
                <div className="fd-spec-chips">
                  {forklift.fuel_type && (
                    <div className="fd-spec-chip">
                      <span className="fd-spec-chip-value"><Fuel size={13} /> {FUEL_LABEL_KEYS[forklift.fuel_type] ? t(FUEL_LABEL_KEYS[forklift.fuel_type]) : forklift.fuel_type}</span>
                      <span className="fd-spec-chip-label">{t('equipment.form.fuelType')}</span>
                    </div>
                  )}
                  {forklift.capacity_kg != null && (
                    <div className="fd-spec-chip">
                      <span className="fd-spec-chip-value"><Gauge size={13} /> {forklift.capacity_kg.toLocaleString()} kg</span>
                      <span className="fd-spec-chip-label">{t('equipment.detail.capacity')}</span>
                    </div>
                  )}
                  {forklift.year_manufactured && (
                    <div className="fd-spec-chip">
                      <span className="fd-spec-chip-value"><Calendar size={13} /> {forklift.year_manufactured}</span>
                      <span className="fd-spec-chip-label">{t('equipment.detail.year')}</span>
                    </div>
                  )}
                </div>
                <div className="fd-kv-grid">
                  <span className="fd-kv-key">{t('equipment.form.serialNumber')}</span><span className="fd-kv-value" style={{ fontVariantNumeric: 'tabular-nums' }}>{forklift.serial_number}</span>
                  {forklift.internal_code && <><span className="fd-kv-key">{t('equipment.form.internalCode')}</span><span className="fd-kv-value">{forklift.internal_code}</span></>}
                  {forklift.model_number && <><span className="fd-kv-key">{t('equipment.detail.model')}</span><span className="fd-kv-value">{forklift.model_number}</span></>}
                  {forklift.mast_type && <><span className="fd-kv-key">{t('equipment.detail.mastType')}</span><span className="fd-kv-value">{forklift.mast_type}</span></>}
                  {forklift.max_lift_height_mm != null && <><span className="fd-kv-key">{t('equipment.detail.maxLiftHeight')}</span><span className="fd-kv-value">{forklift.max_lift_height_mm.toLocaleString()} mm</span></>}
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="fd-card">
              <div className="fd-card-header"><MapPin size={16} /> {t('equipment.detail.currentLocation')}</div>
              <div className="fd-card-body">
                {forklift.current_location ? (
                  <div className="fd-location-box">
                    <div className="fd-location-name">{forklift.current_location.location_name}</div>
                    {forklift.current_location.warehouse_zone && <div className="fd-location-zone">{t('equipment.detail.zone')}: {forklift.current_location.warehouse_zone}</div>}
                    {forklift.current_location.address && <div className="fd-location-address"><MapPin size={11} /> {forklift.current_location.address}</div>}
                    <div className="fd-location-date"><Calendar size={11} /> {t('equipment.detail.since')}: {fmtDate(forklift.current_location.effective_date)}</div>
                    {forklift.current_location.notes && <div className="fd-location-notes">{forklift.current_location.notes}</div>}
                  </div>
                ) : (
                  <div className="fd-location-empty"><MapPin size={16} /> {t('equipment.detail.noLocationRecorded')}</div>
                )}
              </div>
            </div>

            {/* Notes */}
            {forklift.notes && (
              <div className="fd-card">
                <div className="fd-card-header"><FileText size={16} /> {t('common.notes')}</div>
                <div className="fd-card-body"><p className="fd-notes">{forklift.notes}</p></div>
              </div>
            )}
          </div>

          <div className="fd-sidebar">
            {/* Hour Meter */}
            <div className="fd-card">
              <div className="fd-card-header">
                <Clock size={16} /> {t('equipment.detail.hourMeter')}
                {forklift.iot_device_id && (
                  <span className={`fd-iot-status ${iotLive ? 'live' : 'offline'}`}>
                    <span className="fd-iot-dot" />
                    {iotLive ? t('equipment.card.iotLive') : t('equipment.card.iotOffline')}
                  </span>
                )}
              </div>
              <div className="fd-card-body">
                <div className="fd-hours-big">
                  {forklift.current_hour_meter.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  <span className="fd-hours-unit"> {t('equipment.detail.hoursUnit')}</span>
                </div>
                {forklift.last_telemetry_ping && (
                  <div className="fd-hours-synced">
                    <Zap size={11} /> {t('equipment.card.iotAutoSynced')}
                  </div>
                )}
                <div className="fd-hours-bar">
                  <div className="fd-hours-bar-track"><div className="fd-hours-bar-fill" style={{ width: `${pct}%`, background: barColor }} /></div>
                  <div className="fd-hours-bar-label">
                    <span>{t('equipment.detail.pctOfThreshold', { pct: Math.round(pct), threshold: threshold.toLocaleString() })}</span>
                    <span>{t('equipment.detail.serviceInterval')}</span>
                  </div>
                </div>
                <div className="fd-kv-grid fd-hours-stats">
                  <span className="fd-kv-key">{t('equipment.detail.initial')}</span><span className="fd-kv-value">{forklift.initial_hour_meter.toLocaleString()} {t('equipment.detail.hoursUnit')}</span>
                  <span className="fd-kv-key">{t('equipment.detail.hoursUsed')}</span><span className="fd-kv-value">{hoursUsed.toLocaleString(undefined, { maximumFractionDigits: 1 })} {t('equipment.detail.hoursUnit')}</span>
                  <span className="fd-kv-key">{t('equipment.detail.dailyAvg')}</span><span className="fd-kv-value">{dailyAvg.toFixed(1)} {t('equipment.detail.hoursUnit')}</span>
                  {dailyAvg > 0 && forklift.current_hour_meter < threshold && (
                    <><span className="fd-kv-key">{t('equipment.detail.estService')}</span><span className="fd-kv-value">{t('equipment.detail.estServiceDays', { count: Math.ceil((threshold - forklift.current_hour_meter) / dailyAvg) })}</span></>
                  )}
                </div>
              </div>
            </div>

            {/* Asset Summary */}
            <div className="fd-card">
              <div className="fd-card-header"><Shield size={16} /> {t('equipment.detail.assetSummary')}</div>
              <div className="fd-card-body">
                <div className="fd-kv-grid">
                  <span className="fd-kv-key">{t('equipment.form.purchaseDate')}</span><span className="fd-kv-value">{fmtDate(forklift.purchase_date)}</span>
                  {forklift.purchase_date && (
                    <><span className="fd-kv-key">{t('equipment.detail.assetAge')}</span><span className="fd-kv-value">{t('equipment.detail.years', { count: ((Date.now() - new Date(forklift.purchase_date).getTime()) / 31557600000).toFixed(1) })}</span></>
                  )}
                  <span className="fd-kv-key">{t('equipment.detail.warranty')}</span>
                  <span className="fd-kv-value">
                    {forklift.warranty_expiry ? (
                      <span style={{ color: warrantyExpired ? 'var(--color-danger-600)' : 'var(--color-success-600)' }}>
                        {warrantyExpired ? t('equipment.detail.expired') : t('equipment.detail.valid')} · {fmtDate(forklift.warranty_expiry)}
                      </span>
                    ) : '—'}
                  </span>
                  <span className="fd-kv-key">{t('equipment.form.condition')}</span><span className="fd-kv-value" style={{ textTransform: 'capitalize' }}>{forklift.condition}</span>
                  <span className="fd-kv-key">{t('equipment.detail.statusChanges')}</span><span className="fd-kv-value">{forklift.recent_status_history.length}</span>
                  <span className="fd-kv-key">{t('equipment.detail.documents')}</span><span className="fd-kv-value">{t('equipment.detail.filesCount', { count: forklift.documents.length })}</span>
                  <span className="fd-kv-key">{t('equipment.detail.photos')}</span><span className="fd-kv-value">{t('equipment.detail.imagesCount', { count: forklift.photos.length })}</span>
                </div>
              </div>
            </div>

            {/* Customer Link */}
            {forklift.customer && (
              <div className="fd-card">
                <div className="fd-card-header"><User size={16} /> {t('equipment.detail.assignedCustomer')}</div>
                <div className="fd-card-body">
                  <div className="fd-customer-link">
                    <User size={14} />
                    <span>{forklift.customer.first_name} {forklift.customer.last_name}</span>
                    {forklift.customer.company && <span style={{ color: 'var(--color-text-muted)' }}>({forklift.customer.company})</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Photos Tab ═══ */}
      {activeTab === 'photos' && (
        <PhotoGallery photos={forklift.photos} assetName={forklift.name_en} />
      )}

      {/* ═══ Timeline Tab ═══ */}
      {activeTab === 'timeline' && (
        <StatusTimeline history={forklift.recent_status_history} />
      )}

      {/* ═══ Documents Tab ═══ */}
      {activeTab === 'documents' && (
        forklift.documents.length > 0 ? (
          <div className="table-card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('equipment.detail.documentTitle')}</th>
                  <th>{t('common.type')}</th>
                  <th className="col-hide-sm">{t('equipment.detail.expiry')}</th>
                  <th className="col-hide-sm">{t('equipment.detail.uploaded')}</th>
                </tr>
              </thead>
              <tbody>
                {forklift.documents.map((d) => (
                  <tr key={d.id}>
                    <td><a href={d.file_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', fontWeight: 500 }}>{d.title}</a></td>
                    <td className="cell-muted" style={{ textTransform: 'capitalize' }}>{d.document_type.replace(/_/g, ' ')}</td>
                    <td className="cell-muted col-hide-sm">{fmtDate(d.expiry_date)}</td>
                    <td className="cell-muted col-hide-sm">{fmtDate(d.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="fd-location-empty" style={{ margin: '20px 0' }}>
            <FileText size={16} /> {t('equipment.detail.noDocumentsUploaded')}
          </div>
        )
      )}

      {/* ═══ Contracts Tab ═══ */}
      {activeTab === 'contracts' && (
        <div className="fd-card" style={{ maxWidth: 500 }}>
          <div className="fd-card-body" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginBottom: 12 }}>
              {t('equipment.detail.viewContractsHint')}
            </p>
            <Link to={`/rental-contracts`} className="btn btn-primary" style={{ display: 'inline-flex' }}>
              {t('equipment.detail.viewRentalContracts')} →
            </Link>
          </div>
        </div>
      )}

      {/* ═══ Work Orders Tab ═══ */}
      {activeTab === 'workOrders' && (
        <>
          <div className="fd-card" style={{ marginBottom: 16 }}>
            <div className="fd-card-header"><Clock size={16} /> {t('equipment.detail.hourMeterHistory')}</div>
            <div className="fd-card-body">
              {hourMeterLogsError ? (
                <div className="page-error"><AlertCircle size={16} /> {hourMeterLogsError}</div>
              ) : hourMeterLogsLoading ? (
                <div style={{ display: 'grid', gap: 6 }}>
                  {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-cell" style={{ height: 20 }} />)}
                </div>
              ) : hourMeterLogs.length === 0 ? (
                <div className="fd-location-empty"><Clock size={16} /> {t('equipment.detail.noHourMeterLogs')}</div>
              ) : (
                <div className="fd-kv-grid">
                  {hourMeterLogs.map((log) => (
                    <Fragment key={log.id}>
                      <span className="fd-kv-value" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {log.reading.toLocaleString(undefined, { maximumFractionDigits: 1 })} {t('equipment.detail.hoursUnit')}
                        <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--color-text-muted)' }}>
                          ({t(`equipment.detail.hourMeterSource.${log.source}`, log.source)})
                        </span>
                      </span>
                      <span className="fd-kv-key">{fmtDateTime(log.recorded_at)}</span>
                    </Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>

          {workOrdersError ? (
          <div className="page-error" style={{ margin: '20px 0' }}><AlertCircle size={16} /> {workOrdersError}</div>
        ) : workOrdersLoading ? (
          <div className="table-card">
            <div className="table-wrap">
              <table className="data-table">
                <tbody>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="skeleton-row">
                      <td><div className="skeleton-cell" style={{ width: '70%' }} /></td>
                      <td><div className="skeleton-cell" style={{ width: 60 }} /></td>
                      <td><div className="skeleton-cell" style={{ width: 70 }} /></td>
                      <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: 80 }} /></td>
                      <td className="col-hide-sm"><div className="skeleton-cell" style={{ width: 50 }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : forkliftWorkOrders.length > 0 ? (
          <div className="table-card">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('maintenance.workOrders.list.columns.workOrder')}</th>
                    <th>{t('common.type')}</th>
                    <th>{t('common.status')}</th>
                    <th className="col-hide-sm">{t('maintenance.status.scheduled')}</th>
                    <th className="col-hide-sm">{t('maintenance.workOrders.list.columns.priority')}</th>
                  </tr>
                </thead>
                <tbody>
                  {forkliftWorkOrders.map((wo) => (
                    <tr key={wo.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/maintenance/work-orders/${wo.id}`)}>
                      <td><div className="cell-desc">{wo.work_order_number}</div><div className="cell-muted cell-sub">{wo.title}</div></td>
                      <td><WOTypeBadge type={wo.order_type} /></td>
                      <td><WOStatusBadge status={wo.status} /></td>
                      <td className="cell-muted col-hide-sm">{fmtDate(wo.scheduled_date)}</td>
                      <td className="col-hide-sm"><WOPriorityBadge priority={wo.priority} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          ) : (
            <div className="fd-location-empty" style={{ margin: '20px 0' }}>
              <Wrench size={16} /> {t('equipment.detail.noWorkOrders')}
            </div>
          )}
        </>
      )}
    </div>
  )
}
