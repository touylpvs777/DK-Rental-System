import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'
import { getParts } from '@/api/inventory'
import type { SparePart } from '@/types/inventory'

interface Props {
  onSelect: (part: SparePart) => void
  placeholder?: string
}

export default function SparePartSelect({ onSelect, placeholder }: Props) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SparePart[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    const handle = setTimeout(async () => {
      setIsLoading(true)
      try {
        const { data } = await getParts({ q: query || undefined, page_size: 8 })
        if (!cancelled) setResults(data.items)
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(handle) }
  }, [query, isOpen])

  const handleSelect = (p: SparePart) => {
    onSelect(p)
    setIsOpen(false)
    setQuery('')
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true) }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder ?? t('inventory.purchaseOrder.form.linkCatalogPartPlaceholder')}
          style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px 6px 26px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius)', fontSize: 12.5 }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label={t('common.clear')}
            style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)', zIndex: 30,
          maxHeight: 220, overflowY: 'auto',
        }}>
          {isLoading ? (
            <div style={{ padding: 10, fontSize: 12.5, color: 'var(--color-text-muted)' }}>{t('common.loading')}</div>
          ) : results.length === 0 ? (
            <div style={{ padding: 10, fontSize: 12.5, color: 'var(--color-text-muted)' }}>{t('inventory.purchaseOrder.form.noPartsFound')}</div>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12.5 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-subtle)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <strong>{p.part_number}</strong>
                <span style={{ color: 'var(--color-text-muted)' }}> · {p.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
