-- ═══════════════════════════════════════════════════════════════════════════
-- DK Service Enterprise Platform — PostgreSQL Schema
-- Generated: 2026-06-28
-- Tables: 56 | Alembic chain: 425b763888ef → fbd2d0a45d80 → 0b24e4aaa242
-- Target: PostgreSQL 16+
-- ═══════════════════════════════════════════════════════════════════════════

-- NOTE: This DDL represents the CURRENT state of all 56 tables.
-- It is a reference document. Use Alembic migrations for deployment.
-- Do NOT run this file against an existing database.

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- ═══════════════════════════════════════════════════════════════════════════
-- DOMAIN 1: AUTH (3 tables)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE roles (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(50) NOT NULL UNIQUE,
    description     VARCHAR(255),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);

CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    username        VARCHAR(100) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_superuser    BOOLEAN NOT NULL DEFAULT FALSE,
    role_id         INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE INDEX ix_users_role_id ON users(role_id);

CREATE TABLE revoked_tokens (
    id              SERIAL PRIMARY KEY,
    jti             VARCHAR(255) NOT NULL UNIQUE,
    revoked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_revoked_tokens_jti ON revoked_tokens(jti);

-- ═══════════════════════════════════════════════════════════════════════════
-- DOMAIN 2: CRM (4 tables)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE customers (
    id              SERIAL PRIMARY KEY,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) UNIQUE,
    phone           VARCHAR(20),
    company         VARCHAR(255),
    status          VARCHAR(20) NOT NULL DEFAULT 'prospect',
    notes           TEXT,
    assigned_to     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE INDEX ix_customers_status ON customers(status);
CREATE INDEX ix_customers_assigned_to ON customers(assigned_to);

CREATE TABLE leads (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    value           DOUBLE PRECISION,
    source          VARCHAR(50),
    status          VARCHAR(20) NOT NULL DEFAULT 'new',
    customer_id     INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    assigned_to     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE INDEX ix_leads_status ON leads(status);
CREATE INDEX ix_leads_customer_id ON leads(customer_id);
CREATE INDEX ix_leads_assigned_to ON leads(assigned_to);

CREATE TABLE lead_notes (
    id              SERIAL PRIMARY KEY,
    lead_id         INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    author_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_lead_notes_lead_id ON lead_notes(lead_id);

CREATE TABLE activity_logs (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(50) NOT NULL,
    entity_type     VARCHAR(50),
    entity_id       INTEGER,
    details         JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX ix_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX ix_activity_logs_entity_id ON activity_logs(entity_id);
CREATE INDEX ix_activity_logs_created_at ON activity_logs(created_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- DOMAIN 3: CATALOG (6 tables)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE brands (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(150) NOT NULL UNIQUE,
    slug            VARCHAR(150) NOT NULL UNIQUE,
    brand_role      VARCHAR(20) NOT NULL DEFAULT 'primary',
    logo_url        VARCHAR(500),
    country         VARCHAR(100),
    website         VARCHAR(255),
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE INDEX ix_brands_slug ON brands(slug);

CREATE TABLE product_categories (
    id              SERIAL PRIMARY KEY,
    parent_id       INTEGER REFERENCES product_categories(id) ON DELETE RESTRICT,
    name_lo         VARCHAR(200),
    name_en         VARCHAR(200) NOT NULL,
    slug            VARCHAR(200) NOT NULL UNIQUE,
    level           INTEGER NOT NULL DEFAULT 1,
    description     TEXT,
    icon            VARCHAR(100),
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE INDEX ix_product_categories_parent_id ON product_categories(parent_id);
CREATE INDEX ix_product_categories_slug ON product_categories(slug);

CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    sku             VARCHAR(100) NOT NULL UNIQUE,
    name_lo         VARCHAR(300),
    name_en         VARCHAR(300) NOT NULL,
    slug            VARCHAR(300) NOT NULL UNIQUE,
    model_number    VARCHAR(150),
    brand_id        INTEGER REFERENCES brands(id) ON DELETE SET NULL,
    category_id     INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
    description_lo  TEXT,
    description_en  TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
    is_sale         BOOLEAN NOT NULL DEFAULT TRUE,
    is_rental       BOOLEAN NOT NULL DEFAULT FALSE,
    is_used_available BOOLEAN NOT NULL DEFAULT FALSE,
    is_service_item BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE INDEX ix_products_sku ON products(sku);
CREATE INDEX ix_products_name_en ON products(name_en);
CREATE INDEX ix_products_slug ON products(slug);
CREATE INDEX ix_products_model_number ON products(model_number);
CREATE INDEX ix_products_brand_id ON products(brand_id);
CREATE INDEX ix_products_category_id ON products(category_id);
CREATE INDEX ix_products_is_active ON products(is_active);

CREATE TABLE product_specs (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    spec_group      VARCHAR(100) NOT NULL,
    spec_key        VARCHAR(100) NOT NULL,
    spec_label      VARCHAR(150) NOT NULL,
    spec_value      VARCHAR(500) NOT NULL,
    spec_unit       VARCHAR(50),
    sort_order      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX ix_product_specs_product_id ON product_specs(product_id);

CREATE TABLE product_images (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url       VARCHAR(500) NOT NULL,
    alt_text        VARCHAR(255),
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_product_images_product_id ON product_images(product_id);

CREATE TABLE product_compat_brands (
    id              SERIAL PRIMARY KEY,
    product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    brand_id        INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    notes           VARCHAR(300)
);
CREATE INDEX ix_product_compat_brands_product_id ON product_compat_brands(product_id);
CREATE INDEX ix_product_compat_brands_brand_id ON product_compat_brands(brand_id);

CREATE TABLE import_jobs (
    id              SERIAL PRIMARY KEY,
    original_filename VARCHAR(255) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    total_rows      INTEGER NOT NULL DEFAULT 0,
    processed_rows  INTEGER NOT NULL DEFAULT 0,
    success_rows    INTEGER NOT NULL DEFAULT 0,
    error_rows      INTEGER NOT NULL DEFAULT 0,
    preview_data    JSONB,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE TABLE import_errors (
    id              SERIAL PRIMARY KEY,
    job_id          INTEGER NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
    sheet_name      VARCHAR(200),
    row_number      INTEGER NOT NULL,
    row_data        JSONB,
    error_message   TEXT NOT NULL
);
CREATE INDEX ix_import_errors_job_id ON import_errors(job_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- DOMAIN 4: EQUIPMENT (9 tables)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE forklift_models (
    id              SERIAL PRIMARY KEY,
    brand_id        INTEGER REFERENCES brands(id) ON DELETE SET NULL,
    name            VARCHAR(200) NOT NULL,
    slug            VARCHAR(200) NOT NULL UNIQUE,
    series          VARCHAR(100),
    fuel_type       VARCHAR(20),
    capacity_kg     DOUBLE PRECISION,
    max_lift_height_mm INTEGER,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE INDEX ix_forklift_models_brand_id ON forklift_models(brand_id);
CREATE INDEX ix_forklift_models_slug ON forklift_models(slug);

CREATE TABLE forklifts (
    id              SERIAL PRIMARY KEY,
    serial_number   VARCHAR(100) NOT NULL UNIQUE,
    slug            VARCHAR(300) NOT NULL UNIQUE,
    internal_code   VARCHAR(50) UNIQUE,
    model_id        INTEGER REFERENCES forklift_models(id) ON DELETE SET NULL,
    brand_id        INTEGER REFERENCES brands(id) ON DELETE SET NULL,
    customer_id     INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    name_en         VARCHAR(300) NOT NULL,
    name_lo         VARCHAR(300),
    model_number    VARCHAR(150),
    status          VARCHAR(30) NOT NULL DEFAULT 'in_stock',
    condition       VARCHAR(20) NOT NULL DEFAULT 'new',
    fuel_type       VARCHAR(20),
    capacity_kg     DOUBLE PRECISION,
    year_manufactured INTEGER,
    purchase_date   DATE,
    warranty_expiry DATE,
    initial_hour_meter DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    current_hour_meter DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    notes           TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE INDEX ix_forklifts_serial_number ON forklifts(serial_number);
CREATE INDEX ix_forklifts_slug ON forklifts(slug);
CREATE INDEX ix_forklifts_model_id ON forklifts(model_id);
CREATE INDEX ix_forklifts_brand_id ON forklifts(brand_id);
CREATE INDEX ix_forklifts_customer_id ON forklifts(customer_id);
CREATE INDEX ix_forklifts_status ON forklifts(status);
CREATE INDEX ix_forklifts_is_active ON forklifts(is_active);
CREATE INDEX ix_forklifts_name_en ON forklifts(name_en);
CREATE INDEX ix_forklifts_model_number ON forklifts(model_number);

CREATE TABLE forklift_specs (
    id              SERIAL PRIMARY KEY,
    forklift_id     INTEGER NOT NULL REFERENCES forklifts(id) ON DELETE CASCADE,
    mast_type       VARCHAR(50),
    max_lift_height_mm INTEGER,
    front_tire      VARCHAR(50),
    rear_tire       VARCHAR(50),
    tire_type       VARCHAR(50),
    fork_length_mm  INTEGER,
    battery_type    VARCHAR(100),
    attachment_type VARCHAR(100),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE INDEX ix_forklift_specs_forklift_id ON forklift_specs(forklift_id);

CREATE TABLE forklift_photos (
    id              SERIAL PRIMARY KEY,
    forklift_id     INTEGER NOT NULL REFERENCES forklifts(id) ON DELETE CASCADE,
    image_url       VARCHAR(500) NOT NULL,
    thumbnail_url   VARCHAR(500),
    alt_text        VARCHAR(255),
    caption         VARCHAR(500),
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    taken_at        DATE,
    uploaded_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_forklift_photos_forklift_id ON forklift_photos(forklift_id);

CREATE TABLE forklift_documents (
    id              SERIAL PRIMARY KEY,
    forklift_id     INTEGER NOT NULL REFERENCES forklifts(id) ON DELETE CASCADE,
    document_type   VARCHAR(30) NOT NULL,
    title           VARCHAR(300) NOT NULL,
    file_url        VARCHAR(500) NOT NULL,
    file_size_bytes INTEGER,
    mime_type       VARCHAR(100),
    expiry_date     DATE,
    notes           VARCHAR(500),
    uploaded_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_forklift_documents_forklift_id ON forklift_documents(forklift_id);
CREATE INDEX ix_forklift_documents_expiry_date ON forklift_documents(expiry_date);

CREATE TABLE forklift_locations (
    id              SERIAL PRIMARY KEY,
    forklift_id     INTEGER NOT NULL REFERENCES forklifts(id) ON DELETE CASCADE,
    location_name   VARCHAR(200) NOT NULL,
    warehouse_zone  VARCHAR(100),
    address         TEXT,
    customer_id     INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    effective_date  DATE NOT NULL,
    notes           VARCHAR(500),
    recorded_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_forklift_locations_forklift_id ON forklift_locations(forklift_id);
CREATE INDEX ix_forklift_locations_effective_date ON forklift_locations(effective_date);

CREATE TABLE forklift_hour_meter_logs (
    id              SERIAL PRIMARY KEY,
    forklift_id     INTEGER NOT NULL REFERENCES forklifts(id) ON DELETE CASCADE,
    reading         DOUBLE PRECISION NOT NULL,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source          VARCHAR(30) NOT NULL DEFAULT 'manual',
    notes           VARCHAR(500),
    recorded_by     INTEGER REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX ix_forklift_hour_meter_logs_forklift_id ON forklift_hour_meter_logs(forklift_id);
CREATE INDEX ix_forklift_hour_meter_logs_recorded_at ON forklift_hour_meter_logs(recorded_at);

CREATE TABLE forklift_ownership_costs (
    id              SERIAL PRIMARY KEY,
    forklift_id     INTEGER NOT NULL REFERENCES forklifts(id) ON DELETE CASCADE,
    cost_type       VARCHAR(30) NOT NULL,
    amount          DOUBLE PRECISION NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'LAK',
    cost_date       DATE NOT NULL,
    description     VARCHAR(500),
    vendor          VARCHAR(200),
    reference_number VARCHAR(100),
    recorded_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_forklift_ownership_costs_forklift_id ON forklift_ownership_costs(forklift_id);
CREATE INDEX ix_forklift_ownership_costs_cost_date ON forklift_ownership_costs(cost_date);
CREATE INDEX ix_forklift_ownership_costs_cost_type ON forklift_ownership_costs(cost_type);

CREATE TABLE forklift_status_history (
    id              SERIAL PRIMARY KEY,
    forklift_id     INTEGER NOT NULL REFERENCES forklifts(id) ON DELETE CASCADE,
    from_status     VARCHAR(30),
    to_status       VARCHAR(30) NOT NULL,
    reason          VARCHAR(500),
    changed_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_forklift_status_history_forklift_id ON forklift_status_history(forklift_id);
CREATE INDEX ix_forklift_status_history_changed_at ON forklift_status_history(changed_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- DOMAIN 5: QUOTATION (4 tables)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE quotations (
    id              SERIAL PRIMARY KEY,
    quotation_number VARCHAR(50) NOT NULL UNIQUE,
    revision_number INTEGER NOT NULL DEFAULT 1,
    parent_id       INTEGER REFERENCES quotations(id) ON DELETE SET NULL,
    quotation_type  VARCHAR(30) NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'draft',
    title           VARCHAR(500) NOT NULL,
    customer_id     INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    lead_id         INTEGER REFERENCES leads(id) ON DELETE SET NULL,
    assigned_to     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    contact_name    VARCHAR(200),
    contact_email   VARCHAR(255),
    contact_phone   VARCHAR(50),
    subtotal        DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    tax_rate        DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    tax_amount      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    discount_amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_amount    DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    currency        VARCHAR(3) NOT NULL DEFAULT 'LAK',
    valid_from      DATE,
    valid_until     DATE,
    notes           TEXT,
    internal_notes  TEXT,
    converted_to_type VARCHAR(30),
    converted_to_id INTEGER,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX ix_quotations_quotation_number ON quotations(quotation_number);
CREATE INDEX ix_quotations_status ON quotations(status);
CREATE INDEX ix_quotations_quotation_type ON quotations(quotation_type);
CREATE INDEX ix_quotations_customer_id ON quotations(customer_id);
CREATE INDEX ix_quotations_lead_id ON quotations(lead_id);
CREATE INDEX ix_quotations_assigned_to ON quotations(assigned_to);
CREATE INDEX ix_quotations_valid_until ON quotations(valid_until);
CREATE INDEX ix_quotations_is_active ON quotations(is_active);
CREATE INDEX ix_quotations_parent_id ON quotations(parent_id);

CREATE TABLE quotation_items (
    id              SERIAL PRIMARY KEY,
    quotation_id    INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    line_number     INTEGER NOT NULL,
    item_type       VARCHAR(30) NOT NULL,
    forklift_id     INTEGER REFERENCES forklifts(id) ON DELETE SET NULL,
    product_id      INTEGER REFERENCES products(id) ON DELETE SET NULL,
    description     VARCHAR(1000) NOT NULL,
    quantity        DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    unit            VARCHAR(50) NOT NULL DEFAULT 'unit',
    unit_price      DOUBLE PRECISION NOT NULL,
    discount_percent DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    line_total      DOUBLE PRECISION NOT NULL,
    rental_duration_days INTEGER,
    rental_rate_period VARCHAR(20),
    notes           VARCHAR(500),
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_quotation_items_quotation_id ON quotation_items(quotation_id);
CREATE INDEX ix_quotation_items_forklift_id ON quotation_items(forklift_id);
CREATE INDEX ix_quotation_items_product_id ON quotation_items(product_id);

CREATE TABLE quotation_approvals (
    id              SERIAL PRIMARY KEY,
    quotation_id    INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    decision        VARCHAR(20) NOT NULL,
    reason          TEXT,
    conditions      TEXT,
    decided_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    decided_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_quotation_approvals_quotation_id ON quotation_approvals(quotation_id);

CREATE TABLE quotation_status_history (
    id              SERIAL PRIMARY KEY,
    quotation_id    INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    from_status     VARCHAR(30),
    to_status       VARCHAR(30) NOT NULL,
    reason          VARCHAR(500),
    changed_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_quotation_status_history_quotation_id ON quotation_status_history(quotation_id);
CREATE INDEX ix_quotation_status_history_changed_at ON quotation_status_history(changed_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- DOMAIN 6: RENTAL (8 tables)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE rental_contracts (
    id              SERIAL PRIMARY KEY,
    contract_number VARCHAR(50) NOT NULL UNIQUE,
    quotation_id    INTEGER REFERENCES quotations(id) ON DELETE SET NULL,
    customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    lead_id         INTEGER REFERENCES leads(id) ON DELETE SET NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'reservation',
    contract_type   VARCHAR(20) NOT NULL DEFAULT 'short_term',
    revision_number INTEGER NOT NULL DEFAULT 1,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    actual_start_date DATE,
    actual_end_date DATE,
    billing_cycle_day INTEGER NOT NULL DEFAULT 1,
    payment_terms_days INTEGER NOT NULL DEFAULT 30,
    deposit_amount  DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    deposit_status  VARCHAR(20) NOT NULL DEFAULT 'pending',
    early_termination_fee_pct DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    late_return_penalty_pct   DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    overtime_rate_pct         DOUBLE PRECISION NOT NULL DEFAULT 150.0,
    subtotal        DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    tax_rate        DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    tax_amount      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    discount_amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_value     DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    currency        VARCHAR(3) NOT NULL DEFAULT 'LAK',
    delivery_address TEXT,
    delivery_contact_name VARCHAR(200),
    delivery_contact_phone VARCHAR(50),
    notes           TEXT,
    internal_notes  TEXT,
    cancellation_reason TEXT,
    reservation_expires_at TIMESTAMPTZ,
    assigned_to     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at     TIMESTAMPTZ,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX ix_rental_contracts_contract_number ON rental_contracts(contract_number);
CREATE INDEX ix_rental_contracts_status ON rental_contracts(status);
CREATE INDEX ix_rental_contracts_customer_id ON rental_contracts(customer_id);
CREATE INDEX ix_rental_contracts_quotation_id ON rental_contracts(quotation_id);
CREATE INDEX ix_rental_contracts_lead_id ON rental_contracts(lead_id);
CREATE INDEX ix_rental_contracts_assigned_to ON rental_contracts(assigned_to);
CREATE INDEX ix_rental_contracts_is_active ON rental_contracts(is_active);

CREATE TABLE rental_contract_items (
    id              SERIAL PRIMARY KEY,
    contract_id     INTEGER NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
    forklift_id     INTEGER REFERENCES forklifts(id) ON DELETE SET NULL,
    quotation_item_id INTEGER REFERENCES quotation_items(id) ON DELETE SET NULL,
    line_number     INTEGER NOT NULL,
    description     VARCHAR(1000) NOT NULL,
    monthly_rate    DOUBLE PRECISION NOT NULL,
    daily_rate      DOUBLE PRECISION NOT NULL,
    hourly_rate     DOUBLE PRECISION,
    contracted_hours_limit DOUBLE PRECISION,
    maintenance_interval_hours DOUBLE PRECISION,
    departure_hour_meter DOUBLE PRECISION,
    return_hour_meter DOUBLE PRECISION,
    hours_used      DOUBLE PRECISION,
    line_status     VARCHAR(20) NOT NULL DEFAULT 'reserved',
    line_total      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    sort_order      INTEGER NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE INDEX ix_rental_contract_items_contract_id ON rental_contract_items(contract_id);
CREATE INDEX ix_rental_contract_items_forklift_id ON rental_contract_items(forklift_id);

CREATE TABLE rental_contract_terms (
    id              SERIAL PRIMARY KEY,
    contract_id     INTEGER NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
    term_category   VARCHAR(30) NOT NULL,
    term_key        VARCHAR(100) NOT NULL,
    term_label      VARCHAR(300) NOT NULL,
    term_value      TEXT NOT NULL,
    data_type       VARCHAR(20) NOT NULL DEFAULT 'text',
    numeric_value   DOUBLE PRECISION,
    is_required     BOOLEAN NOT NULL DEFAULT FALSE,
    is_visible_to_customer BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,
    UNIQUE (contract_id, term_key)
);
CREATE INDEX ix_rental_contract_terms_contract_id ON rental_contract_terms(contract_id);

CREATE TABLE rental_contract_status_history (
    id              SERIAL PRIMARY KEY,
    contract_id     INTEGER NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
    from_status     VARCHAR(30),
    to_status       VARCHAR(30) NOT NULL,
    reason          VARCHAR(500),
    changed_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_rental_contract_status_history_contract_id ON rental_contract_status_history(contract_id);
CREATE INDEX ix_rental_contract_status_history_changed_at ON rental_contract_status_history(changed_at);

CREATE TABLE rental_extensions (
    id              SERIAL PRIMARY KEY,
    contract_id     INTEGER NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
    extension_number INTEGER NOT NULL,
    original_end_date DATE NOT NULL,
    new_end_date    DATE NOT NULL,
    rate_adjustment_pct DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    new_monthly_rate DOUBLE PRECISION,
    reason          TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    conditions      TEXT,
    requested_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    decided_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_rental_extensions_contract_id ON rental_extensions(contract_id);

CREATE TABLE rental_returns (
    id              SERIAL PRIMARY KEY,
    return_number   VARCHAR(50) NOT NULL UNIQUE,
    contract_id     INTEGER NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
    contract_item_id INTEGER REFERENCES rental_contract_items(id) ON DELETE SET NULL,
    forklift_id     INTEGER REFERENCES forklifts(id) ON DELETE SET NULL,
    return_type     VARCHAR(20) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'requested',
    is_early_termination BOOLEAN NOT NULL DEFAULT FALSE,
    early_termination_reason TEXT,
    requested_date  DATE NOT NULL,
    scheduled_pickup_date DATE,
    actual_pickup_date DATE,
    actual_received_date DATE,
    pickup_address  TEXT,
    departure_hour_meter DOUBLE PRECISION,
    arrival_hour_meter DOUBLE PRECISION,
    condition_rating INTEGER,
    overall_condition VARCHAR(20),
    exterior_notes  TEXT,
    mechanical_pass BOOLEAN,
    safety_equipment_pass BOOLEAN,
    photo_urls      JSONB,
    customer_signoff_url VARCHAR(500),
    assigned_driver INTEGER REFERENCES users(id) ON DELETE SET NULL,
    inspected_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    notes           TEXT,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE INDEX ix_rental_returns_contract_id ON rental_returns(contract_id);
CREATE INDEX ix_rental_returns_contract_item_id ON rental_returns(contract_item_id);
CREATE INDEX ix_rental_returns_forklift_id ON rental_returns(forklift_id);

CREATE TABLE rental_damage_reports (
    id              SERIAL PRIMARY KEY,
    report_number   VARCHAR(50) NOT NULL UNIQUE,
    return_id       INTEGER NOT NULL REFERENCES rental_returns(id) ON DELETE CASCADE,
    contract_id     INTEGER NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
    forklift_id     INTEGER REFERENCES forklifts(id) ON DELETE SET NULL,
    damage_category VARCHAR(30) NOT NULL,
    component       VARCHAR(100),
    description     TEXT NOT NULL,
    photo_urls      JSONB,
    repair_cost     DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    parts_cost      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    downtime_cost   DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_charge    DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    final_charge    DOUBLE PRECISION,
    downtime_days   INTEGER NOT NULL DEFAULT 0,
    is_customer_liable BOOLEAN NOT NULL DEFAULT TRUE,
    dispute_status  VARCHAR(20) NOT NULL DEFAULT 'none',
    dispute_reason  TEXT,
    dispute_resolution TEXT,
    dispute_resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    dispute_resolved_at TIMESTAMPTZ,
    assessed_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    assessed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE INDEX ix_rental_damage_reports_return_id ON rental_damage_reports(return_id);
CREATE INDEX ix_rental_damage_reports_contract_id ON rental_damage_reports(contract_id);

CREATE TABLE rental_billing_cycles (
    id              SERIAL PRIMARY KEY,
    billing_number  VARCHAR(50) NOT NULL UNIQUE,
    contract_id     INTEGER NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
    contract_item_id INTEGER REFERENCES rental_contract_items(id) ON DELETE SET NULL,
    billing_type    VARCHAR(30) NOT NULL,
    description     VARCHAR(500) NOT NULL,
    period_start    DATE,
    period_end      DATE,
    quantity        DOUBLE PRECISION NOT NULL,
    unit_rate       DOUBLE PRECISION NOT NULL,
    amount          DOUBLE PRECISION NOT NULL,
    tax_amount      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_amount    DOUBLE PRECISION NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'LAK',
    is_credit       BOOLEAN NOT NULL DEFAULT FALSE,
    payment_status  VARCHAR(20) NOT NULL DEFAULT 'pending',
    invoice_id      INTEGER,
    due_date        DATE,
    paid_date       DATE,
    generated_by    VARCHAR(20) NOT NULL DEFAULT 'system',
    notes           TEXT,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE INDEX ix_rental_billing_cycles_contract_id ON rental_billing_cycles(contract_id);
CREATE INDEX ix_rental_billing_cycles_billing_number ON rental_billing_cycles(billing_number);
CREATE INDEX ix_rental_billing_cycles_payment_status ON rental_billing_cycles(payment_status);

-- ═══════════════════════════════════════════════════════════════════════════
-- DOMAIN 7: MOVEMENT (2 tables)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE asset_movements (
    id              SERIAL PRIMARY KEY,
    movement_number VARCHAR(50) NOT NULL UNIQUE,
    movement_type   VARCHAR(30) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',
    priority        VARCHAR(10) NOT NULL DEFAULT 'normal',
    forklift_id     INTEGER NOT NULL REFERENCES forklifts(id) ON DELETE RESTRICT,
    rental_contract_id INTEGER REFERENCES rental_contracts(id) ON DELETE SET NULL,
    customer_id     INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    from_location   VARCHAR(200) NOT NULL,
    from_address    TEXT,
    to_location     VARCHAR(200) NOT NULL,
    to_address      TEXT,
    scheduled_date  DATE NOT NULL,
    actual_departure TIMESTAMPTZ,
    actual_arrival  TIMESTAMPTZ,
    departure_hour_meter DOUBLE PRECISION,
    arrival_hour_meter DOUBLE PRECISION,
    assigned_driver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    tracking_code   VARCHAR(100) UNIQUE,
    notes           TEXT,
    internal_notes  TEXT,
    cancellation_reason TEXT,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX ix_asset_movements_movement_number ON asset_movements(movement_number);
CREATE INDEX ix_asset_movements_status ON asset_movements(status);
CREATE INDEX ix_asset_movements_movement_type ON asset_movements(movement_type);
CREATE INDEX ix_asset_movements_forklift_id ON asset_movements(forklift_id);
CREATE INDEX ix_asset_movements_rental_contract_id ON asset_movements(rental_contract_id);
CREATE INDEX ix_asset_movements_customer_id ON asset_movements(customer_id);
CREATE INDEX ix_asset_movements_assigned_driver_id ON asset_movements(assigned_driver_id);
CREATE INDEX ix_asset_movements_scheduled_date ON asset_movements(scheduled_date);

CREATE TABLE movement_history (
    id              SERIAL PRIMARY KEY,
    movement_id     INTEGER NOT NULL REFERENCES asset_movements(id) ON DELETE CASCADE,
    from_status     VARCHAR(20),
    to_status       VARCHAR(20) NOT NULL,
    location        VARCHAR(200),
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    notes           TEXT,
    recorded_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_movement_history_movement_id ON movement_history(movement_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- DOMAIN 8: MAINTENANCE (6 tables)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE maintenance_plans (
    id              SERIAL PRIMARY KEY,
    plan_number     VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    service_type    VARCHAR(20) NOT NULL,
    interval_type   VARCHAR(10) NOT NULL,
    interval_value  INTEGER NOT NULL,
    estimated_duration_hours DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    estimated_cost  DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    checklist       JSONB,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);

CREATE TABLE maintenance_schedules (
    id              SERIAL PRIMARY KEY,
    forklift_id     INTEGER NOT NULL REFERENCES forklifts(id) ON DELETE CASCADE,
    plan_id         INTEGER NOT NULL REFERENCES maintenance_plans(id) ON DELETE CASCADE,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    next_due_date   DATE,
    next_due_hours  DOUBLE PRECISION,
    last_service_date DATE,
    last_service_hours DOUBLE PRECISION,
    times_serviced  INTEGER NOT NULL DEFAULT 0,
    notes           TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE INDEX ix_maintenance_schedules_forklift_id ON maintenance_schedules(forklift_id);
CREATE INDEX ix_maintenance_schedules_plan_id ON maintenance_schedules(plan_id);

CREATE TABLE work_orders (
    id              SERIAL PRIMARY KEY,
    work_order_number VARCHAR(50) NOT NULL UNIQUE,
    forklift_id     INTEGER NOT NULL REFERENCES forklifts(id) ON DELETE RESTRICT,
    schedule_id     INTEGER REFERENCES maintenance_schedules(id) ON DELETE SET NULL,
    plan_id         INTEGER REFERENCES maintenance_plans(id) ON DELETE SET NULL,
    order_type      VARCHAR(20) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    priority        VARCHAR(10) NOT NULL DEFAULT 'normal',
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    assigned_to     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    scheduled_date  DATE NOT NULL,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    verified_at     TIMESTAMPTZ,
    verified_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    hour_meter_at_service DOUBLE PRECISION,
    estimated_hours DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    actual_hours    DOUBLE PRECISION,
    estimated_cost  DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    actual_cost     DOUBLE PRECISION,
    findings        TEXT,
    resolution      TEXT,
    cancellation_reason TEXT,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX ix_work_orders_work_order_number ON work_orders(work_order_number);
CREATE INDEX ix_work_orders_forklift_id ON work_orders(forklift_id);
CREATE INDEX ix_work_orders_schedule_id ON work_orders(schedule_id);
CREATE INDEX ix_work_orders_status ON work_orders(status);
CREATE INDEX ix_work_orders_order_type ON work_orders(order_type);
CREATE INDEX ix_work_orders_priority ON work_orders(priority);
CREATE INDEX ix_work_orders_assigned_to ON work_orders(assigned_to);
CREATE INDEX ix_work_orders_scheduled_date ON work_orders(scheduled_date);

CREATE TABLE service_history (
    id              SERIAL PRIMARY KEY,
    forklift_id     INTEGER NOT NULL REFERENCES forklifts(id) ON DELETE CASCADE,
    work_order_id   INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
    service_type    VARCHAR(20) NOT NULL,
    service_date    DATE NOT NULL,
    technician_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    hour_meter_reading DOUBLE PRECISION,
    duration_hours  DOUBLE PRECISION,
    total_cost      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    currency        VARCHAR(3) NOT NULL DEFAULT 'LAK',
    summary         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_service_history_forklift_id ON service_history(forklift_id);
CREATE INDEX ix_service_history_work_order_id ON service_history(work_order_id);

CREATE TABLE maintenance_costs (
    id              SERIAL PRIMARY KEY,
    work_order_id   INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    cost_type       VARCHAR(20) NOT NULL,
    description     VARCHAR(300) NOT NULL,
    quantity        DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    unit_rate       DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    amount          DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    vendor          VARCHAR(200),
    reference_number VARCHAR(100),
    currency        VARCHAR(3) NOT NULL DEFAULT 'LAK',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_maintenance_costs_work_order_id ON maintenance_costs(work_order_id);

CREATE TABLE part_consumptions (
    id              SERIAL PRIMARY KEY,
    spare_part_id   INTEGER NOT NULL REFERENCES spare_parts(id) ON DELETE RESTRICT,
    warehouse_id    INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    work_order_id   INTEGER REFERENCES work_orders(id) ON DELETE SET NULL,
    forklift_id     INTEGER REFERENCES forklifts(id) ON DELETE SET NULL,
    quantity        DOUBLE PRECISION NOT NULL,
    unit_cost       DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_cost      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    notes           TEXT,
    consumed_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    consumed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_part_consumptions_spare_part_id ON part_consumptions(spare_part_id);
CREATE INDEX ix_part_consumptions_work_order_id ON part_consumptions(work_order_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- DOMAIN 9: INVENTORY (6 tables)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE spare_parts (
    id              SERIAL PRIMARY KEY,
    part_number     VARCHAR(100) NOT NULL UNIQUE,
    name            VARCHAR(300) NOT NULL,
    description     TEXT,
    part_category   VARCHAR(20) NOT NULL DEFAULT 'general',
    brand_id        INTEGER REFERENCES brands(id) ON DELETE SET NULL,
    unit            VARCHAR(30) NOT NULL DEFAULT 'piece',
    unit_price      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    currency        VARCHAR(3) NOT NULL DEFAULT 'LAK',
    min_stock_level INTEGER NOT NULL DEFAULT 5,
    reorder_quantity INTEGER NOT NULL DEFAULT 10,
    lead_time_days  INTEGER NOT NULL DEFAULT 7,
    image_url       VARCHAR(500),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE INDEX ix_spare_parts_part_number ON spare_parts(part_number);
CREATE INDEX ix_spare_parts_name ON spare_parts(name);
CREATE INDEX ix_spare_parts_part_category ON spare_parts(part_category);
CREATE INDEX ix_spare_parts_brand_id ON spare_parts(brand_id);
CREATE INDEX ix_spare_parts_is_active ON spare_parts(is_active);

CREATE TABLE warehouses (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(20) NOT NULL UNIQUE,
    name            VARCHAR(200) NOT NULL,
    address         TEXT,
    contact_name    VARCHAR(200),
    contact_phone   VARCHAR(50),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE INDEX ix_warehouses_code ON warehouses(code);

CREATE TABLE inventory_balances (
    id              SERIAL PRIMARY KEY,
    spare_part_id   INTEGER NOT NULL REFERENCES spare_parts(id) ON DELETE CASCADE,
    warehouse_id    INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    quantity_on_hand DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    quantity_reserved DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    quantity_available DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    last_count_date TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ,
    UNIQUE (spare_part_id, warehouse_id)
);
CREATE INDEX ix_inventory_balances_spare_part_id ON inventory_balances(spare_part_id);
CREATE INDEX ix_inventory_balances_warehouse_id ON inventory_balances(warehouse_id);

CREATE TABLE inventory_transactions (
    id              SERIAL PRIMARY KEY,
    transaction_number VARCHAR(50) NOT NULL UNIQUE,
    transaction_type VARCHAR(20) NOT NULL,
    spare_part_id   INTEGER NOT NULL REFERENCES spare_parts(id) ON DELETE RESTRICT,
    warehouse_id    INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    quantity        DOUBLE PRECISION NOT NULL,
    unit_cost       DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_cost      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    reference_type  VARCHAR(30),
    reference_id    INTEGER,
    notes           TEXT,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_inventory_transactions_transaction_number ON inventory_transactions(transaction_number);
CREATE INDEX ix_inventory_transactions_spare_part_id ON inventory_transactions(spare_part_id);
CREATE INDEX ix_inventory_transactions_warehouse_id ON inventory_transactions(warehouse_id);
CREATE INDEX ix_inventory_transactions_transaction_type ON inventory_transactions(transaction_type);

CREATE TABLE purchase_orders (
    id              SERIAL PRIMARY KEY,
    po_number       VARCHAR(50) NOT NULL UNIQUE,
    status          VARCHAR(25) NOT NULL DEFAULT 'draft',
    vendor          VARCHAR(200) NOT NULL,
    warehouse_id    INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
    order_date      DATE NOT NULL,
    expected_date   DATE,
    received_date   DATE,
    subtotal        DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    tax_amount      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_amount    DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    currency        VARCHAR(3) NOT NULL DEFAULT 'LAK',
    notes           TEXT,
    cancellation_reason TEXT,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE INDEX ix_purchase_orders_po_number ON purchase_orders(po_number);
CREATE INDEX ix_purchase_orders_status ON purchase_orders(status);
CREATE INDEX ix_purchase_orders_warehouse_id ON purchase_orders(warehouse_id);

CREATE TABLE purchase_order_items (
    id              SERIAL PRIMARY KEY,
    purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    spare_part_id   INTEGER NOT NULL REFERENCES spare_parts(id) ON DELETE RESTRICT,
    quantity_ordered DOUBLE PRECISION NOT NULL,
    quantity_received DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    unit_cost       DOUBLE PRECISION NOT NULL,
    line_total      DOUBLE PRECISION NOT NULL,
    notes           VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_purchase_order_items_purchase_order_id ON purchase_order_items(purchase_order_id);
CREATE INDEX ix_purchase_order_items_spare_part_id ON purchase_order_items(spare_part_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- DOMAIN 10: BILLING (6 tables)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE invoices (
    id              SERIAL PRIMARY KEY,
    invoice_number  VARCHAR(50) NOT NULL UNIQUE,
    contract_id     INTEGER NOT NULL REFERENCES rental_contracts(id) ON DELETE RESTRICT,
    customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    status          VARCHAR(30) NOT NULL DEFAULT 'draft',
    issue_date      DATE,
    due_date        DATE,
    paid_date       DATE,
    subtotal        DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    tax_rate        DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    tax_amount      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    discount_amount DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_amount    DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    amount_paid     DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    balance_due     DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    currency        VARCHAR(3) NOT NULL DEFAULT 'LAK',
    billing_period_start DATE,
    billing_period_end   DATE,
    notes           TEXT,
    internal_notes  TEXT,
    sent_at         TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX ix_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX ix_invoices_contract_id ON invoices(contract_id);
CREATE INDEX ix_invoices_customer_id ON invoices(customer_id);
CREATE INDEX ix_invoices_status ON invoices(status);
CREATE INDEX ix_invoices_due_date ON invoices(due_date);
CREATE INDEX ix_invoices_is_active ON invoices(is_active);

CREATE TABLE invoice_items (
    id              SERIAL PRIMARY KEY,
    invoice_id      INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    billing_cycle_id INTEGER REFERENCES rental_billing_cycles(id) ON DELETE SET NULL,
    line_number     INTEGER NOT NULL,
    description     VARCHAR(500) NOT NULL,
    quantity        DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    unit_rate       DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    amount          DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    tax_amount      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    line_total      DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE INDEX ix_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX ix_invoice_items_billing_cycle_id ON invoice_items(billing_cycle_id);

CREATE TABLE payments (
    id              SERIAL PRIMARY KEY,
    payment_number  VARCHAR(50) NOT NULL UNIQUE,
    customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    contract_id     INTEGER REFERENCES rental_contracts(id) ON DELETE SET NULL,
    payment_method  VARCHAR(30) NOT NULL,
    payment_status  VARCHAR(20) NOT NULL DEFAULT 'pending',
    amount          DOUBLE PRECISION NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'LAK',
    payment_date    DATE NOT NULL,
    received_date   DATE,
    reference_number VARCHAR(100),
    notes           TEXT,
    confirmed_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
    confirmed_at    TIMESTAMPTZ,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE INDEX ix_payments_payment_number ON payments(payment_number);
CREATE INDEX ix_payments_customer_id ON payments(customer_id);
CREATE INDEX ix_payments_contract_id ON payments(contract_id);
CREATE INDEX ix_payments_payment_status ON payments(payment_status);
CREATE INDEX ix_payments_payment_date ON payments(payment_date);

CREATE TABLE payment_allocations (
    id              SERIAL PRIMARY KEY,
    payment_id      INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id      INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    allocated_amount DOUBLE PRECISION NOT NULL,
    allocated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    allocated_by    INTEGER REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX ix_payment_allocations_payment_id ON payment_allocations(payment_id);
CREATE INDEX ix_payment_allocations_invoice_id ON payment_allocations(invoice_id);

CREATE TABLE deposits (
    id              SERIAL PRIMARY KEY,
    deposit_number  VARCHAR(50) NOT NULL UNIQUE,
    contract_id     INTEGER NOT NULL REFERENCES rental_contracts(id) ON DELETE RESTRICT,
    customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    deposit_type    VARCHAR(20) NOT NULL,
    deposit_status  VARCHAR(30) NOT NULL DEFAULT 'pending',
    amount          DOUBLE PRECISION NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'LAK',
    received_date   DATE,
    refund_date     DATE,
    refund_amount   DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    forfeit_amount  DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    applied_amount  DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    payment_id      INTEGER REFERENCES payments(id) ON DELETE SET NULL,
    refund_payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
    notes           TEXT,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE INDEX ix_deposits_deposit_number ON deposits(deposit_number);
CREATE INDEX ix_deposits_contract_id ON deposits(contract_id);
CREATE INDEX ix_deposits_customer_id ON deposits(customer_id);
CREATE INDEX ix_deposits_deposit_status ON deposits(deposit_status);

CREATE TABLE revenue_recognitions (
    id              SERIAL PRIMARY KEY,
    recognition_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_id      INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    invoice_item_id INTEGER REFERENCES invoice_items(id) ON DELETE SET NULL,
    contract_id     INTEGER NOT NULL REFERENCES rental_contracts(id) ON DELETE RESTRICT,
    recognition_type VARCHAR(30) NOT NULL,
    recognition_status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    recognition_date DATE NOT NULL,
    amount          DOUBLE PRECISION NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'LAK',
    period_start    DATE,
    period_end      DATE,
    description     VARCHAR(500),
    notes           TEXT,
    created_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ
);
CREATE INDEX ix_revenue_recognitions_recognition_number ON revenue_recognitions(recognition_number);
CREATE INDEX ix_revenue_recognitions_contract_id ON revenue_recognitions(contract_id);
CREATE INDEX ix_revenue_recognitions_invoice_id ON revenue_recognitions(invoice_id);
CREATE INDEX ix_revenue_recognitions_recognition_status ON revenue_recognitions(recognition_status);
CREATE INDEX ix_revenue_recognitions_recognition_date ON revenue_recognitions(recognition_date);

-- ═══════════════════════════════════════════════════════════════════════════
-- PERFORMANCE INDEXES (additive — for aggregation queries)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX ix_invoices_issue_date ON invoices(issue_date);
CREATE INDEX ix_invoices_status_customer ON invoices(status, customer_id);
CREATE INDEX ix_forklifts_status_active ON forklifts(status, is_active);
CREATE INDEX ix_forklift_ownership_costs_forklift_date ON forklift_ownership_costs(forklift_id, cost_date);
CREATE INDEX ix_maintenance_costs_cost_type ON maintenance_costs(cost_type);
CREATE INDEX ix_rental_contracts_status_dates ON rental_contracts(status, start_date, end_date);
