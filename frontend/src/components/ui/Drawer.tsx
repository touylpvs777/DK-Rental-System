import { useEffect, useRef, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import './Drawer.css'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: number
}

export default function Drawer({ isOpen, onClose, title, children, width = 440 }: DrawerProps) {
  const { t } = useTranslation()
  const drawerRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key !== 'Tab' || !drawerRef.current) return
    const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus() }
    }
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    previousFocus.current = document.activeElement as HTMLElement
    document.addEventListener('keydown', trapFocus)
    requestAnimationFrame(() => { drawerRef.current?.querySelector<HTMLElement>('button')?.focus() })
    return () => {
      document.removeEventListener('keydown', trapFocus)
      previousFocus.current?.focus()
    }
  }, [isOpen, trapFocus])

  if (!isOpen) return null

  const titleId = `drawer-title-${title.replace(/\s+/g, '-').toLowerCase()}`

  return createPortal(
    <div className="drawer-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div
        ref={drawerRef}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ width }}
      >
        <div className="drawer-header">
          <span className="drawer-title" id={titleId}>{title}</span>
          <button className="modal-close" onClick={onClose} aria-label={t('common.closePanel')}>
            <X size={16} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </div>,
    document.body
  )
}
