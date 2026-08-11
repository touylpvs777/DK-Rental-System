import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { importNow } from '@/api/catalog'
import type { ImportExecuteResponse } from '@/types/catalog'
import { toast } from '@/store/toastStore'
import PageHeader from '@/components/layout/PageHeader'
import './ImportPage.css'
import '@/styles/shared.css'

/**
 * Dumb frontend / smart backend: this page never reads, parses, or validates
 * the file's contents — it only collects a File and hands it to the backend
 * as-is via POST /catalog/products/import/. Every decision (sheet detection,
 * row validation, what gets created vs. updated) happens server-side; the
 * result shown below is exactly what that response says.
 */
export default function ImportPage() {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<ImportExecuteResponse | null>(null)
  const [transportError, setTransportError] = useState<string | null>(null)

  const handleFileSelect = (f: File) => {
    setTransportError(null)
    setSelectedFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }

  const handleImport = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    setTransportError(null)
    try {
      const { data } = await importNow(selectedFile)
      setResult(data)
      if (data.error_rows === 0) toast.success(t('catalog.import.successToast', { count: data.success_rows }))
      else toast.error(t('catalog.import.errorToast', { count: data.error_rows }))
    } catch {
      // The request never reached (or never returned from) the backend —
      // there is no API response to display, so this is the one message
      // not sourced from it.
      setTransportError(t('catalog.import.uploadFailed'))
    } finally {
      setIsUploading(false)
    }
  }

  const reset = () => {
    setSelectedFile(null)
    setResult(null)
    setTransportError(null)
    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="import-page">
      {/* Header */}
      <PageHeader title={t('catalog.import.title')} subtitle={t('catalog.import.subtitle')} />

      {result ? (
        <div className="import-section">
          <div className={`result-banner ${result.error_rows === 0 ? 'success' : 'partial'}`}>
            {result.error_rows === 0 ? (
              <><CheckCircle2 size={24} /> {t('catalog.import.successBanner')}</>
            ) : (
              <><AlertCircle size={24} /> {t('catalog.import.partialBanner')}</>
            )}
          </div>

          <div className="preview-summary">
            <div className="summary-card valid">
              <div className="summary-label">{t('catalog.import.imported')}</div>
              <div className="summary-value">{result.success_rows}</div>
            </div>
            <div className={`summary-card${result.error_rows > 0 ? ' error' : ''}`}>
              <div className="summary-label">{t('catalog.import.errors')}</div>
              <div className="summary-value">{result.error_rows}</div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="table-card" style={{ marginTop: 16 }}>
              <div style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13.5 }}>{t('catalog.import.failedRows')}</div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('catalog.import.table.sheet')}</th>
                      <th>{t('catalog.import.table.rowNum')}</th>
                      <th>{t('catalog.import.table.error')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((e, i) => (
                      <tr key={i}>
                        <td className="cell-muted">{e.sheet_name}</td>
                        <td className="cell-muted cell-mono">{e.row_number}</td>
                        <td style={{ color: 'var(--color-danger-600)' }}>{e.error_message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="import-actions">
            <button className="btn btn-secondary" onClick={reset}>{t('catalog.import.importAnother')}</button>
            <a href="/catalog" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {t('catalog.import.viewCatalog')}
            </a>
          </div>
        </div>
      ) : isUploading ? (
        <div className="import-section">
          <div className="dropzone" style={{ cursor: 'default' }}>
            <Loader2 size={40} className="dropzone-icon spin" />
            <div className="dropzone-text">{t('catalog.import.importing')}</div>
            <div className="dropzone-hint">{t('catalog.import.uploadingHint')}</div>
          </div>
        </div>
      ) : (
        <div className="import-section">
          <div
            className={`dropzone${isDragging ? ' dragging' : ''}${selectedFile ? ' has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
            />
            <FileSpreadsheet size={40} className="dropzone-icon" />
            {selectedFile ? (
              <>
                <div className="dropzone-filename">{selectedFile.name}</div>
                <div className="dropzone-size">{(selectedFile.size / 1024).toFixed(1)} KB</div>
              </>
            ) : (
              <>
                <div className="dropzone-text">{t('catalog.import.dropzoneText')}</div>
                <div className="dropzone-hint">{t('catalog.import.dropzoneHint')}</div>
              </>
            )}
          </div>

          {selectedFile && (
            <div className="import-actions">
              <button className="btn btn-secondary" onClick={reset}>{t('catalog.import.clear')}</button>
              <button className="btn btn-primary" onClick={handleImport}>
                <Upload size={15} /> {t('catalog.import.importButton')}
              </button>
            </div>
          )}

          {transportError && (
            <p style={{ fontSize: 13, color: 'var(--color-danger-600)', textAlign: 'center' }}>
              {transportError}
            </p>
          )}

          <div className="import-info">
            <AlertCircle size={14} />
            <div>
              <strong>{t('catalog.import.supportedSheetsLabel')}</strong> {t('catalog.import.supportedSheetsList')}
              {' '}{t('catalog.import.autoDetectHint')}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
