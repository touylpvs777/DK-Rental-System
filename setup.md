# DK CRM — PostgreSQL Setup & Run Guide (Windows)

---

## 1. Install PostgreSQL

### Option A — Official Installer (recommended)

1. Download the Windows installer from https://www.postgresql.org/download/windows/
2. Run the installer as Administrator
3. Set the **superuser (postgres) password** — note it, you will need it
4. Keep the default port **5432**
5. Finish installation — PostgreSQL service starts automatically

Verify installation:

```powershell
psql --version
# PostgreSQL 16.x
```

If `psql` is not found, add PostgreSQL to PATH:

```
C:\Program Files\PostgreSQL\16\bin
```

*(Start → Search "Environment Variables" → System Variables → Path → Edit → New)*

---

### Option B — Chocolatey (PowerShell, if you have Chocolatey)

```powershell
choco install postgresql --params '/Password:your_password'
```

---

## 2. Create Database and User

Open **psql** as the postgres superuser:

```powershell
psql -U postgres
```

Enter the password you set during installation, then run:

```sql
-- Create the application database
CREATE DATABASE dk_crm;

-- Create a dedicated application user
CREATE USER dk_user WITH ENCRYPTED PASSWORD 'StrongPassword123!';

-- Grant full access on the database
GRANT ALL PRIVILEGES ON DATABASE dk_crm TO dk_user;

-- Required on PostgreSQL 15+ (schema-level access)
\c dk_crm
GRANT ALL ON SCHEMA public TO dk_user;

-- Confirm
\l
-- Should show dk_crm in the list

\q
```

---

## 3. Configure the .env File

Copy the example file:

```powershell
cd "f:\DK Sevice\CRM-System\backend"
copy .env.example .env
```

Generate a strong secret key:

```powershell
..\venv\Scripts\python -c "import secrets; print(secrets.token_hex(32))"
```

Open `.env` and fill in your values:

```env
APP_NAME=DK CRM API
APP_VERSION=1.0.0
DEBUG=false

DATABASE_URL=postgresql+asyncpg://dk_user:StrongPassword123!@localhost:5432/dk_crm

SECRET_KEY=<paste-generated-key-here>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:8080"]
```

---

## 4. SQLAlchemy Connection String Reference

| Component | Value |
|-----------|-------|
| Driver | `postgresql+asyncpg` |
| User | `dk_user` |
| Password | your password |
| Host | `localhost` |
| Port | `5432` |
| Database | `dk_crm` |

Full format:
```
postgresql+asyncpg://dk_user:StrongPassword123!@localhost:5432/dk_crm
```

If you kept the default postgres superuser instead of creating a separate user:
```
postgresql+asyncpg://postgres:your_postgres_password@localhost:5432/dk_crm
```

---

## 5. Install Python Dependencies

```powershell
cd "f:\DK Sevice\CRM-System\backend"
..\venv\Scripts\pip install -r requirements.txt
```

Verify the critical async driver is present:

```powershell
..\venv\Scripts\python -c "import asyncpg; print('asyncpg OK')"
```

---

## 6. Alembic Migration Setup

Alembic is already in `requirements.txt`. These are one-time setup steps.

### Initialize Alembic (first time only)

```powershell
cd "f:\DK Sevice\CRM-System\backend"
..\venv\Scripts\alembic init alembic
```

### Configure alembic.ini

Open `alembic.ini` and set:

```ini
sqlalchemy.url = postgresql+asyncpg://dk_user:StrongPassword123!@localhost:5432/dk_crm
```

Or better — read it from the `.env` file. Open `alembic/env.py` and replace the top section:

```python
from app.core.config import settings
from app.database.base import Base
import app.models  # noqa: F401 — registers all models

config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
target_metadata = Base.metadata
```

Also switch `env.py` to async mode — add this near the bottom of `run_migrations_online()`:

```python
from sqlalchemy.ext.asyncio import async_engine_from_config

connectable = async_engine_from_config(
    config.get_section(config.config_ini_section, {}),
    prefix="sqlalchemy.",
    poolclass=pool.NullPool,
)

async def run_async_migrations():
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

asyncio.run(run_async_migrations())
```

### Create and apply migrations

```powershell
# Create a migration (after changing models)
..\venv\Scripts\alembic revision --autogenerate -m "initial tables"

# Apply migrations to the database
..\venv\Scripts\alembic upgrade head

# Check current state
..\venv\Scripts\alembic current

# Rollback one step
..\venv\Scripts\alembic downgrade -1
```

> **Note:** For development, the app's lifespan calls `Base.metadata.create_all` automatically on startup
> so Alembic is not required until you need to manage schema changes in production.

---

## 7. Run the Backend

```powershell
cd "f:\DK Sevice\CRM-System\backend"

# Development (hot reload)
..\venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production
..\venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Expected startup output:

```
INFO:     Started server process [XXXX]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

---

## 8. Verify the API is Working

### Health check (browser or curl)

```powershell
curl http://localhost:8000/health
# {"status":"ok","version":"1.0.0"}
```

### Interactive API docs

Open in browser: **http://localhost:8000/docs**

### Register the first user

```powershell
curl -X POST http://localhost:8000/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@example.com\",\"username\":\"admin\",\"password\":\"Admin123!\",\"full_name\":\"Admin User\"}'
```

### Login and get a token

```powershell
curl -X POST http://localhost:8000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@example.com\",\"password\":\"Admin123!\"}'
```

Response:
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

### Call a protected endpoint

```powershell
curl http://localhost:8000/api/v1/users/me `
  -H "Authorization: Bearer eyJ..."
```

---

## 9. Verify PostgreSQL is Running

If you get `ConnectionRefusedError` on startup:

```powershell
# Check if the service is running
Get-Service -Name "postgresql*"

# Start it if stopped
Start-Service -Name "postgresql-x64-16"

# Or via Services GUI
services.msc
# Find "postgresql-x64-16", right-click → Start
```

Test connection directly:

```powershell
psql -U dk_user -d dk_crm -h localhost -p 5432
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `psql -U postgres` | Open psql as superuser |
| `pip install -r requirements.txt` | Install dependencies |
| `uvicorn app.main:app --reload` | Start dev server |
| `alembic revision --autogenerate -m "msg"` | Create migration |
| `alembic upgrade head` | Apply all migrations |
| `alembic downgrade -1` | Roll back one migration |
| `curl http://localhost:8000/health` | Health check |
| `http://localhost:8000/docs` | Swagger UI |
| `http://localhost:8000/redoc` | ReDoc UI |
