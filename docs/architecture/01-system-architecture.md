# System Architecture — DK Service CRM

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + TypeScript | 19.2 + 6.0 |
| Build | Vite | 8.0 |
| State | Zustand | 5.0 |
| Charts | Recharts | 3.8 |
| Icons | Lucide React | latest |
| HTTP | Axios | latest |
| Backend | FastAPI (async) | 0.115+ |
| ORM | SQLAlchemy 2.0 (async) | 2.0.36+ |
| Auth | JWT (python-jose + bcrypt) | HS256 |
| Migrations | Alembic (async) | 1.18 |
| Database | SQLite (dev) / PostgreSQL (prod) | — / 16 |
| Deployment | Docker Compose | 3.8 |
| Reverse Proxy | Nginx | Alpine |

## Architecture Pattern

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (SPA)                    │
│  React 19 + Vite 8 + Zustand + Recharts             │
│  Port 5173 (dev) / Port 80 (prod via Nginx)          │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP/REST (JSON)
                       │ /api/v1/*
┌──────────────────────┴──────────────────────────────┐
│                   BACKEND (FastAPI)                   │
│  Async Python 3.12+                                  │
│  Port 8000                                           │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐       │
│  │  Routes   │→│ Services  │→│ Repositories  │       │
│  │ (API)     │  │ (Logic)  │  │ (Data Access) │       │
│  └──────────┘  └──────────┘  └──────┬───────┘       │
│                                      │               │
│  ┌────────────────┐  ┌───────────────┴──┐            │
│  │ Middleware      │  │ SQLAlchemy ORM   │            │
│  │ CORS, ReqID,   │  │ Async Sessions   │            │
│  │ Security Hdrs  │  └──────┬───────────┘            │
│  └────────────────┘         │                        │
└─────────────────────────────┼────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │     DATABASE       │
                    │ SQLite (dev)       │
                    │ PostgreSQL (prod)  │
                    │ 56 tables          │
                    └───────────────────┘
```

## Layer Responsibilities

### Routes (`app/routes/`)
- HTTP endpoint definitions
- Request validation (Pydantic)
- Permission enforcement via `require_permission()`
- Activity logging
- Response serialization

### Services (`app/services/`)
- Business logic and workflow orchestration
- State machine transitions (forklift status, quotation workflow, rental lifecycle)
- Cross-entity coordination (rental → billing hooks)
- No direct DB access — delegates to repositories

### Repositories (`app/repositories/`)
- SQLAlchemy queries (select, insert, update, delete)
- Eager loading configuration (selectinload)
- Filter/sort/paginate logic
- No business rules

### Middleware (`app/core/middleware.py`)
- `RequestIdMiddleware` — X-Request-ID correlation
- `SecurityHeadersMiddleware` — CSP, X-Frame-Options, etc.

### Auth (`app/core/security.py` + `app/dependencies.py`)
- JWT token creation/validation
- Password hashing (bcrypt)
- `get_current_user` dependency
- Token revocation via `revoked_tokens` table
