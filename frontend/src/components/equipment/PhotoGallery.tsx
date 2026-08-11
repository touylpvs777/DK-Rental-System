import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, X, Camera, Maximize2 } from 'lucide-react'
import { createPortal } from 'react-dom'
import type { ForkliftPhotoEntry } from '@/types/forklift'
import './PhotoGallery.css'

interface PhotoGalleryProps {
  photos: ForkliftPhotoEntry[]
  assetName: string
}

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="1"%3E%3Crect x="2" y="2" width="20" height="20" rx="2"/%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"/%3E%3Cpath d="M21 15l-5-5L5 21"/%3E%3C/svg%3E'

export default function PhotoGallery({ photos, assetName }: PhotoGalleryProps) {
  const { t } = useTranslation()
  const sorted = [...photos].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
    return a.sort_order - b.sort_order
  })

  const [idx, setIdx] = useState(0)
  const [lightbox, setLightbox] = useState(false)

  const active = sorted[idx]
  const src = active?.image_url ?? PLACEHOLDER
  const total = sorted.length

  const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), [])
  const next = useCallback(() => setIdx((i) => Math.min(total - 1, i + 1)), [total])

  useEffect(() => {
    if (!lightbox) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'Escape') setLightbox(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [lightbox, prev, next])

  if (!photos.length) {
    return (
      <div className="gallery-empty">
        <Camera size={40} />
        <p>{t('equipment.gallery.noPhotos')}</p>
        <small>{t('equipment.gallery.noPhotosHint')}</small>
      </div>
    )
  }

  return (
    <>
      <div className="gallery">
        <div className="gallery-main" onClick={() => setLightbox(true)}>
          <img src={src} alt={active?.alt_text ?? assetName} className="gallery-main-img"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }} />
          {total > 1 && (
            <>
              <button className="gallery-arrow left" aria-label={t('equipment.gallery.previousPhoto')} onClick={(e) => { e.stopPropagation(); prev() }} disabled={idx === 0}><ChevronLeft size={18} /></button>
              <button className="gallery-arrow right" aria-label={t('equipment.gallery.nextPhoto')} onClick={(e) => { e.stopPropagation(); next() }} disabled={idx === total - 1}><ChevronRight size={18} /></button>
            </>
          )}
          <div className="gallery-counter">{idx + 1} / {total}</div>
          <button className="gallery-fullscreen" aria-label={t('equipment.gallery.viewFullscreen')} onClick={(e) => { e.stopPropagation(); setLightbox(true) }}><Maximize2 size={14} /></button>
        </div>

        {total > 1 && (
          <div className="gallery-thumbs">
            {sorted.map((p, i) => (
              <button key={p.id} className={`gallery-thumb${i === idx ? ' active' : ''}`} onClick={() => setIdx(i)}>
                <img src={p.thumbnail_url ?? p.image_url} alt={p.alt_text ?? ''} onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }} />
              </button>
            ))}
          </div>
        )}

        {active?.caption && <div className="gallery-caption">{active.caption}</div>}
      </div>

      {lightbox && createPortal(
        <div className="gallery-lightbox" onClick={() => setLightbox(false)}>
          <button className="gallery-lb-close" aria-label={t('common.close')} onClick={() => setLightbox(false)}><X size={20} /></button>
          <div className="gallery-lb-counter">{idx + 1} / {total}</div>
          <img src={src} alt={active?.alt_text ?? assetName} className="gallery-lb-img" onClick={(e) => e.stopPropagation()}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }} />
          {total > 1 && (
            <>
              <button className="gallery-lb-arrow left" aria-label={t('equipment.gallery.previousPhoto')} onClick={(e) => { e.stopPropagation(); prev() }} disabled={idx === 0}><ChevronLeft size={28} /></button>
              <button className="gallery-lb-arrow right" aria-label={t('equipment.gallery.nextPhoto')} onClick={(e) => { e.stopPropagation(); next() }} disabled={idx === total - 1}><ChevronRight size={28} /></button>
            </>
          )}
          <div className="gallery-lb-thumbs" onClick={(e) => e.stopPropagation()}>
            {sorted.map((p, i) => (
              <button key={p.id} className={`gallery-lb-thumb${i === idx ? ' active' : ''}`} onClick={() => setIdx(i)}>
                <img src={p.thumbnail_url ?? p.image_url} alt="" />
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
