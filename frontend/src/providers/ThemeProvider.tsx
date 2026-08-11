import { useEffect, type ReactNode } from 'react'
import { useThemeStore } from '@/store/themeStore'

const MQ = '(prefers-color-scheme: dark)'

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useThemeStore((s) => s.mode)
  const setResolved = useThemeStore((s) => s.setResolved)

  useEffect(() => {
    function apply() {
      const isDark =
        mode === 'dark' || (mode === 'system' && window.matchMedia(MQ).matches)
      const resolved = isDark ? 'dark' : 'light'
      document.documentElement.setAttribute('data-theme', resolved)
      setResolved(resolved)
    }

    apply()

    if (mode === 'system') {
      const mql = window.matchMedia(MQ)
      mql.addEventListener('change', apply)
      return () => mql.removeEventListener('change', apply)
    }
  }, [mode, setResolved])

  return <>{children}</>
}
