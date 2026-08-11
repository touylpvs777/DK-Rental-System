import { LayoutGrid, List } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ViewToggleProps {
  view: 'grid' | 'list'
  onChange: (view: 'grid' | 'list') => void
}

export default function ViewToggle({ view, onChange }: ViewToggleProps) {
  const { t } = useTranslation()
  return (
    <div className="mp-view-toggle">
      <button
        className={`mp-view-btn${view === 'grid' ? ' active' : ''}`}
        onClick={() => onChange('grid')}
        title={t('common.gridView')}
        aria-label={t('common.gridView')}
      >
        <LayoutGrid size={15} />
      </button>
      <button
        className={`mp-view-btn${view === 'list' ? ' active' : ''}`}
        onClick={() => onChange('list')}
        title={t('common.listView')}
        aria-label={t('common.listView')}
      >
        <List size={15} />
      </button>
    </div>
  )
}
