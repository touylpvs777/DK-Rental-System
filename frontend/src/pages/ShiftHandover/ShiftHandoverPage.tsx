import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Plus, RefreshCw, AlertCircle, ClipboardCheck, ChevronLeft, ChevronRight,
  Gauge, User, Users, Clock, Trash2, ImageIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useShiftHandovers } from '@/hooks/useShiftHandovers'
import { useForklifts } from '@/hooks/useForklifts'
import PageHeader from '@/components/layout/PageHeader'
import Modal from '@/components/ui/Modal'
import { checklistStatusLabel, shiftLabel } from '@/utils/shiftHandoverLabels'
import type { ShiftHandover } from '@/types/shiftHandover'

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function ChecklistStatusPill({ status }: { status: string }) {
  const { t } = useTranslation()
  const isIssue = status === 'Issues Found'
  return (
    <span
      className={
        `inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ` +
        (isIssue
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300')
      }
    >
      {checklistStatusLabel(t, status)}
    </span>
  )
}

function HandoverCard({ handover, onOpen, onDelete }: {
  handover: ShiftHandover; onOpen: () => void; onDelete: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onOpen} className="flex-1 text-left">
          <div className="text-base font-semibold text-slate-800 dark:text-white">
            {handover.forklift.serial_number} <span className="font-normal text-slate-400">·</span> {handover.forklift.name_en}
          </div>
          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {handover.rental_contract.contract_number}
          </div>
        </button>
        <ChecklistStatusPill status={handover.checklist_status} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-1.5">
          <Clock size={13} className="text-slate-400" /> {shiftLabel(t, handover.shift_name)}
        </div>
        <div className="flex items-center gap-1.5">
          <Gauge size={13} className="text-slate-400" /> {handover.hour_meter.toLocaleString()} h
        </div>
        <div className="flex items-center gap-1.5">
          <User size={13} className="text-slate-400" /> {handover.handover_person}
        </div>
        <div className="flex items-center gap-1.5">
          <Users size={13} className="text-slate-400" /> {handover.receiver_person}
        </div>
      </div>

      {handover.issues_description && (
        <p className="line-clamp-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {handover.issues_description}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-400 dark:border-slate-700">
        <span>{fmtDateTime(handover.handover_datetime)}</span>
        <div className="flex items-center gap-3">
          {!!handover.issue_photos?.length && (
            <span className="flex items-center gap-1"><ImageIcon size={13} /> {handover.issue_photos.length}</span>
          )}
          <button
            type="button"
            onClick={onDelete}
            aria-label={t('common.delete')}
            className="text-slate-400 transition hover:text-red-600 dark:hover:text-red-400"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ShiftHandoverPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { forklifts } = useForklifts({ page: 1, page_size: 100, is_active: true })
  const {
    handovers, total, skip, limit, hasNext, hasPrev,
    params, isLoading, isFetching, error, applyParams, refetch, remove,
  } = useShiftHandovers({ skip: 0, limit: 20 })

  const [pendingDelete, setPendingDelete] = useState<ShiftHandover | null>(null)

  const confirmDelete = async () => {
    if (!pendingDelete) return
    await remove(pendingDelete.id)
    setPendingDelete(null)
  }

  return (
    <div>
      <PageHeader
        title={t('shiftHandover.list.title', 'Shift Handovers')}
        subtitle={t('shiftHandover.list.subtitle', { defaultValue: '{{count}} handover checklists', count: total })}
      >
        <div className="flex gap-2">
          <button
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={14} className={isFetching ? 'spin' : ''} /> {t('common.refresh', 'Refresh')}
          </button>
          <button
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#003366] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            onClick={() => navigate('/shift-handovers/new')}
          >
            <Plus size={15} /> {t('shiftHandover.list.newHandover', 'New Handover')}
          </button>
        </div>
      </PageHeader>

      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          value={params.forklift_id ?? ''}
          onChange={(e) => applyParams({ forklift_id: e.target.value ? Number(e.target.value) : undefined })}
        >
          <option value="">{t('shiftHandover.list.allForklifts', 'All forklifts')}</option>
          {forklifts.map((f) => (
            <option key={f.id} value={f.id}>{f.serial_number} — {f.name_en}</option>
          ))}
        </select>
        {(params.forklift_id !== undefined) && (
          <button
            className="rounded-xl px-3 py-2 text-sm text-slate-500 underline"
            onClick={() => applyParams({ forklift_id: undefined })}
          >
            {t('common.clearFilters', 'Clear filters')}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
          ))}
        </div>
      ) : handovers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 py-16 text-slate-400 dark:border-slate-600">
          <ClipboardCheck size={36} />
          <p>{t('shiftHandover.list.empty', 'No shift handovers recorded yet.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {handovers.map((h) => (
            <HandoverCard
              key={h.id}
              handover={h}
              onOpen={() => navigate(`/shift-handovers/${h.id}`)}
              onDelete={() => setPendingDelete(h)}
            />
          ))}
        </div>
      )}

      {!isLoading && total > limit && (
        <div className="mt-5 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>{t('shiftHandover.list.rangeOf', {
            defaultValue: 'Showing {{from}}–{{to}} of {{total}}',
            from: skip + 1, to: Math.min(skip + limit, total), total,
          })}</span>
          <div className="flex gap-2">
            <button
              className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 dark:border-slate-600"
              disabled={!hasPrev}
              onClick={() => applyParams({ skip: Math.max(0, skip - limit) })}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 dark:border-slate-600"
              disabled={!hasNext}
              onClick={() => applyParams({ skip: skip + limit })}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title={t('shiftHandover.list.deleteTitle', 'Delete handover record')}
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={() => setPendingDelete(null)}>{t('common.cancel')}</button>
            <button className="btn btn-danger" onClick={confirmDelete}>{t('common.delete')}</button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('shiftHandover.list.deleteConfirm', 'This shift handover checklist will be permanently deleted. This cannot be undone.')}
        </p>
      </Modal>
    </div>
  )
}
