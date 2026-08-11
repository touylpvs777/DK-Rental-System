import logging
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.middleware import ClientIPMiddleware, RequestIdMiddleware, SecurityHeadersMiddleware

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)
from app.database.base import Base
from app.database.session import AsyncSessionLocal, engine

# Import all models so Base.metadata knows about every table before create_all runs.
import app.models as _models  # noqa: F401, E402

from app.core.security import hash_password
from app.models.role import Role, RoleName
from app.models.user import User
from app.models.warehouse import Warehouse
from app.routes import activity, auth, billing, customers, dashboard, delivery_notes, forklifts, inventory, iot_telemetry, leads, maintenance, movements, notifications, partners, projects, quotations, receipts, rentals, reports, roles, sales_orders, users, uploads
from app.routes.catalog import router as catalog_router
from app.routes.settings import router as settings_router
from app.scheduler import shutdown_scheduler, start_scheduler
from app.services.notification_subscribers import register_notification_subscribers
from app.services.rbac_service import RBACService

# Wire domain-event subscribers (Phase 1, Step 3) once at import time.
register_notification_subscribers()


async def _backfill_ownership_state(conn) -> None:
    """
    One-time backfill for the newly-added forklifts.ownership_state column,
    run immediately after it's added (both engines default new rows to
    'for_sale', so this only needs to touch pre-existing rows).
    Heuristic: a linked customer implies the unit is customer-owned; a
    decommissioned unit is retired; everything else keeps the column default.
    """
    await conn.execute(text(
        "UPDATE forklifts SET ownership_state = 'customer_owned' WHERE customer_id IS NOT NULL"
    ))
    await conn.execute(text(
        "UPDATE forklifts SET ownership_state = 'retired' WHERE status = 'decommissioned'"
    ))


async def _apply_sqlite_migrations(conn) -> None:
    """
    Non-destructive schema migrations for SQLite.
    Each block is idempotent — safe to run on every startup.
    """
    # ── leads.source ───────────────────────────────────────────────────────
    try:
        await conn.execute(text("ALTER TABLE leads ADD COLUMN source VARCHAR(50)"))
    except OperationalError:
        pass  # column already exists

    # ── activity_logs.ip_address ─────────────────────────────────────────
    try:
        await conn.execute(text("ALTER TABLE activity_logs ADD COLUMN ip_address VARCHAR(45)"))
    except OperationalError:
        pass  # column already exists

    # ── notifications.recipient_user_id / is_read ───────────────────────────
    try:
        await conn.execute(text("ALTER TABLE notifications ADD COLUMN recipient_user_id INTEGER"))
    except OperationalError:
        pass  # column already exists
    try:
        await conn.execute(text("ALTER TABLE notifications ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT 0"))
    except OperationalError:
        pass  # column already exists

    # ── notifications.target_role (Enterprise Audit & Alert: role broadcast) ─
    try:
        await conn.execute(text("ALTER TABLE notifications ADD COLUMN target_role VARCHAR(50)"))
    except OperationalError:
        pass  # column already exists

    # ── forklifts.ownership_state (Asset Registry M3) ────────────────────────
    try:
        await conn.execute(text(
            "ALTER TABLE forklifts ADD COLUMN ownership_state VARCHAR(20) NOT NULL DEFAULT 'for_sale'"
        ))
        await _backfill_ownership_state(conn)
    except OperationalError:
        pass  # column already exists

    # ── forklifts.iot_device_id / last_telemetry_ping (IoT Telemetry) ────────
    try:
        await conn.execute(text("ALTER TABLE forklifts ADD COLUMN iot_device_id VARCHAR(100)"))
    except OperationalError:
        pass  # column already exists
    try:
        await conn.execute(text("ALTER TABLE forklifts ADD COLUMN last_telemetry_ping DATETIME"))
    except OperationalError:
        pass  # column already exists
    # SQLite can't ADD COLUMN ... UNIQUE directly, so the uniqueness constraint
    # from the model (iot_device_id, unique=True) is created as a separate
    # index here; naturally idempotent, safe to run every startup.
    await conn.execute(text(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_forklifts_iot_device_id ON forklifts (iot_device_id)"
    ))

    # ── work_orders.scheduled_date: DATE -> DATETIME (Work Order M6) ─────────
    # SQLite has no real column-type enforcement (type affinity only), so no
    # ALTER is needed for the widened type itself. But old rows may hold a
    # bare 'YYYY-MM-DD' string that SQLAlchemy's DateTime type can't parse
    # back — normalize those to midnight so they stay readable. The length
    # check makes this idempotent (already-normalized rows are 19+ chars).
    await conn.execute(text(
        "UPDATE work_orders SET scheduled_date = scheduled_date || ' 00:00:00' "
        "WHERE length(scheduled_date) = 10"
    ))

    # ── invoices.reference_type / reference_id (Finance M10) ─────────────────
    try:
        await conn.execute(text("ALTER TABLE invoices ADD COLUMN reference_type VARCHAR(20)"))
    except OperationalError:
        pass  # column already exists
    try:
        await conn.execute(text("ALTER TABLE invoices ADD COLUMN reference_id INTEGER"))
    except OperationalError:
        pass  # column already exists

    # ── quotations equipment fields + quotation_items.tax_percent (Document Editor) ──
    try:
        await conn.execute(text("ALTER TABLE quotations ADD COLUMN machine_type VARCHAR(100)"))
    except OperationalError:
        pass  # column already exists
    try:
        await conn.execute(text("ALTER TABLE quotations ADD COLUMN hour_meter FLOAT"))
    except OperationalError:
        pass  # column already exists
    try:
        await conn.execute(text("ALTER TABLE quotations ADD COLUMN location VARCHAR(200)"))
    except OperationalError:
        pass  # column already exists
    try:
        await conn.execute(text("ALTER TABLE quotations ADD COLUMN customer_reference VARCHAR(100)"))
    except OperationalError:
        pass  # column already exists
    try:
        await conn.execute(text(
            "ALTER TABLE quotations ADD COLUMN round_amount FLOAT NOT NULL DEFAULT 0"
        ))
    except OperationalError:
        pass  # column already exists
    try:
        await conn.execute(text("ALTER TABLE quotations ADD COLUMN terms_conditions TEXT"))
    except OperationalError:
        pass  # column already exists
    try:
        await conn.execute(text(
            "ALTER TABLE quotation_items ADD COLUMN tax_percent FLOAT NOT NULL DEFAULT 0"
        ))
    except OperationalError:
        pass  # column already exists

    # ── purchase_orders.partner_id (Partners) ─────────────────────────────
    try:
        await conn.execute(text("ALTER TABLE purchase_orders ADD COLUMN partner_id INTEGER REFERENCES partners (id) ON DELETE SET NULL"))
    except OperationalError:
        pass  # column already exists

    # NOTE: invoices.contract_id also became nullable in this change (work-order
    # and sales invoices have no rental contract). SQLite can't drop a NOT NULL
    # constraint via ALTER TABLE without a full table rebuild, and every other
    # column here is untouched, so — unlike the activity_logs rebuild above —
    # we don't do that rebuild for a dev-only engine. A pre-existing local
    # dev.db predating this change will reject a null contract_id until it's
    # recreated; Postgres (below) gets the real, unconditional fix.

    # ── activity_logs: rebuild to drop Enum CHECK constraints + add details ─
    # The original table used Enum(ActionType) which creates a CHECK constraint.
    # New ActionType values violate that constraint, so we rebuild as plain VARCHAR.
    result = await conn.execute(text("PRAGMA table_info(activity_logs)"))
    col_names = {row[1] for row in result.fetchall()}
    if "details" not in col_names:
        await conn.execute(text("""
            CREATE TABLE activity_logs_v2 (
                id       INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                user_id  INTEGER REFERENCES users (id) ON DELETE SET NULL,
                action   VARCHAR(50) NOT NULL,
                entity_type VARCHAR(50),
                entity_id   INTEGER,
                details  TEXT,
                created_at DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP)
            )
        """))
        await conn.execute(text("""
            INSERT INTO activity_logs_v2 (id, user_id, action, entity_type, entity_id, created_at)
            SELECT id, user_id, action, entity_type, entity_id, created_at
            FROM activity_logs
        """))
        await conn.execute(text("DROP TABLE activity_logs"))
        await conn.execute(text(
            "ALTER TABLE activity_logs_v2 RENAME TO activity_logs"
        ))
        await conn.execute(text(
            "CREATE INDEX ix_activity_logs_user_id ON activity_logs (user_id)"
        ))
        await conn.execute(text(
            "CREATE INDEX ix_activity_logs_entity ON activity_logs (entity_type, entity_id)"
        ))
        await conn.execute(text(
            "CREATE INDEX ix_activity_logs_created_at ON activity_logs (created_at)"
        ))
        # Normalize values stored as enum NAME ("USER_LOGIN") → enum value ("user_login").
        # SQLAlchemy's Enum type stores .name by default for non-native enums.
        from app.models.activity_log import ActionType, EntityType
        for member in ActionType:
            await conn.execute(
                text("UPDATE activity_logs SET action = :val WHERE action = :name"),
                {"val": member.value, "name": member.name},
            )
        for member in EntityType:
            await conn.execute(
                text("UPDATE activity_logs SET entity_type = :val WHERE entity_type = :name"),
                {"val": member.value, "name": member.name},
            )
    else:
        # details column already exists: still run normalization in case legacy rows
        # with uppercase NAME values (USER_LOGIN) were loaded before the first migration.
        from app.models.activity_log import ActionType, EntityType
        for member in ActionType:
            await conn.execute(
                text("UPDATE activity_logs SET action = :val WHERE action = :name"),
                {"val": member.value, "name": member.name},
            )
        for member in EntityType:
            await conn.execute(
                text("UPDATE activity_logs SET entity_type = :val WHERE entity_type = :name"),
                {"val": member.value, "name": member.name},
            )


_DEFAULT_ADMIN_EMAIL = "admin@dkservice.com"
_DEFAULT_ADMIN_USERNAME = "admin"
_DEFAULT_ADMIN_PASSWORD = "Admin@123"


async def _seed_defaults(db: AsyncSession) -> None:
    """
    Startup safety net: guarantees a working admin login and a default
    warehouse exist even after a database reset (e.g. a wiped Docker
    volume). Idempotent and safe to run on every startup — a no-op once
    the admin account and a warehouse both already exist.

    This restores *access*, not lost data: if the database was actually
    wiped, everything else (customers, quotations, inventory, ...) is gone
    and must come from a backup — this only re-establishes the bootstrap
    records needed to log back in and use the app again. Never raises —
    a seeding conflict must not prevent the app from starting.
    """
    try:
        admin = (
            await db.execute(select(User).where(User.email == _DEFAULT_ADMIN_EMAIL))
        ).scalar_one_or_none()
        if admin is None:
            role = (
                await db.execute(select(Role).where(Role.name == RoleName.SUPER_ADMIN.value))
            ).scalar_one_or_none()
            db.add(User(
                email=_DEFAULT_ADMIN_EMAIL,
                username=_DEFAULT_ADMIN_USERNAME,
                full_name="System Administrator",
                hashed_password=hash_password(_DEFAULT_ADMIN_PASSWORD),
                is_active=True,
                is_superuser=True,
                role_id=role.id if role else None,
            ))
            logger.warning(
                "No admin account found on startup - auto-created %s with the default "
                "password. Log in and change it.", _DEFAULT_ADMIN_EMAIL,
            )

        warehouse = (await db.execute(select(Warehouse).limit(1))).scalar_one_or_none()
        if warehouse is None:
            db.add(Warehouse(code="WH-MAIN", name="Main Warehouse", is_active=True))
            logger.info("No warehouse found on startup - auto-created default warehouse WH-MAIN.")

        await db.commit()
    except Exception:
        await db.rollback()
        logger.exception("Startup default-seeding failed - continuing without it.")


async def _apply_postgres_migrations(conn) -> None:
    """
    Non-destructive schema migrations for PostgreSQL, mirroring
    `_apply_sqlite_migrations`. `Base.metadata.create_all` only creates
    tables that don't exist yet — it never adds columns to a table that
    already exists, so any column added to a model after its table was
    first created in a live Postgres database must be patched in here.
    Each statement is idempotent (`ADD COLUMN IF NOT EXISTS`) and safe to
    run on every startup.
    """
    for statement in (
        "ALTER TABLE leads ADD COLUMN IF NOT EXISTS source VARCHAR(50)",
        "ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)",
        "ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS details JSON",
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_user_id INTEGER",
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false",
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_role VARCHAR(50)",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reference_type VARCHAR(20)",
        "ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reference_id INTEGER",
        "ALTER TABLE invoices ALTER COLUMN contract_id DROP NOT NULL",
        "ALTER TABLE forklifts ADD COLUMN IF NOT EXISTS iot_device_id VARCHAR(100)",
        "ALTER TABLE forklifts ADD COLUMN IF NOT EXISTS last_telemetry_ping TIMESTAMPTZ",
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_forklifts_iot_device_id ON forklifts (iot_device_id)",
        "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS machine_type VARCHAR(100)",
        "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS hour_meter DOUBLE PRECISION",
        "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS location VARCHAR(200)",
        "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS customer_reference VARCHAR(100)",
        "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS round_amount DOUBLE PRECISION NOT NULL DEFAULT 0",
        "ALTER TABLE quotations ADD COLUMN IF NOT EXISTS terms_conditions TEXT",
        "ALTER TABLE quotation_items ADD COLUMN IF NOT EXISTS tax_percent DOUBLE PRECISION NOT NULL DEFAULT 0",
        "ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS partner_id INTEGER REFERENCES partners (id) ON DELETE SET NULL",
        "CREATE INDEX IF NOT EXISTS ix_purchase_orders_partner_id ON purchase_orders (partner_id)",
    ):
        await conn.execute(text(statement))

    # ── forklifts.ownership_state (Asset Registry M3) ────────────────────────
    # Not part of the tuple above: "ADD COLUMN IF NOT EXISTS" is silently a
    # no-op on every startup once the column exists, so a one-time backfill
    # gated on it would re-run forever and stomp on values an admin has since
    # changed by hand. Detect first-creation explicitly instead.
    result = await conn.execute(text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = 'forklifts' AND column_name = 'ownership_state'"
    ))
    if result.scalar_one_or_none() is None:
        await conn.execute(text(
            "ALTER TABLE forklifts ADD COLUMN ownership_state VARCHAR(20) NOT NULL DEFAULT 'for_sale'"
        ))
        await _backfill_ownership_state(conn)

    # ── work_orders.scheduled_date: DATE -> TIMESTAMPTZ (Work Order M6) ──────
    # A straight type widening, not an ADD COLUMN, so it can't join the tuple
    # loop above — but casting an already-timestamptz column to timestamptz
    # is a harmless no-op, so this is safe to run on every startup too.
    await conn.execute(text(
        "ALTER TABLE work_orders ALTER COLUMN scheduled_date TYPE TIMESTAMPTZ "
        "USING scheduled_date::timestamptz"
    ))


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        if settings.DATABASE_URL.startswith("sqlite"):
            await _apply_sqlite_migrations(conn)
        elif settings.DATABASE_URL.startswith("postgresql"):
            await _apply_postgres_migrations(conn)
    async with AsyncSessionLocal() as db:
        await RBACService(db).seed_roles()
        await _seed_defaults(db)
    start_scheduler()
    yield
    shutdown_scheduler()
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(ClientIPMiddleware)


app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(customers.router, prefix="/api/v1")
app.include_router(leads.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(activity.router, prefix="/api/v1")
app.include_router(roles.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(catalog_router, prefix="/api/v1/catalog")
app.include_router(forklifts.router, prefix="/api/v1")
app.include_router(iot_telemetry.router, prefix="/api/v1")
app.include_router(quotations.router, prefix="/api/v1")
app.include_router(sales_orders.router, prefix="/api/v1")
app.include_router(delivery_notes.router, prefix="/api/v1")
app.include_router(rentals.router, prefix="/api/v1")
app.include_router(movements.router, prefix="/api/v1")
app.include_router(maintenance.router, prefix="/api/v1")
app.include_router(inventory.router, prefix="/api/v1")
app.include_router(partners.router, prefix="/api/v1")
app.include_router(billing.router, prefix="/api/v1")
app.include_router(receipts.router, prefix="/api/v1")
app.include_router(uploads.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(projects.router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1")

_uploads_dir = Path(settings.UPLOAD_DIR)
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_uploads_dir.parent)), name="uploads")


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_id = uuid.uuid4().hex[:12]
    logger.warning(
        "Validation error [%s] %s %s — %s",
        error_id,
        request.method,
        request.url.path,
        exc.errors(),
    )
    return JSONResponse(
        status_code=422,
        content={
            "detail": jsonable_encoder(exc.errors()),
            "error_id": error_id,
        },
    )


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    # Safety net for the ~50+ commit sites that don't already catch this locally
    # (most services do, with a tailored 409 message — see e.g. customer_service.py).
    # The `get_db` dependency (app/database/session.py) already rolled the session
    # back in its `except Exception: await session.rollback(); raise` block before
    # this handler runs, so no rollback call is needed (or possible) here.
    error_id = uuid.uuid4().hex[:12]
    logger.warning(
        "Integrity error [%s] %s %s — %s",
        error_id,
        request.method,
        request.url.path,
        str(getattr(exc, "orig", exc)),
    )
    return JSONResponse(
        status_code=400,
        content={
            "detail": "Data already exists or constraint violated. Please check your input.",
            "error_id": error_id,
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    error_id = uuid.uuid4().hex[:12]
    logger.exception(
        "Unhandled error [%s] %s %s",
        error_id,
        request.method,
        request.url.path,
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal error occurred. Please try again.",
            "error_id": error_id,
        },
    )


@app.get("/health", tags=["Health"])
async def health_check():
    db_ok = False
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        logger.warning("Health check: database unreachable")
    return {
        "status": "healthy" if db_ok else "degraded",
        "version": settings.APP_VERSION,
        "database": "ok" if db_ok else "unreachable",
    }

# Serve the built React app (frontend/dist). Static assets under /assets get
# their own mount (fingerprinted filenames, safe to cache hard); everything
# else - including root-level public/ files like login.jpeg and any client
# -side route (/login, /dashboard/123, ...) - falls through to serve_frontend,
# which returns the real file when it exists on disk and the SPA shell
# (index.html) otherwise. Missing assets raise a real 404 instead of being
# silently rewritten into index.html, so a broken image fails loudly instead
# of rendering as an unstyled page.
FRONTEND_DIST_DIR = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

if FRONTEND_DIST_DIR.exists():
    app.mount(
        "/assets",
        StaticFiles(directory=FRONTEND_DIST_DIR / "assets"),
        name="frontend-assets",
    )

    _STATIC_ASSET_SUFFIXES = {
        ".js", ".css", ".map", ".json", ".webmanifest",
        ".png", ".jpg", ".jpeg", ".svg", ".gif", ".webp", ".ico",
        ".woff", ".woff2", ".ttf",
    }

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")

        requested_file = FRONTEND_DIST_DIR / full_path
        if requested_file.is_file():
            return FileResponse(requested_file)

        # A path that looks like a static asset (has a known extension) but
        # wasn't found on disk is a genuinely broken reference - fail loudly
        # with a 404 rather than masking it as the SPA shell, which is what
        # made a missing login.jpeg render as a blank background instead of
        # a visible error in the browser's network tab.
        if Path(full_path).suffix.lower() in _STATIC_ASSET_SUFFIXES:
            raise HTTPException(status_code=404, detail="Asset not found")

        # Anything else is a client-side route (e.g. /login, /dashboard/123)
        # that React Router resolves - hand it the SPA shell.
        return FileResponse(FRONTEND_DIST_DIR / "index.html")

    logger.info("Serving frontend build from %s", FRONTEND_DIST_DIR)
else:
    logger.warning(
        "Frontend build not found at %s - run `npm run build` in frontend/ first.",
        FRONTEND_DIST_DIR,
    )