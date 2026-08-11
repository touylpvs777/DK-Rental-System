import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { getMe } from '@/api/auth'

export default function PrivateRoute() {
  const { t } = useTranslation()
  const { token, user, setUser, logout } = useAuthStore()

  useEffect(() => {
    if (token && !user) {
      getMe()
        .then(({ data }) => setUser(data))
        .catch(() => logout())
    }
  }, [token, user, setUser, logout])

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (!user) {
    return (
      <div
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12 }}
        role="status"
        aria-busy="true"
        aria-label={t('common.loadingApplication')}
      >
        <Loader2 size={24} className="spin" style={{ color: 'var(--color-primary-500)' }} />
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{t('common.loading')}</span>
      </div>
    )
  }

  return <Outlet />
}
