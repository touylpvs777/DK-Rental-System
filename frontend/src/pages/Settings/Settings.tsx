import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Building2, CircleDollarSign, DatabaseZap, Loader2, Save, Bell, ImageUp, X } from 'lucide-react'
import client from '@/api/client'
import { uploadImage } from '@/api/upload'
import { getPreferences, subscribeToEvent, updatePreference } from '@/api/notifications'
import type { NotificationPreference } from '@/types/notification'
import { useAuthStore } from '@/store/authStore'
import { useCompanyStore } from '@/store/companyStore'
import { resolveMediaUrl } from '@/utils/media'
import { toast } from '@/store/toastStore'
import PageHeader from '@/components/layout/PageHeader'

interface SettingRecord {
  id: number
  key: string
  value: unknown
  description: string | null
  created_at: string
  updated_at: string | null
}

type TabKey = 'company' | 'financial' | 'system' | 'notifications'

interface SubscribableEvent {
  eventType: string
  labelKey: string
}

interface SubscribableGroup {
  groupKey: string
  events: SubscribableEvent[]
}

const SUBSCRIBABLE_GROUPS: SubscribableGroup[] = [
  {
    groupKey: 'critical',
    events: [
      { eventType: 'customer_deleted', labelKey: 'customerDeleted' },
      { eventType: 'forklift_deleted', labelKey: 'forkliftDeleted' },
      { eventType: 'catalog_product_deleted', labelKey: 'productDeleted' },
    ],
  },
  {
    groupKey: 'sales',
    events: [
      { eventType: 'quotation_approved', labelKey: 'quotationApproved' },
      { eventType: 'quotation_sent', labelKey: 'quotationSent' },
      { eventType: 'rental_contract_activated', labelKey: 'contractActivated' },
      { eventType: 'rental_contract_cancelled', labelKey: 'contractCancelled' },
    ],
  },
  {
    groupKey: 'billing',
    events: [
      { eventType: 'invoice_issued', labelKey: 'invoiceIssued' },
      { eventType: 'payment_recorded', labelKey: 'paymentRecorded' },
      { eventType: 'payment_rejected', labelKey: 'paymentRejected' },
      { eventType: 'deposit_refunded', labelKey: 'depositRefunded' },
    ],
  },
  {
    groupKey: 'operations',
    events: [
      { eventType: 'forklift_status_changed', labelKey: 'forkliftStatusChanged' },
      { eventType: 'inventory_import_executed', labelKey: 'inventoryImportExecuted' },
      { eventType: 'setting_updated', labelKey: 'settingUpdated' },
    ],
  },
]

function Toggle({ checked, disabled, onChange, ariaLabel }: { checked: boolean; disabled?: boolean; onChange: () => void; ariaLabel: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      className={`pb-1 ${checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
      style={{
        position: 'relative',
        width: 40,
        height: 22,
        borderRadius: 999,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'background-color 0.15s ease',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'white',
          transition: 'left 0.15s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
        }}
      />
    </button>
  )
}

interface CompanyProfile {
  company_name: string
  address: string
  phone: string
  fax: string
  website: string
  email: string
  logo_url: string
}

interface FinancialDefaults {
  vat_rate: number
  default_currency: string
  default_payment_terms: string
}

interface SystemVariables {
  equipment_types: string[]
  repair_statuses: string[]
}

const defaultCompanyProfile: CompanyProfile = {
  company_name: 'DK Service',
  address: 'Vientiane, Laos',
  phone: '+856 20 000 000',
  fax: '',
  website: '',
  email: '',
  logo_url: 'https://example.com/logo.png',
}

const defaultFinancialDefaults: FinancialDefaults = {
  vat_rate: 10,
  default_currency: 'LAK',
  default_payment_terms: 'Net 30',
}

const defaultSystemVariables: SystemVariables = {
  equipment_types: ['Forklift', 'Warehouse', 'Generator'],
  repair_statuses: ['Open', 'In Progress', 'Resolved'],
}

function mergeWithDefaults<T>(value: unknown, defaults: T): T {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { ...defaults, ...(value as Record<string, unknown>) } as T
  }
  return defaults
}

function parseSettingValue<T>(value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }
  return (value as T | undefined) ?? fallback
}

function toList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function toCsv(items: string[]): string {
  return items.join(', ')
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)

  const [activeTab, setActiveTab] = useState<TabKey>('company')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<Record<TabKey, boolean>>({
    company: false,
    financial: false,
    system: false,
    notifications: false,
  })

  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(defaultCompanyProfile)
  const [financialDefaults, setFinancialDefaults] = useState<FinancialDefaults>(defaultFinancialDefaults)
  const [systemVariables, setSystemVariables] = useState<SystemVariables>(defaultSystemVariables)

  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [preferencesLoading, setPreferencesLoading] = useState(true)
  const [togglingEvent, setTogglingEvent] = useState<string | null>(null)

  const [isUploadingLogo, setUploadingLogo] = useState(false)
  const [isDraggingLogo, setDraggingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const setCompanyStoreProfile = useCompanyStore((s) => s.setProfile)

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true)
      try {
        const response = await client.get<SettingRecord[]>('/settings')
        const records = response.data.reduce<Record<string, SettingRecord>>((acc, item) => {
          acc[item.key] = item
          return acc
        }, {})

        setCompanyProfile(mergeWithDefaults(parseSettingValue(records.company_profile?.value, defaultCompanyProfile), defaultCompanyProfile))
        setFinancialDefaults(mergeWithDefaults(parseSettingValue(records.financial_defaults?.value, defaultFinancialDefaults), defaultFinancialDefaults))
        setSystemVariables(mergeWithDefaults(parseSettingValue(records.system_variables?.value, defaultSystemVariables), defaultSystemVariables))
      } catch {
        toast.error(t('settings.loadError'))
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [t])

  useEffect(() => {
    const loadPreferences = async () => {
      setPreferencesLoading(true)
      try {
        const { data } = await getPreferences()
        setPreferences(data)
      } catch {
        toast.error(t('settings.notifications.loadError'))
      } finally {
        setPreferencesLoading(false)
      }
    }

    loadPreferences()
  }, [t])

  if (!user?.is_superuser) {
    return <Navigate to="/dashboard" replace />
  }

  const toggleEventSubscription = async (eventType: string) => {
    const existing = preferences.find((p) => p.event_type === eventType)
    setTogglingEvent(eventType)
    try {
      if (existing) {
        const { data } = await updatePreference(existing.id, !existing.is_enabled)
        setPreferences((current) => current.map((p) => (p.id === data.id ? data : p)))
      } else {
        const { data } = await subscribeToEvent(eventType)
        setPreferences((current) => [...current, data])
      }
    } catch {
      toast.error(t('settings.notifications.saveError'))
    } finally {
      setTogglingEvent(null)
    }
  }

  const saveTab = async (tab: TabKey) => {
    const key = tab === 'company' ? 'company_profile' : tab === 'financial' ? 'financial_defaults' : 'system_variables'
    const payload = tab === 'company'
      ? companyProfile
      : tab === 'financial'
        ? financialDefaults
        : systemVariables

    setSaving((current) => ({ ...current, [tab]: true }))
    try {
      const response = await client.put(`/settings/${key}`, {
        value: payload,
        description: t(`settings.${tab}.description`),
      })
      if (tab === 'company') {
        const merged = mergeWithDefaults(response.data.value, companyProfile)
        setCompanyProfile(merged)
        setCompanyStoreProfile(merged)
      } else if (tab === 'financial') {
        setFinancialDefaults(mergeWithDefaults(response.data.value, financialDefaults))
      } else {
        setSystemVariables(mergeWithDefaults(response.data.value, systemVariables))
      }
      toast.success(t('settings.saveSuccess'))
    } catch {
      toast.error(t('settings.saveError'))
    } finally {
      setSaving((current) => ({ ...current, [tab]: false }))
    }
  }

  const handleLogoFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(t('settings.company.logoInvalidType'))
      return
    }
    setUploadingLogo(true)
    try {
      const result = await uploadImage(file)
      setCompanyProfile((current) => ({ ...current, logo_url: result.url }))
    } catch {
      toast.error(t('settings.company.logoUploadError'))
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDraggingLogo(false)
    const f = e.dataTransfer.files[0]
    if (f) handleLogoFile(f)
  }

  const tabs: Array<{ key: TabKey; label: string; icon: typeof Building2 }> = [
    { key: 'company', label: t('settings.tabs.company'), icon: Building2 },
    { key: 'financial', label: t('settings.tabs.financial'), icon: CircleDollarSign },
    { key: 'system', label: t('settings.tabs.system'), icon: DatabaseZap },
    { key: 'notifications', label: t('settings.tabs.notifications'), icon: Bell },
  ]

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            style={{
              border: activeTab === key ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              borderRadius: 999,
              padding: '8px 14px',
              background: activeTab === key ? 'var(--color-primary-soft)' : 'white',
              color: activeTab === key ? 'var(--color-primary)' : 'var(--color-text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Loader2 size={18} className="spin" />
          <span>{t('settings.loading')}</span>
        </div>
      ) : (
        <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800" style={{ display: 'grid', gap: 20 }}>
          {activeTab === 'company' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gap: 12 }}>
                <label className="grid gap-2 text-slate-700 dark:text-slate-300" style={{ display: 'grid', gap: 6 }}>
                  <span className="leading-relaxed">{t('settings.company.companyName')}</span>
                  <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pb-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white" value={companyProfile.company_name} onChange={(event) => setCompanyProfile({ ...companyProfile, company_name: event.target.value })} style={inputStyle} />
                </label>
                <label className="grid gap-2 text-slate-700 dark:text-slate-300" style={{ display: 'grid', gap: 6 }}>
                  <span className="leading-relaxed">{t('settings.company.address')}</span>
                  <textarea className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pb-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white" value={companyProfile.address} onChange={(event) => setCompanyProfile({ ...companyProfile, address: event.target.value })} style={{ ...inputStyle, minHeight: 84 }} />
                </label>
                <label className="grid gap-2 text-slate-700 dark:text-slate-300" style={{ display: 'grid', gap: 6 }}>
                  <span className="leading-relaxed">{t('settings.company.phone')}</span>
                  <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pb-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white" value={companyProfile.phone} onChange={(event) => setCompanyProfile({ ...companyProfile, phone: event.target.value })} style={inputStyle} />
                </label>
                <label className="grid gap-2 text-slate-700 dark:text-slate-300" style={{ display: 'grid', gap: 6 }}>
                  <span className="leading-relaxed">{t('settings.company.fax')}</span>
                  <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pb-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white" value={companyProfile.fax} onChange={(event) => setCompanyProfile({ ...companyProfile, fax: event.target.value })} style={inputStyle} />
                </label>
                <label className="grid gap-2 text-slate-700 dark:text-slate-300" style={{ display: 'grid', gap: 6 }}>
                  <span className="leading-relaxed">{t('settings.company.website')}</span>
                  <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pb-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white" value={companyProfile.website} onChange={(event) => setCompanyProfile({ ...companyProfile, website: event.target.value })} style={inputStyle} />
                </label>
                <label className="grid gap-2 text-slate-700 dark:text-slate-300" style={{ display: 'grid', gap: 6 }}>
                  <span className="leading-relaxed">{t('settings.company.email')}</span>
                  <input type="email" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pb-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white" value={companyProfile.email} onChange={(event) => setCompanyProfile({ ...companyProfile, email: event.target.value })} style={inputStyle} />
                </label>

                <div className="grid gap-2 text-slate-700 dark:text-slate-300" style={{ display: 'grid', gap: 6 }}>
                  <span className="leading-relaxed">{t('settings.company.logoUrl')}</span>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoFile(f) }}
                  />
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDraggingLogo(true) }}
                    onDragLeave={() => setDraggingLogo(false)}
                    onDrop={handleLogoDrop}
                    onClick={() => !isUploadingLogo && logoInputRef.current?.click()}
                    className={`pb-1 flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed px-4 py-3.5 transition ${
                      isDraggingLogo
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30'
                        : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-slate-500 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isUploadingLogo ? (
                      <Loader2 size={28} className="spin text-blue-600" />
                    ) : companyProfile.logo_url ? (
                      <img
                        src={resolveMediaUrl(companyProfile.logo_url) ?? undefined}
                        alt={companyProfile.company_name}
                        className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-contain bg-white dark:border-slate-600"
                      />
                    ) : (
                      <ImageUp size={28} className="shrink-0 text-slate-400 dark:text-slate-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="leading-relaxed pb-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                        {isUploadingLogo ? t('settings.company.logoUploading') : t('settings.company.logoDropzoneText')}
                      </div>
                      <div className="leading-relaxed pb-1 truncate text-xs text-slate-500 dark:text-slate-400">
                        {companyProfile.logo_url || t('settings.company.logoDropzoneHint')}
                      </div>
                    </div>
                    {companyProfile.logo_url && !isUploadingLogo && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setCompanyProfile({ ...companyProfile, logo_url: '' }) }}
                        className="pb-1 shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-600 dark:hover:text-slate-200"
                        aria-label={t('inventory.import.clearFile')}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => saveTab('company')} disabled={saving.company} className="pb-2" style={buttonStyle}>
                {saving.company ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                {saving.company ? t('settings.saving') : t('settings.save')}
              </button>
            </div>
          )}

          {activeTab === 'financial' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gap: 12 }}>
                <label className="grid gap-2 text-slate-700 dark:text-slate-300" style={{ display: 'grid', gap: 6 }}>
                  <span className="leading-relaxed">{t('settings.financial.vatRate')}</span>
                  <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pb-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white" type="number" value={financialDefaults.vat_rate} onChange={(event) => setFinancialDefaults({ ...financialDefaults, vat_rate: Number(event.target.value) })} style={inputStyle} />
                </label>
                <label className="grid gap-2 text-slate-700 dark:text-slate-300" style={{ display: 'grid', gap: 6 }}>
                  <span className="leading-relaxed">{t('settings.financial.defaultCurrency')}</span>
                  <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pb-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white" value={financialDefaults.default_currency} onChange={(event) => setFinancialDefaults({ ...financialDefaults, default_currency: event.target.value })} style={inputStyle} />
                </label>
                <label className="grid gap-2 text-slate-700 dark:text-slate-300" style={{ display: 'grid', gap: 6 }}>
                  <span className="leading-relaxed">{t('settings.financial.defaultPaymentTerms')}</span>
                  <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pb-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white" value={financialDefaults.default_payment_terms} onChange={(event) => setFinancialDefaults({ ...financialDefaults, default_payment_terms: event.target.value })} style={inputStyle} />
                </label>
              </div>
              <button type="button" onClick={() => saveTab('financial')} disabled={saving.financial} className="pb-2" style={buttonStyle}>
                {saving.financial ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                {saving.financial ? t('settings.saving') : t('settings.save')}
              </button>
            </div>
          )}

          {activeTab === 'system' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gap: 12 }}>
                <label className="grid gap-2 text-slate-700 dark:text-slate-300" style={{ display: 'grid', gap: 6 }}>
                  <span className="leading-relaxed">{t('settings.system.equipmentTypes')}</span>
                  <textarea className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pb-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white" value={toCsv(systemVariables.equipment_types)} onChange={(event) => setSystemVariables({ ...systemVariables, equipment_types: toList(event.target.value) })} style={{ ...inputStyle, minHeight: 84 }} />
                </label>
                <label className="grid gap-2 text-slate-700 dark:text-slate-300" style={{ display: 'grid', gap: 6 }}>
                  <span className="leading-relaxed">{t('settings.system.repairStatuses')}</span>
                  <textarea className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pb-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white" value={toCsv(systemVariables.repair_statuses)} onChange={(event) => setSystemVariables({ ...systemVariables, repair_statuses: toList(event.target.value) })} style={{ ...inputStyle, minHeight: 84 }} />
                </label>
              </div>
              <button type="button" onClick={() => saveTab('system')} disabled={saving.system} className="pb-2" style={buttonStyle}>
                {saving.system ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                {saving.system ? t('settings.saving') : t('settings.save')}
              </button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div style={{ display: 'grid', gap: 20 }}>
              <p className="leading-relaxed" style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 13.5 }}>
                {t('settings.notifications.description')}
              </p>

              {preferencesLoading ? (
                <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Loader2 size={18} className="spin" />
                  <span className="leading-relaxed">{t('settings.loading')}</span>
                </div>
              ) : (
                SUBSCRIBABLE_GROUPS.map((group) => (
                  <div key={group.groupKey} style={{ display: 'grid', gap: 10 }}>
                    <h3 className="leading-relaxed" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      {t(`settings.notifications.groups.${group.groupKey}`)}
                    </h3>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700" style={{ display: 'grid' }}>
                      {group.events.map((evt, idx) => {
                        const pref = preferences.find((p) => p.event_type === evt.eventType)
                        const isEnabled = pref?.is_enabled ?? false
                        return (
                          <div
                            key={evt.eventType}
                            className="pb-1"
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              gap: 12, padding: '12px 14px',
                              borderTop: idx === 0 ? 'none' : '1px solid var(--color-border)',
                            }}
                          >
                            <span className="leading-relaxed text-slate-700 dark:text-slate-300" style={{ fontSize: 14 }}>
                              {t(`settings.notifications.events.${evt.labelKey}`)}
                            </span>
                            <Toggle
                              checked={isEnabled}
                              disabled={togglingEvent === evt.eventType}
                              onChange={() => toggleEventSubscription(evt.eventType)}
                              ariaLabel={t(`settings.notifications.events.${evt.labelKey}`)}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  fontSize: 14,
}

const buttonStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 10,
  padding: '10px 14px',
  background: 'var(--color-primary)',
  color: 'white',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  width: 'fit-content',
}
