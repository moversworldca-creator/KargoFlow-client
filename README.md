# Movers CRM

Movers CRM is a Django + React application for moving-company operations: leads, sales opportunities, estimates, jobs, crews, payments, files, document templates, and automations.

For the RBAC audit summary, see `RBAC_AUDIT_SUMMARY.md`.
For the route-level access map, see `ROUTE_RBAC_MAP.md`.
For the backend architecture and API guide, see [`docs/backend-architecture.md`](docs/backend-architecture.md).
For the module, class, and function reference, see [`docs/backend-module-reference.md`](docs/backend-module-reference.md).
For separate module files, see [`docs/backend-modules/README.md`](docs/backend-modules/README.md).

## Stack

- Backend: Django 6, Django REST Framework, Celery
- Frontend: React 19, Vite, Tailwind, TanStack Query
- Local dev database: SQLite by default
- Docker database/cache: PostgreSQL 16 and Redis 7
- Production web stack: backend/frontend services with Caddy for HTTPS and proxy in test environment

## First-Time Development Setup

From the project root:

```bash
./setup.dev.sh --fresh
```

This creates default local env files, installs Python and frontend dependencies, runs migrations, and seeds demo data.

Start the app locally:

```bash
./setup.dev.sh --start --skip-install --skip-seed
```

URLs:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api
- API documentation: http://localhost:8000/api/docs/
- OpenAPI schema: http://localhost:8000/api/schema/
- Django admin: http://localhost:8000/admin

Demo login:

- `admin@fastmovers.com` / `password123`
- `manager@fastmovers.com` / `password123`
- `rep1@fastmovers.com` / `password123`
- `rep2@fastmovers.com` / `password123`

## Docker Development Setup

```bash
./setup.dev.sh --docker --fresh --start
```

This builds the Docker images, starts Postgres and Redis, runs migrations and seeds inside containers, then starts the dev stack.

## Production Setup

Docker production setup:

```bash
./setup.sh --docker --fresh --start
```

Host-machine production setup expects an existing PostgreSQL database:

```bash
DB_HOST=127.0.0.1 DB_PORT=5432 DB_NAME=movers_crm DB_USER=movers DB_PASS=secret ./setup.sh --fresh
```

Before real deployment, update `deploy/docker.env` with strong values for `SECRET_KEY`, `DB_PASS`, `ALLOWED_HOSTS`, and any integration credentials.

Test environment for `test.kargoflow.net`:

```bash
docker compose --project-directory . --env-file deploy/docker.env -f deploy/docker-compose.yml -f deploy/docker-compose.test.yml up -d --build
```

For test HTTPS, Caddy handles certificate management automatically and terminates TLS.
Point DNS for `test.kargoflow.net` at the Docker host and use HTTPS directly.

## Setup Flags

- `--docker`: run setup using Docker Compose.
- `--no-docker`: run setup on the host machine. This is the default.
- `--clean`: remove generated local artifacts such as frontend builds, static files, and Python caches.
- `--fresh`: reset the database and seed clean demo/baseline data.
- `--start`: start services after setup.
- `--no-start`: prepare only. This is the default.
- `--skip-install`: skip dependency installation or frontend build.
- `--skip-seed`: run migrations/checks without seed commands.

## Generated Files

The setup scripts create missing env files with safe local defaults:

- `.env`: local Django/Vite development values
- `frontend/.env.local`: Vite API URL for local frontend development
- `deploy/docker.env`: Docker Compose values
- `deploy/docker-compose.test.yml`: test-domain overrides for `test.kargoflow.net`

These files may contain local secrets and should not be committed unless the team explicitly decides to version examples.

## Common Commands

Local backend:

```bash
cd backend
../venv/bin/python manage.py runserver 0.0.0.0:8000
```

Local frontend:

```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

Run backend checks:

```bash
cd backend
../venv/bin/python manage.py check
```

Run frontend tests:

```bash
cd frontend
npm test
```

Stop Docker services:

```bash
docker compose --project-directory . --env-file deploy/docker.env -f deploy/docker-compose.yml -f deploy/docker-compose.dev.yml down
```

Remove Docker data volumes:

```bash
docker compose --project-directory . --env-file deploy/docker.env -f deploy/docker-compose.yml -f deploy/docker-compose.dev.yml down -v
```
