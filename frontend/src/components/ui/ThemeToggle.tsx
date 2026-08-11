import { Sun, Moon, Monitor } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useThemeStore, type ThemeMode } from '@/store/themeStore'
import './ThemeToggle.css'

const OPTIONS: { mode: ThemeMode; icon: React.ElementType; labelKey: string }[] = [
  { mode: 'light', icon: Sun, labelKey: 'common.themeLight' },
  { mode: 'dark', icon: Moon, labelKey: 'common.themeDark' },
  { mode: 'system', icon: Monitor, labelKey: 'common.themeSystem' },
]

export default function ThemeToggle() {
  const { t } = useTranslation()
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)

  return (
    <div className="theme-toggle" role="radiogroup" aria-label={t('common.theme')}>
      {OPTIONS.map(({ mode: m, icon: Icon, labelKey }) => (
        <button
          key={m}
          className={`theme-toggle-btn${mode === m ? ' active' : ''}`}
          onClick={() => setMode(m)}
          aria-label={t(labelKey)}
          aria-checked={mode === m}
          role="radio"
          title={t(labelKey)}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  )
}
