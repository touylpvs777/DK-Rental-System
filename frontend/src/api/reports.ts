import type { AxiosError } from 'axios'
import client from './client'
import type { DashboardSummary } from '@/types/dashboard'
import { buildCSV } from '@/utils/mockAdapter'

export type ReportType   = 'customers'
export type ReportFormat = 'csv' | 'excel'

export interface ReportParams {
  format?:    ReportFormat
  from_date?: string
  to_date?:   string
}

// ── Mime + extension lookup ──────────────────────────────────
const MIME: Record<ReportFormat, string> = {
  csv:   'text/csv;charset=utf-8;',
  excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

// ── Programmatic anchor download ─────────────────────────────
function triggerDownload(blob: Blob, filename: string) {
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 150)
}

// ── Client-side CSV fallbacks ────────────────────────────────
// Used when the backend endpoint is not yet available (404/501).

function summaryFallbackCSV(summary: DashboardSummary): Blob {
  return buildCSV(
    ['Metric', 'Value'],
    [
      ['Total Customers',        summary.total_customers],
      ['Active Customers',       summary.active_customers],
      ['Prospect Customers',     summary.prospect_customers],
      ['Fleet Size',             summary.fleet.total],
      ['Forklifts In Stock',     summary.fleet.in_stock],
      ['Forklifts Rented',       summary.fleet.rented],
      ['Forklifts In Service',   summary.fleet.in_service],
      ['Active Rental Contracts',summary.active_rental_contracts],
      ['Total Rental Contracts', summary.total_rental_contracts],
    ],
  )
}

// ── Main download function ───────────────────────────────────

export async function downloadReport(
  type: ReportType,
  params: ReportParams = {},
  /** Pass summary data to enable client-side CSV fallback if endpoint is missing */
  summaryFallback?: DashboardSummary | null,
) {
  const format   = params.format ?? 'csv'
  const today    = new Date().toISOString().slice(0, 10)
  const ext      = format === 'excel' ? 'xlsx' : 'csv'
  const filename = `${type}_report_${today}.${ext}`

  try {
    const response = await client.get(`/reports/${type}`, {
      params: {
        format,
        ...(params.from_date && { from_date: params.from_date }),
        ...(params.to_date   && { to_date:   params.to_date   }),
      },
      responseType: 'blob',
    })

    const blob = new Blob([response.data as BlobPart], { type: MIME[format] })
    triggerDownload(blob, filename)

  } catch (err) {
    const status = (err as AxiosError).response?.status

    // Endpoint not yet implemented — try client-side CSV if we have summary data
    if ((status === 404 || status === 501) && format === 'csv' && summaryFallback) {
      const blob = summaryFallbackCSV(summaryFallback)
      triggerDownload(blob, `${type}_summary_${today}.csv`)
      return                  // successful client-side fallback
    }

    // For missing endpoints without summary data, throw a readable error
    if (status === 404 || status === 501) {
      throw new Error(`The "${type}" report endpoint is not yet available on this server.`)
    }

    throw err
  }
}
