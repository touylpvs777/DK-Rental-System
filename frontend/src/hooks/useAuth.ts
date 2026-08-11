import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { login as loginApi, logoutApi, getMe } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import type { LoginRequest } from '@/types/auth'

export function useAuth() {
  const { t } = useTranslation()
  const { token, user, setToken, setRefreshToken, setUser, logout: clearAuth, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data: tokenData } = await loginApi(credentials)
      setToken(tokenData.access_token)
      setRefreshToken(tokenData.refresh_token)
      const { data: me } = await getMe()
      setUser(me)
      navigate('/dashboard')
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })
        ?.response?.data?.detail
      const msg = typeof detail === 'string'
        ? detail
        : t('login.invalidCredentials')
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await logoutApi()
    } catch {
      // Ignore errors — clear local state regardless
    }
    clearAuth()
    navigate('/login')
  }

  return { token, user, isAuthenticated, isLoading, error, login, logout }
}
