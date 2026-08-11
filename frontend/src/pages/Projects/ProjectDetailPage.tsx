import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, AlertCircle, Pencil, CheckCircle2, Trash2, Plus, ListChecks, ClipboardList } from 'lucide-react'
import {
  getProject, updateProject, deleteProject, approveBoq,
  createMilestone, updateMilestoneStatus, deleteMilestone,
  createBoqItem, deleteBoqItem,
} from '@/api/projects'
import { getParts } from '@/api/inventory'
import { ProjectStatusBadge, MilestoneStatusBadge } from '@/components/projects/ProjectStatusBadge'
import { MilestoneProgressBar } from '@/components/projects/MilestoneProgressBar'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { toast } from '@/store/toastStore'
import ProjectForm from './ProjectForm'
import type { ProjectDetail, ProjectUpdate, MilestoneStatus } from '@/types/project'
import type { SparePart } from '@/types/inventory'
import '@/pages/Catalog/ProductDetailPage.css'
import '@/styles/detail.css'
import '@/styles/shared.css'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtAmt(n: number) { return n.toLocaleString(undefined, { maximumFractionDigits: 2 }) }

const NEXT_MILESTONE_STATUS: Record<MilestoneStatus, MilestoneStatus | null> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: null,
}

function errMsg(e: unknown, fallback: string) {
  return (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? fallback
}

export default function ProjectDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false)
  const [boqModalOpen, setBoqModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<'project' | { milestoneId: number } | { boqItemId: number } | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setIsLoading(true); setError(null)
    try { setProject((await getProject(Number(id))).data) }
    catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      setError(status === 403 ? t('projects.detail.noPermissionView') : t('projects.detail.notFound'))
    } finally { setIsLoading(false) }
  }, [id, t])

  useEffect(() => { load() }, [load])

  if (isLoading) {
    return (
      <div className="product-detail">
        <div className="detail-skeleton">
          <div className="skeleton-cell" style={{ height: 18, width: '30%', marginBottom: 24 }} />
          <div className="skeleton-cell" style={{ height: 64, width: '100%', marginBottom: 16 }} />
          <div className="skeleton-cell" style={{ height: 200, width: '100%' }} />
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="product-detail">
        <button className="detail-back" onClick={() => navigate('/projects')}><ChevronLeft size={16} /> {t('projects.detail.backToProjects')}</button>
        <div className="page-error" style={{ marginTop: 24 }}><AlertCircle size={16} /> {error ?? t('projects.detail.notFound')}</div>
      </div>
    )
  }

  const canApproveBoq = !['boq_approved', 'installation', 'handover', 'completed'].includes(project.status)

  const handleEditSubmit = async (data: ProjectUpdate): Promise<boolean> => {
    try {
      await updateProject(project.id, data)
      toast.success(t('projects.detail.projectUpdated'))
      await load()
      return true
    } catch (e) { toast.error(errMsg(e, t('projects.detail.projectUpdateFailed'))); return false }
  }

  const handleApproveBoq = async () => {
    setActionLoading(true)
    try { await approveBoq(project.id); toast.success(t('projects.detail.boqApproved')); await load() }
    catch (e) { toast.error(errMsg(e, t('projects.detail.boqApproveFailed'))) }
    finally { setActionLoading(false) }
  }

  const handleDeleteProject = async () => {
    setActionLoading(true)
    try { await deleteProject(project.id); toast.success(t('projects.detail.projectDeleted')); navigate('/projects') }
    catch (e) { toast.error(errMsg(e, t('projects.detail.projectDeleteFailed'))); setActionLoading(false) }
  }

  const handleAdvanceMilestone = async (milestoneId: number, current: MilestoneStatus) => {
    const next = NEXT_MILESTONE_STATUS[current]
    if (!next) return
    setActionLoading(true)
    try { await updateMilestoneStatus(project.id, milestoneId, next); await load() }
    catch (e) { toast.error(errMsg(e, t('projects.detail.milestoneStatusUpdateFailed'))) }
    finally { setActionLoading(false) }
  }

  const handleDeleteMilestone = async (milestoneId: number) => {
    setActionLoading(true)
    try { await deleteMilestone(project.id, milestoneId); toast.success(t('projects.detail.milestoneRemoved')); await load() }
    catch (e) { toast.error(errMsg(e, t('projects.detail.milestoneRemoveFailed'))) }
    finally { setActionLoading(false); setDeleteTarget(null) }
  }

  const handleDeleteBoqItem = async (itemId: number) => {
    setActionLoading(true)
    try { await deleteBoqItem(project.id, itemId); toast.success(t('projects.detail.boqItemRemoved')); await load() }
    catch (e) { toast.error(errMsg(e, t('projects.detail.boqItemRemoveFailed'))) }
    finally { setActionLoading(false); setDeleteTarget(null) }
  }

  const boqTotal = project.boq_items.reduce((sum, i) => sum + i.total_price, 0)

  return (
    <div className="product-detail">
      <button className="detail-back" onClick={() => navigate('/projects')}><ChevronLeft size={16} /> {t('projects.detail.backToProjects')}</button>

      <div className="detail-header">
        <div>
          <div className="detail-title-row"><h1 className="detail-name">{project.name}</h1></div>
          <div className="detail-subtitle">{project.project_number} · {project.customer_name}</div>
          <div className="detail-badges">
            <ProjectStatusBadge status={project.status} />
          </div>
        </div>
        <div className="detail-actions">
          <button className="btn btn-secondary" disabled={actionLoading} onClick={() => setEditOpen(true)}><Pencil size={14} /> {t('projects.detail.edit')}</button>
          {canApproveBoq && <button className="btn btn-primary" disabled={actionLoading} onClick={handleApproveBoq}><CheckCircle2 size={14} /> {t('projects.detail.approveBoq')}</button>}
          <button className="btn btn-secondary" disabled={actionLoading} onClick={() => setDeleteTarget('project')}><Trash2 size={14} /> {t('projects.detail.delete')}</button>
        </div>
      </div>

      <div className="detail-summary-grid">
        {[
          { label: t('projects.detail.startDate'), value: fmtDate(project.start_date) },
          { label: t('projects.detail.endDate'), value: fmtDate(project.end_date) },
          { label: t('projects.detail.milestones'), value: `${project.milestone_completed}/${project.milestone_total}` },
          { label: t('projects.detail.boqTotal'), value: project.boq_items.length ? `${fmtAmt(boqTotal)} ${project.boq_items[0].currency}` : '—' },
        ].map((c) => <div key={c.label} className="detail-summary-card"><div className="detail-summary-label">{c.label}</div><div className="detail-summary-value">{c.value}</div></div>)}
      </div>

      {project.milestone_total > 0 && (
        <div style={{ marginTop: 16, maxWidth: 320 }}>
          <MilestoneProgressBar completed={project.milestone_completed} total={project.milestone_total} />
        </div>
      )}

      {project.notes && (
        <div className="detail-description" style={{ marginTop: 16 }}>
          <div className="detail-section-title">{t('projects.detail.notes')}</div>
          <p>{project.notes}</p>
        </div>
      )}

      {/* Milestones */}
      <div className="detail-specs-section" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="detail-section-title" style={{ margin: 0 }}><ListChecks size={15} style={{ verticalAlign: -2, marginRight: 4 }} /> {t('projects.detail.milestones')} ({project.milestones.length})</h2>
          <button className="btn btn-ghost" disabled={actionLoading} onClick={() => setMilestoneModalOpen(true)}><Plus size={14} /> {t('projects.detail.addMilestone')}</button>
        </div>
        {project.milestones.length === 0 ? (
          <div className="table-empty" style={{ marginTop: 10 }}><ListChecks size={32} /><p>{t('projects.detail.noMilestonesYet')}</p></div>
        ) : (
          <div className="table-card" style={{ marginTop: 10 }}>
            <table className="data-table">
              <thead><tr><th>{t('projects.detail.colMilestone')}</th><th className="col-hide-sm">{t('projects.detail.colDueDate')}</th><th>{t('projects.detail.colStatus')}</th><th></th></tr></thead>
              <tbody>
                {project.milestones.map((m) => {
                  const next = NEXT_MILESTONE_STATUS[m.status]
                  return (
                    <tr key={m.id}>
                      <td className="cell-desc">{m.name}</td>
                      <td className="cell-muted col-hide-sm">{fmtDate(m.due_date)}</td>
                      <td><MilestoneStatusBadge status={m.status} /></td>
                      <td style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {next && (
                          <button className="btn btn-ghost" disabled={actionLoading} onClick={() => handleAdvanceMilestone(m.id, m.status)}>
                            {t('projects.detail.markStatus', { status: t(`projects.milestoneStatus.${next}`) })}
                          </button>
                        )}
                        <button className="btn btn-ghost" disabled={actionLoading} onClick={() => setDeleteTarget({ milestoneId: m.id })}><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BOQ */}
      <div className="detail-specs-section" style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="detail-section-title" style={{ margin: 0 }}><ClipboardList size={15} style={{ verticalAlign: -2, marginRight: 4 }} /> {t('projects.detail.billOfQuantities')} ({project.boq_items.length})</h2>
          <button className="btn btn-ghost" disabled={actionLoading} onClick={() => setBoqModalOpen(true)}><Plus size={14} /> {t('projects.detail.addBoqItem')}</button>
        </div>
        {project.boq_items.length === 0 ? (
          <div className="table-empty" style={{ marginTop: 10 }}><ClipboardList size={32} /><p>{t('projects.detail.noBoqItemsYet')}</p></div>
        ) : (
          <div className="table-card" style={{ marginTop: 10 }}>
            <table className="data-table">
              <thead><tr><th>{t('projects.detail.colDescription')}</th><th className="col-hide-sm">{t('projects.detail.colQty')}</th><th className="col-hide-sm">{t('projects.detail.colUnitPrice')}</th><th>{t('projects.detail.colTotal')}</th><th></th></tr></thead>
              <tbody>
                {project.boq_items.map((i) => (
                  <tr key={i.id}>
                    <td className="cell-desc">{i.description}</td>
                    <td className="cell-muted col-hide-sm cell-mono">{i.quantity}</td>
                    <td className="cell-muted col-hide-sm cell-mono">{fmtAmt(i.unit_price)}</td>
                    <td className="cell-mono cell-total">{fmtAmt(i.total_price)} {i.currency}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost" disabled={actionLoading} onClick={() => setDeleteTarget({ boqItemId: i.id })}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={3} style={{ textAlign: 'right', fontWeight: 600 }}>{t('projects.detail.totalRow')}</td><td className="cell-mono cell-total">{fmtAmt(boqTotal)} {project.boq_items[0]?.currency}</td><td /></tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <ProjectForm isOpen={editOpen} onClose={() => setEditOpen(false)} onSubmit={handleEditSubmit} project={project} />
      <MilestoneModal isOpen={milestoneModalOpen} onClose={() => setMilestoneModalOpen(false)} projectId={project.id} onSuccess={load} />
      <BoqItemModal isOpen={boqModalOpen} onClose={() => setBoqModalOpen(false)} projectId={project.id} onSuccess={load} />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={deleteTarget === 'project' ? t('projects.detail.deleteProjectTitle') : deleteTarget && 'milestoneId' in deleteTarget ? t('projects.detail.deleteMilestoneTitle') : t('projects.detail.deleteBoqItemTitle')}
        message={deleteTarget === 'project' ? t('projects.detail.deleteProjectMessage') : t('projects.detail.deleteGenericMessage')}
        confirmLabel={t('projects.detail.confirmDelete')}
        isLoading={actionLoading}
        onConfirm={() => {
          if (deleteTarget === 'project') handleDeleteProject()
          else if (deleteTarget && 'milestoneId' in deleteTarget) handleDeleteMilestone(deleteTarget.milestoneId)
          else if (deleteTarget && 'boqItemId' in deleteTarget) handleDeleteBoqItem(deleteTarget.boqItemId)
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function MilestoneModal({ isOpen, onClose, projectId, onSuccess }: { isOpen: boolean; onClose: () => void; projectId: number; onSuccess: () => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  useEffect(() => { if (isOpen) { setName(''); setDueDate('') } }, [isOpen])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('projects.detail.milestoneModalTitle')} width={420}>
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!name.trim()) return
          setIsLoading(true)
          try {
            await createMilestone(projectId, { name: name.trim(), ...(dueDate && { due_date: dueDate }) })
            toast.success(t('projects.detail.milestoneAdded'))
            onClose(); onSuccess()
          } catch (err) { toast.error(errMsg(err, t('projects.detail.milestoneAddFailed'))) }
          finally { setIsLoading(false) }
        }}
      >
        <div className="form-group">
          <label>{t('projects.detail.milestoneName')} <span className="required">*</span></label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('projects.detail.milestoneNamePlaceholder')} required />
        </div>
        <div className="form-group">
          <label>{t('projects.detail.dueDate')}</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>{t('projects.form.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading || !name.trim()}>{isLoading ? t('projects.detail.adding') : t('projects.detail.addMilestone')}</button>
        </div>
      </form>
    </Modal>
  )
}

function BoqItemModal({ isOpen, onClose, projectId, onSuccess }: { isOpen: boolean; onClose: () => void; projectId: number; onSuccess: () => void }) {
  const { t } = useTranslation()
  const [parts, setParts] = useState<SparePart[]>([])
  const [sparePartId, setSparePartId] = useState('')
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setSparePartId(''); setDescription(''); setQuantity('1'); setUnitPrice(''); setErr(null)
      getParts({ page_size: 100, is_active: true }).then(({ data }) => setParts(data.items)).catch(() => setParts([]))
    }
  }, [isOpen])

  const handlePartSelect = (value: string) => {
    setSparePartId(value)
    const part = parts.find((p) => String(p.id) === value)
    if (part) {
      if (!description.trim()) setDescription(part.name)
      setUnitPrice(String(part.unit_price))
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('projects.detail.boqModalTitle')} width={480}>
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!description.trim() || !unitPrice) { setErr(t('projects.detail.descriptionPriceRequired')); return }
          setIsLoading(true); setErr(null)
          try {
            await createBoqItem(projectId, {
              description: description.trim(),
              quantity: Number(quantity) || 1,
              unit_price: Number(unitPrice),
              ...(sparePartId && { spare_part_id: Number(sparePartId) }),
            })
            toast.success(t('projects.detail.boqItemAdded'))
            onClose(); onSuccess()
          } catch (err) { setErr(errMsg(err, t('projects.detail.boqItemAddFailed'))) }
          finally { setIsLoading(false) }
        }}
      >
        {err && <div className="page-error" style={{ margin: 0 }}>{err}</div>}
        <div className="form-group">
          <label>{t('projects.detail.linkInventoryPart')}</label>
          <select value={sparePartId} onChange={(e) => handlePartSelect(e.target.value)}>
            <option value="">{t('projects.detail.notLinked')}</option>
            {parts.map((p) => <option key={p.id} value={p.id}>{p.part_number} — {p.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>{t('projects.detail.description')} <span className="required">*</span></label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} required />
        </div>
        <div className="form-row-2">
          <div className="form-group">
            <label>{t('projects.detail.quantity')}</label>
            <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="0.01" step="any" />
          </div>
          <div className="form-group">
            <label>{t('projects.detail.unitPrice')} <span className="required">*</span></label>
            <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} min="0" step="any" required />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>{t('projects.form.cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>{isLoading ? t('projects.detail.adding') : t('projects.detail.addItem')}</button>
        </div>
      </form>
    </Modal>
  )
}
