import { useRef, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ScrollRowProps {
  title: string
  sub?: string
  children: ReactNode
}

export default function ScrollRow({ title, sub, children }: ScrollRowProps) {
  const { t } = useTranslation()
  const trackRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const updateArrows = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    updateArrows()
    const el = trackRef.current
    if (!el) return
    el.addEventListener('scroll', updateArrows, { passive: true })
    window.addEventListener('resize', updateArrows)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', updateArrows)
    }
  }, [updateArrows, children])

  const scrollBy = (dir: number) => {
    trackRef.current?.scrollBy({ left: dir * trackRef.current.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <div>
      <div className="mp-row-head">
        <div>
          <span className="mp-section-title">{title}</span>
          {sub && <span className="mp-section-sub">{sub}</span>}
        </div>
        <div className="mp-row-nav">
          <button type="button" className="mp-row-nav-btn" onClick={() => scrollBy(-1)} disabled={!canLeft} aria-label={t('common.scrollLeft')}>
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="mp-row-nav-btn" onClick={() => scrollBy(1)} disabled={!canRight} aria-label={t('common.scrollRight')}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="mp-row-scroll" ref={trackRef}>
        {children}
      </div>
    </div>
  )
}
