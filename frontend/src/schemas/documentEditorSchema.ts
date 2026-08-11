/**
 * Shared field-name contract for the reusable Document Editor sections
 * (DocumentEditorHeader / VehicleInfoSection / DocumentTotalsPanel /
 * DocumentFooterSection) — every document editor's own Zod-inferred form
 * type (QuotationEditorFormValues, SalesOrderEditorFormValues, …) must carry
 * these exact field names so the shared sections' `register()` calls type-check
 * against whichever form is actually mounted via `FormProvider` at runtime.
 */
export interface DocumentHeaderFormValues {
  title: string
  customer_id: number | null
  assigned_to: number | null
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  tax_rate: number
  discount_amount: number
  round_amount: number
  currency: string
  exchange_rate: number
  valid_from?: string
  valid_until?: string
  customer_reference?: string
  bank_details?: string

  job_number?: string
  machine_type?: string
  vehicle_make?: string
  vehicle_model?: string
  vehicle_vin?: string
  vehicle_engine_no?: string
  hour_meter?: number | null
  vehicle_reg_no?: string
  location?: string

  notes?: string
  internal_notes?: string
  terms_conditions?: string
}
