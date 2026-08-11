import { Search, X } from 'lucide-react'
import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  value: string
  onChange: (q: string) => void
  placeholder?: string
}

export default function EquipmentSearch({ value, onChange, placeholder }: Props) {
  const { t } = useTranslation()
  const [local, setLocal] = useState(value)

  useEffect(() => { setLocal(value) }, [value])

  const handleChange = useCallback((v: string) => {
    setLocal(v)
    onChange(v)
  }, [onChange])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)', padding: '10px 16px',
      maxWidth: 480, flex: 1, minWidth: 200,
      transition: 'border-color 0.15s, box-shadow 0.15s',
    }}
    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary-400)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
    >
      <Search size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
      <input
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder ?? t('equipment.filters.searchPlaceholder')}
        style={{
          flex: 1, border: 'none', outline: 'none', background: 'transparent',
          fontSize: 14, color: 'var(--color-text)', fontFamily: 'inherit',
        }}
      />
      {local && (
        <button
          onClick={() => handleChange('')}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, display: 'flex', color: 'var(--color-text-muted)' }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
