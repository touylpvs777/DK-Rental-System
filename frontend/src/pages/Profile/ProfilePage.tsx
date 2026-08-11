import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { useAuthStore } from '@/store/authStore'
import { useAvatarStore } from '@/store/avatarStore'
import { toast } from '@/store/toastStore'
import { resolveMediaUrl } from '@/utils/media'

const MIN_PASSWORD_LENGTH = 8

const cardClass =
  'rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800'
const sectionTitleClass =
  'mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400'
const labelClass = 'grid gap-1.5 text-sm text-slate-700 dark:text-slate-300'
const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:focus:border-blue-500 dark:focus:ring-blue-900/40'

function splitName(fullName: string | null | undefined): { first: string; last: string } {
  const trimmed = fullName?.trim()
  if (!trimmed) return { first: '', last: '' }
  const [first, ...rest] = trimmed.split(/\s+/)
  return { first, last: rest.join(' ') }
}

export default function ProfilePage() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const customAvatar = useAvatarStore((s) => s.customAvatar)
  const setCustomAvatar = useAvatarStore((s) => s.setCustomAvatar)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const initialName = splitName(user?.full_name)
  const [firstName, setFirstName] = useState(initialName.first)
  const [lastName, setLastName] = useState(initialName.last)
  const [email, setEmail] = useState(user?.email ?? '')
  const [phone, setPhone] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const avatarUrl = customAvatar ?? resolveMediaUrl(user?.avatar_url)
  const initials = user
    ? (user.full_name ?? user.username).split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'
  const displayName = user?.full_name ?? user?.username ?? '—'
  const role = user?.is_superuser ? t('header.roleAdmin') : t('header.roleUser')

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setCustomAvatar(reader.result as string)
    reader.readAsDataURL(file)
  }

  const resetForm = () => {
    setFirstName(initialName.first)
    setLastName(initialName.last)
    setEmail(user?.email ?? '')
    setPhone('')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError(null)
  }

  const handleSave = (e: FormEvent) => {
    e.preventDefault()
    setPasswordError(null)

    if (currentPassword || newPassword || confirmPassword) {
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        setPasswordError(t('profile.security.tooShortError'))
        return
      }
      if (newPassword !== confirmPassword) {
        setPasswordError(t('profile.security.mismatchError'))
        return
      }
    }

    // Front-end only for now — no API call. Password fields are cleared so
    // nothing sensitive lingers in state after a simulated save.
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    toast.success(t('profile.savedToast'))
  }

  return (
    <div className="grid gap-5" style={{ maxWidth: 880 }}>
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} />

      <form onSubmit={handleSave} className="grid gap-5">
        {/* Avatar & basic info */}
        <div className={cardClass}>
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <button
              type="button"
              className="group relative h-20 w-20 shrink-0 rounded-full"
              onClick={() => fileInputRef.current?.click()}
              title={t('profile.uploadPhoto')}
            >
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-800 to-blue-500 text-2xl font-bold text-blue-50">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                <Camera size={22} />
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-white">{displayName}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{role}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {t('profile.uploadPhoto')}
              </button>
            </div>
          </div>
        </div>

        {/* Personal details */}
        <div className={cardClass}>
          <h3 className={sectionTitleClass}>{t('profile.personalDetails.title')}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              <span>{t('profile.personalDetails.firstName')}</span>
              <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </label>
            <label className={labelClass}>
              <span>{t('profile.personalDetails.lastName')}</span>
              <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </label>
            <label className={labelClass}>
              <span>{t('profile.personalDetails.email')}</span>
              <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className={labelClass}>
              <span>{t('profile.personalDetails.phone')}</span>
              <input
                type="tel"
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('profile.personalDetails.phonePlaceholder')}
              />
            </label>
          </div>
        </div>

        {/* Security */}
        <div className={cardClass}>
          <h3 className={sectionTitleClass}>{t('profile.security.title')}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={`${labelClass} sm:col-span-2`}>
              <span>{t('profile.security.currentPassword')}</span>
              <input
                type="password"
                autoComplete="current-password"
                className={inputClass}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </label>
            <label className={labelClass}>
              <span>{t('profile.security.newPassword')}</span>
              <input
                type="password"
                autoComplete="new-password"
                className={inputClass}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={MIN_PASSWORD_LENGTH}
              />
            </label>
            <label className={labelClass}>
              <span>{t('profile.security.confirmPassword')}</span>
              <input
                type="password"
                autoComplete="new-password"
                className={inputClass}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={MIN_PASSWORD_LENGTH}
              />
            </label>
          </div>
          {passwordError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{passwordError}</p>}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            {t('profile.saveChanges')}
          </button>
        </div>
      </form>
    </div>
  )
}
