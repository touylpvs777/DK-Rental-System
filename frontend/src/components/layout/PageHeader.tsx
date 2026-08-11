import type { CSSProperties, ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { getHeaderColorClass } from '@/utils/routeHeaderColor'

interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Right-side content — action buttons, toolbars, etc. */
  children?: ReactNode
  style?: CSSProperties
}

export default function PageHeader({ title, subtitle, children, style }: PageHeaderProps) {
  const { pathname } = useLocation()
  const colorClass = getHeaderColorClass(pathname)

  return (
    <div className={`page-header page-header-banner ${colorClass}`} style={style}>
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="page-header-sub">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
