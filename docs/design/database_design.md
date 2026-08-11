# Database Design — Technical Design Specification

> **Full artifacts:** See `docs/database/` for the complete PostgreSQL DDL (`postgresql-schema.sql`, 56 CREATE TABLE statements), ER diagram (`er-diagram.mmd`), and Alembic migration scripts.

## 1. Database Engine

| Environment | Engine | Driver | Connection |
|-------------|--------|--------|-----------|
| Development | SQLite | aiosqlite | `sqlite+aiosqlite:///./crm.db` |
| Production | PostgreSQL 16 | asyncpg | `postgresql+asyncpg://user:pass@host:5432/dk_crm` |

ORM: SQLAlchemy 2.0 with `DeclarativeBase`, async sessions, `expire_on_commit=False`.

### Domain Relationship Overview

```mermaid
graph LR
    Auth["Auth<br/>3 tables"] --- CRM["CRM<br/>4 tables"]
    CRM --- Catalog["Catalog<br/>8 tables"]
    Catalog --- Equipment["Equipment<br/>9 tables"]
    CRM --- Quotation["Quotation<br/>4 tables"]
    Quotation -->|convert| Rental["Rental<br/>8 tables"]
    Equipment --- Rental
    Rental -->|activate| Billing["Billing<br/>6 tables"]
    Equipment --- Movement["Movement<br/>2 tables"]
    Equipment --- Maintenance["Maintenance<br/>6 tables"]
    Maintenance --- Inventory["Inventory<br/>6 tables"]
    Billing --- Executive["Executive BI<br/>1 table"]

    classDef core fill:#3b82f6,color:#fff
    classDef ops fill:#059669,color:#fff
    classDef fin fill:#d97706,color:#fff
    class Auth,CRM core
    class Catalog,Equipment,Quotation,Rental,Movement,Maintenance,Inventory ops
    class Billing,Executive fin
```

## 2. Table Inventory (56 tables across 11 domains)

### Auth Domain (3 tables)

| Table | Columns | PK | FKs | Purpose |
|-------|---------|-----|-----|---------|
| `users` | id, email (unique), username (unique), hashed_password, full_name, is_active, is_superuser, role_id, last_login, created_at, updated_at | id | role_id → roles | User accounts |
| `roles` | id, name (unique), description, is_active, created_at, updated_at | id | — | 4 system roles (super_admin, manager, sales, support) |
| `revoked_tokens` | id, jti (unique), revoked_at | id | — | JWT access token revocation |

### CRM Domain (4 tables)

| Table | Columns | FKs | Purpose |
|-------|---------|-----|---------|
| `customers` | id, first_name, last_name, email (unique), phone, company, status, notes, assigned_to, created_by, created_at, updated_at | assigned_to → users, created_by → users | Customer records |
| `leads` | id, title, description, value, source, status, customer_id, assigned_to, created_by, created_at, updated_at | customer_id → customers, assigned_to → users, created_by → users | Sales leads (7 statuses) |
| `lead_notes` | id, lead_id, author_id, content, created_at | lead_id → leads (CASCADE), author_id → users | Notes on leads |
| `activity_logs` | id, user_id, action, entity_type, entity_id, details, created_at | user_id → users | Audit trail (62 action types) |

### Catalog Domain (6 tables)

| Table | Columns | FKs | Purpose |
|-------|---------|-----|---------|
| `brands` | id, name (unique), slug (unique), logo_url, description, is_active, created_at, updated_at | — | Product/equipment brands |
| `product_categories` | id, name, slug (unique), parent_id, depth, sort_order, is_active, created_at, updated_at | parent_id → self | 3-level category tree |
| `products` | id, sku (unique), name, description_en, description_lo, category_id, brand_id, price, status, is_active, created_at, updated_at | category_id → product_categories, brand_id → brands | Product catalog |
| `product_specs` | id, product_id, spec_key, spec_value, sort_order | product_id → products (CASCADE) | Key-value specs |
| `product_images` | id, product_id, url, alt_text, is_primary, sort_order | product_id → products (CASCADE) | Product images |
| `product_compat_brands` | id, product_id, brand_id | product_id → products (CASCADE), brand_id → brands | Brand compatibility |
| `import_jobs` | id, filename, status, total_rows, success_count, error_count, created_by, created_at | created_by → users | Excel import tracking |
| `import_errors` | id, import_job_id, row_number, field, message | import_job_id → import_jobs (CASCADE) | Per-row import errors |

### Equipment Domain (9 tables)

| Table | Columns | FKs | Purpose |
|-------|---------|-----|---------|
| `forklift_models` | id, brand_name, model_name, created_at, updated_at | — | Equipment model catalog |
| `forklifts` | id, serial_number (unique), slug (unique), internal_code, model_id, brand_id, customer_id, name_en, name_lo, model_number, status, condition, fuel_type, capacity_kg, year_manufactured, purchase_date, warranty_expiry, initial_hour_meter, current_hour_meter, notes, is_active, created_by, updated_by, created_at, updated_at | model_id → forklift_models, brand_id → brands, customer_id → customers | Core asset entity (25 columns) |
| `forklift_specs` | id, forklift_id, mast_type, max_lift_height_mm, front_tire, rear_tire, tire_type, fork_length_mm, battery_type, attachment_type, notes, created_at, updated_at | forklift_id → forklifts (CASCADE) | Physical specifications |
| `forklift_photos` | id, forklift_id, url, caption, is_primary, sort_order, created_at | forklift_id → forklifts (CASCADE) | Image gallery |
| `forklift_documents` | id, forklift_id, document_type, title, url, expiry_date, created_at | forklift_id → forklifts (CASCADE) | Certificates, manuals, warranties |
| `forklift_locations` | id, forklift_id, latitude, longitude, address, customer_site, effective_date, created_at | forklift_id → forklifts (CASCADE) | GPS/site tracking history |
| `forklift_hour_meter_logs` | id, forklift_id, hours_reading, recorded_at, recorded_by | forklift_id → forklifts (CASCADE) | Usage tracking |
| `forklift_ownership_costs` | id, forklift_id, cost_type, amount, currency, cost_date, description, vendor, reference_number, recorded_by, created_at | forklift_id → forklifts (CASCADE) | TCO data (7 cost types) |
| `forklift_status_history` | id, forklift_id, old_status, new_status, changed_by, changed_at, notes | forklift_id → forklifts (CASCADE) | Status transition audit |

### Quotation Domain (4 tables)

| Table | Columns | FKs | Purpose |
|-------|---------|-----|---------|
| `quotations` | id, quotation_number (unique), revision_number, parent_id, quotation_type, status, title, customer_id, lead_id, assigned_to, contact_name/email/phone, subtotal, tax_rate, tax_amount, discount_amount, total_amount, currency, valid_from, valid_until, notes, internal_notes, converted_to_type, converted_to_id, created_by, updated_by, created_at, updated_at, is_active | customer_id → customers, lead_id → leads, parent_id → self | Sales quotations (10 statuses) |
| `quotation_items` | id, quotation_id, item_type, description, quantity, unit_rate, discount_pct, tax_rate, line_total, sort_order | quotation_id → quotations (CASCADE) | Line items (7 item types) |
| `quotation_approvals` | id, quotation_id, approver_id, decision, comments, created_at | quotation_id → quotations (CASCADE) | Approval records |
| `quotation_status_history` | id, quotation_id, old_status, new_status, changed_by, changed_at, notes | quotation_id → quotations (CASCADE) | Status audit trail |

### Rental Domain (8 tables)

| Table | Columns | FKs | Purpose |
|-------|---------|-----|---------|
| `rental_contracts` | id, contract_number (unique), quotation_id, customer_id, lead_id, status, contract_type, revision_number, start/end_date, actual_start/end_date, billing_cycle_day, payment_terms_days, deposit_amount/status, fee percentages (3), financials (6), delivery info (3), notes (3), assigned_to, approved_by/at, created_by, updated_by, created_at, updated_at, is_active | quotation_id → quotations, customer_id → customers (RESTRICT), lead_id → leads | Core rental entity (13 statuses) |
| `rental_contract_items` | id, contract_id, forklift_id, quotation_item_id, line_number, description, monthly/daily/hourly_rate, hour limits, hour meters, line_status, line_total, sort_order, notes, created_at, updated_at | contract_id → rental_contracts (CASCADE), forklift_id → forklifts | Equipment line items |
| `rental_contract_terms` | id, contract_id, term_category, term_key (unique per contract), term_label, term_value, data_type, numeric_value, is_required, is_visible_to_customer, sort_order | contract_id → rental_contracts (CASCADE) | Terms & conditions |
| `rental_contract_status_history` | id, contract_id, old_status, new_status, changed_by, changed_at, notes | contract_id → rental_contracts (CASCADE) | Status audit trail |
| `rental_extensions` | id, contract_id, extension_number, original/new_end_date, rate_adjustment_pct, new_monthly_rate, reason, status, conditions, requested/approved_by, decided_at, created_at | contract_id → rental_contracts (CASCADE) | Contract extensions (4 statuses) |
| `rental_returns` | id, return_number (unique), contract_id, contract_item_id, forklift_id, return_type, status, is_early_termination, dates (4), hour meters (2), inspection fields (5), photo_urls (JSON), assigned_driver, inspected_by, notes, created_by, created_at, updated_at | contract_id → rental_contracts (CASCADE), forklift_id → forklifts | Return processing (7 statuses) |
| `rental_damage_reports` | id, report_number (unique), return_id, contract_id, forklift_id, damage_category, component, description, photo_urls (JSON), costs (5 fields), is_customer_liable, dispute fields (4), assessed_by/at, created_at, updated_at | return_id → rental_returns (CASCADE), contract_id → rental_contracts (CASCADE) | Damage assessment |
| `rental_billing_cycles` | id, billing_number (unique), contract_id, contract_item_id, billing_type, description, period dates, financials (6), is_credit, payment_status, invoice_id, due/paid_date, generated_by, notes, created_by, created_at, updated_at | contract_id → rental_contracts (CASCADE) | Billing periods (10 billing types) |

### Movement Domain (2 tables)

| Table | Columns | FKs | Purpose |
|-------|---------|-----|---------|
| `asset_movements` | id, movement_number (unique), movement_type, status, priority, forklift_id, rental_contract_id, customer_id, from/to_location, from/to_address, scheduled_date, actual_departure/arrival, hour meters (2), assigned_driver_id, tracking_code, notes (3), created_by, updated_by, created_at, updated_at, is_active | forklift_id → forklifts (RESTRICT), rental_contract_id → rental_contracts, customer_id → customers | Asset logistics (6 statuses, 4 types) |
| `movement_history` | id, movement_id, from/to_status, location, latitude, longitude, notes, recorded_by, recorded_at | movement_id → asset_movements (CASCADE) | Checkpoint log |

### Maintenance Domain (6 tables)

| Table | Columns | FKs | Purpose |
|-------|---------|-----|---------|
| `maintenance_plans` | id, plan_number (unique), name, description, service_type, interval_type, interval_value, estimated_duration_hours, estimated_cost, checklist (JSON), is_active, created_at, updated_at | — | PM templates |
| `maintenance_schedules` | id, forklift_id, plan_id, status, next_due_date, next_due_hours, last_service_date/hours, times_serviced, notes, is_active, created_at, updated_at | forklift_id → forklifts (CASCADE), plan_id → maintenance_plans (CASCADE) | Per-forklift schedules |
| `work_orders` | id, work_order_number (unique), forklift_id, schedule_id, plan_id, order_type, status, priority, title, description, assigned_to, scheduled_date, started/completed/verified_at, verified_by, hour_meter_at_service, estimated/actual_hours, estimated/actual_cost, findings, resolution, cancellation_reason, created_by, updated_by, created_at, updated_at, is_active | forklift_id → forklifts (RESTRICT), schedule_id → schedules, plan_id → plans | Work order lifecycle (6 statuses) |
| `service_history` | id, forklift_id, work_order_id, service_type, service_date, technician_id, hour_meter_reading, duration_hours, total_cost, currency, summary, created_at | forklift_id → forklifts (CASCADE), work_order_id → work_orders | Completed service log |
| `maintenance_costs` | id, work_order_id, cost_type, description, quantity, unit_rate, amount, vendor, reference_number, currency, created_at | work_order_id → work_orders (CASCADE) | Cost tracking (4 types) |
| `part_consumptions` | id, spare_part_id, warehouse_id, work_order_id, forklift_id, quantity, unit_cost, total_cost, notes, consumed_by, consumed_at | spare_part_id → spare_parts (RESTRICT), warehouse_id → warehouses (RESTRICT), work_order_id → work_orders | Parts used in maintenance |

### Inventory Domain (6 tables)

| Table | Columns | FKs | Purpose |
|-------|---------|-----|---------|
| `spare_parts` | id, part_number (unique), name, description, part_category, brand_id, unit, unit_price, currency, min_stock_level, reorder_quantity, lead_time_days, image_url, is_active, created_at, updated_at | brand_id → brands | Spare part catalog (11 categories) |
| `warehouses` | id, name, location, is_active, created_at, updated_at | — | Storage locations |
| `inventory_balances` | id, spare_part_id, warehouse_id, quantity_on_hand, quantity_reserved, quantity_available, last_count_date, updated_at | spare_part_id → spare_parts (CASCADE), warehouse_id → warehouses (CASCADE) | Stock levels (unique per part×warehouse) |
| `inventory_transactions` | id, transaction_number (unique), transaction_type, spare_part_id, warehouse_id, quantity, unit_cost, total_cost, reference_type, reference_id, notes, created_by, created_at | spare_part_id → spare_parts (RESTRICT), warehouse_id → warehouses (RESTRICT) | Stock movements (6 types) |
| `purchase_orders` | id, po_number (unique), status, vendor, warehouse_id, order_date, expected/received_date, financials (3), currency, notes, cancellation_reason, created_by, is_active, created_at, updated_at | warehouse_id → warehouses (RESTRICT) | PO lifecycle (5 statuses) |
| `purchase_order_items` | id, purchase_order_id, spare_part_id, quantity_ordered, quantity_received, unit_cost, line_total, notes, created_at | purchase_order_id → purchase_orders (CASCADE), spare_part_id → spare_parts (RESTRICT) | PO line items |

### Billing Domain (6 tables)

| Table | Columns | FKs | Purpose |
|-------|---------|-----|---------|
| `invoices` | id, invoice_number (unique), contract_id, customer_id, status, issue/due/paid_date, financials (7), billing_period_start/end, notes (2), sent_at, cancelled_at, cancellation_reason, created_by, updated_by, created_at, updated_at, is_active | contract_id → rental_contracts (RESTRICT), customer_id → customers (RESTRICT) | Invoices (8 statuses) |
| `invoice_items` | id, invoice_id, billing_cycle_id, line_number, description, quantity, unit_rate, amount, tax_amount, line_total, sort_order, created_at, updated_at | invoice_id → invoices (CASCADE) | Invoice line items |
| `payments` | id, payment_number (unique), customer_id, contract_id, payment_method, payment_status, amount, currency, payment/received_date, reference_number, notes, confirmed_by/at, created_by, updated_by, created_at, updated_at | customer_id → customers (RESTRICT), contract_id → rental_contracts | Payment records (6 methods, 4 statuses) |
| `payment_allocations` | id, payment_id, invoice_id, allocated_amount, allocated_at, allocated_by | payment_id → payments (CASCADE), invoice_id → invoices (CASCADE) | Payment-to-invoice mapping |
| `deposits` | id, deposit_number (unique), contract_id, customer_id, deposit_type, deposit_status, amount, currency, received/refund_date, refund/forfeit/applied_amount, payment_id, refund_payment_id, notes, created_by, updated_by, created_at, updated_at | contract_id → rental_contracts (RESTRICT), customer_id → customers (RESTRICT), payment_id → payments | Security/advance deposits (6 statuses) |
| `revenue_recognitions` | id, recognition_number (unique), invoice_id, invoice_item_id, contract_id, recognition_type, recognition_status, recognition_date, amount, currency, period_start/end, description, notes, created_by, updated_by, created_at, updated_at | invoice_id → invoices, contract_id → rental_contracts (RESTRICT) | Accrual accounting (5 types, 3 statuses) |

## 3. Key Enumerations

| Domain | Enum | Values |
|--------|------|--------|
| Auth | RoleName | super_admin, manager, sales, support |
| CRM | CustomerStatus | active, inactive, prospect, churned |
| CRM | LeadStatus | new, contacted, qualified, proposal, won, lost |
| Equipment | ForkliftStatus | in_stock, sold, rented, in_service, reserved, decommissioned |
| Equipment | ForkliftCondition | new, used, refurbished |
| Equipment | FuelType | electric, diesel, lpg, dual_fuel |
| Quotation | QuotationStatus | draft, under_review, approved, revision, sent, accepted, rejected, expired, converted, cancelled |
| Rental | RentalContractStatus | reservation, draft, pending_approval, approved, revision, delivering, active, overdue, returning, inspecting, settling, closed, cancelled |
| Rental | ReturnStatus | requested, scheduled, picked_up, received, inspected, completed, cancelled |
| Movement | MovementStatus | draft, preparing, in_transit, delivered, completed, cancelled |
| Maintenance | WorkOrderStatus | scheduled, due, in_progress, completed, verified, cancelled |
| Inventory | TransactionType | receive, issue, adjust, transfer, return, consume |
| Inventory | POStatus | draft, ordered, partially_received, received, cancelled |
| Billing | InvoiceStatus | draft, issued, sent, partially_paid, paid, overdue, cancelled, voided |
| Billing | PaymentRecordStatus | pending, confirmed, rejected, refunded |
| Billing | DepositRecordStatus | pending, received, partially_refunded, refunded, forfeited, applied |

## 4. Schema Changes Required by Refactor Plan

| Phase | Change | Migration | Script |
|-------|--------|-----------|--------|
| All phases | 9 performance indexes for aggregation queries | `migration-001-performance-indexes.py` | `a1b2c3d4e5f6` |
| Phase 10 | New table: `kpi_targets` (KPI target values) | `migration-002-kpi-targets.py` | `b2c3d4e5f6a7` |
| C5 | None — password change uses existing `users.hashed_password` | No migration | — |

No existing table schema changes are required. All refactor work uses existing tables. Migrations are **additive only**.

### Alembic Migration Chain

```mermaid
graph TD
    M1["425b763888ef<br/>Initial schema (55 tables)"] --> M2["fbd2d0a45d80<br/>Add forklift_specs table"]
    M2 --> M3["0b24e4aaa242<br/>Move mast_type to forklift_specs"]
    M3 --> M4["a1b2c3d4e5f6<br/>Performance indexes (9 new)<br/><i>ADDITIVE</i>"]
    M4 --> M5["b2c3d4e5f6a7<br/>Add kpi_targets table<br/><i>ADDITIVE</i>"]

    style M4 fill:#22c55e,color:#fff
    style M5 fill:#22c55e,color:#fff
```

## 5. Index Strategy

Current indexes: ~95 (auto-created by SQLAlchemy for PKs, unique columns, indexed columns, FKs).

### New Performance Indexes (Migration `a1b2c3d4e5f6`)

| Index | Table | Columns | Accelerates |
|-------|-------|---------|-------------|
| `ix_invoices_issue_date` | invoices | issue_date | Period reports, aging |
| `ix_invoices_status_customer` | invoices | status, customer_id | Customer statements |
| `ix_payments_payment_date` | payments | payment_date | Cash flow reports |
| `ix_forklifts_status_active` | forklifts | status, is_active | Fleet utilization |
| `ix_forklift_ownership_costs_forklift_date` | forklift_ownership_costs | forklift_id, cost_date | Per-asset TCO |
| `ix_maintenance_costs_cost_type` | maintenance_costs | cost_type | Cost aggregation |
| `ix_rental_contracts_status_dates` | rental_contracts | status, start_date, end_date | Active contract filtering |
| `ix_revenue_recognitions_recognition_date` | revenue_recognitions | recognition_date | Period recognition |
| `ix_rental_billing_cycles_payment_status` | rental_billing_cycles | payment_status | Overdue detection |

### New Table: `kpi_targets` (Migration `b2c3d4e5f6a7`)

```sql
CREATE TABLE kpi_targets (
    id              SERIAL PRIMARY KEY,
    metric_name     VARCHAR(100) NOT NULL,
    metric_category VARCHAR(50) NOT NULL,
    target_value    DOUBLE PRECISION NOT NULL,
    unit            VARCHAR(30) NOT NULL DEFAULT 'number',
    period_type     VARCHAR(20) NOT NULL DEFAULT 'monthly',
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    notes           TEXT,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
```
