# Local Docker Development Runbook

## Goal

Run CIForce locally with Docker as the default development environment:

- `postgres`: runtime metadata store
- `backend`: FastAPI + VEGA/LangGraph
- `frontend`: Vite build served by Nginx

Current runtime split:

- `runtime metadata`: Postgres
- `LangGraph checkpoint`: SQLite volume at `/app/data/vega.db`

## Prerequisites

- Docker Desktop is running
- `backend/.env` has a valid `OPENAI_API_KEY`
- `backend/.env` has:

```bash
OPENAI_DOTENV_OVERRIDE=true
OPENAI_TRUST_ENV=false
VEGA_RUNTIME_STORE=postgres
VEGA_RUNTIME_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ciforce
VEGA_CHECKPOINT_DB_PATH=data/vega.db
```

The compose backend service overrides the database URL to use the internal Docker hostname:

```bash
VEGA_RUNTIME_DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ciforce
VEGA_CHECKPOINT_DB_PATH=/app/data/vega.db
```

## Start

From the repo root:

```bash
docker compose up --build
```

Detached mode:

```bash
docker compose up -d --build
```

## URLs

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:8000/health`
- Backend API docs: `http://localhost:8000/docs`
- Postgres: `localhost:5432`

## Verify

Check service health:

```bash
curl http://127.0.0.1:8000/health
```

Expected VEGA shape:

```json
{
  "vega": {
    "ready": true,
    "metadata_store": "postgres",
    "checkpoint": "/app/data/vega.db"
  }
}
```

Smoke-test the runtime metadata store from the host:

```bash
python backend/scripts/verify_vega_runtime_store.py
```

Smoke-test business sector and workspace APIs after the backend is rebuilt:

```bash
python backend/scripts/verify_workspace_api.py
```

This creates one `smoke-tenant` business sector, one workspace, updates the
workspace canvas state, and confirms the workspace task-run list endpoint works.

Inspect a task after running VEGA:

```bash
python backend/scripts/inspect_vega_task_run.py --thread-id <thread_id>
```

## Logs

All services:

```bash
docker compose logs -f
```

Backend only:

```bash
docker compose logs -f backend
```

Postgres only:

```bash
docker compose logs -f postgres
```

## Restart

Backend only:

```bash
docker compose restart backend
```

Rebuild backend after dependency or code changes:

```bash
docker compose up -d --build backend
```

Full restart:

```bash
docker compose down
docker compose up -d --build
```

## Stop

Stop containers but keep volumes:

```bash
docker compose down
```

Stop and remove volumes:

```bash
docker compose down -v
```

Use `down -v` only when you are comfortable deleting local Postgres data and SQLite checkpoint data.

## Common Issues

### `/health` does not show `metadata_store: postgres`

The backend process is probably old or not running through Docker. Restart it:

```bash
docker compose restart backend
```

### LLM requests fail with `Connection error`

Check proxy environment variables:

```bash
python -c "import os; print({k: os.getenv(k) for k in ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY']})"
```

For local development, keep:

```bash
OPENAI_TRUST_ENV=false
```

### LLM requests fail with `AuthenticationError`

Confirm the key in `backend/.env` is the new key:

```bash
python -c "from dotenv import dotenv_values; k=dotenv_values('backend/.env').get('OPENAI_API_KEY'); print(k[-4:] if k else None)"
```

If the system has an old `OPENAI_API_KEY`, keep:

```bash
OPENAI_DOTENV_OVERRIDE=true
```

### Postgres is already using port 5432

Either stop the existing local Postgres, or change the host port in `docker-compose.yml`:

```yaml
ports:
  - "5433:5432"
```

Then update host-side smoke tests to use:

```bash
VEGA_RUNTIME_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/ciforce
```
