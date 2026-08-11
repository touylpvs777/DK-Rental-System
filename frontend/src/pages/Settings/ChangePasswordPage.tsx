import { useState, type CSSProperties, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyRound, Loader2 } from 'lucide-react'
import { changePassword } from '@/api/auth'
import { toast } from '@/store/toastStore'
import PageHeader from '@/components/layout/PageHeader'

const MIN_PASSWORD_LENGTH = 8

export default function ChangePasswordPage() {
  const { t } = useTranslation()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(t('changePassword.tooShortError'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('changePassword.mismatchError'))
      return
    }

    setSubmitting(true)
    try {
      await changePassword({ current_password: currentPassword, new_password: newPassword })
      toast.success(t('changePassword.successToast'))
      reset()
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      const message = status === 400
        ? t('changePassword.incorrectCurrentError')
        : (detail ?? t('changePassword.genericError'))
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 20, maxWidth: 480 }}>
      <PageHeader title={t('changePassword.title')} subtitle={t('changePassword.subtitle')} />

      <form
        onSubmit={handleSubmit}
        className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        style={{ display: 'grid', gap: 16 }}
      >
        <label className="grid gap-2 text-slate-700 dark:text-slate-300" style={{ display: 'grid', gap: 6 }}>
          <span>{t('changePassword.currentPassword')}</span>
          <input
            type="password"
            autoComplete="current-password"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            placeholder={t('changePassword.currentPasswordPlaceholder')}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={inputStyle}
            required
          />
        </label>

        <label className="grid gap-2 text-slate-700 dark:text-slate-300" style={{ display: 'grid', gap: 6 }}>
          <span>{t('changePassword.newPassword')}</span>
          <input
            type="password"
            autoComplete="new-password"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            placeholder={t('changePassword.newPasswordPlaceholder')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={inputStyle}
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </label>

        <label className="grid gap-2 text-slate-700 dark:text-slate-300" style={{ display: 'grid', gap: 6 }}>
          <span>{t('changePassword.confirmPassword')}</span>
          <input
            type="password"
            autoComplete="new-password"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            placeholder={t('changePassword.confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={inputStyle}
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
        </label>

        {error && (
          <div className="page-error">
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? <Loader2 size={16} className="spin" /> : <KeyRound size={16} />}
          {submitting ? t('changePassword.submitting') : t('changePassword.submit')}
        </button>
      </form>
    </div>
  )
}

const inputStyle: CSSProperties = {
  fontSize: 14,
}

const buttonStyle: CSSProperties = {
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
