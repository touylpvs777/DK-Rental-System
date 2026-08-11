# PostgreSQL Schema — DK Service Enterprise Platform

## Overview

| Metric | Value |
|--------|-------|
| Total tables | 56 (existing) + 1 (new: kpi_targets) = **57** |
| Total domains | 11 |
| Total foreign keys | 108 |
| Total indexes | 95 (existing) + 9 (new performance) = **104** |
| Total unique constraints | 26 |
| Target engine | PostgreSQL 16+ |
| ORM | SQLAlchemy 2.0 async |
| Migration tool | Alembic (async) |

## Files in This Directory

| File | Purpose |
|------|---------|
| `er-diagram.mmd` | Complete Mermaid ER diagram (all 57 tables with columns, types, FKs, relationships) |
| `postgresql-schema.sql` | Full DDL reference — all CREATE TABLE + CREATE INDEX statements |
| `migration-001-performance-indexes.py` | Additive Alembic migration: 9 new indexes for aggregation queries |
| `migration-002-kpi-targets.py` | Additive Alembic migration: new kpi_targets table for Phase 10 |
| `schema-documentation.md` | This file — schema guide, constraints, conventions |

## Alembic Migration Chain

```
425b763888ef  initial schema (55 tables)
     │
fbd2d0a45d80  add forklift_specs table
     │
0b24e4aaa242  move mast_type/max_lift_height_mm to forklift_specs
     │
a1b2c3d4e5f6  add performance indexes (9 new indexes) ← NEW
     │
b2c3d4e5f6a7  add kpi_targets table ← NEW
```

All new migrations are **additive only**. No existing tables, columns, or constraints are modified.

---

## Domain Summary

### Domain 1: Auth (3 tables)

| Table | Rows (est.) | Purpose |
|-------|-------------|---------|
| `roles` | 4 | System roles: super_admin, manager, sales, support |
| `users` | ~20 | Staff accounts with role assignment |
| `revoked_tokens` | ~100/day | JWT access token revocation (JTI blacklist) |

### Domain 2: CRM (4 tables)

| Table | Rows (est.) | Purpose |
|-------|-------------|---------|
| `customers` | ~500 | Customer records with status lifecycle |
| `leads` | ~1,000 | Sales pipeline (7-stage: new → won/lost) |
| `lead_notes` | ~3,000 | Notes attached to leads |
| `activity_logs` | ~50,000 | Audit trail (62 action types × entity references) |

### Domain 3: Catalog (8 tables)

| Table | Rows (est.) | Purpose |
|-------|-------------|---------|
| `brands` | ~30 | Equipment and parts manufacturers |
| `product_categories` | ~50 | 3-level category tree (division → category → sub-category) |
| `products` | ~500 | Spare parts and accessories catalog |
| `product_specs` | ~2,000 | EAV specifications (group/key/label/value/unit) |
| `product_images` | ~1,000 | Product gallery images |
| `product_compat_brands` | ~500 | Brand compatibility mapping |
| `import_jobs` | ~50 | Excel import tracking |
| `import_errors` | ~500 | Per-row import error details |

### Domain 4: Equipment (9 tables)

| Table | Rows (est.) | Purpose |
|-------|-------------|---------|
| `forklift_models` | ~30 | Equipment model catalog (brand + series) |
| `forklifts` | ~250 | Core asset entity (25+ columns) |
| `forklift_specs` | ~250 | Physical specifications (mast, tires, battery) |
| `forklift_photos` | ~500 | Asset photo gallery |
| `forklift_documents` | ~300 | Certificates, warranties, manuals |
| `forklift_locations` | ~1,000 | Location tracking history |
| `forklift_hour_meter_logs` | ~5,000 | Usage hour readings |
| `forklift_ownership_costs` | ~2,000 | TCO data (7 cost types) |
| `forklift_status_history` | ~3,000 | Status transition audit trail |

### Domain 5: Quotation (4 tables)

| Table | Rows (est.) | Purpose |
|-------|-------------|---------|
| `quotations` | ~500 | Sales quotations (10-stage workflow) |
| `quotation_items` | ~2,000 | Line items (7 item types) |
| `quotation_approvals` | ~300 | Approval decision records |
| `quotation_status_history` | ~2,000 | Status transition audit |

### Domain 6: Rental (8 tables)

| Table | Rows (est.) | Purpose |
|-------|-------------|---------|
| `rental_contracts` | ~200 | Core rental entity (13-stage lifecycle) |
| `rental_contract_items` | ~400 | Equipment line items per contract |
| `rental_contract_terms` | ~1,000 | Terms & conditions (7 categories) |
| `rental_contract_status_history` | ~1,500 | Status audit trail |
| `rental_extensions` | ~50 | Contract extension requests |
| `rental_returns` | ~200 | Return processing (7-stage) |
| `rental_damage_reports` | ~50 | Damage assessment with dispute workflow |
| `rental_billing_cycles` | ~2,000 | Monthly billing periods (10 billing types) |

### Domain 7: Movement (2 tables)

| Table | Rows (est.) | Purpose |
|-------|-------------|---------|
| `asset_movements` | ~500 | Delivery/retrieval/transfer logistics |
| `movement_history` | ~2,000 | Checkpoint log with GPS coordinates |

### Domain 8: Maintenance (6 tables)

| Table | Rows (est.) | Purpose |
|-------|-------------|---------|
| `maintenance_plans` | ~20 | PM templates (interval type + value) |
| `maintenance_schedules` | ~200 | Per-forklift schedule assignments |
| `work_orders` | ~1,000 | Work order lifecycle (6-stage) |
| `service_history` | ~1,000 | Completed service records |
| `maintenance_costs` | ~3,000 | Labor/parts/external costs per WO |
| `part_consumptions` | ~2,000 | Spare parts consumed in maintenance |

### Domain 9: Inventory (6 tables)

| Table | Rows (est.) | Purpose |
|-------|-------------|---------|
| `spare_parts` | ~300 | Spare part catalog (11 categories) |
| `warehouses` | ~5 | Storage locations |
| `inventory_balances` | ~500 | Stock levels per part × warehouse (unique constraint) |
| `inventory_transactions` | ~5,000 | Stock movements (6 transaction types) |
| `purchase_orders` | ~100 | PO lifecycle (5-stage) |
| `purchase_order_items` | ~500 | PO line items |

### Domain 10: Billing (6 tables)

| Table | Rows (est.) | Purpose |
|-------|-------------|---------|
| `invoices` | ~2,000 | Invoice lifecycle (8 statuses) |
| `invoice_items` | ~5,000 | Invoice line items (linked to billing cycles) |
| `payments` | ~1,500 | Payment records (6 methods, 4 statuses) |
| `payment_allocations` | ~2,000 | Payment → invoice allocation mapping |
| `deposits` | ~200 | Security/advance/guarantee deposits (6 statuses) |
| `revenue_recognitions` | ~3,000 | Accrual accounting entries (5 types, 3 statuses) |

### Domain 11: Executive BI (1 new table)

| Table | Rows (est.) | Purpose |
|-------|-------------|---------|
| `kpi_targets` | ~100 | KPI target values per metric per period |

---

## Naming Conventions

| Convention | Pattern | Example |
|-----------|---------|---------|
| Table names | `snake_case`, plural | `rental_contracts` |
| Column names | `snake_case` | `contract_number` |
| Primary keys | `id` (always `SERIAL`) | `id` |
| Foreign keys | `{entity}_id` | `customer_id`, `forklift_id` |
| Timestamps | `{event}_at` (TIMESTAMPTZ) | `created_at`, `approved_at` |
| Dates | `{event}_date` (DATE) | `purchase_date`, `due_date` |
| Status columns | `status` or `{domain}_status` | `status`, `deposit_status` |
| Boolean flags | `is_{adjective}` | `is_active`, `is_primary` |
| Amounts | `{name}` (DOUBLE PRECISION) | `amount`, `total_value` |
| Currency | `currency` (VARCHAR(3)) | Always default `'LAK'` |
| Unique identifiers | `{entity}_number` | `invoice_number`, `po_number` |
| Indexes | `ix_{table}_{column}` | `ix_invoices_status` |

## Constraint Patterns

### Foreign Key ON DELETE Behavior

| Pattern | Used When | Example |
|---------|-----------|---------|
| `CASCADE` | Child is meaningless without parent | `quotation_items.quotation_id` |
| `SET NULL` | Reference is optional/audit-only | `forklifts.brand_id`, `*.created_by` |
| `RESTRICT` | Deletion must be explicitly handled | `invoices.contract_id`, `invoices.customer_id` |

### Unique Constraints

| Table | Unique Columns | Purpose |
|-------|---------------|---------|
| `users` | `email`, `username` | Account uniqueness |
| `brands` | `name`, `slug` | No duplicate brands |
| `products` | `sku`, `slug` | Product identification |
| `forklifts` | `serial_number`, `slug`, `internal_code` | Asset identification |
| `quotations` | `quotation_number` | Document numbering |
| `rental_contracts` | `contract_number` | Document numbering |
| `invoices` | `invoice_number` | Document numbering |
| `payments` | `payment_number` | Document numbering |
| `deposits` | `deposit_number` | Document numbering |
| `warehouses` | `code` | Warehouse identification |
| `spare_parts` | `part_number` | Part identification |
| `inventory_balances` | `(spare_part_id, warehouse_id)` | One balance per part per warehouse |
| `rental_contract_terms` | `(contract_id, term_key)` | One term per key per contract |
| `asset_movements` | `tracking_code` | Unique tracking |

## Default Values

| Pattern | Default | Tables |
|---------|---------|--------|
| Currency | `'LAK'` | All financial tables (invoices, payments, deposits, costs) |
| Status (new entity) | First stage value | `'draft'`, `'pending'`, `'new'`, `'in_stock'` |
| Boolean active | `TRUE` | All tables with `is_active` |
| Timestamps | `NOW()` | All `created_at` columns |
| Numeric amounts | `0.0` | All financial amount columns |
| Sort order | `0` | All orderable entities |
| Hour meter | `0.0` | `forklifts.initial_hour_meter`, `current_hour_meter` |
| Overtime rate | `150.0` | `rental_contracts.overtime_rate_pct` |

## New Performance Indexes (Migration 001)

| Index | Table | Columns | Accelerates |
|-------|-------|---------|-------------|
| `ix_invoices_issue_date` | invoices | issue_date | Period reports, aging |
| `ix_invoices_status_customer` | invoices | status, customer_id | Customer statements |
| `ix_payments_payment_date` | payments | payment_date | Cash flow reports |
| `ix_forklifts_status_active` | forklifts | status, is_active | Fleet utilization dashboard |
| `ix_forklift_ownership_costs_forklift_date` | forklift_ownership_costs | forklift_id, cost_date | Per-asset TCO calculation |
| `ix_maintenance_costs_cost_type` | maintenance_costs | cost_type | Cost category aggregation |
| `ix_rental_contracts_status_dates` | rental_contracts | status, start_date, end_date | Active contract filtering |
| `ix_revenue_recognitions_recognition_date` | revenue_recognitions | recognition_date | Period recognition reports |
| `ix_rental_billing_cycles_payment_status` | rental_billing_cycles | payment_status | Overdue cycle detection |

## Deployment Instructions

### Fresh PostgreSQL Setup

```bash
# 1. Create database
createdb -U dk_user dk_crm

# 2. Run all migrations
cd backend
alembic upgrade head

# 3. Seed roles (happens automatically on app startup)
uvicorn app.main:app
```

### Apply New Migrations Only

```bash
# From current head (0b24e4aaa242):
alembic upgrade head
# This runs: a1b2c3d4e5f6 (indexes) → b2c3d4e5f6a7 (kpi_targets)

# Verify:
alembic current
# Should show: b2c3d4e5f6a7 (head)
```

### Rollback New Migrations

```bash
# Revert kpi_targets table:
alembic downgrade a1b2c3d4e5f6

# Revert performance indexes:
alembic downgrade 0b24e4aaa242

# Both are safe — no data loss, no existing table modifications.
```
