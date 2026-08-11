import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Settings, LogOut, UserCircle, KeyRound } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import ThemeToggle from './ThemeToggle'
import './UserProfileDropdown.css'

export default function UserProfileDropdown() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const initials = user
    ? (user.full_name ?? user.username).split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'
  const displayName = user?.full_name ?? user?.username ?? '—'
  const email = user?.email ?? ''
  const role = user?.is_superuser ? t('header.roleAdmin') : t('header.roleUser')

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const handleLogout = () => {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <div className="user-dropdown" ref={ref}>
      <button className="user-dropdown-trigger" onClick={() => setIsOpen((v) => !v)}>
        <div className="user-dropdown-avatar">{initials}</div>
        <span className="user-dropdown-name">{displayName}</span>
        <ChevronDown size={14} className="user-dropdown-chevron" />
      </button>

      {isOpen && (
        <div className="user-dropdown-menu">
          <div className="user-dropdown-header">
            <div className="user-dropdown-avatar lg">{initials}</div>
            <div className="user-dropdown-header-info">
              <div className="user-dropdown-header-name">{displayName}</div>
              {email && <div className="user-dropdown-header-email">{email}</div>}
              <div className="user-dropdown-header-role">{role}</div>
            </div>
          </div>

          <div className="user-dropdown-section">
            <div className="user-dropdown-section-label">{t('header.appearance')}</div>
            <div className="user-dropdown-theme-row">
              <ThemeToggle />
            </div>
          </div>

          <div className="user-dropdown-divider" />

          <button className="user-dropdown-item" onClick={() => { setIsOpen(false); navigate('/settings') }}>
            <Settings size={14} /> {t('header.settings')}
          </button>

          <div className="user-dropdown-divider" />

          <button className="user-dropdown-item" onClick={() => { setIsOpen(false); navigate('/profile') }}>
            <UserCircle size={14} /> {t('header.myProfile')}
          </button>
          <button className="user-dropdown-item" onClick={() => { setIsOpen(false); navigate('/change-password') }}>
            <KeyRound size={14} /> {t('header.changePassword')}
          </button>

          <div className="user-dropdown-divider" />

          <button className="user-dropdown-item danger" onClick={handleLogout}>
            <LogOut size={14} /> {t('header.logout')}
          </button>
        </div>
      )}
    </div>
  )
}
