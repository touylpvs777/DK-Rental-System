import { useState, useEffect, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import { getCustomers } from '@/api/customers'
import type { Customer } from '@/types/customer'
import type { Project, ProjectCreate, ProjectStatus, ProjectUpdate } from '@/types/project'

interface ProjectFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ProjectCreate | ProjectUpdate) => Promise<boolean>
  project?: Project | null
}

const STATUS_OPTIONS: ProjectStatus[] = [
  'draft', 'survey', 'design', 'boq_approved', 'installation', 'handover', 'completed',
]

const EMPTY = {
  name: '',
  customer_id: '',
  status: 'draft' as ProjectStatus,
  start_date: '',
  end_date: '',
  notes: '',
}

export default function ProjectForm({ isOpen, onClose, onSubmit, project }: ProjectFormProps) {
  const { t } = useTranslation()
  const isEdit = !!project
  const [fields, setFields] = useState(EMPTY)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFields(
        project
          ? {
              name: project.name,
              customer_id: String(project.customer_id),
              status: project.status,
              start_date: project.start_date ?? '',
              end_date: project.end_date ?? '',
              notes: project.notes ?? '',
            }
          : EMPTY
      )
      if (!isEdit) {
        getCustomers({ limit: 500 }).then(({ data }) => setCustomers(data)).catch(() => setCustomers([]))
      }
    }
  }, [isOpen, project, isEdit])

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFields((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    let ok: boolean
    if (isEdit) {
      const payload: ProjectUpdate = {
        name: fields.name.trim(),
        status: fields.status,
        ...(fields.start_date && { start_date: fields.start_date }),
        ...(fields.end_date && { end_date: fields.end_date }),
        notes: fields.notes.trim() || undefined,
      }
      ok = await onSubmit(payload)
    } else {
      const payload: ProjectCreate = {
        name: fields.name.trim(),
        customer_id: Number(fields.customer_id),
        ...(fields.start_date && { start_date: fields.start_date }),
        ...(fields.end_date && { end_date: fields.end_date }),
        ...(fields.notes.trim() && { notes: fields.notes.trim() }),
      }
      ok = await onSubmit(payload)
    }
    setIsLoading(false)
    if (ok) onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t('projects.form.editProject') : t('projects.form.newProject')}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isLoading}>
            {t('projects.form.cancel')}
          </button>
          <button type="submit" form="project-form" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? t('projects.form.saving') : isEdit ? t('projects.form.saveChanges') : t('projects.form.createProject')}
          </button>
        </>
      }
    >
      <form id="project-form" onSubmit={handleSubmit} className="form-grid">
        <div className="form-group">
          <label htmlFor="pf-name">{t('projects.form.projectName')} <span className="required">*</span></label>
          <input id="pf-name" value={fields.name} onChange={set('name')} required placeholder={t('projects.form.projectNamePlaceholder')} />
        </div>

        {!isEdit && (
          <div className="form-group">
            <label htmlFor="pf-customer">{t('projects.form.customer')} <span className="required">*</span></label>
            <select id="pf-customer" value={fields.customer_id} onChange={set('customer_id')} required>
              <option value="" disabled>{t('projects.form.selectCustomer')}</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}{c.company ? ` — ${c.company}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {isEdit && (
          <div className="form-group">
            <label htmlFor="pf-status">{t('projects.form.status')}</label>
            <select id="pf-status" value={fields.status} onChange={set('status')}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{t(`projects.status.${s}`)}</option>)}
            </select>
          </div>
        )}

        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="pf-start">{t('projects.form.startDate')}</label>
            <input id="pf-start" type="date" value={fields.start_date} onChange={set('start_date')} />
          </div>
          <div className="form-group">
            <label htmlFor="pf-end">{t('projects.form.endDate')}</label>
            <input id="pf-end" type="date" value={fields.end_date} onChange={set('end_date')} />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="pf-notes">{t('projects.form.notes')}</label>
          <textarea id="pf-notes" value={fields.notes} onChange={set('notes')} placeholder={t('projects.form.notesPlaceholder')} rows={3} />
        </div>
      </form>
    </Modal>
  )
}
