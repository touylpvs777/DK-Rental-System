# Deployment Design — Technical Design Specification

## 1. Deployment Architecture

```mermaid
graph TB
    Client["Client Browser"] -->|"HTTPS :443"| LB["Load Balancer<br/>(future)"]
    LB -->|":80"| FE["dk-frontend<br/>Nginx :80<br/>SPA + API proxy"]
    FE -->|"/api/v1/*<br/>proxy_pass"| BE["dk-backend<br/>Uvicorn :8000<br/>FastAPI"]
    BE -->|"AsyncSession"| DB["dk-db<br/>PostgreSQL 16<br/>:5432"]
    BE -->|"read/write"| Vol["Volume:<br/>uploads/images/"]
    DB --- PGData["Volume:<br/>pgdata"]

    classDef container fill:#7c3aed,color:#fff
    classDef db fill:#d97706,color:#fff
    classDef ext fill:#64748b,color:#fff
    class FE,BE container
    class DB db
    class Client,LB,Vol,PGData ext
```

### ASCII Reference

```
Client Browser
    │
    ▼ HTTPS :443 (future load balancer)
┌─────────────────────────────────────────┐
│  Docker Compose Stack                   │
│                                         │
│  ┌──────────────┐  ┌────────────────┐  │
│  │ dk-frontend  │  │  dk-backend    │  │
│  │ Nginx :80    │──│  Uvicorn :8000 │  │
│  │ SPA + proxy  │  │  FastAPI       │  │
│  └──────────────┘  └───────┬────────┘  │
│                            │            │
│                    ┌───────▼────────┐  │
│                    │  dk-db         │  │
│                    │  PostgreSQL 16 │  │
│                    │  :5432         │  │
│                    └────────────────┘  │
│                                         │
│  Volumes: pgdata, uploads              │
└─────────────────────────────────────────┘
```

## 2. Container Specifications

### 2.1 Frontend Container (`dk-frontend`)

| Property | Value |
|----------|-------|
| Build stage 1 | `node:20-alpine` — `npm ci && npm run build` |
| Build stage 2 | `nginx:alpine` — serve `dist/` |
| Exposed port | 80 |
| Config file | `nginx.conf` → `/etc/nginx/conf.d/default.conf` |
| Restart policy | `unless-stopped` |

### 2.2 Backend Container (`dk-backend`)

| Property | Value |
|----------|-------|
| Base image | `python:3.12-slim` |
| System deps | `gcc`, `libpq-dev` |
| Python deps | `pip install -r requirements.txt` |
| Command | `uvicorn app.main:app --host 0.0.0.0 --port 8000` |
| Exposed port | 8000 |
| Env file | `./backend/.env` |
| Env overrides | `DATABASE_URL=postgresql+asyncpg://dk_user:dk_pass@db:5432/dk_crm`, `DEBUG=false` |
| Depends on | `db` (service_healthy) |
| Health check | `curl -f http://localhost:8000/health` (30s interval, 5s timeout, 3 retries) |
| Restart policy | `unless-stopped` |

### 2.3 Database Container (`dk-db`)

| Property | Value |
|----------|-------|
| Image | `postgres:16-alpine` |
| Database | `dk_crm` |
| User | `dk_user` |
| Password | `dk_pass` (must change in production) |
| Volume | `pgdata:/var/lib/postgresql/data` |
| Exposed port | 5432 |
| Health check | `pg_isready -U dk_user -d dk_crm` (10s interval, 5s timeout, 5 retries) |
| Restart policy | `unless-stopped` |

## 3. Nginx Configuration

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # SPA routing — all non-file requests → index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://backend:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health proxy
    location /health {
        proxy_pass http://backend:8000/health;
    }

    # Static assets — 1 year cache
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 256;
}
```

## 4. Environment Configuration

### Development

| Setting | Value |
|---------|-------|
| Database | SQLite (`crm.db` in backend/) |
| Frontend | Vite dev server (`:5173`) with API proxy |
| Backend | Uvicorn (`:8000`) with `--reload` |
| CORS origins | localhost:3000, 5173, 5174, 8080 |

### Production

| Setting | Value |
|---------|-------|
| Database | PostgreSQL 16 via Docker |
| Frontend | Nginx serving static build |
| Backend | Uvicorn behind Nginx proxy |
| CORS origins | Production domain(s) only |
| SECRET_KEY | Strong random value |
| DEBUG | `false` |

### Required Environment Variables (`.env`)

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | Yes | SQLite path | Override with PostgreSQL in production |
| `SECRET_KEY` | **Critical** | Placeholder | Must set to cryptographic random string |
| `DEBUG` | No | `False` | Set `True` only in development |
| `ALLOWED_ORIGINS` | No | Localhost list | Set to production domain(s) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | 30 | Adjust per security policy |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | 7 | Adjust per security policy |
| `UPLOAD_DIR` | No | `uploads/images` | Mount as Docker volume in production |
| `MAX_UPLOAD_SIZE_MB` | No | 5 | Adjust per requirements |

## 5. Database Migration Strategy

### Development (SQLite)

1. `Base.metadata.create_all` on every startup — creates missing tables
2. `_apply_sqlite_migrations()` — idempotent column additions, enum normalization
3. No Alembic in dev (create_all handles schema)

### Production (PostgreSQL)

1. Enable `asyncpg` in `requirements.txt` (currently commented out)
2. Set `DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db`
3. Run `alembic upgrade head` before starting the application
4. Alembic env.py reads `settings.DATABASE_URL` dynamically
5. 3 existing migrations in `alembic/versions/`

### Migration Commands

```bash
# Generate new migration
alembic revision --autogenerate -m "description"

# Apply all pending migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1

# Show current revision
alembic current
```

## 6. Startup Sequence

```
docker-compose up -d
  │
  ├─→ dk-db starts
  │     └─→ PostgreSQL initializes, runs health check
  │
  ├─→ dk-backend waits for db health check
  │     └─→ Uvicorn starts
  │           └─→ Lifespan: create_all → seed_roles
  │                 └─→ Health endpoint available at /health
  │
  └─→ dk-frontend starts after backend
        └─→ Nginx serves SPA, proxies /api/ to backend
```

## 7. Health Monitoring

| Endpoint | Check | Response |
|----------|-------|----------|
| `GET /health` | DB connectivity via `SELECT 1` | `{status: "healthy"\|"degraded", version, database: "ok"\|"unreachable"}` |

Docker health checks ensure restart on failure:
- Backend: `curl -f http://localhost:8000/health` every 30s
- Database: `pg_isready` every 10s

## 8. Volume Management

| Volume | Container | Mount Point | Purpose |
|--------|-----------|-------------|---------|
| `pgdata` | dk-db | `/var/lib/postgresql/data` | Database persistence |
| (bind mount needed) | dk-backend | `/app/uploads` | Uploaded images (not currently configured as volume) |

### Gap: Upload volume not configured

`docker-compose.yml` does not mount `uploads/` as a volume. Uploaded files are lost on container recreation.

**Fix:** Add to backend service:
```yaml
volumes:
  - uploads:/app/uploads
```

## 9. Scaling Considerations

| Concern | Current | Production Recommendation |
|---------|---------|--------------------------|
| Backend workers | Single Uvicorn process | Add `--workers 4` or use Gunicorn with Uvicorn workers |
| Database connections | pool_size=10, max_overflow=20 | Adequate for 4 workers |
| Static files | Nginx with gzip | Add CDN for assets in high-traffic scenarios |
| File uploads | Local filesystem | Move to S3/MinIO for multi-instance deployments |
| Load balancing | Not configured | Add Nginx upstream or cloud LB for multi-instance |
| SSL/TLS | Not configured | Add Let's Encrypt or cloud-managed certificate |

## 10. CI/CD Pipeline (Future)

```yaml
# Proposed GitHub Actions workflow
name: CI/CD
on:
  push:
    branches: [main]
  pull_request:

jobs:
  backend:
    steps:
      - pip install -r requirements.txt
      - ruff check app/
      - pytest tests/ --cov=app
      
  frontend:
    steps:
      - npm ci
      - npx tsc --noEmit
      - npm run build
      
  deploy:
    needs: [backend, frontend]
    if: github.ref == 'refs/heads/main'
    steps:
      - docker compose build
      - docker compose push
      - ssh deploy@server "docker compose pull && docker compose up -d"
```
