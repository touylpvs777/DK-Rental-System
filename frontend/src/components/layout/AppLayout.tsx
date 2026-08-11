import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSidebarStore } from '@/store/sidebarStore'
import Sidebar from './Sidebar'
import Header from './Header'
import PrintHeader from '@/components/print/PrintHeader'
import './AppLayout.css'

export default function AppLayout() {
  const { t } = useTranslation()
  const sidebarState = useSidebarStore((s) => s.state)
  const setState = useSidebarStore((s) => s.setState)

  useEffect(() => {
    let lastDesktopState: 'expanded' | 'collapsed' = 'collapsed'

    const handler = () => {
      const w = window.innerWidth
      if (w <= 768) {
        setState('hidden')
      } else if (w <= 1024) {
        setState('collapsed')
      } else {
        const saved = localStorage.getItem('dk-sidebar-v2') as 'expanded' | 'collapsed' | null
        setState(saved === 'collapsed' ? 'collapsed' : lastDesktopState)
      }
    }

    const current = useSidebarStore.getState().state
    if (current !== 'hidden') lastDesktopState = current as 'expanded' | 'collapsed'

    handler()
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [setState])

  const sidebarWidth =
    sidebarState === 'expanded' ? 'var(--sidebar-width-expanded)' :
    sidebarState === 'collapsed' ? 'var(--sidebar-width-collapsed)' :
    '0px'

  return (
    <div
      className="app-shell"
      style={{ '--sidebar-width': sidebarWidth } as React.CSSProperties}
    >
      <a href="#main-content" className="skip-to-content">{t('common.skipToContent')}</a>
      <PrintHeader />
      <Sidebar />
      <div className="app-main">
        <Header />
        <main className="app-content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
