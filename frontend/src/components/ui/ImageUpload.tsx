import { useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, X, CheckCircle2, Link2, Loader2 } from 'lucide-react'
import { uploadImage, uploadImageFromUrl, type UploadResult } from '@/api/upload'
import { resolveMediaUrl } from '@/utils/media'
import { toast } from '@/store/toastStore'
import './ImageUpload.css'

const ACCEPTED = '.jpg,.jpeg,.png,.webp'
const MAX_SIZE_MB = 5
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024

function extractErrorMessage(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string }
    if (first?.msg) return first.msg
  }
  return fallback
}

interface Props {
  onUploaded?: (result: UploadResult) => void
  /** Called when the user clears a previously-set image via the remove (×) button. */
  onRemoved?: () => void
  /** Pre-seeds the preview with an already-known image (e.g. when editing an
   * existing record). Read once on mount — the parent's `key` prop should
   * change to force a remount if the underlying record being edited changes
   * while this component stays on screen. */
  initialImageUrl?: string | null
  className?: string
}

export default function ImageUpload({ onUploaded, onRemoved, initialImageUrl, className }: Props) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(() => resolveMediaUrl(initialImageUrl) ?? null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [dragging, setDragging] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [urlLoading, setUrlLoading] = useState(false)

  const reset = () => {
    setPreview(null)
    setProgress(null)
    setError(null)
    setResult(null)
    setUrlInput('')
    if (inputRef.current) inputRef.current.value = ''
    onRemoved?.()
  }

  const validate = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      return t('imageUpload.invalidFormat')
    }
    if (file.size > MAX_SIZE_BYTES) {
      return t('imageUpload.fileTooLarge', { size: MAX_SIZE_MB })
    }
    if (!file.type.startsWith('image/')) {
      return t('imageUpload.invalidImage')
    }
    return null
  }

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setResult(null)

    const validationError = validate(file)
    if (validationError) {
      setError(validationError)
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setProgress(0)

    try {
      const res = await uploadImage(file, setProgress)
      setResult(res)
      setProgress(100)
      onUploaded?.(res)
    } catch (err) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail || t('imageUpload.uploadFailed')
      setError(msg)
      setProgress(null)
    }
  }, [onUploaded])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleUrlFetch = useCallback(async () => {
    const trimmed = urlInput.trim()
    if (!trimmed || urlLoading) return

    setUrlLoading(true)
    try {
      const res = await uploadImageFromUrl(trimmed)
      setPreview(resolveMediaUrl(res.url))
      setResult(res)
      setError(null)
      setProgress(null)
      setUrlInput('')
      onUploaded?.(res)
    } catch (err) {
      toast.error(extractErrorMessage(err, t('imageUpload.urlFetchFailed')))
    } finally {
      setUrlLoading(false)
    }
  }, [urlInput, urlLoading, onUploaded, t])

  const onUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleUrlFetch()
    }
  }

  if (preview) {
    return (
      <div className={className}>
        <div className="img-upload-preview">
          <img src={preview} alt={t('imageUpload.previewAlt')} />
          <button className="img-upload-remove" onClick={reset} title={t('imageUpload.remove')} type="button">
            <X size={14} />
          </button>
        </div>

        {progress !== null && progress < 100 && (
          <div className="img-upload-progress">
            <div className="img-upload-progress-bar">
              <div className="img-upload-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="img-upload-progress-text">{progress}%</div>
          </div>
        )}

        {result && (
          <div className="img-upload-success">
            <CheckCircle2 size={14} /> {t('imageUpload.uploadedSuccessfully')}
          </div>
        )}

        {error && <div className="img-upload-error">{error}</div>}
      </div>
    )
  }

  return (
    <div className={className}>
      <div
        className={`img-upload${dragging ? ' dragging' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          onChange={onFileChange}
          hidden
        />
        <div className="img-upload-icon"><Upload size={28} /></div>
        <div className="img-upload-label">{t('imageUpload.clickOrDrag')}</div>
        <div className="img-upload-hint">{t('imageUpload.hint', { size: MAX_SIZE_MB })}</div>
      </div>
      {error && <div className="img-upload-error">{error}</div>}

      <div className="img-upload-divider">{t('imageUpload.orDivider')}</div>

      <div className="img-upload-url-row">
        <input
          type="url"
          className="img-upload-url-input"
          placeholder={t('imageUpload.urlPlaceholder')}
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={onUrlKeyDown}
          disabled={urlLoading}
        />
        <button
          type="button"
          className="img-upload-url-btn"
          onClick={handleUrlFetch}
          disabled={urlLoading || !urlInput.trim()}
        >
          {urlLoading ? <Loader2 size={14} className="img-upload-spin" /> : <Link2 size={14} />}
          {t('imageUpload.fetchButton')}
        </button>
      </div>
    </div>
  )
}
