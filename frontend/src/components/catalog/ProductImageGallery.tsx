import { useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { ProductImage } from '@/types/catalog'

interface GalleryProps {
  images: ProductImage[]
  productName: string
}

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 24 24" fill="none" stroke="%23cbd5e1" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"%3E%3Crect x="2" y="2" width="20" height="20" rx="2"/%3E%3Ccircle cx="8.5" cy="8.5" r="1.5"/%3E%3Cpath d="M21 15l-5-5L5 21"/%3E%3C/svg%3E'

export default function ProductImageGallery({ images, productName }: GalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [lightbox, setLightbox]   = useState(false)

  const sorted = [...images].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
    return a.sort_order - b.sort_order
  })

  const active = sorted[activeIdx]
  const src    = active?.image_url ?? PLACEHOLDER

  const prev = () => setActiveIdx((i) => Math.max(0, i - 1))
  const next = () => setActiveIdx((i) => Math.min(sorted.length - 1, i + 1))

  return (
    <>
      <div className="gallery">
        {/* Main image */}
        <div className="gallery-main" onClick={() => setLightbox(true)}>
          <img
            src={src}
            alt={active?.alt_text ?? productName}
            className="gallery-main-img"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
          />
          {sorted.length > 1 && (
            <>
              <button className="gallery-arrow left" onClick={(e) => { e.stopPropagation(); prev() }} disabled={activeIdx === 0}>
                <ChevronLeft size={18} />
              </button>
              <button className="gallery-arrow right" onClick={(e) => { e.stopPropagation(); next() }} disabled={activeIdx === sorted.length - 1}>
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {sorted.length > 1 && (
          <div className="gallery-thumbs">
            {sorted.map((img, i) => (
              <button
                key={img.id}
                className={`gallery-thumb${i === activeIdx ? ' active' : ''}`}
                onClick={() => setActiveIdx(i)}
              >
                <img
                  src={img.image_url}
                  alt={img.alt_text ?? `${productName} ${i + 1}`}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="gallery-lightbox" onClick={() => setLightbox(false)}>
          <button className="gallery-lb-close" onClick={() => setLightbox(false)}>
            <X size={20} />
          </button>
          <img
            src={src}
            alt={active?.alt_text ?? productName}
            className="gallery-lb-img"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER }}
          />
          {sorted.length > 1 && (
            <>
              <button className="gallery-arrow left lb" onClick={(e) => { e.stopPropagation(); prev() }} disabled={activeIdx === 0}>
                <ChevronLeft size={24} />
              </button>
              <button className="gallery-arrow right lb" onClick={(e) => { e.stopPropagation(); next() }} disabled={activeIdx === sorted.length - 1}>
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>
      )}
    </>
  )
}
