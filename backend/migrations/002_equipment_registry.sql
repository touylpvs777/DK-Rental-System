-- =============================================================================
-- Migration 002: Equipment Registry Module
-- Database:      PostgreSQL 14+
-- Module:        Equipment Registry (Forklift Fleet Management)
-- Author:        DK Service Platform Team
-- =============================================================================
--
-- MIGRATION STRATEGY
-- ──────────────────
-- 1. This script creates 8 NEW tables. It does NOT alter any existing table.
-- 2. Tables are created in FK-dependency order (parents before children).
-- 3. Every statement is idempotent (CREATE TABLE IF NOT EXISTS / CREATE INDEX
--    IF NOT EXISTS) so the script can be re-run safely.
-- 4. All enum-like columns use VARCHAR, not PostgreSQL ENUM types. This matches
--    the project convention (activity_logs.action, products.status, etc.) and
--    allows adding new values without ALTER TYPE migrations.
-- 5. For SQLite (dev), Base.metadata.create_all handles table creation
--    automatically. This script is for PostgreSQL production deployments.
--
-- PRE-FLIGHT CHECKLIST
-- ────────────────────
-- [ ] Production database backed up
-- [ ] brands table exists:       SELECT count(*) FROM brands;
-- [ ] customers table exists:    SELECT count(*) FROM customers;
-- [ ] users table exists:        SELECT count(*) FROM users;
-- [ ] No existing forklift_* tables: \dt forklift*
-- [ ] Run inside a transaction:  BEGIN; ... COMMIT;
--
-- EXECUTION
-- ─────────
-- psql -h <host> -U <user> -d <db> -f 002_equipment_registry.sql
--
-- VERIFICATION
-- ────────────
-- \dt forklift*                       -- 8 tables
-- \di *forklift*                      -- 20 indexes
-- SELECT count(*) FROM forklifts;     -- 0
-- =============================================================================


BEGIN;


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. forklift_models
--    Model/series catalogue. One row per equipment model (e.g. "EFG 216k").
--    Multiple physical forklifts may reference the same model.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS forklift_models (
    id                  SERIAL          PRIMARY KEY,
    brand_id            INT             REFERENCES brands (id) ON DELETE SET NULL,
    name                VARCHAR(200)    NOT NULL,
    slug                VARCHAR(200)    NOT NULL,
    series              VARCHAR(100),
    fuel_type           VARCHAR(20),
    capacity_kg         DOUBLE PRECISION,
    max_lift_height_mm  INT,
    description         TEXT,
    is_active           BOOL            NOT NULL DEFAULT TRUE,
    sort_order          INT             NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ,

    CONSTRAINT uq_forklift_models_slug UNIQUE (slug),

    CONSTRAINT ck_forklift_models_fuel_type CHECK (
        fuel_type IS NULL OR fuel_type IN ('electric', 'diesel', 'lpg', 'dual_fuel')
    ),
    CONSTRAINT ck_forklift_models_capacity CHECK (
        capacity_kg IS NULL OR capacity_kg >= 0
    ),
    CONSTRAINT ck_forklift_models_lift_height CHECK (
        max_lift_height_mm IS NULL OR max_lift_height_mm >= 0
    )
);

-- slug already indexed by UNIQUE constraint uq_forklift_models_slug

CREATE INDEX IF NOT EXISTS ix_forklift_models_brand_id
    ON forklift_models (brand_id);

CREATE INDEX IF NOT EXISTS ix_forklift_models_is_active
    ON forklift_models (is_active);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. forklifts
--    Core asset table. Each row = one physical forklift with a unique serial
--    number. This is the parent for all child tables below.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS forklifts (
    id                  SERIAL          PRIMARY KEY,
    serial_number       VARCHAR(100)    NOT NULL,
    slug                VARCHAR(300)    NOT NULL,
    internal_code       VARCHAR(50),

    model_id            INT             REFERENCES forklift_models (id) ON DELETE SET NULL,
    brand_id            INT             REFERENCES brands (id)          ON DELETE SET NULL,
    customer_id         INT             REFERENCES customers (id)       ON DELETE SET NULL,

    name_en             VARCHAR(300)    NOT NULL,
    name_lo             VARCHAR(300),
    model_number        VARCHAR(150),

    status              VARCHAR(30)     NOT NULL DEFAULT 'in_stock',
    condition           VARCHAR(20)     NOT NULL DEFAULT 'new',
    fuel_type           VARCHAR(20),
    capacity_kg         DOUBLE PRECISION,
    mast_type           VARCHAR(50),
    max_lift_height_mm  INT,

    year_manufactured   INT,
    purchase_date       DATE,
    warranty_expiry     DATE,

    initial_hour_meter  DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    current_hour_meter  DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    notes               TEXT,
    is_active           BOOL            NOT NULL DEFAULT TRUE,

    created_by          INT             REFERENCES users (id) ON DELETE SET NULL,
    updated_by          INT             REFERENCES users (id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ,

    -- Full-text search (PostgreSQL only)
    search_vector       TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('english',
            coalesce(serial_number, '') || ' ' ||
            coalesce(name_en, '')       || ' ' ||
            coalesce(model_number, '')  || ' ' ||
            coalesce(internal_code, '')
        )
    ) STORED,

    -- Unique constraints
    CONSTRAINT uq_forklifts_serial_number UNIQUE (serial_number),
    CONSTRAINT uq_forklifts_slug          UNIQUE (slug),
    CONSTRAINT uq_forklifts_internal_code UNIQUE (internal_code),

    -- Check constraints
    CONSTRAINT ck_forklifts_status CHECK (
        status IN ('in_stock', 'sold', 'rented', 'in_service', 'reserved', 'decommissioned')
    ),
    CONSTRAINT ck_forklifts_condition CHECK (
        condition IN ('new', 'used', 'refurbished')
    ),
    CONSTRAINT ck_forklifts_fuel_type CHECK (
        fuel_type IS NULL OR fuel_type IN ('electric', 'diesel', 'lpg', 'dual_fuel')
    ),
    CONSTRAINT ck_forklifts_capacity CHECK (
        capacity_kg IS NULL OR capacity_kg >= 0
    ),
    CONSTRAINT ck_forklifts_lift_height CHECK (
        max_lift_height_mm IS NULL OR max_lift_height_mm >= 0
    ),
    CONSTRAINT ck_forklifts_year CHECK (
        year_manufactured IS NULL OR (year_manufactured >= 1900 AND year_manufactured <= 2100)
    ),
    CONSTRAINT ck_forklifts_initial_hours CHECK (initial_hour_meter >= 0),
    CONSTRAINT ck_forklifts_current_hours CHECK (current_hour_meter >= 0)
);

-- serial_number, slug, internal_code already indexed by UNIQUE constraints

CREATE INDEX IF NOT EXISTS ix_forklifts_name_en
    ON forklifts (name_en);

CREATE INDEX IF NOT EXISTS ix_forklifts_model_number
    ON forklifts (model_number);

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS ix_forklifts_model_id
    ON forklifts (model_id);

CREATE INDEX IF NOT EXISTS ix_forklifts_brand_id
    ON forklifts (brand_id);

CREATE INDEX IF NOT EXISTS ix_forklifts_customer_id
    ON forklifts (customer_id);

-- Filter indexes
CREATE INDEX IF NOT EXISTS ix_forklifts_status
    ON forklifts (status);

CREATE INDEX IF NOT EXISTS ix_forklifts_is_active
    ON forklifts (is_active);

-- Full-text search index
CREATE INDEX IF NOT EXISTS ix_forklifts_fts
    ON forklifts USING GIN (search_vector);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. forklift_status_history
--    Immutable audit trail. One row per status transition.
--    Append-only — application must never UPDATE or DELETE rows directly.
--    CASCADE from parent forklift is the only deletion path.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS forklift_status_history (
    id              SERIAL          PRIMARY KEY,
    forklift_id     INT             NOT NULL REFERENCES forklifts (id) ON DELETE CASCADE,
    from_status     VARCHAR(30),
    to_status       VARCHAR(30)     NOT NULL,
    reason          VARCHAR(500),
    changed_by      INT             REFERENCES users (id) ON DELETE SET NULL,
    changed_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_fk_status_history_to CHECK (
        to_status IN ('in_stock', 'sold', 'rented', 'in_service', 'reserved', 'decommissioned')
    ),
    CONSTRAINT ck_fk_status_history_from CHECK (
        from_status IS NULL OR from_status IN ('in_stock', 'sold', 'rented', 'in_service', 'reserved', 'decommissioned')
    )
);

CREATE INDEX IF NOT EXISTS ix_fk_status_history_forklift_id
    ON forklift_status_history (forklift_id);

CREATE INDEX IF NOT EXISTS ix_fk_status_history_changed_at
    ON forklift_status_history (changed_at);


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. forklift_locations
--    Location history. Most recent row by effective_date = current location.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS forklift_locations (
    id              SERIAL          PRIMARY KEY,
    forklift_id     INT             NOT NULL REFERENCES forklifts (id) ON DELETE CASCADE,
    location_name   VARCHAR(200)    NOT NULL,
    warehouse_zone  VARCHAR(100),
    address         TEXT,
    customer_id     INT             REFERENCES customers (id) ON DELETE SET NULL,
    effective_date  DATE            NOT NULL,
    notes           VARCHAR(500),
    recorded_by     INT             REFERENCES users (id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_fk_locations_forklift_id
    ON forklift_locations (forklift_id);

CREATE INDEX IF NOT EXISTS ix_fk_locations_effective_date
    ON forklift_locations (effective_date);

CREATE INDEX IF NOT EXISTS ix_fk_locations_customer_id
    ON forklift_locations (customer_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. forklift_hour_meter_logs
--    Point-in-time hour meter readings. Append-only.
--    After each INSERT, the application updates forklifts.current_hour_meter.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS forklift_hour_meter_logs (
    id              SERIAL          PRIMARY KEY,
    forklift_id     INT             NOT NULL REFERENCES forklifts (id) ON DELETE CASCADE,
    reading         DOUBLE PRECISION NOT NULL,
    recorded_at     TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    source          VARCHAR(30)     NOT NULL DEFAULT 'manual',
    notes           VARCHAR(500),
    recorded_by     INT             REFERENCES users (id) ON DELETE SET NULL,

    CONSTRAINT ck_fk_hour_meter_reading CHECK (reading >= 0),
    CONSTRAINT ck_fk_hour_meter_source CHECK (
        source IN ('manual', 'service_visit', 'telemetry')
    )
);

CREATE INDEX IF NOT EXISTS ix_fk_hour_meter_forklift_id
    ON forklift_hour_meter_logs (forklift_id);

CREATE INDEX IF NOT EXISTS ix_fk_hour_meter_recorded_at
    ON forklift_hour_meter_logs (recorded_at);


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. forklift_documents
--    File attachment metadata. Actual files stored externally (filesystem/S3).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS forklift_documents (
    id              SERIAL          PRIMARY KEY,
    forklift_id     INT             NOT NULL REFERENCES forklifts (id) ON DELETE CASCADE,
    document_type   VARCHAR(30)     NOT NULL,
    title           VARCHAR(300)    NOT NULL,
    file_url        VARCHAR(500)    NOT NULL,
    file_size_bytes INT,
    mime_type       VARCHAR(100),
    expiry_date     DATE,
    notes           VARCHAR(500),
    uploaded_by     INT             REFERENCES users (id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_fk_documents_type CHECK (
        document_type IN (
            'warranty', 'inspection', 'insurance', 'registration',
            'service_contract', 'manual', 'certificate', 'other'
        )
    ),
    CONSTRAINT ck_fk_documents_file_size CHECK (
        file_size_bytes IS NULL OR file_size_bytes >= 0
    )
);

CREATE INDEX IF NOT EXISTS ix_fk_documents_forklift_id
    ON forklift_documents (forklift_id);

CREATE INDEX IF NOT EXISTS ix_fk_documents_expiry_date
    ON forklift_documents (expiry_date)
    WHERE expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_fk_documents_document_type
    ON forklift_documents (document_type);


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. forklift_photos
--    Visual documentation. is_primary managed by application layer (at most
--    one TRUE per forklift).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS forklift_photos (
    id              SERIAL          PRIMARY KEY,
    forklift_id     INT             NOT NULL REFERENCES forklifts (id) ON DELETE CASCADE,
    image_url       VARCHAR(500)    NOT NULL,
    thumbnail_url   VARCHAR(500),
    alt_text        VARCHAR(255),
    caption         VARCHAR(500),
    is_primary      BOOL            NOT NULL DEFAULT FALSE,
    sort_order      INT             NOT NULL DEFAULT 0,
    taken_at        DATE,
    uploaded_by     INT             REFERENCES users (id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_fk_photos_sort_order CHECK (sort_order >= 0)
);

CREATE INDEX IF NOT EXISTS ix_fk_photos_forklift_id
    ON forklift_photos (forklift_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 8. forklift_ownership_costs
--    Total Cost of Ownership entries. Each row = one cost event.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS forklift_ownership_costs (
    id               SERIAL          PRIMARY KEY,
    forklift_id      INT             NOT NULL REFERENCES forklifts (id) ON DELETE CASCADE,
    cost_type        VARCHAR(30)     NOT NULL,
    amount           DOUBLE PRECISION NOT NULL,
    currency         VARCHAR(3)      NOT NULL DEFAULT 'LAK',
    cost_date        DATE            NOT NULL,
    description      VARCHAR(500),
    vendor           VARCHAR(200),
    reference_number VARCHAR(100),
    recorded_by      INT             REFERENCES users (id) ON DELETE SET NULL,
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_fk_costs_type CHECK (
        cost_type IN ('purchase', 'maintenance', 'repair', 'insurance', 'parts', 'inspection', 'other')
    ),
    CONSTRAINT ck_fk_costs_amount CHECK (amount > 0),
    CONSTRAINT ck_fk_costs_currency CHECK (char_length(currency) = 3)
);

CREATE INDEX IF NOT EXISTS ix_fk_costs_forklift_id
    ON forklift_ownership_costs (forklift_id);

CREATE INDEX IF NOT EXISTS ix_fk_costs_cost_type
    ON forklift_ownership_costs (cost_type);

CREATE INDEX IF NOT EXISTS ix_fk_costs_cost_date
    ON forklift_ownership_costs (cost_date);


COMMIT;


-- =============================================================================
-- VERIFICATION QUERIES
-- Run these after migration to confirm success.
-- =============================================================================
-- SELECT table_name FROM information_schema.tables
--     WHERE table_schema = 'public' AND table_name LIKE 'forklift%'
--     ORDER BY table_name;
--
-- Expected: 8 tables
--   forklift_documents
--   forklift_hour_meter_logs
--   forklift_locations
--   forklift_models
--   forklift_ownership_costs
--   forklift_photos
--   forklift_status_history
--   forklifts
--
-- SELECT indexname FROM pg_indexes
--     WHERE tablename LIKE 'forklift%'
--     ORDER BY indexname;
--
-- Expected: 20 indexes (8 PK + 12 custom)
--
-- SELECT conname, contype FROM pg_constraint
--     WHERE conname LIKE 'ck_f%' OR conname LIKE 'uq_f%'
--     ORDER BY conname;
--
-- Expected: 18 constraints (3 UNIQUE + 15 CHECK)
-- =============================================================================


-- =============================================================================
-- ROLLBACK SCRIPT
-- Run this to completely reverse the migration.
-- WARNING: All equipment registry data will be permanently destroyed.
-- =============================================================================
-- BEGIN;
--
-- DROP TABLE IF EXISTS forklift_ownership_costs  CASCADE;
-- DROP TABLE IF EXISTS forklift_photos           CASCADE;
-- DROP TABLE IF EXISTS forklift_documents         CASCADE;
-- DROP TABLE IF EXISTS forklift_hour_meter_logs   CASCADE;
-- DROP TABLE IF EXISTS forklift_locations          CASCADE;
-- DROP TABLE IF EXISTS forklift_status_history     CASCADE;
-- DROP TABLE IF EXISTS forklifts                   CASCADE;
-- DROP TABLE IF EXISTS forklift_models             CASCADE;
--
-- COMMIT;
-- =============================================================================
