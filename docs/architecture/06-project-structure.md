# Project Structure — DK Service CRM

```
DK Sevice/CRM-System/
├── docker-compose.yml              # 3-service stack (backend + frontend + postgres)
├── Dockerfile.backend              # Python 3.12-slim
├── Dockerfile.frontend             # Node 20 multi-stage + Nginx
├── nginx.conf                      # SPA routing + API proxy
│
├── backend/
│   ├── .env / .env.example         # Runtime config
│   ├── requirements.txt            # 12 Python deps
│   ├── alembic.ini                 # Migration config
│   ├── alembic/
│   │   ├── env.py                  # Async Alembic setup
│   │   └── versions/               # 3 migration files
│   ├── migrations/                 # Legacy SQL migrations (pre-Alembic)
│   │   ├── 001_catalog_tables.sql
│   │   └── 002_equipment_registry.sql
│   ├── crm.db                      # SQLite dev database
│   └── app/
│       ├── main.py                 # FastAPI app, lifespan, error handlers
│       ├── dependencies.py         # get_current_user
│       ├── core/
│       │   ├── config.py           # Pydantic Settings
│       │   ├── security.py         # JWT + bcrypt
│       │   ├── permissions.py      # RBAC (32 permissions × 4 roles)
│       │   └── middleware.py       # RequestID + Security headers
│       ├── database/
│       │   ├── base.py             # DeclarativeBase
│       │   └── session.py          # AsyncSession factory + engine
│       ├── models/                 # 52 SQLAlchemy models
│       │   ├── __init__.py         # Registers all models
│       │   ├── user.py, role.py, customer.py, lead.py, ...
│       │   ├── forklift.py + 7 child tables
│       │   ├── quotation.py + 3 child tables
│       │   ├── rental_contract.py + 7 child tables
│       │   ├── invoice.py, payment.py, deposit.py, ...
│       │   └── work_order.py, spare_part.py, ...
│       ├── schemas/                # 16 Pydantic schema files
│       │   ├── forklift.py         # 20+ schemas (Create/Update/Out/Detail)
│       │   ├── billing.py          # All billing DTOs
│       │   └── ...
│       ├── repositories/           # 16 repository classes
│       │   ├── forklift_repository.py  # Filter + eager-load queries
│       │   └── ...
│       ├── services/               # 22 service classes
│       │   ├── forklift_service.py     # CRUD + status transitions
│       │   ├── rental_workflow_service.py  # Billing hooks
│       │   └── ...
│       ├── routes/                 # 17 router files → 218 endpoints
│       │   ├── auth.py, users.py, forklifts.py, ...
│       │   ├── billing.py          # 30 endpoints
│       │   └── uploads.py          # Image upload
│       └── utils/
│           ├── export.py           # CSV/Excel generation
│           └── slugify.py          # URL slug helper
│
├── frontend/
│   ├── package.json                # React 19 + Vite 8 + deps
│   ├── vite.config.ts              # Path alias + proxy + chunk splitting
│   ├── tsconfig.json
│   ├── public/
│   │   ├── dk-lao-logo.png         # Brand logo (289KB)
│   │   ├── favicon.svg
│   │   └── images/
│   │       └── forklift.svg        # Hero illustration
│   └── src/
│       ├── main.tsx                # Entry + ThemeProvider
│       ├── App.tsx                 # Router (48 lazy routes)
│       ├── api/                    # 17 Axios API clients
│       ├── components/
│       │   ├── layout/             # AppLayout, Sidebar, Header, Breadcrumb
│       │   ├── ui/                 # 14 reusable UI components
│       │   ├── charts/             # 4 Recharts wrappers
│       │   ├── billing/            # 9 billing components
│       │   ├── catalog/            # 5 catalog components
│       │   ├── equipment/          # 5 equipment components
│       │   ├── inventory/          # 3 inventory components
│       │   ├── maintenance/        # 3 maintenance components
│       │   ├── movement/           # 3 movement components
│       │   ├── quotation/          # 1 status badge
│       │   └── rental/             # 1 status badge
│       ├── modules/                # Feature modules (self-contained)
│       │   ├── dashboard/          # 7 files
│       │   ├── equipment/          # 7 files
│       │   ├── inventory/          # 7 files
│       │   └── finance/            # 9 files
│       ├── pages/                  # 48 page components (16 directories)
│       ├── hooks/                  # 12 custom hooks
│       ├── store/                  # 4 Zustand stores
│       ├── types/                  # 12 TypeScript type files
│       ├── styles/                 # tokens.css, shared.css, marketplace.css
│       ├── config/                 # routes.ts (breadcrumb config)
│       ├── providers/              # ThemeProvider
│       └── utils/                  # mockAdapter.ts
│
└── docs/
    ├── diagrams/                   # Mermaid diagrams (20 .mmd files)
    └── architecture/               # THIS DIRECTORY (generated)
```

## File Counts

| Category | Count |
|----------|-------|
| Backend Python files | 94 |
| Frontend TypeScript/TSX files | ~140 |
| Frontend CSS files | ~30 |
| SQLAlchemy models | 52 |
| Pydantic schema files | 16 |
| API route files | 17 |
| Service classes | 22 |
| Repository classes | 16 |
| Frontend pages | 48 |
| Frontend components | 76 |
| API endpoints | 218 |
| Database tables | 56 |
| Zustand stores | 4 |
