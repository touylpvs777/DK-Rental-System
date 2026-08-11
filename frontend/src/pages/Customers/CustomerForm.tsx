import { useState, useEffect, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/ui/Modal'
import type { Customer, CustomerCreate, CustomerStatus } from '@/types/customer'

interface CustomerFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CustomerCreate) => Promise<boolean>
  customer?: Customer | null
}

const EMPTY = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  company: '',
  status: 'prospect' as CustomerStatus,
  notes: '',
}

export default function CustomerForm({ isOpen, onClose, onSubmit, customer }: CustomerFormProps) {
  const { t } = useTranslation()
  const isEdit = !!customer
  const [fields, setFields] = useState(EMPTY)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFields(
        customer
          ? {
              first_name: customer.first_name,
              last_name: customer.last_name,
              email: customer.email ?? '',
              phone: customer.phone ?? '',
              company: customer.company ?? '',
              status: customer.status,
              notes: customer.notes ?? '',
            }
          : EMPTY
      )
    }
  }, [isOpen, customer])

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setFields((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    const payload: CustomerCreate = {
      first_name: fields.first_name.trim(),
      last_name: fields.last_name.trim(),
      status: fields.status,
      ...(fields.email.trim()   && { email:   fields.email.trim() }),
      ...(fields.phone.trim()   && { phone:   fields.phone.trim() }),
      ...(fields.company.trim() && { company: fields.company.trim() }),
      ...(fields.notes.trim()   && { notes:   fields.notes.trim() }),
    }
    const ok = await onSubmit(payload)
    setIsLoading(false)
    if (ok) onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t('customers.form.editTitle') : t('customers.form.newTitle')}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isLoading}>
            {t('common.cancel')}
          </button>
          <button type="submit" form="customer-form" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? t('common.saving') : isEdit ? t('customers.form.saveChanges') : t('customers.form.createCustomer')}
          </button>
        </>
      }
    >
      <form id="customer-form" onSubmit={handleSubmit} className="form-grid">
        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="cf-first">{t('customers.form.firstNameLabel')} <span className="required">*</span></label>
            <input id="cf-first" value={fields.first_name} onChange={set('first_name')} required placeholder={t('customers.form.firstNamePlaceholder')} />
          </div>
          <div className="form-group">
            <label htmlFor="cf-last">{t('customers.form.lastNameLabel')} <span className="required">*</span></label>
            <input id="cf-last" value={fields.last_name} onChange={set('last_name')} required placeholder={t('customers.form.lastNamePlaceholder')} />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="cf-email">{t('common.email')}</label>
          <input id="cf-email" type="email" value={fields.email} onChange={set('email')} placeholder={t('customers.form.emailPlaceholder')} />
        </div>

        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="cf-phone">{t('common.phone')}</label>
            <input id="cf-phone" value={fields.phone} onChange={set('phone')} placeholder={t('customers.form.phonePlaceholder')} />
          </div>
          <div className="form-group">
            <label htmlFor="cf-status">{t('common.status')}</label>
            <select id="cf-status" value={fields.status} onChange={set('status')}>
              <option value="prospect">{t('customers.status.prospect')}</option>
              <option value="active">{t('customers.status.active')}</option>
              <option value="inactive">{t('customers.status.inactive')}</option>
              <option value="churned">{t('customers.status.churned')}</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="cf-company">{t('customers.form.companyLabel')}</label>
          <input id="cf-company" value={fields.company} onChange={set('company')} placeholder={t('customers.form.companyPlaceholder')} />
        </div>

        <div className="form-group">
          <label htmlFor="cf-notes">{t('common.notes')}</label>
          <textarea id="cf-notes" value={fields.notes} onChange={set('notes')} placeholder={t('customers.form.notesPlaceholder')} rows={3} />
        </div>
      </form>
    </Modal>
  )
}
