# Constraints — DK Service Enterprise Platform

## 1. Primary Keys

Every table uses `SERIAL PRIMARY KEY` on an `id` column. No composite primary keys exist.

| Count | Pattern |
|-------|---------|
| 56 | `id SERIAL PRIMARY KEY` |

---

## 2. Unique Constraints

### Single-Column UNIQUE (24)

| Table | Column | Purpose |
|-------|--------|---------|
| roles | name | One role per name |
| users | email | One account per email |
| users | username | One account per username |
| revoked_tokens | jti | One revocation per token |
| customers | email | One customer per email |
| brands | name | No duplicate brand names |
| brands | slug | URL-safe unique identifier |
| product_categories | slug | URL-safe unique identifier |
| products | sku | Unique stock-keeping unit |
| products | slug | URL-safe unique identifier |
| forklift_models | slug | URL-safe unique identifier |
| forklifts | serial_number | Manufacturer serial |
| forklifts | slug | URL-safe unique identifier |
| forklifts | internal_code | DK internal asset code |
| quotations | quotation_number | Document number: QT-YYYYMMDD-XXXX |
| rental_contracts | contract_number | Document number: RC-YYYYMMDD-XXXX |
| rental_returns | return_number | Document number |
| rental_damage_reports | report_number | Document number |
| rental_billing_cycles | billing_number | Cycle identifier |
| asset_movements | movement_number | Document number |
| asset_movements | tracking_code | Shipment tracking (nullable but unique when set) |
| work_orders | work_order_number | Document number: WO-YYYYMMDD-XXXX |
| spare_parts | part_number | Manufacturer part number |
| warehouses | code | Warehouse code: WH-01 |
| inventory_transactions | transaction_number | Transaction identifier |
| purchase_orders | po_number | PO document number |
| invoices | invoice_number | Invoice number: INV-YYYYMMDD-XXXX |
| payments | payment_number | Payment identifier |
| deposits | deposit_number | Deposit identifier |
| revenue_recognitions | recognition_number | Recognition identifier |
| maintenance_plans | plan_number | PM plan identifier |

### Composite UNIQUE (2)

| Table | Columns | Purpose |
|-------|---------|---------|
| inventory_balances | (spare_part_id, warehouse_id) | One balance record per part per warehouse |
| rental_contract_terms | (contract_id, term_key) | One term per key per contract |

---

## 3. Foreign Key Constraints

### By ON DELETE Behavior

#### CASCADE (28 FKs) — child deleted when parent deleted

| Child Table | FK Column | Parent Table |
|-------------|-----------|-------------|
| lead_notes | lead_id | leads |
| product_specs | product_id | products |
| product_images | product_id | products |
| product_compat_brands | product_id | products |
| product_compat_brands | brand_id | brands |
| import_errors | job_id | import_jobs |
| forklift_specs | forklift_id | forklifts |
| forklift_photos | forklift_id | forklifts |
| forklift_documents | forklift_id | forklifts |
| forklift_locations | forklift_id | forklifts |
| forklift_hour_meter_logs | forklift_id | forklifts |
| forklift_ownership_costs | forklift_id | forklifts |
| forklift_status_history | forklift_id | forklifts |
| quotation_items | quotation_id | quotations |
| quotation_approvals | quotation_id | quotations |
| quotation_status_history | quotation_id | quotations |
| rental_contract_items | contract_id | rental_contracts |
| rental_contract_terms | contract_id | rental_contracts |
| rental_contract_status_history | contract_id | rental_contracts |
| rental_extensions | contract_id | rental_contracts |
| rental_returns | contract_id | rental_contracts |
| rental_damage_reports | return_id | rental_returns |
| rental_damage_reports | contract_id | rental_contracts |
| rental_billing_cycles | contract_id | rental_contracts |
| movement_history | movement_id | asset_movements |
| maintenance_costs | work_order_id | work_orders |
| invoice_items | invoice_id | invoices |
| payment_allocations | payment_id | payments |
| payment_allocations | invoice_id | invoices |
| maintenance_schedules | forklift_id | forklifts |
| maintenance_schedules | plan_id | maintenance_plans |
| service_history | forklift_id | forklifts |
| inventory_balances | spare_part_id | spare_parts |
| inventory_balances | warehouse_id | warehouses |
| purchase_order_items | purchase_order_id | purchase_orders |

#### RESTRICT (8 FKs) — parent deletion blocked

| Child Table | FK Column | Parent Table | Reason |
|-------------|-----------|-------------|--------|
| product_categories | parent_id | product_categories | Prevent orphaning sub-categories |
| rental_contracts | customer_id | customers | Cannot delete customer with active contracts |
| invoices | contract_id | rental_contracts | Cannot delete contract with invoices |
| invoices | customer_id | customers | Cannot delete customer with invoices |
| deposits | contract_id | rental_contracts | Cannot delete contract with deposits |
| deposits | customer_id | customers | Cannot delete customer with deposits |
| asset_movements | forklift_id | forklifts | Cannot delete forklift with movement history |
| work_orders | forklift_id | forklifts | Cannot delete forklift with work orders |
| revenue_recognitions | contract_id | rental_contracts | Cannot delete contract with revenue entries |
| inventory_transactions | spare_part_id | spare_parts | Cannot delete part with transaction history |
| inventory_transactions | warehouse_id | warehouses | Cannot delete warehouse with transactions |
| purchase_orders | warehouse_id | warehouses | Cannot delete warehouse with POs |
| purchase_order_items | spare_part_id | spare_parts | Cannot delete part with PO lines |
| part_consumptions | spare_part_id | spare_parts | Cannot delete part with consumption records |
| part_consumptions | warehouse_id | warehouses | Cannot delete warehouse with consumptions |

#### SET NULL (78+ FKs) — reference cleared

All `created_by`, `updated_by`, `assigned_to`, `recorded_by`, `uploaded_by`, `changed_by`, `decided_by`, `confirmed_by`, `verified_by`, `assessed_by`, `inspected_by`, `consumed_by`, `allocated_by` columns use SET NULL.

Optional entity references:
- `forklifts.model_id` → forklift_models SET NULL
- `forklifts.brand_id` → brands SET NULL
- `forklifts.customer_id` → customers SET NULL
- `products.brand_id` → brands SET NULL
- `products.category_id` → product_categories SET NULL
- `quotations.customer_id` → customers SET NULL
- `quotations.lead_id` → leads SET NULL
- `quotations.parent_id` → quotations SET NULL
- `rental_contracts.quotation_id` → quotations SET NULL
- `rental_contracts.lead_id` → leads SET NULL
- `rental_contract_items.forklift_id` → forklifts SET NULL
- `rental_contract_items.quotation_item_id` → quotation_items SET NULL
- `rental_returns.contract_item_id` → rental_contract_items SET NULL
- `rental_returns.forklift_id` → forklifts SET NULL
- `rental_billing_cycles.contract_item_id` → rental_contract_items SET NULL
- `payments.contract_id` → rental_contracts SET NULL
- `deposits.payment_id` → payments SET NULL
- `deposits.refund_payment_id` → payments SET NULL
- `invoice_items.billing_cycle_id` → rental_billing_cycles SET NULL
- `revenue_recognitions.invoice_id` → invoices SET NULL
- `revenue_recognitions.invoice_item_id` → invoice_items SET NULL

#### No Explicit ON DELETE (10 FKs) — defaults to NO ACTION

| Table | Column | Parent | Note |
|-------|--------|--------|------|
| users | role_id | roles | Early model, no ondelete specified |
| customers | assigned_to | users | Early model |
| customers | created_by | users | Early model |
| leads | customer_id | customers | Early model |
| leads | assigned_to | users | Early model |
| leads | created_by | users | Early model |

These behave as `NO ACTION` (equivalent to RESTRICT) at the PostgreSQL level.

---

## 4. NOT NULL Constraints

### Convention: Required Columns

| Column Pattern | Always NOT NULL | Notes |
|----------------|----------------|-------|
| `id` | Yes | Primary key |
| `*_number` (document numbers) | Yes | Business identifiers |
| `status` | Yes | Always has a default |
| `is_active` | Yes | Default TRUE |
| `created_at` | Yes | Default NOW() |
| `description` (on items) | Yes | Line item descriptions |
| Financial amounts | Yes | Default 0.0 |
| `currency` | Yes | Default 'LAK' |

### Convention: Nullable Columns

| Column Pattern | Always Nullable | Notes |
|----------------|----------------|-------|
| `updated_at` | Yes | NULL until first update |
| `*_by` (user references) | Yes | SET NULL on user deletion |
| `notes`, `internal_notes` | Yes | Optional text |
| `*_at` (event timestamps) | Yes | NULL until event occurs |
| `email`, `phone` | Yes (except users) | Optional contact info |

---

## 5. Default Values

### Status Defaults (first state in workflow)

| Table | Column | Default | Workflow |
|-------|--------|---------|----------|
| customers | status | 'prospect' | prospect → active → inactive → churned |
| leads | status | 'new' | new → contacted → qualified → proposal → won/lost |
| quotations | status | 'draft' | draft → under_review → approved → sent → accepted → converted |
| rental_contracts | status | 'reservation' | reservation → draft → pending → approved → active → closed |
| asset_movements | status | 'draft' | draft → preparing → in_transit → delivered → completed |
| work_orders | status | 'scheduled' | scheduled → in_progress → completed → verified |
| invoices | status | 'draft' | draft → issued → sent → paid |
| payments | payment_status | 'pending' | pending → confirmed/rejected |
| deposits | deposit_status | 'pending' | pending → received → refunded/forfeited/applied |
| purchase_orders | status | 'draft' | draft → ordered → received |
| rental_extensions | status | 'pending' | pending → approved/rejected |
| import_jobs | status | 'pending' | pending → preview → processing → completed |
| maintenance_schedules | status | 'active' | active → paused → completed |

### Numeric Defaults

| Pattern | Default | Tables |
|---------|---------|--------|
| All financial amounts | `0.0` | invoices, payments, costs, line items |
| `currency` | `'LAK'` | All tables with financial data |
| `sort_order` | `0` | All orderable entities |
| `quantity` | `1.0` | Line items (quotation, invoice, billing cycle) |
| `revision_number` | `1` | quotations, rental_contracts |
| `hour_meter` | `0.0` | forklifts (initial, current) |
| `overtime_rate_pct` | `150.0` | rental_contracts |
| `billing_cycle_day` | `1` | rental_contracts |
| `payment_terms_days` | `30` | rental_contracts |
| `min_stock_level` | `5` | spare_parts |
| `reorder_quantity` | `10` | spare_parts |
| `lead_time_days` | `7` | spare_parts |

### Boolean Defaults

| Column | Default | Tables |
|--------|---------|--------|
| `is_active` | TRUE | All major entities |
| `is_superuser` | FALSE | users |
| `is_primary` | FALSE | photos, images |
| `is_featured` | FALSE | products |
| `is_early_termination` | FALSE | rental_returns |
| `is_customer_liable` | TRUE | rental_damage_reports |
| `is_credit` | FALSE | rental_billing_cycles |
| `is_required` | FALSE | rental_contract_terms |
| `is_visible_to_customer` | TRUE | rental_contract_terms |

---

## 6. CHECK Constraints

No explicit CHECK constraints are defined in the SQLAlchemy models. Status values are enforced at the application layer (Pydantic schemas and service-layer state machines), not at the database level.

**Recommendation for future:** Add CHECK constraints for status columns in PostgreSQL:

```sql
-- Example (additive, does not modify existing data)
ALTER TABLE invoices ADD CONSTRAINT chk_invoices_status
    CHECK (status IN ('draft','issued','sent','partially_paid','paid','overdue','cancelled','voided'));
```

---

## 7. Data Integrity Rules (Application-Enforced)

These rules are enforced by service-layer code, not database constraints:

| Rule | Enforced By | Location |
|------|------------|----------|
| Quotation status transitions | `QuotationWorkflowService` | `VALID_TRANSITIONS` dict |
| Rental contract status transitions | `RentalWorkflowService` | `VALID_TRANSITIONS` dict |
| Movement status transitions | `MovementService` | State machine logic |
| Work order status transitions | `MaintenanceService` | State machine logic |
| Invoice balance_due = total_amount - amount_paid | `BillingService` | `allocate_payment()` |
| inventory_balance.quantity_available = on_hand - reserved | `InventoryService` | Transaction handlers |
| Forklift status follows lifecycle | `ForkliftStatusService` | Status change validation |
