-- =============================================================================
-- Migration 001: Product Catalog Module
-- Compatible with: SQLite (dev) and PostgreSQL (production)
-- Applied automatically on startup via Base.metadata.create_all
-- This file is provided for documentation, auditing, and manual PostgreSQL runs.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- brands
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brands (
    id          INTEGER      NOT NULL PRIMARY KEY AUTOINCREMENT,
    name        VARCHAR(150) NOT NULL UNIQUE,
    slug        VARCHAR(150) NOT NULL UNIQUE,
    brand_role  VARCHAR(20)  NOT NULL DEFAULT 'primary',   -- primary | parts_only | both
    logo_url    VARCHAR(500),
    country     VARCHAR(100),
    website     VARCHAR(255),
    description TEXT,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME
);

CREATE INDEX IF NOT EXISTS ix_brands_slug      ON brands (slug);
CREATE INDEX IF NOT EXISTS ix_brands_is_active ON brands (is_active);


-- ---------------------------------------------------------------------------
-- product_categories  (self-referential, max 3 levels)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_categories (
    id          INTEGER      NOT NULL PRIMARY KEY AUTOINCREMENT,
    parent_id   INTEGER      REFERENCES product_categories (id) ON DELETE RESTRICT,
    name_lo     VARCHAR(200),
    name_en     VARCHAR(200) NOT NULL,
    slug        VARCHAR(200) NOT NULL UNIQUE,
    level       INTEGER      NOT NULL DEFAULT 1,   -- 1=division 2=category 3=sub-category
    description TEXT,
    icon        VARCHAR(100),
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME
);

CREATE INDEX IF NOT EXISTS ix_product_categories_slug      ON product_categories (slug);
CREATE INDEX IF NOT EXISTS ix_product_categories_parent_id ON product_categories (parent_id);


-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id                 INTEGER      NOT NULL PRIMARY KEY AUTOINCREMENT,
    sku                VARCHAR(100) NOT NULL UNIQUE,
    name_lo            VARCHAR(300),
    name_en            VARCHAR(300) NOT NULL,
    slug               VARCHAR(300) NOT NULL UNIQUE,
    model_number       VARCHAR(150),
    brand_id           INTEGER      REFERENCES brands (id)             ON DELETE SET NULL,
    category_id        INTEGER      REFERENCES product_categories (id) ON DELETE SET NULL,
    description_lo     TEXT,
    description_en     TEXT,
    is_active          BOOLEAN      NOT NULL DEFAULT TRUE,
    is_featured        BOOLEAN      NOT NULL DEFAULT FALSE,
    is_sale            BOOLEAN      NOT NULL DEFAULT TRUE,
    is_rental          BOOLEAN      NOT NULL DEFAULT FALSE,
    is_used_available  BOOLEAN      NOT NULL DEFAULT FALSE,
    is_service_item    BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order         INTEGER      NOT NULL DEFAULT 0,
    created_by         INTEGER      REFERENCES users (id)              ON DELETE SET NULL,
    updated_by         INTEGER      REFERENCES users (id)              ON DELETE SET NULL,
    created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         DATETIME
);

CREATE INDEX IF NOT EXISTS ix_products_sku          ON products (sku);
CREATE INDEX IF NOT EXISTS ix_products_slug         ON products (slug);
CREATE INDEX IF NOT EXISTS ix_products_name_en      ON products (name_en);
CREATE INDEX IF NOT EXISTS ix_products_model_number ON products (model_number);
CREATE INDEX IF NOT EXISTS ix_products_brand_id     ON products (brand_id);
CREATE INDEX IF NOT EXISTS ix_products_category_id  ON products (category_id);
CREATE INDEX IF NOT EXISTS ix_products_is_active    ON products (is_active);


-- ---------------------------------------------------------------------------
-- product_specs  (EAV — flexible attributes grouped by spec_group)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_specs (
    id          INTEGER      NOT NULL PRIMARY KEY AUTOINCREMENT,
    product_id  INTEGER      NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    spec_group  VARCHAR(100) NOT NULL,   -- e.g. "Performance", "Origin", "Technical"
    spec_key    VARCHAR(100) NOT NULL,   -- e.g. "lift_height_min"
    spec_label  VARCHAR(150) NOT NULL,   -- e.g. "Lift Height Min"
    spec_value  VARCHAR(500) NOT NULL,
    spec_unit   VARCHAR(50),             -- e.g. "mm", "t", "V"
    sort_order  INTEGER      NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS ix_product_specs_product_id ON product_specs (product_id);


-- ---------------------------------------------------------------------------
-- product_images
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_images (
    id          INTEGER      NOT NULL PRIMARY KEY AUTOINCREMENT,
    product_id  INTEGER      NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    image_url   VARCHAR(500) NOT NULL,
    alt_text    VARCHAR(255),
    is_primary  BOOLEAN      NOT NULL DEFAULT FALSE,
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_product_images_product_id ON product_images (product_id);


-- ---------------------------------------------------------------------------
-- product_compat_brands  (spare-parts compatibility N:M)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_compat_brands (
    id          INTEGER      NOT NULL PRIMARY KEY AUTOINCREMENT,
    product_id  INTEGER      NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    brand_id    INTEGER      NOT NULL REFERENCES brands (id)   ON DELETE CASCADE,
    notes       VARCHAR(300)
);

CREATE INDEX IF NOT EXISTS ix_product_compat_brands_product_id ON product_compat_brands (product_id);
CREATE INDEX IF NOT EXISTS ix_product_compat_brands_brand_id   ON product_compat_brands (brand_id);


-- ---------------------------------------------------------------------------
-- import_jobs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_jobs (
    id                 INTEGER      NOT NULL PRIMARY KEY AUTOINCREMENT,
    original_filename  VARCHAR(255) NOT NULL,
    status             VARCHAR(20)  NOT NULL DEFAULT 'pending',
        -- pending | preview | processing | completed | partial | failed
    total_rows         INTEGER      NOT NULL DEFAULT 0,
    processed_rows     INTEGER      NOT NULL DEFAULT 0,
    success_rows       INTEGER      NOT NULL DEFAULT 0,
    error_rows         INTEGER      NOT NULL DEFAULT 0,
    preview_data       TEXT,        -- JSON blob; cleared after execute to free space
    created_by         INTEGER      REFERENCES users (id) ON DELETE SET NULL,
    created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at       DATETIME
);


-- ---------------------------------------------------------------------------
-- import_errors
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS import_errors (
    id            INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    job_id        INTEGER NOT NULL REFERENCES import_jobs (id) ON DELETE CASCADE,
    sheet_name    VARCHAR(200),
    row_number    INTEGER NOT NULL,
    row_data      TEXT,   -- JSON snapshot of the raw row for debugging
    error_message TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_import_errors_job_id ON import_errors (job_id);


-- =============================================================================
-- PostgreSQL-specific version (run this instead of the SQLite block above
-- when migrating to PostgreSQL).
-- Replace AUTOINCREMENT with SERIAL/GENERATED and BOOLEAN with BOOL.
-- =============================================================================
/*
-- PostgreSQL DDL (reference only — not executed here)

CREATE TABLE brands (
    id          SERIAL        PRIMARY KEY,
    name        VARCHAR(150)  NOT NULL UNIQUE,
    slug        VARCHAR(150)  NOT NULL UNIQUE,
    brand_role  VARCHAR(20)   NOT NULL DEFAULT 'primary',
    logo_url    VARCHAR(500),
    country     VARCHAR(100),
    website     VARCHAR(255),
    description TEXT,
    is_active   BOOL          NOT NULL DEFAULT TRUE,
    sort_order  INT           NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ
);

CREATE TABLE product_categories (
    id          SERIAL        PRIMARY KEY,
    parent_id   INT           REFERENCES product_categories (id) ON DELETE RESTRICT,
    name_lo     VARCHAR(200),
    name_en     VARCHAR(200)  NOT NULL,
    slug        VARCHAR(200)  NOT NULL UNIQUE,
    level       INT           NOT NULL DEFAULT 1,
    description TEXT,
    icon        VARCHAR(100),
    sort_order  INT           NOT NULL DEFAULT 0,
    is_active   BOOL          NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ
);

CREATE TABLE products (
    id                SERIAL        PRIMARY KEY,
    sku               VARCHAR(100)  NOT NULL UNIQUE,
    name_lo           VARCHAR(300),
    name_en           VARCHAR(300)  NOT NULL,
    slug              VARCHAR(300)  NOT NULL UNIQUE,
    model_number      VARCHAR(150),
    brand_id          INT           REFERENCES brands (id)             ON DELETE SET NULL,
    category_id       INT           REFERENCES product_categories (id) ON DELETE SET NULL,
    description_lo    TEXT,
    description_en    TEXT,
    is_active         BOOL          NOT NULL DEFAULT TRUE,
    is_featured       BOOL          NOT NULL DEFAULT FALSE,
    is_sale           BOOL          NOT NULL DEFAULT TRUE,
    is_rental         BOOL          NOT NULL DEFAULT FALSE,
    is_used_available BOOL          NOT NULL DEFAULT FALSE,
    is_service_item   BOOL          NOT NULL DEFAULT FALSE,
    sort_order        INT           NOT NULL DEFAULT 0,
    created_by        INT           REFERENCES users (id) ON DELETE SET NULL,
    updated_by        INT           REFERENCES users (id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ,
    search_vector     TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('english',
            coalesce(name_en,'') || ' ' || coalesce(model_number,'') || ' ' || coalesce(description_en,'')
        )
    ) STORED
);

CREATE INDEX ix_products_fts ON products USING GIN(search_vector);

CREATE TABLE product_specs (
    id          SERIAL        PRIMARY KEY,
    product_id  INT           NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    spec_group  VARCHAR(100)  NOT NULL,
    spec_key    VARCHAR(100)  NOT NULL,
    spec_label  VARCHAR(150)  NOT NULL,
    spec_value  VARCHAR(500)  NOT NULL,
    spec_unit   VARCHAR(50),
    sort_order  INT           NOT NULL DEFAULT 0
);

CREATE TABLE product_images (
    id          SERIAL        PRIMARY KEY,
    product_id  INT           NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    image_url   VARCHAR(500)  NOT NULL,
    alt_text    VARCHAR(255),
    is_primary  BOOL          NOT NULL DEFAULT FALSE,
    sort_order  INT           NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE product_compat_brands (
    id          SERIAL  PRIMARY KEY,
    product_id  INT     NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    brand_id    INT     NOT NULL REFERENCES brands (id)   ON DELETE CASCADE,
    notes       VARCHAR(300)
);

CREATE TABLE import_jobs (
    id                SERIAL        PRIMARY KEY,
    original_filename VARCHAR(255)  NOT NULL,
    status            VARCHAR(20)   NOT NULL DEFAULT 'pending',
    total_rows        INT           NOT NULL DEFAULT 0,
    processed_rows    INT           NOT NULL DEFAULT 0,
    success_rows      INT           NOT NULL DEFAULT 0,
    error_rows        INT           NOT NULL DEFAULT 0,
    preview_data      JSONB,
    created_by        INT           REFERENCES users (id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    completed_at      TIMESTAMPTZ
);

CREATE TABLE import_errors (
    id            SERIAL  PRIMARY KEY,
    job_id        INT     NOT NULL REFERENCES import_jobs (id) ON DELETE CASCADE,
    sheet_name    VARCHAR(200),
    row_number    INT     NOT NULL,
    row_data      JSONB,
    error_message TEXT    NOT NULL
);
*/
