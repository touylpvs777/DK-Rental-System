import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bold, Italic, Underline, List, UploadCloud, X, AlertTriangle,
  FileText, FileSpreadsheet, FileImage, File as FileIcon, Download,
  type LucideIcon,
} from 'lucide-react'
import { toast } from '@/store/toastStore'
import { sanitizeRichText } from '@/utils/sanitizeRichText'
import type { LegalDocumentState } from '@/types/legalDocument'

const ACCEPTED_EXT = ['.pdf', '.jpg', '.jpeg', '.doc', '.docx', '.xls', '.xlsx']
const ACCEPTED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

function isAcceptedFile(file: File): boolean {
  if (file.type && ACCEPTED_MIME.has(file.type)) return true
  const lower = file.name.toLowerCase()
  return ACCEPTED_EXT.some((ext) => lower.endsWith(ext))
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const EXT_ICONS: Record<string, LucideIcon> = {
  pdf: FileText,
  jpg: FileImage,
  jpeg: FileImage,
  png: FileImage,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
}

function getFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.')
  return idx === -1 ? '' : fileName.slice(idx + 1).toLowerCase()
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border-b-2 px-3 py-2 text-sm font-medium transition ${
        active
          ? 'border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400'
          : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  )
}

// ── Tab 1: Write Content (contentEditable rich text editor, no library) ─────

function RichTextEditor({ initialValue, onChange, placeholder }: {
  initialValue: string; onChange: (html: string) => void; placeholder: string
}) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialValue
    // Only hydrate from the initial value on mount — after that the div is
    // uncontrolled and reports out via onInput, so re-syncing on every prop
    // change would fight the browser's caret position while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const emitChange = () => {
    if (ref.current) onChange(sanitizeRichText(ref.current.innerHTML))
  }

  const exec = (command: string) => {
    document.execCommand(command)
    emitChange()
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-1 rounded-t-xl border border-b-0 border-slate-200 bg-slate-50 p-1.5 dark:border-zinc-700 dark:bg-zinc-800">
        {[
          { icon: Bold, command: 'bold', label: t('rental.legalDocument.toolbar.bold') },
          { icon: Italic, command: 'italic', label: t('rental.legalDocument.toolbar.italic') },
          { icon: Underline, command: 'underline', label: t('rental.legalDocument.toolbar.underline') },
          { icon: List, command: 'insertUnorderedList', label: t('rental.legalDocument.toolbar.bulletList') },
        ].map(({ icon: Icon, command, label }) => (
          <button
            key={command}
            type="button"
            aria-label={label}
            title={label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(command)}
            className="rounded-md p-1.5 text-slate-600 hover:bg-slate-200 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <Icon size={15} />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emitChange}
        data-placeholder={placeholder}
        className="min-h-[220px] rounded-b-xl border border-slate-200 p-3 text-sm leading-relaxed text-slate-800 outline-none focus:border-blue-400 empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)] dark:border-zinc-700 dark:text-zinc-100 dark:empty:before:text-zinc-500"
      />
    </div>
  )
}

// ── Tab 2: Upload File (drag & drop) ────────────────────────────────────────

function FileDropzone({ file, onFileSelected, onRemove }: {
  file: File | null; onFileSelected: (file: File) => void; onRemove: () => void
}) {
  const { t } = useTranslation()
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const FileTypeIcon = EXT_ICONS[getFileExtension(file?.name ?? '')] ?? FileIcon

  const handleFiles = (files: FileList | null) => {
    const picked = files?.[0]
    if (!picked) return
    if (!isAcceptedFile(picked)) {
      toast.error(t('rental.legalDocument.invalidType'))
      return
    }
    onFileSelected(picked)
  }

  if (file) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600">
            <FileTypeIcon size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800 dark:text-white">{file.name}</p>
            <p className="text-xs text-slate-500 dark:text-zinc-400">{formatBytes(file.size)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t('rental.legalDocument.removeFile')}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-zinc-700"
        >
          <X size={16} />
        </button>
      </div>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click() }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files) }}
      className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition ${
        isDragging
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
          : 'border-slate-300 hover:border-slate-400 dark:border-zinc-700 dark:hover:border-zinc-600'
      }`}
    >
      <UploadCloud size={26} className="text-slate-400" />
      <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">{t('rental.legalDocument.dropzoneTitle')}</p>
      <p className="text-xs text-slate-400 dark:text-zinc-500">{t('rental.legalDocument.dropzoneSubtitle')}</p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXT.join(',')}
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
      />
    </div>
  )
}

// ── Document Viewer — renders whatever is currently attached/written ───────

function DocumentViewer({ contractBody, attachmentFile }: { contractBody: string; attachmentFile: File | null }) {
  const { t } = useTranslation()
  const objectUrl = useMemo(() => (attachmentFile ? URL.createObjectURL(attachmentFile) : null), [attachmentFile])
  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }, [objectUrl])
  const FileTypeIcon = EXT_ICONS[getFileExtension(attachmentFile?.name ?? '')] ?? FileIcon

  if (attachmentFile && objectUrl) {
    if (attachmentFile.type === 'application/pdf') {
      return <embed src={objectUrl} type="application/pdf" className="h-[560px] w-full rounded-xl border border-slate-200 dark:border-zinc-700" />
    }
    if (attachmentFile.type.startsWith('image/')) {
      return <img src={objectUrl} alt={attachmentFile.name} className="w-full rounded-xl border border-slate-200 object-contain dark:border-zinc-700" />
    }
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 p-10 text-center dark:border-zinc-700">
        <FileTypeIcon size={36} className="text-slate-400" />
        <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">{attachmentFile.name}</p>
        <p className="text-xs text-slate-400">{t('rental.legalDocument.noPreview')}</p>
        <a href={objectUrl} download={attachmentFile.name} className="btn btn-secondary" style={{ fontSize: 12.5 }}>
          <Download size={13} /> {t('rental.legalDocument.downloadFile')}
        </a>
      </div>
    )
  }

  if (contractBody.trim()) {
    return (
      <div
        className="max-w-none text-sm leading-relaxed text-slate-800 [&_ul]:list-disc [&_ul]:pl-5 dark:text-zinc-100"
        dangerouslySetInnerHTML={{ __html: sanitizeRichText(contractBody) }}
      />
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 py-14 text-slate-400 dark:text-zinc-500">
      <FileText size={30} />
      <p className="text-sm">{t('rental.legalDocument.empty')}</p>
    </div>
  )
}

// ── Panel ────────────────────────────────────────────────────────────────────

export default function LegalDocumentPanel({ state, onChange, canEdit }: {
  state: LegalDocumentState
  onChange: (next: Partial<LegalDocumentState>) => void
  canEdit: boolean
}) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'write' | 'upload'>('write')
  const hasDocument = !!state.contract_body.trim() || !!state.attachment_file

  return (
    <section className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-zinc-800/70 dark:bg-zinc-900 dark:shadow-none">
      <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
        {canEdit ? t('rental.legalDocument.title') : t('rental.legalDocument.viewerTitle')}
      </h3>

      {canEdit ? (
        <>
          <div className="mb-4 flex gap-1 border-b border-slate-200 dark:border-zinc-700">
            <TabButton active={tab === 'write'} onClick={() => setTab('write')}>{t('rental.legalDocument.writeTab')}</TabButton>
            <TabButton active={tab === 'upload'} onClick={() => setTab('upload')}>{t('rental.legalDocument.uploadTab')}</TabButton>
          </div>

          {tab === 'write' ? (
            <RichTextEditor
              initialValue={state.contract_body}
              onChange={(html) => onChange({ contract_body: html })}
              placeholder={t('rental.legalDocument.bodyPlaceholder')}
            />
          ) : (
            <FileDropzone
              file={state.attachment_file}
              onFileSelected={(file) => onChange({ attachment_file: file })}
              onRemove={() => onChange({ attachment_file: null })}
            />
          )}

          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-500">
            <AlertTriangle size={12} /> {t('rental.legalDocument.mockNotice')}
          </div>

          {hasDocument && (
            <div className="mt-5 border-t border-slate-100 pt-4 dark:border-zinc-800">
              <DocumentViewer contractBody={state.contract_body} attachmentFile={state.attachment_file} />
            </div>
          )}
        </>
      ) : (
        <DocumentViewer contractBody={state.contract_body} attachmentFile={state.attachment_file} />
      )}
    </section>
  )
}
