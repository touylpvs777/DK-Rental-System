import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ChevronLeft, AlertCircle, Truck, ClipboardList, Wrench, Receipt,
  Mail, Phone, Building2, User,
} from 'lucide-react'
import { getCustomerOverview } from '@/api/customers'
import { CustomerStatusBadge } from '@/components/ui/Badge'
import { ForkliftStatusBadge } from '@/components/equipment/ForkliftStatusBadge'
import { RentalStatusBadge } from '@/components/rental/RentalStatusBadge'
import { WOStatusBadge, WOPriorityBadge } from '@/components/maintenance/MaintenanceStatusBadge'
import InvoiceStatusBadge from '@/components/billing/InvoiceStatusBadge'
import type { Customer360 } from '@/types/customer'
import './Customer360Page.css'
import '@/styles/shared.css'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtAmount(n: number, currency: string) {
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency}`
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
}

export default function Customer360Page() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [data, setData] = useState<Customer360 | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const { data } = await getCustomerOverview(Number(id))
      setData(data)
    } catch {
      setError(t('customer360.loadError'))
    } finally {
      setIsLoading(false)
    }
  }, [id, t])

  useEffect(() => { load() }, [load])

  if (isLoading) {
    return (
      <div className="c360-page">
        <div className="c360-skeleton">
          <div className="skeleton-cell" style={{ height: 18, width: '30%', marginBottom: 24 }} />
          <div className="skeleton-cell" style={{ height: 64, width: '100%', marginBottom: 16 }} />
          <div className="skeleton-cell" style={{ height: 200, width: '100%' }} />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="c360-page">
        <button className="c360-back" onClick={() => navigate('/customers')}>
          <ChevronLeft size={16} /> {t('customer360.backToCustomers')}
        </button>
        <div className="page-error" style={{ marginTop: 24 }}>
          <AlertCircle size={16} /> {error ?? t('customer360.notFound')}
        </div>
      </div>
    )
  }

  const { customer, summary, forklifts, rental_contracts, work_orders, invoices } = data

  return (
    <div className="c360-page">
      <button className="c360-back" onClick={() => navigate('/customers')}>
        <ChevronLeft size={16} /> {t('customer360.backToCustomers')}
      </button>

      {/* Header */}
      <div className="c360-header">
        <div className="c360-header-left">
          <div className="c360-avatar">{initials(customer.first_name, customer.last_name)}</div>
          <div className="c360-header-info">
            <div className="c360-header-name">{customer.first_name} {customer.last_name}</div>
            <div className="c360-header-meta">
              {customer.company && <span><Building2 size={12} /> {customer.company}</span>}
              {customer.email && <span><Mail size={12} /> {customer.email}</span>}
              {customer.phone && <span><Phone size={12} /> {customer.phone}</span>}
            </div>
            <div className="c360-header-badges">
              <CustomerStatusBadge status={customer.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="c360-stats">
        <div className="c360-stat-chip">
          <span className="c360-stat-value">{summary.forklift_count}</span>
          <span className="c360-stat-label">{t('customer360.forklifts')}</span>
        </div>
        <div className="c360-stat-chip">
          <span className="c360-stat-value">{summary.active_rental_count}</span>
          <span className="c360-stat-label">{t('customer360.activeRentals')}</span>
        </div>
        <div className="c360-stat-chip">
          <span className="c360-stat-value">{summary.open_work_order_count}</span>
          <span className="c360-stat-label">{t('customer360.openWorkOrders')}</span>
        </div>
        <div className="c360-stat-chip">
          <span className="c360-stat-value">{fmtAmount(summary.total_outstanding, summary.currency)}</span>
          <span className="c360-stat-label">{t('customer360.outstanding')}</span>
        </div>
      </div>

      <div className="c360-sections">
        {/* Profile */}
        {customer.notes && (
          <div className="c360-card">
            <div className="c360-card-header"><User size={16} /> {t('customer360.notes')}</div>
            <div className="c360-card-body">
              <p style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6 }}>{customer.notes}</p>
            </div>
          </div>
        )}

        {/* Forklifts */}
        <div className="c360-card">
          <div className="c360-card-header">
            <Truck size={16} /> {t('customer360.forklifts')}
            <span className="c360-card-count">({forklifts.length})</span>
          </div>
          {forklifts.length === 0 ? (
            <div className="c360-empty">{t('customer360.noForklifts')}</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('customer360.colSerialNumber')}</th>
                    <th>{t('customer360.colName')}</th>
                    <th>{t('customer360.colStatus')}</th>
                    <th className="col-hide-sm">{t('customer360.colHourMeter')}</th>
                  </tr>
                </thead>
                <tbody>
                  {forklifts.map((f) => (
                    <tr key={f.id}>
                      <td>{f.serial_number}</td>
                      <td className="cell-muted">{f.name_en}</td>
                      <td><ForkliftStatusBadge status={f.status} /></td>
                      <td className="cell-muted col-hide-sm">{f.current_hour_meter.toLocaleString()} hrs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Rental Contracts */}
        <div className="c360-card">
          <div className="c360-card-header">
            <ClipboardList size={16} /> {t('customer360.rentalContracts')}
            <span className="c360-card-count">({rental_contracts.length})</span>
          </div>
          {rental_contracts.length === 0 ? (
            <div className="c360-empty">{t('customer360.noRentalContracts')}</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('customer360.colContractNumber')}</th>
                    <th>{t('customer360.colStatus')}</th>
                    <th className="col-hide-sm">{t('customer360.colStartDate')}</th>
                    <th className="col-hide-sm">{t('customer360.colEndDate')}</th>
                    <th>{t('customer360.colTotalValue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rental_contracts.map((c) => (
                    <tr key={c.id}>
                      <td>{c.contract_number}</td>
                      <td><RentalStatusBadge status={c.status} /></td>
                      <td className="cell-muted col-hide-sm">{fmtDate(c.start_date)}</td>
                      <td className="cell-muted col-hide-sm">{fmtDate(c.end_date)}</td>
                      <td className="cell-muted">{fmtAmount(c.total_value, c.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Work Orders */}
        <div className="c360-card">
          <div className="c360-card-header">
            <Wrench size={16} /> {t('customer360.workOrders')}
            <span className="c360-card-count">({work_orders.length})</span>
          </div>
          {work_orders.length === 0 ? (
            <div className="c360-empty">{t('customer360.noWorkOrders')}</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('customer360.colWorkOrderNumber')}</th>
                    <th>{t('customer360.colForklift')}</th>
                    <th>{t('customer360.colTitle')}</th>
                    <th>{t('customer360.colStatus')}</th>
                    <th className="col-hide-sm">{t('customer360.colPriority')}</th>
                    <th className="col-hide-sm">{t('customer360.colScheduledDate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {work_orders.map((wo) => (
                    <tr key={wo.id}>
                      <td>{wo.work_order_number}</td>
                      <td className="cell-muted">{wo.forklift.serial_number}</td>
                      <td className="cell-muted">{wo.title}</td>
                      <td><WOStatusBadge status={wo.status} /></td>
                      <td className="col-hide-sm"><WOPriorityBadge priority={wo.priority} /></td>
                      <td className="cell-muted col-hide-sm">{fmtDate(wo.scheduled_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invoices */}
        <div className="c360-card">
          <div className="c360-card-header">
            <Receipt size={16} /> {t('customer360.invoices')}
            <span className="c360-card-count">({invoices.length})</span>
          </div>
          {invoices.length === 0 ? (
            <div className="c360-empty">{t('customer360.noInvoices')}</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('customer360.colInvoiceNumber')}</th>
                    <th>{t('customer360.colStatus')}</th>
                    <th>{t('customer360.colTotalAmount')}</th>
                    <th>{t('customer360.colBalanceDue')}</th>
                    <th className="col-hide-sm">{t('customer360.colDueDate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>{inv.invoice_number}</td>
                      <td><InvoiceStatusBadge status={inv.status} /></td>
                      <td className="cell-muted">{fmtAmount(inv.total_amount, inv.currency)}</td>
                      <td className="cell-muted">{fmtAmount(inv.balance_due, inv.currency)}</td>
                      <td className="cell-muted col-hide-sm">{fmtDate(inv.due_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
