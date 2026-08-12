import {
  useEffect, useRef, useState,
  type ChangeEvent, type PointerEvent as ReactPointerEvent, type ReactNode,
} from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle, Camera, ChevronLeft, Loader2, X,
} from 'lucide-react'
import { getShiftHandover } from '@/api/shiftHandover'
import { uploadImage } from '@/api/upload'
import { useShiftHandovers } from '@/hooks/useShiftHandovers'
import { useForklifts } from '@/hooks/useForklifts'
import { useRentalContracts } from '@/hooks/useRentals'
import {
  shiftHandoverSchema, SHIFT_HANDOVER_DEFAULTS, type ShiftHandoverFormValues,
} from '@/schemas/shiftHandoverEditorSchema'
import { toast } from '@/store/toastStore'
import { checklistStatusLabel, shiftLabel } from '@/utils/shiftHandoverLabels'
import type { ShiftHandoverSignatures } from '@/types/shiftHandover'

const SHIFT_OPTIONS: ShiftHandoverFormValues['shift_name'][] = ['Morning', 'Afternoon', 'Night']
const STATUS_OPTIONS: ShiftHandoverFormValues['checklist_status'][] = ['Normal', 'Issues Found']

function nowLocalInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function isoToLocalInput(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ── Segmented control — big touch targets for factory-floor use ────────────

function SegmentedControl<T extends string>({ options, value, onChange, tone, formatLabel }: {
  options: T[]; value: T; onChange: (v: T) => void; tone?: (v: T) => string; formatLabel?: (v: T) => string
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {options.map((opt) => {
        const active = opt === value
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={
              `rounded-xl border px-4 py-3 text-sm font-semibold transition sm:flex-1 ` +
              (active
                ? (tone ? tone(opt) : 'border-[#003366] bg-[#003366] text-white')
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700')
            }
          >
            {formatLabel ? formatLabel(opt) : opt}
          </button>
        )
      })}
    </div>
  )
}

// ── Signature capture — plain canvas + pointer events, no extra deps ───────

function SignaturePad({ label, value, onChange }: {
  label: string; value: string | null; onChange: (dataUrl: string | null) => void
}) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const [hasDrawn, setHasDrawn] = useState(!!value)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !value) return
    const img = new Image()
    img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    img.src = value
    // Only replay the initial value once on mount (e.g. loading an existing record).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getPoint = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
  }

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drawingRef.current = true
    lastPointRef.current = getPoint(e)
  }

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !lastPointRef.current) return
    const point = getPoint(e)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    lastPointRef.current = point
    setHasDrawn(true)
  }

  const stopDrawing = () => {
    if (!drawingRef.current) return
    drawingRef.current = false
    lastPointRef.current = null
    const canvas = canvasRef.current
    if (canvas && hasDrawn) onChange(canvas.toDataURL('image/png'))
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
    onChange(null)
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        {hasDrawn && (
          <button type="button" onClick={clear} className="text-xs font-medium text-slate-500 underline">
            {t('common.clear', 'Clear')}
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={340}
        height={140}
        className="w-full touch-none rounded-xl border border-slate-300 bg-white dark:border-slate-600"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
        onPointerCancel={stopDrawing}
      />
    </div>
  )
}

// ── Section wrapper ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h2>
      <div className="grid gap-4">{children}</div>
    </section>
  )
}

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-base text-slate-800 shadow-sm outline-none transition focus:border-[#003366] dark:border-slate-600 dark:bg-slate-900 dark:text-white'
const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300'

export default function ShiftHandoverForm() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const isNew = !id
  const navigate = useNavigate()

  const { create, update } = useShiftHandovers()
  const { forklifts } = useForklifts({ page: 1, page_size: 100, is_active: true })
  const { contracts } = useRentalContracts({ page: 1, page_size: 100 })

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [signatures, setSignatures] = useState<ShiftHandoverSignatures>({})

  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors },
  } = useForm<ShiftHandoverFormValues>({
    resolver: zodResolver(shiftHandoverSchema),
    defaultValues: { ...SHIFT_HANDOVER_DEFAULTS, handover_datetime: nowLocalInput() },
  })

  const checklistStatus = watch('checklist_status')
  const forkliftId = watch('forklift_id')

  // react-hook-form/zod error `.message` is a short code (see the schema),
  // not display text — translate it here so validation copy stays localized.
  const fieldError = (code?: string) => (code ? t(`shiftHandover.validation.${code}`, code) : null)

  useEffect(() => {
    if (isNew) return
    setIsLoading(true)
    getShiftHandover(Number(id))
      .then(({ data }) => {
        reset({
          rental_contract_id: data.rental_contract.id,
          forklift_id: data.forklift.id,
          handover_datetime: isoToLocalInput(data.handover_datetime),
          shift_name: data.shift_name as ShiftHandoverFormValues['shift_name'],
          handover_person: data.handover_person,
          receiver_person: data.receiver_person,
          hour_meter: data.hour_meter,
          checklist_status: data.checklist_status as ShiftHandoverFormValues['checklist_status'],
          issues_description: data.issues_description ?? '',
        })
        setPhotos(data.issue_photos ?? [])
        setSignatures(data.signatures ?? {})
      })
      .catch(() => setLoadError(t('shiftHandover.form.notFound', 'Shift handover record not found.')))
      .finally(() => setIsLoading(false))
  }, [id, isNew, reset, t])

  // Convenience: prefill the current hour meter reading when a forklift is
  // first picked on a new record, so the driver only has to correct it if
  // it's changed since the last log rather than typing it from scratch.
  const prefilledForRef = useRef<number | null>(null)
  useEffect(() => {
    if (!isNew || forkliftId == null || prefilledForRef.current === forkliftId) return
    const f = forklifts.find((x) => x.id === forkliftId)
    if (f) {
      setValue('hour_meter', f.current_hour_meter)
      prefilledForRef.current = forkliftId
    }
  }, [forkliftId, forklifts, isNew, setValue])

  const handlePhotoCapture = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setIsUploadingPhoto(true)
    try {
      const result = await uploadImage(file)
      setPhotos((prev) => [...prev, result.url])
    } catch {
      toast.error(t('shiftHandover.form.photoUploadFailed', 'Could not upload photo.'))
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const removePhoto = (url: string) => setPhotos((prev) => prev.filter((p) => p !== url))

  const onSubmit = handleSubmit(async (form) => {
    if (!form.rental_contract_id) {
      toast.error(t('shiftHandover.form.contractRequired', 'Select a rental contract.'))
      return
    }
    if (!form.forklift_id) {
      toast.error(t('shiftHandover.form.forkliftRequired', 'Select a forklift.'))
      return
    }
    setIsSaving(true)
    try {
      const sigPayload = (signatures.handover_person || signatures.receiver_person) ? signatures : undefined
      const ok = isNew
        ? await create({
            rental_contract_id: form.rental_contract_id,
            forklift_id: form.forklift_id,
            handover_datetime: new Date(form.handover_datetime).toISOString(),
            shift_name: form.shift_name,
            handover_person: form.handover_person,
            receiver_person: form.receiver_person,
            hour_meter: form.hour_meter,
            checklist_status: form.checklist_status,
            issues_description: form.checklist_status === 'Issues Found' ? form.issues_description : undefined,
            issue_photos: photos.length ? photos : undefined,
            signatures: sigPayload,
          })
        : await update(Number(id), {
            handover_datetime: new Date(form.handover_datetime).toISOString(),
            shift_name: form.shift_name,
            handover_person: form.handover_person,
            receiver_person: form.receiver_person,
            hour_meter: form.hour_meter,
            checklist_status: form.checklist_status,
            issues_description: form.checklist_status === 'Issues Found' ? form.issues_description : null,
            issue_photos: photos.length ? photos : null,
            signatures: sigPayload ?? null,
          })
      if (ok) navigate('/shift-handovers', { replace: true })
    } finally {
      setIsSaving(false)
    }
  })

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-slate-400">
        <Loader2 size={24} className="spin" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
        <AlertCircle size={16} /> {loadError}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl pb-28">
      <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center gap-3 border-b border-slate-200 bg-[#003366] px-4 py-3.5 text-white sm:-mx-6 sm:px-6">
        <button type="button" onClick={() => navigate('/shift-handovers')} className="rounded-lg p-1 hover:bg-white/10">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-semibold">
          {isNew ? t('shiftHandover.form.newTitle', 'New Shift Handover') : t('shiftHandover.form.editTitle', 'Edit Shift Handover')}
        </h1>
      </div>

      <form onSubmit={onSubmit} className="grid gap-4">
        <Section title={t('shiftHandover.form.equipmentSection', 'Equipment & Contract')}>
          <div>
            <label className={labelClass}>{t('shiftHandover.form.rentalContract', 'Rental Contract')} <span className="text-red-500">*</span></label>
            <select
              className={fieldClass}
              disabled={!isNew}
              {...register('rental_contract_id', { setValueAs: (v) => (v ? Number(v) : null) })}
            >
              <option value="">{t('shiftHandover.form.selectContract', 'Select a contract…')}</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>{c.contract_number} — {c.customer.first_name} {c.customer.last_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>{t('shiftHandover.form.forklift', 'Forklift')} <span className="text-red-500">*</span></label>
            <select
              className={fieldClass}
              disabled={!isNew}
              {...register('forklift_id', { setValueAs: (v) => (v ? Number(v) : null) })}
            >
              <option value="">{t('shiftHandover.form.selectForklift', 'Select a forklift…')}</option>
              {forklifts.map((f) => (
                <option key={f.id} value={f.id}>{f.serial_number} — {f.name_en}</option>
              ))}
            </select>
          </div>
        </Section>

        <Section title={t('shiftHandover.form.shiftSection', 'Shift Details')}>
          <div>
            <label className={labelClass}>{t('shiftHandover.form.shift', 'Shift')}</label>
            <SegmentedControl
              options={SHIFT_OPTIONS}
              value={watch('shift_name')}
              onChange={(v) => setValue('shift_name', v)}
              formatLabel={(v) => shiftLabel(t, v)}
            />
          </div>

          <div>
            <label className={labelClass}>{t('shiftHandover.form.dateTime', 'Handover Date & Time')} <span className="text-red-500">*</span></label>
            <input type="datetime-local" className={fieldClass} {...register('handover_datetime')} />
            {errors.handover_datetime && <p className="mt-1 text-xs text-red-600">{fieldError(errors.handover_datetime.message)}</p>}
          </div>

          <div>
            <label className={labelClass}>{t('shiftHandover.form.hourMeter', 'Hour Meter Reading')} <span className="text-red-500">*</span></label>
            <input
              type="number" inputMode="decimal" step="0.1" min="0" className={fieldClass}
              {...register('hour_meter', { valueAsNumber: true })}
            />
            {errors.hour_meter && <p className="mt-1 text-xs text-red-600">{fieldError(errors.hour_meter.message)}</p>}
          </div>
        </Section>

        <Section title={t('shiftHandover.form.personnelSection', 'Personnel')}>
          <div>
            <label className={labelClass}>{t('shiftHandover.form.handoverPerson', 'Handover Person (outgoing)')} <span className="text-red-500">*</span></label>
            <input className={fieldClass} placeholder={t('shiftHandover.form.namePlaceholder', 'Full name')} {...register('handover_person')} />
            {errors.handover_person && <p className="mt-1 text-xs text-red-600">{fieldError(errors.handover_person.message)}</p>}
          </div>
          <div>
            <label className={labelClass}>{t('shiftHandover.form.receiverPerson', 'Receiver Person (incoming)')} <span className="text-red-500">*</span></label>
            <input className={fieldClass} placeholder={t('shiftHandover.form.namePlaceholder', 'Full name')} {...register('receiver_person')} />
            {errors.receiver_person && <p className="mt-1 text-xs text-red-600">{fieldError(errors.receiver_person.message)}</p>}
          </div>
        </Section>

        <Section title={t('shiftHandover.form.checklistSection', 'Checklist')}>
          <div>
            <label className={labelClass}>{t('shiftHandover.form.checklistStatus', 'Checklist Status')}</label>
            <SegmentedControl
              options={STATUS_OPTIONS}
              value={checklistStatus}
              onChange={(v) => setValue('checklist_status', v)}
              tone={(v) => (v === 'Issues Found' ? 'border-amber-500 bg-amber-500 text-white' : 'border-emerald-600 bg-emerald-600 text-white')}
              formatLabel={(v) => checklistStatusLabel(t, v)}
            />
          </div>

          {checklistStatus === 'Issues Found' && (
            <>
              <div>
                <label className={labelClass}>{t('shiftHandover.form.issuesDescription', 'Describe the Issue')} <span className="text-red-500">*</span></label>
                <textarea
                  rows={3} className={fieldClass}
                  placeholder={t('shiftHandover.form.issuesPlaceholder', 'What did you notice? Be specific.')}
                  {...register('issues_description')}
                />
                {errors.issues_description && <p className="mt-1 text-xs text-red-600">{fieldError(errors.issues_description.message)}</p>}
              </div>

              <div>
                <label className={labelClass}>{t('shiftHandover.form.issuePhotos', 'Photos')}</label>
                <div className="flex flex-wrap gap-2">
                  {photos.map((url) => (
                    <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(url)}
                        className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-slate-400 dark:border-slate-600">
                    {isUploadingPhoto ? <Loader2 size={18} className="spin" /> : <Camera size={18} />}
                    <span className="text-[10px]">{t('shiftHandover.form.addPhoto', 'Add')}</span>
                    <input
                      type="file" accept="image/*" capture="environment" className="hidden"
                      onChange={handlePhotoCapture} disabled={isUploadingPhoto}
                    />
                  </label>
                </div>
              </div>
            </>
          )}
        </Section>

        <Section title={t('shiftHandover.form.signaturesSection', 'Signatures')}>
          <SignaturePad
            label={t('shiftHandover.form.handoverSignature', 'Handover person signature')}
            value={signatures.handover_person ?? null}
            onChange={(v) => setSignatures((prev) => ({ ...prev, handover_person: v ?? undefined }))}
          />
          <SignaturePad
            label={t('shiftHandover.form.receiverSignature', 'Receiver person signature')}
            value={signatures.receiver_person ?? null}
            onChange={(v) => setSignatures((prev) => ({ ...prev, receiver_person: v ?? undefined }))}
          />
        </Section>
      </form>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 p-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-xl gap-2">
          <button
            type="button"
            onClick={() => navigate('/shift-handovers')}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-300"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={() => onSubmit()}
            disabled={isSaving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#003366] py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          >
            {isSaving && <Loader2 size={16} className="spin" />}
            {isNew ? t('shiftHandover.form.submit', 'Submit Handover') : t('shiftHandover.form.saveChanges', 'Save Changes')}
          </button>
        </div>
      </div>
    </div>
  )
}
