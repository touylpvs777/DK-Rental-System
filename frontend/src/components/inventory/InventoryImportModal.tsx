import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { importInventory } from '@/api/inventory'
import type { InventoryImportResult } from '@/types/inventory'

interface InventoryImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImported: () => void
}

/**
 * Dumb frontend / smart backend: this component never reads, parses, or
 * validates the file's contents — it only collects a File and hands it to
 * the backend as-is. Every accept/reject decision (extension, size, sheet
 * structure, row data) is made by POST /inventory/import, and the result
 * shown below is exactly what that response says, nothing inferred here.
 */
export default function InventoryImportModal({ isOpen, onClose, onImported }: InventoryImportModalProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<InventoryImportResult | null>(null)
  const [transportError, setTransportError] = useState<string | null>(null)

  const reset = () => {
    setSelectedFile(null)
    setResult(null)
    setTransportError(null)
    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleCloseAndRefresh = () => {
    reset()
    onClose()
    onImported()
  }

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

  const handleUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    setTransportError(null)
    try {
      const { data } = await importInventory(selectedFile)
      setResult(data)
    } catch {
      // The request never reached (or never returned from) the backend —
      // there is no API response to display, so this is the one message
      // not sourced from it.
      setTransportError(t('inventory.import.uploadFailed'))
    } finally {
      setIsUploading(false)
    }
  }

  const footer = result ? (
    <button
      type="button"
      onClick={handleCloseAndRefresh}
      className="pb-2 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
    >
      <CheckCircle2 size={15} /> {t('inventory.import.closeAndRefresh')}
    </button>
  ) : (
    <>
      <button
        type="button"
        onClick={handleClose}
        className="pb-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        {t('common.cancel')}
      </button>
      <button
        type="button"
        onClick={handleUpload}
        disabled={!selectedFile || isUploading}
        className="pb-2 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isUploading ? (
          <><Loader2 size={15} className="spin" /> {t('inventory.import.uploading')}</>
        ) : (
          <><UploadCloud size={15} /> {t('inventory.import.uploadButton')}</>
        )}
      </button>
    </>
  )

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('inventory.import.title')} width={520} footer={footer}>
      <p className="leading-relaxed mb-4 text-sm text-slate-500 dark:text-slate-400">
        {t('inventory.import.subtitle')}
      </p>

      {isUploading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-800">
          <Loader2 size={32} className="spin text-blue-600" />
          <div className="leading-relaxed pb-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            {t('inventory.import.uploading')}
          </div>
          <div className="leading-relaxed pb-1 text-xs text-slate-500 dark:text-slate-400">
            {t('inventory.import.uploadingHint')}
          </div>
        </div>
      ) : result ? (
        <div>
          <div
            className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${
              result.errors.length === 0
                ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/40'
                : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'
            }`}
          >
            {result.errors.length === 0 ? (
              <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-green-600 dark:text-green-400" />
            ) : (
              <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            )}
            <div>
              <div className="leading-relaxed pb-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                {result.errors.length === 0
                  ? t('inventory.import.successBanner')
                  : t('inventory.import.partialBanner')}
              </div>
              <div className="leading-relaxed pb-1 text-sm text-slate-600 dark:text-slate-300">
                {t('inventory.import.resultSummary', {
                  imported: result.rows_imported,
                  updated: result.rows_updated,
                })}
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="mt-4">
              <div className="leading-relaxed pb-1 mb-2 text-sm font-semibold text-red-700 dark:text-red-400">
                {t('inventory.import.rowErrorsTitle', { count: result.errors.length })}
              </div>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40">
                {result.errors.map((err, i) => (
                  <div
                    key={i}
                    className={`px-4 py-2.5 text-sm ${i > 0 ? 'border-t border-red-200 dark:border-red-900' : ''}`}
                  >
                    <span className="leading-relaxed pb-1 font-semibold text-red-700 dark:text-red-400">
                      {t('inventory.import.rowLabel', { row: err.row_number })}
                    </span>{' '}
                    <span className="leading-relaxed pb-1 text-red-600 dark:text-red-300">
                      {err.error_message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30'
                : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-slate-500 dark:hover:bg-slate-700'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
            />
            {selectedFile ? (
              <>
                <FileSpreadsheet size={36} className="text-blue-600 dark:text-blue-400" />
                <div className="leading-relaxed pb-1 text-sm font-medium text-slate-800 dark:text-slate-100">
                  {selectedFile.name}
                </div>
                <div className="leading-relaxed pb-1 text-xs text-slate-500 dark:text-slate-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); reset() }}
                  className="pb-1 mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-600"
                >
                  <X size={12} /> {t('inventory.import.clearFile')}
                </button>
              </>
            ) : (
              <>
                <UploadCloud size={36} className="text-slate-400 dark:text-slate-500" />
                <div className="leading-relaxed pb-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {t('inventory.import.dropzoneText')}
                </div>
                <div className="leading-relaxed pb-1 text-xs text-slate-500 dark:text-slate-400">
                  {t('inventory.import.dropzoneHint')}
                </div>
              </>
            )}
          </div>

          {transportError && (
            <div className="leading-relaxed pb-1 mt-3 text-sm text-red-600 dark:text-red-400">
              {transportError}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
