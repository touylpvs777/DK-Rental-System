import { useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { buildBreadcrumbs, getPageTitleKey } from '@/config/routes'
import './Breadcrumb.css'

export default function Breadcrumb() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const crumbs = buildBreadcrumbs(pathname)
  const title = t(getPageTitleKey(pathname))

  useEffect(() => {
    document.title = `${title} — ${t('common.brandName')}`
  }, [title, t])

  if (crumbs.length <= 1) {
    return <span className="breadcrumb-title">{title}</span>
  }

  return (
    <nav className="breadcrumb" aria-label={t('header.breadcrumb')}>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={i} className="breadcrumb-segment">
            {i > 0 && <ChevronRight size={14} className="breadcrumb-sep" />}
            {isLast ? (
              <span className="breadcrumb-current">{t(crumb.labelKey)}</span>
            ) : (
              <Link to={crumb.path} className="breadcrumb-link">
                {t(crumb.labelKey)}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
