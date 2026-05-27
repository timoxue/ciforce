"""Postgres-backed business sector and workspace store."""
from __future__ import annotations

import json
import os
import re
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any


WORKSPACE_CORE_DDL = (
    """
    CREATE TABLE IF NOT EXISTS business_sectors (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'default',
        name TEXT NOT NULL,
        slug TEXT,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        sort_order INTEGER NOT NULL DEFAULT 0,
        icon TEXT,
        color TEXT,
        settings TEXT NOT NULL DEFAULT '{}',
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'default',
        business_sector_id TEXT NOT NULL REFERENCES business_sectors(id),
        name TEXT NOT NULL,
        slug TEXT,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        canvas_state TEXT NOT NULL DEFAULT '{}',
        settings TEXT NOT NULL DEFAULT '{}',
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS workspace_members (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL DEFAULT 'default',
        workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(workspace_id, user_id)
    )
    """,
)

WORKSPACE_CORE_INDEXES = (
    """
    CREATE INDEX IF NOT EXISTS idx_business_sectors_tenant_status_sort
        ON business_sectors(tenant_id, status, sort_order, created_at DESC)
    """,
    """
    CREATE UNIQUE INDEX IF NOT EXISTS idx_business_sectors_tenant_slug
        ON business_sectors(tenant_id, slug)
        WHERE slug IS NOT NULL
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_workspaces_sector_created
        ON workspaces(business_sector_id, created_at DESC)
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_workspaces_tenant_status_created
        ON workspaces(tenant_id, status, created_at DESC)
    """,
    """
    CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_sector_slug
        ON workspaces(business_sector_id, slug)
        WHERE slug IS NOT NULL
    """,
    """
    CREATE INDEX IF NOT EXISTS idx_workspace_members_user
        ON workspace_members(user_id, workspace_id)
    """,
)


class WorkspaceStore:
    """Small store for platform business objects.

    VEGA runtime persistence stays in `vega.persistence`; this store owns the
    product domain objects that task runs attach to.
    """

    def __init__(self, dsn: str | None = None) -> None:
        self.dsn = dsn or os.getenv("WORKSPACE_DATABASE_URL") or os.getenv(
            "VEGA_RUNTIME_DATABASE_URL"
        ) or os.getenv("DATABASE_URL")
        self._pool: Any = None

    async def setup(self) -> None:
        if not self.dsn:
            raise RuntimeError(
                "Workspace store requires WORKSPACE_DATABASE_URL, "
                "VEGA_RUNTIME_DATABASE_URL, or DATABASE_URL"
            )
        asyncpg = _require_asyncpg()
        self._pool = await asyncpg.create_pool(self.dsn, min_size=1, max_size=5)
        async with self.connection() as conn:
            await ensure_workspace_tables(conn)

    async def teardown(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None

    async def list_business_sectors(
        self,
        *,
        tenant_id: str = "default",
        include_archived: bool = False,
    ) -> list[dict[str, Any]]:
        async with self.connection() as conn:
            if include_archived:
                rows = await conn.fetch(
                    """
                    SELECT * FROM business_sectors
                    WHERE tenant_id = $1
                    ORDER BY sort_order ASC, created_at DESC
                    """,
                    tenant_id,
                )
            else:
                rows = await conn.fetch(
                    """
                    SELECT * FROM business_sectors
                    WHERE tenant_id = $1 AND status <> 'archived'
                    ORDER BY sort_order ASC, created_at DESC
                    """,
                    tenant_id,
                )
        return [_row_to_business_sector(row) for row in rows]

    async def create_business_sector(self, payload: dict[str, Any]) -> dict[str, Any]:
        sector_id = payload.get("id") or f"sector-{uuid.uuid4().hex[:12]}"
        tenant_id = payload.get("tenant_id") or "default"
        slug = payload.get("slug") or _slugify(payload["name"])
        async with self.connection() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO business_sectors (
                    id, tenant_id, name, slug, description, status, sort_order,
                    icon, color, settings, created_by, created_at, updated_at
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7,
                    $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                RETURNING *
                """,
                sector_id,
                tenant_id,
                payload["name"],
                slug,
                payload.get("description"),
                payload.get("status", "active"),
                payload.get("sort_order", 0),
                payload.get("icon"),
                payload.get("color"),
                _dumps(payload.get("settings"), "{}"),
                payload.get("created_by"),
            )
        return _row_to_business_sector(row)

    async def get_business_sector(self, sector_id: str) -> dict[str, Any] | None:
        async with self.connection() as conn:
            row = await conn.fetchrow("SELECT * FROM business_sectors WHERE id = $1", sector_id)
        return _row_to_business_sector(row) if row else None

    async def list_workspaces(
        self,
        *,
        business_sector_id: str,
        tenant_id: str | None = None,
        include_archived: bool = False,
    ) -> list[dict[str, Any]]:
        clauses = ["business_sector_id = $1"]
        params: list[Any] = [business_sector_id]
        if tenant_id:
            params.append(tenant_id)
            clauses.append(f"tenant_id = ${len(params)}")
        if not include_archived:
            clauses.append("status <> 'archived'")

        async with self.connection() as conn:
            rows = await conn.fetch(
                f"""
                SELECT * FROM workspaces
                WHERE {' AND '.join(clauses)}
                ORDER BY created_at DESC
                """,
                *params,
            )
        return [_row_to_workspace(row) for row in rows]

    async def create_workspace(self, payload: dict[str, Any]) -> dict[str, Any]:
        workspace_id = payload.get("id") or f"workspace-{uuid.uuid4().hex[:12]}"
        sector = await self.get_business_sector(payload["business_sector_id"])
        if sector is None:
            raise LookupError(f"Business sector not found: {payload['business_sector_id']}")

        tenant_id = payload.get("tenant_id") or sector["tenant_id"] or "default"
        slug = payload.get("slug") or _slugify(payload["name"])
        async with self.connection() as conn:
            row = await conn.fetchrow(
                """
                INSERT INTO workspaces (
                    id, tenant_id, business_sector_id, name, slug, description,
                    status, canvas_state, settings, created_by, created_at, updated_at
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6,
                    $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                RETURNING *
                """,
                workspace_id,
                tenant_id,
                payload["business_sector_id"],
                payload["name"],
                slug,
                payload.get("description"),
                payload.get("status", "active"),
                _dumps(payload.get("canvas_state"), "{}"),
                _dumps(payload.get("settings"), "{}"),
                payload.get("created_by"),
            )

            user_id = payload.get("created_by")
            if user_id:
                await conn.execute(
                    """
                    INSERT INTO workspace_members (id, tenant_id, workspace_id, user_id, role, created_at)
                    VALUES ($1, $2, $3, $4, 'owner', CURRENT_TIMESTAMP)
                    ON CONFLICT(workspace_id, user_id) DO UPDATE SET role = excluded.role
                    """,
                    f"member-{uuid.uuid4().hex[:12]}",
                    tenant_id,
                    workspace_id,
                    user_id,
                )
        return _row_to_workspace(row)

    async def get_workspace(self, workspace_id: str) -> dict[str, Any] | None:
        async with self.connection() as conn:
            row = await conn.fetchrow("SELECT * FROM workspaces WHERE id = $1", workspace_id)
        return _row_to_workspace(row) if row else None

    async def update_workspace_canvas(
        self,
        *,
        workspace_id: str,
        canvas_state: dict[str, Any],
    ) -> dict[str, Any] | None:
        async with self.connection() as conn:
            row = await conn.fetchrow(
                """
                UPDATE workspaces
                SET canvas_state = $2, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
                """,
                workspace_id,
                _dumps(canvas_state, "{}"),
            )
        return _row_to_workspace(row) if row else None

    async def list_workspace_task_runs(
        self,
        *,
        workspace_id: str,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        async with self.connection() as conn:
            rows = await conn.fetch(
                """
                SELECT *
                FROM task_runs
                WHERE workspace_id = $1
                ORDER BY created_at DESC
                LIMIT $2
                """,
                workspace_id,
                max(1, min(limit, 200)),
            )
        return [_row_to_task_run(row) for row in rows]

    @asynccontextmanager
    async def connection(self):
        if self._pool is None:
            raise RuntimeError("Workspace store is not initialized")
        async with self._pool.acquire() as conn:
            yield conn


workspace_store = WorkspaceStore()


async def ensure_workspace_tables(conn: Any) -> None:
    for ddl in WORKSPACE_CORE_DDL:
        await conn.execute(ddl)
    for ddl in WORKSPACE_CORE_INDEXES:
        await conn.execute(ddl)


def _require_asyncpg():
    try:
        import asyncpg
    except ImportError as exc:
        raise RuntimeError("asyncpg is required for workspace APIs") from exc
    return asyncpg


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9\u4e00-\u9fff]+", "-", value.strip().lower()).strip("-")
    return slug or f"item-{uuid.uuid4().hex[:8]}"


def _dumps(value: Any, fallback: str) -> str:
    if value is None:
        return fallback
    return json.dumps(value, ensure_ascii=False)


def _loads(value: Any, fallback: Any) -> Any:
    if value is None or value == "":
        return fallback
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, (bytes, bytearray)):
        value = value.decode("utf-8", errors="ignore")
    try:
        return json.loads(value)
    except Exception:
        return fallback


def _dt(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def _row_to_business_sector(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"],
        "tenant_id": row["tenant_id"],
        "name": row["name"],
        "slug": row["slug"],
        "description": row["description"],
        "status": row["status"],
        "sort_order": row["sort_order"],
        "icon": row["icon"],
        "color": row["color"],
        "settings": _loads(row["settings"], {}),
        "created_by": row["created_by"],
        "created_at": _dt(row["created_at"]),
        "updated_at": _dt(row["updated_at"]),
    }


def _row_to_workspace(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"],
        "tenant_id": row["tenant_id"],
        "business_sector_id": row["business_sector_id"],
        "name": row["name"],
        "slug": row["slug"],
        "description": row["description"],
        "status": row["status"],
        "canvas_state": _loads(row["canvas_state"], {}),
        "settings": _loads(row["settings"], {}),
        "created_by": row["created_by"],
        "created_at": _dt(row["created_at"]),
        "updated_at": _dt(row["updated_at"]),
    }


def _row_to_task_run(row: Any) -> dict[str, Any]:
    return {
        "id": row["id"],
        "tenant_id": row["tenant_id"],
        "business_sector_id": row["business_sector_id"],
        "workspace_id": row["workspace_id"],
        "workspace_name": row["workspace_name"],
        "user_id": row["user_id"],
        "agent_key": row["agent_key"],
        "title": row["title"],
        "goal": row["goal"],
        "status": row["status"],
        "trigger_source": row["trigger_source"],
        "thread_id": row["thread_id"],
        "billing_tags": _loads(row["billing_tags"], {}),
        "request_tags": _loads(row["request_tags"], {}),
        "file_refs": _loads(row["file_refs"], []),
        "memory_refs": _loads(row["memory_refs"], []),
        "knowledge_refs": _loads(row["knowledge_refs"], []),
        "final_reply": row["final_reply"],
        "error_message": row["error_message"],
        "started_at": _dt(row["started_at"]),
        "completed_at": _dt(row["completed_at"]),
        "created_at": _dt(row["created_at"]),
        "updated_at": _dt(row["updated_at"]),
    }
