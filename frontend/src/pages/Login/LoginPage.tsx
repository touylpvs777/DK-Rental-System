import { type FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { User, Lock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import LanguageToggle from '@/components/ui/LanguageToggle'

export default function LoginPage() {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading, error, login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    login({ username, password })
  }

  const inputClass =
    'w-full rounded-lg border border-white/30 bg-transparent py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/60 outline-none transition-colors focus:border-white/70'

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center bg-cover bg-center p-6"
      style={{ backgroundImage: "url('/login.jpeg')" }}
    >
      {/* Dim overlay so the card and text read clearly against the photo */}
      <div aria-hidden="true" className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-wide text-white">DK LAO</h1>
          <p className="mt-2 text-sm font-medium uppercase tracking-widest text-white/90">
            {t('login.subtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-400/40 bg-red-500/20 px-4 py-2 text-sm text-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-sm text-white/90">
              {t('login.username')}
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('login.usernamePlaceholder')}
                autoComplete="username"
                autoFocus
                required
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm text-white/90">
              {t('login.password')}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.passwordPlaceholder')}
                autoComplete="current-password"
                required
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <a href="#" className="text-sm text-white/90 hover:text-white hover:underline">
              {t('login.forgotPassword')}
            </a>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {t('login.signingIn')}
              </>
            ) : (
              t('login.signIn')
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/90">
          {t('login.noAccount')}{' '}
          <a href="#" className="font-semibold text-white hover:underline">
            {t('login.signUp')}
          </a>
        </p>

        <div className="mt-6 flex justify-center">
          <LanguageToggle />
        </div>
      </div>
    </div>
  )
}
