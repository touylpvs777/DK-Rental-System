# Table Definitions — DK Service Enterprise Platform

> 56 tables across 10 domains. PostgreSQL 16+ target. Full DDL in [`postgresql-schema.sql`](postgresql-schema.sql).

---

## Domain 1: Auth (3 tables)

### `roles`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| name | VARCHAR(50) | NO | — | UNIQUE |
| description | VARCHAR(255) | YES | — | |
| is_active | BOOLEAN | NO | TRUE | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | YES | — | |

### `users`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| email | VARCHAR(255) | NO | — | UNIQUE |
| username | VARCHAR(100) | NO | — | UNIQUE |
| hashed_password | VARCHAR(255) | NO | — | |
| full_name | VARCHAR(255) | YES | — | |
| is_active | BOOLEAN | NO | TRUE | |
| is_superuser | BOOLEAN | NO | FALSE | |
| role_id | INTEGER | YES | — | FK → roles(id) |
| last_login | TIMESTAMPTZ | YES | — | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | YES | — | |

### `revoked_tokens`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| jti | VARCHAR(36) | NO | — | UNIQUE |
| expires_at | TIMESTAMPTZ | NO | — | |

---

## Domain 2: CRM (4 tables)

### `customers`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| first_name | VARCHAR(100) | NO | — | |
| last_name | VARCHAR(100) | NO | — | |
| email | VARCHAR(255) | YES | — | UNIQUE |
| phone | VARCHAR(20) | YES | — | |
| company | VARCHAR(255) | YES | — | |
| status | VARCHAR(20) | NO | 'prospect' | Enum: active, inactive, prospect, churned |
| notes | TEXT | YES | — | |
| assigned_to | INTEGER | YES | — | FK → users(id) |
| created_by | INTEGER | YES | — | FK → users(id) |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | YES | — | |

### `leads`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| title | VARCHAR(255) | NO | — | |
| description | TEXT | YES | — | |
| value | FLOAT | YES | — | |
| source | VARCHAR(50) | YES | — | Enum: website, referral, cold_call, email, social_media, other |
| status | VARCHAR(20) | NO | 'new' | Enum: new, contacted, qualified, proposal, won, lost |
| customer_id | INTEGER | YES | — | FK → customers(id) |
| assigned_to | INTEGER | YES | — | FK → users(id) |
| created_by | INTEGER | YES | — | FK → users(id) |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | YES | — | |

### `lead_notes`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| lead_id | INTEGER | NO | — | FK → leads(id) CASCADE |
| author_id | INTEGER | YES | — | FK → users(id) SET NULL |
| content | TEXT | NO | — | |
| created_at | TIMESTAMPTZ | NO | NOW() | |

### `activity_logs`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| user_id | INTEGER | YES | — | FK → users(id) SET NULL |
| action | VARCHAR(50) | NO | — | 77 ActionType values |
| entity_type | VARCHAR(50) | YES | — | 15 EntityType values |
| entity_id | INTEGER | YES | — | |
| details | JSONB | YES | — | |
| created_at | TIMESTAMPTZ | NO | NOW() | |

---

## Domain 3: Catalog (8 tables)

### `brands`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| name | VARCHAR(150) | NO | — | UNIQUE |
| slug | VARCHAR(150) | NO | — | UNIQUE |
| brand_role | VARCHAR(20) | NO | 'primary' | Enum: primary, parts_only, both |
| logo_url | VARCHAR(500) | YES | — | |
| country | VARCHAR(100) | YES | — | |
| website | VARCHAR(255) | YES | — | |
| description | TEXT | YES | — | |
| is_active | BOOLEAN | NO | TRUE | |
| sort_order | INTEGER | NO | 0 | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | YES | — | |

### `product_categories`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| parent_id | INTEGER | YES | — | FK → product_categories(id) RESTRICT |
| name_lo | VARCHAR(200) | YES | — | Lao name |
| name_en | VARCHAR(200) | NO | — | English name |
| slug | VARCHAR(200) | NO | — | UNIQUE |
| level | INTEGER | NO | 1 | 1=division, 2=category, 3=sub |
| description | TEXT | YES | — | |
| icon | VARCHAR(100) | YES | — | |
| sort_order | INTEGER | NO | 0 | |
| is_active | BOOLEAN | NO | TRUE | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | YES | — | |

### `products`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| sku | VARCHAR(100) | NO | — | UNIQUE |
| name_lo | VARCHAR(300) | YES | — | |
| name_en | VARCHAR(300) | NO | — | |
| slug | VARCHAR(300) | NO | — | UNIQUE |
| model_number | VARCHAR(150) | YES | — | |
| brand_id | INTEGER | YES | — | FK → brands(id) SET NULL |
| category_id | INTEGER | YES | — | FK → product_categories(id) SET NULL |
| description_lo | TEXT | YES | — | |
| description_en | TEXT | YES | — | |
| is_active | BOOLEAN | NO | TRUE | |
| is_featured | BOOLEAN | NO | FALSE | |
| is_sale | BOOLEAN | NO | TRUE | |
| is_rental | BOOLEAN | NO | FALSE | |
| is_used_available | BOOLEAN | NO | FALSE | |
| is_service_item | BOOLEAN | NO | FALSE | |
| sort_order | INTEGER | NO | 0 | |
| created_by | INTEGER | YES | — | FK → users(id) SET NULL |
| updated_by | INTEGER | YES | — | FK → users(id) SET NULL |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | YES | — | |

### `product_specs`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| product_id | INTEGER | NO | — | FK → products(id) CASCADE |
| spec_group | VARCHAR(100) | NO | — | |
| spec_key | VARCHAR(100) | NO | — | |
| spec_label | VARCHAR(150) | NO | — | |
| spec_value | VARCHAR(500) | NO | — | |
| spec_unit | VARCHAR(50) | YES | — | |
| sort_order | INTEGER | NO | 0 | |

### `product_images`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| product_id | INTEGER | NO | — | FK → products(id) CASCADE |
| image_url | VARCHAR(500) | NO | — | |
| alt_text | VARCHAR(255) | YES | — | |
| is_primary | BOOLEAN | NO | FALSE | |
| sort_order | INTEGER | NO | 0 | |
| created_at | TIMESTAMPTZ | NO | NOW() | |

### `product_compat_brands`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| product_id | INTEGER | NO | — | FK → products(id) CASCADE |
| brand_id | INTEGER | NO | — | FK → brands(id) CASCADE |
| notes | VARCHAR(300) | YES | — | |

### `import_jobs`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| original_filename | VARCHAR(255) | NO | — | |
| status | VARCHAR(20) | NO | 'pending' | Enum: pending, preview, processing, completed, partial, failed |
| total_rows | INTEGER | NO | 0 | |
| processed_rows | INTEGER | NO | 0 | |
| success_rows | INTEGER | NO | 0 | |
| error_rows | INTEGER | NO | 0 | |
| preview_data | JSONB | YES | — | |
| created_by | INTEGER | YES | — | FK → users(id) SET NULL |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| completed_at | TIMESTAMPTZ | YES | — | |

### `import_errors`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| job_id | INTEGER | NO | — | FK → import_jobs(id) CASCADE |
| sheet_name | VARCHAR(200) | YES | — | |
| row_number | INTEGER | NO | — | |
| row_data | JSONB | YES | — | |
| error_message | TEXT | NO | — | |

---

## Domain 4: Equipment (9 tables)

### `forklift_models`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| brand_id | INTEGER | YES | — | FK → brands(id) SET NULL |
| name | VARCHAR(200) | NO | — | |
| slug | VARCHAR(200) | NO | — | UNIQUE |
| series | VARCHAR(100) | YES | — | |
| fuel_type | VARCHAR(20) | YES | — | |
| capacity_kg | FLOAT | YES | — | |
| max_lift_height_mm | INTEGER | YES | — | |
| description | TEXT | YES | — | |
| is_active | BOOLEAN | NO | TRUE | |
| sort_order | INTEGER | NO | 0 | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | YES | — | |

### `forklifts`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| serial_number | VARCHAR(100) | NO | — | UNIQUE |
| slug | VARCHAR(300) | NO | — | UNIQUE |
| internal_code | VARCHAR(50) | YES | — | UNIQUE |
| model_id | INTEGER | YES | — | FK → forklift_models(id) SET NULL |
| brand_id | INTEGER | YES | — | FK → brands(id) SET NULL |
| customer_id | INTEGER | YES | — | FK → customers(id) SET NULL |
| name_en | VARCHAR(300) | NO | — | |
| name_lo | VARCHAR(300) | YES | — | |
| model_number | VARCHAR(150) | YES | — | |
| status | VARCHAR(30) | NO | 'in_stock' | Enum: in_stock, sold, rented, in_service, reserved, decommissioned |
| condition | VARCHAR(20) | NO | 'new' | Enum: new, used, refurbished |
| fuel_type | VARCHAR(20) | YES | — | Enum: electric, diesel, lpg, dual_fuel |
| capacity_kg | FLOAT | YES | — | |
| year_manufactured | INTEGER | YES | — | |
| purchase_date | DATE | YES | — | |
| warranty_expiry | DATE | YES | — | |
| initial_hour_meter | FLOAT | NO | 0.0 | |
| current_hour_meter | FLOAT | NO | 0.0 | |
| notes | TEXT | YES | — | |
| is_active | BOOLEAN | NO | TRUE | |
| created_by | INTEGER | YES | — | FK → users(id) SET NULL |
| updated_by | INTEGER | YES | — | FK → users(id) SET NULL |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | YES | — | |

### `forklift_specs`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| forklift_id | INTEGER | NO | — | FK → forklifts(id) CASCADE |
| mast_type | VARCHAR(50) | YES | — | |
| max_lift_height_mm | INTEGER | YES | — | |
| front_tire | VARCHAR(50) | YES | — | |
| rear_tire | VARCHAR(50) | YES | — | |
| tire_type | VARCHAR(50) | YES | — | |
| fork_length_mm | INTEGER | YES | — | |
| battery_type | VARCHAR(100) | YES | — | |
| attachment_type | VARCHAR(100) | YES | — | |
| notes | TEXT | YES | — | |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | YES | — | |

### `forklift_photos`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| forklift_id | INTEGER | NO | — | FK → forklifts(id) CASCADE |
| image_url | VARCHAR(500) | NO | — | |
| thumbnail_url | VARCHAR(500) | YES | — | |
| alt_text | VARCHAR(255) | YES | — | |
| caption | VARCHAR(500) | YES | — | |
| is_primary | BOOLEAN | NO | FALSE | |
| sort_order | INTEGER | NO | 0 | |
| taken_at | DATE | YES | — | |
| uploaded_by | INTEGER | YES | — | FK → users(id) SET NULL |
| created_at | TIMESTAMPTZ | NO | NOW() | |

### `forklift_documents`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| forklift_id | INTEGER | NO | — | FK → forklifts(id) CASCADE |
| document_type | VARCHAR(30) | NO | — | Enum: warranty, inspection, insurance, registration, service_contract, manual, certificate, other |
| title | VARCHAR(300) | NO | — | |
| file_url | VARCHAR(500) | NO | — | |
| file_size_bytes | INTEGER | YES | — | |
| mime_type | VARCHAR(100) | YES | — | |
| expiry_date | DATE | YES | — | |
| notes | VARCHAR(500) | YES | — | |
| uploaded_by | INTEGER | YES | — | FK → users(id) SET NULL |
| created_at | TIMESTAMPTZ | NO | NOW() | |

### `forklift_locations`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| forklift_id | INTEGER | NO | — | FK → forklifts(id) CASCADE |
| location_name | VARCHAR(200) | NO | — | |
| warehouse_zone | VARCHAR(100) | YES | — | |
| address | TEXT | YES | — | |
| customer_id | INTEGER | YES | — | FK → customers(id) SET NULL |
| effective_date | DATE | NO | — | |
| notes | VARCHAR(500) | YES | — | |
| recorded_by | INTEGER | YES | — | FK → users(id) SET NULL |
| created_at | TIMESTAMPTZ | NO | NOW() | |

### `forklift_hour_meter_logs`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| forklift_id | INTEGER | NO | — | FK → forklifts(id) CASCADE |
| reading | FLOAT | NO | — | |
| recorded_at | TIMESTAMPTZ | NO | NOW() | |
| source | VARCHAR(30) | NO | 'manual' | |
| notes | VARCHAR(500) | YES | — | |
| recorded_by | INTEGER | YES | — | FK → users(id) SET NULL |

### `forklift_ownership_costs`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| forklift_id | INTEGER | NO | — | FK → forklifts(id) CASCADE |
| cost_type | VARCHAR(30) | NO | — | Enum: purchase, maintenance, repair, insurance, parts, inspection, other |
| amount | FLOAT | NO | — | |
| currency | VARCHAR(3) | NO | 'LAK' | |
| cost_date | DATE | NO | — | |
| description | VARCHAR(500) | YES | — | |
| vendor | VARCHAR(200) | YES | — | |
| reference_number | VARCHAR(100) | YES | — | |
| recorded_by | INTEGER | YES | — | FK → users(id) SET NULL |
| created_at | TIMESTAMPTZ | NO | NOW() | |

### `forklift_status_history`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| forklift_id | INTEGER | NO | — | FK → forklifts(id) CASCADE |
| from_status | VARCHAR(30) | YES | — | |
| to_status | VARCHAR(30) | NO | — | |
| reason | VARCHAR(500) | YES | — | |
| changed_by | INTEGER | YES | — | FK → users(id) SET NULL |
| changed_at | TIMESTAMPTZ | NO | NOW() | |

---

## Domain 5: Quotation (4 tables)

### `quotations`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| quotation_number | VARCHAR(50) | NO | — | UNIQUE |
| revision_number | INTEGER | NO | 1 | |
| parent_id | INTEGER | YES | — | FK → quotations(id) SET NULL |
| quotation_type | VARCHAR(30) | NO | — | Enum: rental, sales, service, spare_parts |
| status | VARCHAR(30) | NO | 'draft' | Enum: draft, under_review, approved, revision, sent, accepted, rejected, expired, converted, cancelled |
| title | VARCHAR(500) | NO | — | |
| customer_id | INTEGER | YES | — | FK → customers(id) SET NULL |
| lead_id | INTEGER | YES | — | FK → leads(id) SET NULL |
| assigned_to | INTEGER | YES | — | FK → users(id) SET NULL |
| contact_name | VARCHAR(200) | YES | — | |
| contact_email | VARCHAR(255) | YES | — | |
| contact_phone | VARCHAR(50) | YES | — | |
| subtotal | FLOAT | NO | 0.0 | |
| tax_rate | FLOAT | NO | 0.0 | |
| tax_amount | FLOAT | NO | 0.0 | |
| discount_amount | FLOAT | NO | 0.0 | |
| total_amount | FLOAT | NO | 0.0 | |
| currency | VARCHAR(3) | NO | 'LAK' | |
| valid_from | DATE | YES | — | |
| valid_until | DATE | YES | — | |
| notes | TEXT | YES | — | |
| internal_notes | TEXT | YES | — | |
| converted_to_type | VARCHAR(30) | YES | — | |
| converted_to_id | INTEGER | YES | — | No FK (polymorphic) |
| created_by | INTEGER | YES | — | FK → users(id) SET NULL |
| updated_by | INTEGER | YES | — | FK → users(id) SET NULL |
| created_at | TIMESTAMPTZ | NO | NOW() | |
| updated_at | TIMESTAMPTZ | YES | — | |
| is_active | BOOLEAN | NO | TRUE | |

### `quotation_items`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| quotation_id | INTEGER | NO | — | FK → quotations(id) CASCADE |
| line_number | INTEGER | NO | — | |
| item_type | VARCHAR(30) | NO | — | Enum: forklift_rental, forklift_sale, service, spare_part, delivery, insurance, custom |
| forklift_id | INTEGER | YES | — | FK → forklifts(id) SET NULL |
| product_id | INTEGER | YES | — | FK → products(id) SET NULL |
| description | VARCHAR(1000) | NO | — | |
| quantity | FLOAT | NO | 1.0 | |
| unit | VARCHAR(50) | NO | 'unit' | |
| unit_price | FLOAT | NO | — | |
| discount_percent | FLOAT | NO | 0.0 | |
| line_total | FLOAT | NO | — | |
| rental_duration_days | INTEGER | YES | — | |
| rental_rate_period | VARCHAR(20) | YES | — | |
| notes | VARCHAR(500) | YES | — | |
| sort_order | INTEGER | NO | 0 | |
| created_at | TIMESTAMPTZ | NO | NOW() | |

### `quotation_approvals`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| quotation_id | INTEGER | NO | — | FK → quotations(id) CASCADE |
| revision_number | INTEGER | NO | — | |
| decision | VARCHAR(20) | NO | — | |
| reason | TEXT | YES | — | |
| conditions | TEXT | YES | — | |
| decided_by | INTEGER | YES | — | FK → users(id) SET NULL |
| decided_at | TIMESTAMPTZ | NO | NOW() | |

### `quotation_status_history`

| Column | Type | Null | Default | Constraints |
|--------|------|------|---------|-------------|
| id | SERIAL | NO | auto | PK |
| quotation_id | INTEGER | NO | — | FK → quotations(id) CASCADE |
| from_status | VARCHAR(30) | YES | — | |
| to_status | VARCHAR(30) | NO | — | |
| reason | VARCHAR(500) | YES | — | |
| changed_by | INTEGER | YES | — | FK → users(id) SET NULL |
| changed_at | TIMESTAMPTZ | NO | NOW() | |

---

## Domains 6–10: Rental, Movement, Maintenance, Inventory, Billing

> Full column definitions for all 28 remaining tables are in [`postgresql-schema.sql`](postgresql-schema.sql) with exact types, defaults, and constraints. Key tables summarized below.

### `rental_contracts` — 38 columns

Core fields: contract_number (UNIQUE), customer_id (FK RESTRICT), quotation_id, status (13-state enum), contract_type, dates (start/end/actual), billing config (cycle_day, payment_terms_days), penalty rates (3 percentages), financials (6 amount fields), delivery info, notes, user tracking.

### `invoices` — 27 columns

Core fields: invoice_number (UNIQUE), contract_id (FK RESTRICT), customer_id (FK RESTRICT), status (8-state enum), dates (issue/due/paid), financials (subtotal through balance_due, 7 fields), billing period, notes, cancellation tracking.

### `payments` — 18 columns

Core fields: payment_number (UNIQUE), customer_id (FK RESTRICT), payment_method (6 methods), payment_status (4 states), amount, dates, reference_number, confirmation tracking.

### `work_orders` — 27 columns

Core fields: work_order_number (UNIQUE), forklift_id (FK RESTRICT), order_type (4 types), status (6 states), priority (4 levels), assigned_to, dates, hour meters, estimated/actual hours and costs, findings/resolution.

### `spare_parts` — 16 columns

Core fields: part_number (UNIQUE), name, part_category (11 categories), brand_id, pricing (unit_price, currency), stock config (min_stock_level, reorder_quantity, lead_time_days).

### `inventory_balances` — 8 columns

Core fields: spare_part_id + warehouse_id (COMPOSITE UNIQUE), quantity_on_hand, quantity_reserved, quantity_available.
