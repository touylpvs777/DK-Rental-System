export type ActionType =
  // Authentication
  | 'user_login'
  | 'user_logout'
  // Users
  | 'user_created'
  | 'user_updated'
  | 'user_deleted'
  // Customers
  | 'customer_created'
  | 'customer_updated'
  | 'customer_deleted'
  | 'customer_status_changed'
  // Leads
  | 'lead_created'
  | 'lead_updated'
  | 'lead_deleted'
  | 'lead_status_changed'
  | 'lead_note_added'
  | 'lead_note_deleted'
  // Catalog
  | 'catalog_product_created'
  | 'catalog_product_updated'
  | 'catalog_product_deleted'
  | 'catalog_brand_created'
  | 'catalog_brand_updated'
  | 'catalog_brand_deleted'
  | 'catalog_category_created'
  | 'catalog_category_updated'
  | 'catalog_category_deleted'
  | 'catalog_import_previewed'
  | 'catalog_import_executed'
  // Forklifts
  | 'forklift_created'
  | 'forklift_updated'
  | 'forklift_deleted'
  | 'forklift_status_changed'
  // Quotations
  | 'quotation_created'
  | 'quotation_updated'
  | 'quotation_deleted'
  | 'quotation_submitted'
  | 'quotation_approved'
  | 'quotation_revision_requested'
  | 'quotation_sent'
  | 'quotation_accepted'
  | 'quotation_declined'
  | 'quotation_converted'
  | 'quotation_cancelled'
  | 'quotation_reactivated'
  // Rental Contracts
  | 'rental_contract_created'
  | 'rental_contract_updated'
  | 'rental_contract_deleted'
  | 'rental_contract_submitted'
  | 'rental_contract_approved'
  | 'rental_contract_revision'
  | 'rental_contract_activated'
  | 'rental_contract_cancelled'
  | 'rental_contract_closed'
  | 'rental_return_requested'
  | 'rental_return_picked_up'
  | 'rental_return_received'
  | 'rental_return_completed'
  | 'rental_damage_assessed'
  | 'rental_damage_disputed'
  | 'rental_damage_resolved'
  | 'rental_extension_requested'
  | 'rental_extension_approved'
  | 'rental_extension_rejected'
  | 'rental_billing_created'
  // Billing & Payments
  | 'invoice_created'
  | 'invoice_updated'
  | 'invoice_issued'
  | 'invoice_sent'
  | 'invoice_cancelled'
  | 'invoice_voided'
  | 'payment_recorded'
  | 'payment_confirmed'
  | 'payment_rejected'
  | 'payment_allocated'
  | 'deposit_created'
  | 'deposit_received'
  | 'deposit_refunded'
  | 'deposit_forfeited'
  | 'deposit_applied'
  | 'revenue_recognized'
  | 'revenue_reversed'
  // Warehouse Projects
  | 'project_created'
  | 'project_updated'
  | 'project_deleted'
  | 'project_milestone_status_changed'
  // Global Settings
  | 'setting_updated'
  // Inventory Import
  | 'inventory_import_executed'
  // Notification Preferences
  | 'notification_preference_created'
  | 'notification_preference_updated'
  | 'notification_preference_deleted'

export type EntityType =
  | 'user'
  | 'customer'
  | 'lead'
  | 'note'
  | 'catalog_product'
  | 'catalog_brand'
  | 'catalog_category'
  | 'catalog_import'
  | 'forklift'
  | 'quotation'
  | 'rental_contract'
  | 'invoice'
  | 'payment'
  | 'deposit'
  | 'revenue_recognition'
  | 'project'
  | 'project_milestone'
  | 'setting'
  | 'inventory_import'
  | 'notification_preference'

export interface ActivityLog {
  id: number
  user_id: number | null
  user: { id: number; username: string; full_name: string | null } | null
  action: ActionType
  entity_type: EntityType | null
  entity_id: number | null
  details: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}
