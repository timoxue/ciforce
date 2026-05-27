"""Persistent runtime metadata stores for VEGA."""
from __future__ import annotations

import json
import os
import uuid
from abc import ABC, abstractmethod
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any

import aiosqlite


TASK_RUNS_DDL = """
CREATE TABLE IF NOT EXISTS task_runs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    business_sector_id TEXT,
    workspace_id TEXT,
    workspace_name TEXT,
    user_id TEXT,
    agent_key TEXT,
    title TEXT,
    goal TEXT NOT NULL,
    status TEXT NOT NULL,
    trigger_source TEXT NOT NULL DEFAULT 'workspace',
    thread_id TEXT,
    billing_tags TEXT NOT NULL DEFAULT '{}',
    request_tags TEXT NOT NULL DEFAULT '{}',
    file_refs TEXT NOT NULL DEFAULT '[]',
    memory_refs TEXT NOT NULL DEFAULT '[]',
    knowledge_refs TEXT NOT NULL DEFAULT '[]',
    final_reply TEXT,
    error_message TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""


RUNTIME_THREADS_DDL = """
CREATE TABLE IF NOT EXISTS runtime_threads (
    id TEXT PRIMARY KEY,
    task_run_id TEXT NOT NULL,
    engine TEXT NOT NULL,
    thread_id TEXT NOT NULL UNIQUE,
    checkpoint_ref TEXT,
    state_snapshot TEXT,
    is_primary INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_run_id) REFERENCES task_runs(id)
)
"""


AGENT_RUNS_DDL = """
CREATE TABLE IF NOT EXISTS agent_runs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    business_sector_id TEXT,
    workspace_id TEXT,
    task_run_id TEXT NOT NULL,
    runtime_thread_id TEXT,
    agent_key TEXT NOT NULL,
    run_role TEXT NOT NULL DEFAULT 'worker',
    status TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cached_tokens INTEGER NOT NULL DEFAULT 0,
    reasoning_tokens INTEGER NOT NULL DEFAULT 0,
    tool_call_count INTEGER NOT NULL DEFAULT 0,
    model_name TEXT,
    model_provider TEXT,
    model_cost_usd REAL NOT NULL DEFAULT 0,
    tool_cost_usd REAL NOT NULL DEFAULT 0,
    sandbox_cost_usd REAL NOT NULL DEFAULT 0,
    total_cost_usd REAL NOT NULL DEFAULT 0,
    duration_ms INTEGER,
    quality_score REAL,
    accepted_first_pass INTEGER,
    resolved_config_id TEXT,
    error_type TEXT,
    error_message TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_run_id) REFERENCES task_runs(id)
)
"""


TASK_RUN_EVENTS_DDL = """
CREATE TABLE IF NOT EXISTS task_run_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    workspace_id TEXT,
    task_run_id TEXT NOT NULL,
    agent_run_id TEXT,
    runtime_thread_id TEXT,
    event_type TEXT NOT NULL,
    event_source TEXT NOT NULL DEFAULT 'runtime',
    event_ts TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payload TEXT NOT NULL DEFAULT '{}',
    trace_id TEXT,
    span_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_run_id) REFERENCES task_runs(id)
)
"""


TASK_RUNS_DDL_POSTGRES = """
CREATE TABLE IF NOT EXISTS task_runs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    business_sector_id TEXT,
    workspace_id TEXT,
    workspace_name TEXT,
    user_id TEXT,
    agent_key TEXT,
    title TEXT,
    goal TEXT NOT NULL,
    status TEXT NOT NULL,
    trigger_source TEXT NOT NULL DEFAULT 'workspace',
    thread_id TEXT,
    billing_tags TEXT NOT NULL DEFAULT '{}',
    request_tags TEXT NOT NULL DEFAULT '{}',
    file_refs TEXT NOT NULL DEFAULT '[]',
    memory_refs TEXT NOT NULL DEFAULT '[]',
    knowledge_refs TEXT NOT NULL DEFAULT '[]',
    final_reply TEXT,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
)
"""


RUNTIME_THREADS_DDL_POSTGRES = """
CREATE TABLE IF NOT EXISTS runtime_threads (
    id TEXT PRIMARY KEY,
    task_run_id TEXT NOT NULL,
    engine TEXT NOT NULL,
    thread_id TEXT NOT NULL UNIQUE,
    checkpoint_ref TEXT,
    state_snapshot TEXT,
    is_primary INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_run_id) REFERENCES task_runs(id)
)
"""


AGENT_RUNS_DDL_POSTGRES = """
CREATE TABLE IF NOT EXISTS agent_runs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    business_sector_id TEXT,
    workspace_id TEXT,
    task_run_id TEXT NOT NULL,
    runtime_thread_id TEXT,
    agent_key TEXT NOT NULL,
    run_role TEXT NOT NULL DEFAULT 'worker',
    status TEXT NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cached_tokens INTEGER NOT NULL DEFAULT 0,
    reasoning_tokens INTEGER NOT NULL DEFAULT 0,
    tool_call_count INTEGER NOT NULL DEFAULT 0,
    model_name TEXT,
    model_provider TEXT,
    model_cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    tool_cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    sandbox_cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
    duration_ms INTEGER,
    quality_score DOUBLE PRECISION,
    accepted_first_pass INTEGER,
    resolved_config_id TEXT,
    error_type TEXT,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_run_id) REFERENCES task_runs(id)
)
"""


TASK_RUN_EVENTS_DDL_POSTGRES = """
CREATE TABLE IF NOT EXISTS task_run_events (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    workspace_id TEXT,
    task_run_id TEXT NOT NULL,
    agent_run_id TEXT,
    runtime_thread_id TEXT,
    event_type TEXT NOT NULL,
    event_source TEXT NOT NULL DEFAULT 'runtime',
    event_ts TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    payload TEXT NOT NULL DEFAULT '{}',
    trace_id TEXT,
    span_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(task_run_id) REFERENCES task_runs(id)
)
"""


TASK_RUNS_INDEXES = (
    "CREATE INDEX IF NOT EXISTS idx_task_runs_workspace_created ON task_runs(workspace_id, created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_task_runs_status_created ON task_runs(status, created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_task_runs_thread_id ON task_runs(thread_id)",
)


RUNTIME_THREADS_INDEXES = (
    "CREATE INDEX IF NOT EXISTS idx_runtime_threads_task_run_id ON runtime_threads(task_run_id)",
)


AGENT_RUNS_INDEXES = (
    "CREATE INDEX IF NOT EXISTS idx_agent_runs_task_run_id ON agent_runs(task_run_id, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_agent_runs_workspace_agent ON agent_runs(workspace_id, agent_key, created_at DESC)",
    "CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_status ON agent_runs(agent_key, status, created_at DESC)",
)


TASK_RUN_EVENTS_INDEXES = (
    "CREATE INDEX IF NOT EXISTS idx_task_run_events_task_run_ts ON task_run_events(task_run_id, event_ts)",
    "CREATE INDEX IF NOT EXISTS idx_task_run_events_agent_run_ts ON task_run_events(agent_run_id, event_ts)",
    "CREATE INDEX IF NOT EXISTS idx_task_run_events_type_ts ON task_run_events(event_type, event_ts DESC)",
)


class RuntimeStore(ABC):
    """Abstract runtime metadata store for task and agent execution records."""

    @abstractmethod
    async def setup(self) -> None:
        """Initialize backing resources."""

    @abstractmethod
    async def teardown(self) -> None:
        """Release backing resources."""

    @abstractmethod
    async def upsert_task_run(self, payload: dict[str, Any]) -> None:
        """Create or update a task run."""

    @abstractmethod
    async def attach_runtime_thread(
        self,
        *,
        task_run_id: str,
        thread_id: str,
        engine: str = "langgraph",
    ) -> str:
        """Attach a runtime thread to a task run."""

    @abstractmethod
    async def update_task_run_status(
        self,
        *,
        task_run_id: str,
        status: str,
        final_reply: str | None = None,
        error_message: str | None = None,
        mark_started: bool = False,
        mark_completed: bool = False,
    ) -> None:
        """Update the task run lifecycle state."""

    @abstractmethod
    async def get_task_run_by_thread_id(self, thread_id: str) -> dict[str, Any] | None:
        """Look up the latest task run by runtime thread id."""

    @abstractmethod
    async def create_agent_run(self, payload: dict[str, Any]) -> str:
        """Create an agent execution record."""

    @abstractmethod
    async def update_agent_run(self, agent_run_id: str, payload: dict[str, Any]) -> None:
        """Update an agent execution record."""

    @abstractmethod
    async def append_task_run_event(self, payload: dict[str, Any]) -> str:
        """Append a runtime event."""


class PostgresRuntimeStore(RuntimeStore):
    """Production-oriented runtime metadata store backed by Postgres."""

    def __init__(self, dsn: str | None = None) -> None:
        self.dsn = dsn or os.getenv("VEGA_RUNTIME_DATABASE_URL") or os.getenv("DATABASE_URL")
        self._pool: Any = None

    async def setup(self) -> None:
        if not self.dsn:
            raise RuntimeError(
                "Postgres runtime store requires VEGA_RUNTIME_DATABASE_URL or DATABASE_URL"
            )
        asyncpg = _require_asyncpg()
        self._pool = await asyncpg.create_pool(self.dsn, min_size=1, max_size=5)
        async with self._connection() as conn:
            await ensure_runtime_tables_postgres(conn)

    async def teardown(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None

    async def upsert_task_run(self, payload: dict[str, Any]) -> None:
        async with self._connection() as conn:
            await upsert_task_run_postgres(conn, payload)

    async def attach_runtime_thread(
        self,
        *,
        task_run_id: str,
        thread_id: str,
        engine: str = "langgraph",
    ) -> str:
        async with self._connection() as conn:
            return await attach_runtime_thread_postgres(
                conn,
                task_run_id=task_run_id,
                thread_id=thread_id,
                engine=engine,
            )

    async def update_task_run_status(
        self,
        *,
        task_run_id: str,
        status: str,
        final_reply: str | None = None,
        error_message: str | None = None,
        mark_started: bool = False,
        mark_completed: bool = False,
    ) -> None:
        async with self._connection() as conn:
            await update_task_run_status_postgres(
                conn,
                task_run_id=task_run_id,
                status=status,
                final_reply=final_reply,
                error_message=error_message,
                mark_started=mark_started,
                mark_completed=mark_completed,
            )

    async def get_task_run_by_thread_id(self, thread_id: str) -> dict[str, Any] | None:
        async with self._connection() as conn:
            return await get_task_run_by_thread_id_postgres(conn, thread_id)

    async def create_agent_run(self, payload: dict[str, Any]) -> str:
        async with self._connection() as conn:
            return await create_agent_run_postgres(conn, payload)

    async def update_agent_run(self, agent_run_id: str, payload: dict[str, Any]) -> None:
        async with self._connection() as conn:
            await update_agent_run_postgres(conn, agent_run_id, payload)

    async def append_task_run_event(self, payload: dict[str, Any]) -> str:
        async with self._connection() as conn:
            return await append_task_run_event_postgres(conn, payload)

    @asynccontextmanager
    async def _connection(self):
        if self._pool is None:
            raise RuntimeError("Postgres runtime store is not initialized")
        async with self._pool.acquire() as conn:
            yield conn


class SqliteRuntimeStore(RuntimeStore):
    """Local runtime metadata store used for development and transitional deployments."""

    def __init__(self, db_path: str | Path) -> None:
        self.db_path = Path(db_path)
        self._conn: aiosqlite.Connection | None = None

    @property
    def connection(self) -> aiosqlite.Connection | None:
        return self._conn

    async def setup(self) -> None:
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = await aiosqlite.connect(str(self.db_path))
        await ensure_runtime_tables(self._conn)

    async def teardown(self) -> None:
        if self._conn is not None:
            await self._conn.close()
            self._conn = None

    async def upsert_task_run(self, payload: dict[str, Any]) -> None:
        await upsert_task_run(self._require_conn(), payload)

    async def attach_runtime_thread(
        self,
        *,
        task_run_id: str,
        thread_id: str,
        engine: str = "langgraph",
    ) -> str:
        return await attach_runtime_thread(
            self._require_conn(),
            task_run_id=task_run_id,
            thread_id=thread_id,
            engine=engine,
        )

    async def update_task_run_status(
        self,
        *,
        task_run_id: str,
        status: str,
        final_reply: str | None = None,
        error_message: str | None = None,
        mark_started: bool = False,
        mark_completed: bool = False,
    ) -> None:
        await update_task_run_status(
            self._require_conn(),
            task_run_id=task_run_id,
            status=status,
            final_reply=final_reply,
            error_message=error_message,
            mark_started=mark_started,
            mark_completed=mark_completed,
        )

    async def get_task_run_by_thread_id(self, thread_id: str) -> dict[str, Any] | None:
        return await get_task_run_by_thread_id(self._require_conn(), thread_id)

    async def create_agent_run(self, payload: dict[str, Any]) -> str:
        return await create_agent_run(self._require_conn(), payload)

    async def update_agent_run(self, agent_run_id: str, payload: dict[str, Any]) -> None:
        await update_agent_run(self._require_conn(), agent_run_id, payload)

    async def append_task_run_event(self, payload: dict[str, Any]) -> str:
        return await append_task_run_event(self._require_conn(), payload)

    def _require_conn(self) -> aiosqlite.Connection:
        if self._conn is None:
            raise RuntimeError("SQLite runtime store is not initialized")
        return self._conn


def create_runtime_store(
    *,
    store_type: str | None = None,
    sqlite_db_path: str | Path | None = None,
    postgres_dsn: str | None = None,
) -> RuntimeStore:
    """Build the runtime metadata store configured for the current environment."""
    resolved_type = (store_type or os.getenv("VEGA_RUNTIME_STORE", "sqlite")).strip().lower()
    if resolved_type == "sqlite":
        db_path = sqlite_db_path or os.getenv("VEGA_RUNTIME_DB_PATH") or "data/vega.db"
        return SqliteRuntimeStore(db_path)
    if resolved_type == "postgres":
        return PostgresRuntimeStore(postgres_dsn)
    raise ValueError(f"Unsupported VEGA runtime store: {resolved_type}")


def _require_asyncpg():
    try:
        import asyncpg
    except ImportError as exc:
        raise RuntimeError(
            "asyncpg is required for VEGA postgres runtime store. "
            "Add it to backend dependencies before enabling VEGA_RUNTIME_STORE=postgres."
        ) from exc
    return asyncpg


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


def _row_to_task_run(row: Any) -> dict[str, Any] | None:
    if row is None:
        return None

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
        "started_at": _normalize_datetime(row["started_at"]),
        "completed_at": _normalize_datetime(row["completed_at"]),
        "created_at": _normalize_datetime(row["created_at"]),
        "updated_at": _normalize_datetime(row["updated_at"]),
    }


def _normalize_datetime(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    return value


async def ensure_runtime_tables(conn: aiosqlite.Connection) -> None:
    await conn.execute(TASK_RUNS_DDL)
    await conn.execute(RUNTIME_THREADS_DDL)
    await conn.execute(AGENT_RUNS_DDL)
    await conn.execute(TASK_RUN_EVENTS_DDL)
    for ddl in TASK_RUNS_INDEXES:
        await conn.execute(ddl)
    for ddl in RUNTIME_THREADS_INDEXES:
        await conn.execute(ddl)
    for ddl in AGENT_RUNS_INDEXES:
        await conn.execute(ddl)
    for ddl in TASK_RUN_EVENTS_INDEXES:
        await conn.execute(ddl)
    await conn.commit()


async def ensure_runtime_tables_postgres(conn: Any) -> None:
    for ddl in (
        TASK_RUNS_DDL_POSTGRES,
        RUNTIME_THREADS_DDL_POSTGRES,
        AGENT_RUNS_DDL_POSTGRES,
        TASK_RUN_EVENTS_DDL_POSTGRES,
    ):
        await conn.execute(ddl)
    for ddl in TASK_RUNS_INDEXES:
        await conn.execute(ddl)
    for ddl in RUNTIME_THREADS_INDEXES:
        await conn.execute(ddl)
    for ddl in AGENT_RUNS_INDEXES:
        await conn.execute(ddl)
    for ddl in TASK_RUN_EVENTS_INDEXES:
        await conn.execute(ddl)


async def upsert_task_run(conn: aiosqlite.Connection, payload: dict[str, Any]) -> None:
    await conn.execute(
        """
        INSERT INTO task_runs (
            id, tenant_id, business_sector_id, workspace_id, workspace_name, user_id,
            agent_key, title, goal, status, trigger_source, thread_id,
            billing_tags, request_tags, file_refs, memory_refs, knowledge_refs,
            created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
            tenant_id = excluded.tenant_id,
            business_sector_id = excluded.business_sector_id,
            workspace_id = excluded.workspace_id,
            workspace_name = excluded.workspace_name,
            user_id = excluded.user_id,
            agent_key = excluded.agent_key,
            title = excluded.title,
            goal = excluded.goal,
            status = excluded.status,
            trigger_source = excluded.trigger_source,
            thread_id = excluded.thread_id,
            billing_tags = excluded.billing_tags,
            request_tags = excluded.request_tags,
            file_refs = excluded.file_refs,
            memory_refs = excluded.memory_refs,
            knowledge_refs = excluded.knowledge_refs,
            updated_at = CURRENT_TIMESTAMP
        """,
        (
            payload["id"],
            payload.get("tenant_id"),
            payload.get("business_sector_id"),
            payload.get("workspace_id"),
            payload.get("workspace_name"),
            payload.get("user_id"),
            payload.get("agent_key"),
            payload.get("title"),
            payload["goal"],
            payload["status"],
            payload.get("trigger_source", "workspace"),
            payload.get("thread_id"),
            _dumps(payload.get("billing_tags"), "{}"),
            _dumps(payload.get("request_tags"), "{}"),
            _dumps(payload.get("file_refs"), "[]"),
            _dumps(payload.get("memory_refs"), "[]"),
            _dumps(payload.get("knowledge_refs"), "[]"),
        ),
    )
    await conn.commit()


async def upsert_task_run_postgres(conn: Any, payload: dict[str, Any]) -> None:
    await conn.execute(
        """
        INSERT INTO task_runs (
            id, tenant_id, business_sector_id, workspace_id, workspace_name, user_id,
            agent_key, title, goal, status, trigger_source, thread_id,
            billing_tags, request_tags, file_refs, memory_refs, knowledge_refs,
            created_at, updated_at
        )
        VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12,
            $13, $14, $15, $16, $17,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT(id) DO UPDATE SET
            tenant_id = excluded.tenant_id,
            business_sector_id = excluded.business_sector_id,
            workspace_id = excluded.workspace_id,
            workspace_name = excluded.workspace_name,
            user_id = excluded.user_id,
            agent_key = excluded.agent_key,
            title = excluded.title,
            goal = excluded.goal,
            status = excluded.status,
            trigger_source = excluded.trigger_source,
            thread_id = excluded.thread_id,
            billing_tags = excluded.billing_tags,
            request_tags = excluded.request_tags,
            file_refs = excluded.file_refs,
            memory_refs = excluded.memory_refs,
            knowledge_refs = excluded.knowledge_refs,
            updated_at = CURRENT_TIMESTAMP
        """,
        payload["id"],
        payload.get("tenant_id"),
        payload.get("business_sector_id"),
        payload.get("workspace_id"),
        payload.get("workspace_name"),
        payload.get("user_id"),
        payload.get("agent_key"),
        payload.get("title"),
        payload["goal"],
        payload["status"],
        payload.get("trigger_source", "workspace"),
        payload.get("thread_id"),
        _dumps(payload.get("billing_tags"), "{}"),
        _dumps(payload.get("request_tags"), "{}"),
        _dumps(payload.get("file_refs"), "[]"),
        _dumps(payload.get("memory_refs"), "[]"),
        _dumps(payload.get("knowledge_refs"), "[]"),
    )


async def attach_runtime_thread(
    conn: aiosqlite.Connection,
    *,
    task_run_id: str,
    thread_id: str,
    engine: str = "langgraph",
) -> str:
    runtime_thread_id = str(uuid.uuid4())
    await conn.execute(
        """
        INSERT INTO runtime_threads (id, task_run_id, engine, thread_id, is_primary, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(thread_id) DO UPDATE SET
            task_run_id = excluded.task_run_id,
            engine = excluded.engine,
            updated_at = CURRENT_TIMESTAMP
        """,
        (runtime_thread_id, task_run_id, engine, thread_id),
    )
    await conn.commit()
    return runtime_thread_id


async def attach_runtime_thread_postgres(
    conn: Any,
    *,
    task_run_id: str,
    thread_id: str,
    engine: str = "langgraph",
) -> str:
    runtime_thread_id = str(uuid.uuid4())
    await conn.execute(
        """
        INSERT INTO runtime_threads (id, task_run_id, engine, thread_id, is_primary, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(thread_id) DO UPDATE SET
            task_run_id = excluded.task_run_id,
            engine = excluded.engine,
            updated_at = CURRENT_TIMESTAMP
        """,
        runtime_thread_id,
        task_run_id,
        engine,
        thread_id,
    )
    return runtime_thread_id


async def update_task_run_status(
    conn: aiosqlite.Connection,
    *,
    task_run_id: str,
    status: str,
    final_reply: str | None = None,
    error_message: str | None = None,
    mark_started: bool = False,
    mark_completed: bool = False,
) -> None:
    clauses = ["status = ?", "updated_at = CURRENT_TIMESTAMP"]
    params: list[Any] = [status]

    if final_reply is not None:
        clauses.append("final_reply = ?")
        params.append(final_reply)
    if error_message is not None:
        clauses.append("error_message = ?")
        params.append(error_message)
    if mark_started:
        clauses.append("started_at = COALESCE(started_at, CURRENT_TIMESTAMP)")
    if mark_completed:
        clauses.append("completed_at = CURRENT_TIMESTAMP")

    params.append(task_run_id)
    await conn.execute(f"UPDATE task_runs SET {', '.join(clauses)} WHERE id = ?", params)
    await conn.commit()


async def update_task_run_status_postgres(
    conn: Any,
    *,
    task_run_id: str,
    status: str,
    final_reply: str | None = None,
    error_message: str | None = None,
    mark_started: bool = False,
    mark_completed: bool = False,
) -> None:
    clauses = ["status = $1", "updated_at = CURRENT_TIMESTAMP"]
    params: list[Any] = [status]

    if final_reply is not None:
        params.append(final_reply)
        clauses.append(f"final_reply = ${len(params)}")
    if error_message is not None:
        params.append(error_message)
        clauses.append(f"error_message = ${len(params)}")
    if mark_started:
        clauses.append("started_at = COALESCE(started_at, CURRENT_TIMESTAMP)")
    if mark_completed:
        clauses.append("completed_at = CURRENT_TIMESTAMP")

    params.append(task_run_id)
    await conn.execute(
        f"UPDATE task_runs SET {', '.join(clauses)} WHERE id = ${len(params)}",
        *params,
    )


async def get_task_run_by_thread_id(conn: aiosqlite.Connection, thread_id: str) -> dict[str, Any] | None:
    conn.row_factory = aiosqlite.Row
    async with conn.execute(
        """
        SELECT tr.*
        FROM task_runs tr
        LEFT JOIN runtime_threads rt ON rt.task_run_id = tr.id
        WHERE rt.thread_id = ? OR tr.thread_id = ?
        ORDER BY tr.created_at DESC
        LIMIT 1
        """,
        (thread_id, thread_id),
    ) as cursor:
        row = await cursor.fetchone()
    return _row_to_task_run(row)


async def get_task_run_by_thread_id_postgres(conn: Any, thread_id: str) -> dict[str, Any] | None:
    row = await conn.fetchrow(
        """
        SELECT tr.*
        FROM task_runs tr
        LEFT JOIN runtime_threads rt ON rt.task_run_id = tr.id
        WHERE rt.thread_id = $1 OR tr.thread_id = $1
        ORDER BY tr.created_at DESC
        LIMIT 1
        """,
        thread_id,
    )
    return _row_to_task_run(row)


async def create_agent_run(conn: aiosqlite.Connection, payload: dict[str, Any]) -> str:
    agent_run_id = payload.get("id") or str(uuid.uuid4())
    await conn.execute(
        """
        INSERT INTO agent_runs (
            id, tenant_id, business_sector_id, workspace_id, task_run_id, runtime_thread_id,
            agent_key, run_role, status, model_name, model_provider, started_at, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """,
        (
            agent_run_id,
            payload.get("tenant_id"),
            payload.get("business_sector_id"),
            payload.get("workspace_id"),
            payload["task_run_id"],
            payload.get("runtime_thread_id"),
            payload["agent_key"],
            payload.get("run_role", "worker"),
            payload.get("status", "running"),
            payload.get("model_name"),
            payload.get("model_provider"),
        ),
    )
    await conn.commit()
    return agent_run_id


async def create_agent_run_postgres(conn: Any, payload: dict[str, Any]) -> str:
    agent_run_id = payload.get("id") or str(uuid.uuid4())
    await conn.execute(
        """
        INSERT INTO agent_runs (
            id, tenant_id, business_sector_id, workspace_id, task_run_id, runtime_thread_id,
            agent_key, run_role, status, model_name, model_provider, started_at, created_at, updated_at
        )
        VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        """,
        agent_run_id,
        payload.get("tenant_id"),
        payload.get("business_sector_id"),
        payload.get("workspace_id"),
        payload["task_run_id"],
        payload.get("runtime_thread_id"),
        payload["agent_key"],
        payload.get("run_role", "worker"),
        payload.get("status", "running"),
        payload.get("model_name"),
        payload.get("model_provider"),
    )
    return agent_run_id


async def update_agent_run(conn: aiosqlite.Connection, agent_run_id: str, payload: dict[str, Any]) -> None:
    clauses = ["updated_at = CURRENT_TIMESTAMP"]
    params: list[Any] = []
    field_map = {
        "status": "status",
        "input_tokens": "input_tokens",
        "output_tokens": "output_tokens",
        "cached_tokens": "cached_tokens",
        "reasoning_tokens": "reasoning_tokens",
        "tool_call_count": "tool_call_count",
        "model_name": "model_name",
        "model_provider": "model_provider",
        "model_cost_usd": "model_cost_usd",
        "tool_cost_usd": "tool_cost_usd",
        "sandbox_cost_usd": "sandbox_cost_usd",
        "total_cost_usd": "total_cost_usd",
        "duration_ms": "duration_ms",
        "quality_score": "quality_score",
        "accepted_first_pass": "accepted_first_pass",
        "resolved_config_id": "resolved_config_id",
        "error_type": "error_type",
        "error_message": "error_message",
    }
    for key, column in field_map.items():
        if key in payload:
            clauses.append(f"{column} = ?")
            params.append(payload[key])

    if payload.get("mark_completed"):
        clauses.append("completed_at = CURRENT_TIMESTAMP")

    params.append(agent_run_id)
    await conn.execute(f"UPDATE agent_runs SET {', '.join(clauses)} WHERE id = ?", params)
    await conn.commit()


async def update_agent_run_postgres(conn: Any, agent_run_id: str, payload: dict[str, Any]) -> None:
    clauses = ["updated_at = CURRENT_TIMESTAMP"]
    params: list[Any] = []
    field_map = {
        "status": "status",
        "input_tokens": "input_tokens",
        "output_tokens": "output_tokens",
        "cached_tokens": "cached_tokens",
        "reasoning_tokens": "reasoning_tokens",
        "tool_call_count": "tool_call_count",
        "model_name": "model_name",
        "model_provider": "model_provider",
        "model_cost_usd": "model_cost_usd",
        "tool_cost_usd": "tool_cost_usd",
        "sandbox_cost_usd": "sandbox_cost_usd",
        "total_cost_usd": "total_cost_usd",
        "duration_ms": "duration_ms",
        "quality_score": "quality_score",
        "accepted_first_pass": "accepted_first_pass",
        "resolved_config_id": "resolved_config_id",
        "error_type": "error_type",
        "error_message": "error_message",
    }
    for key, column in field_map.items():
        if key in payload:
            params.append(payload[key])
            clauses.append(f"{column} = ${len(params)}")

    if payload.get("mark_completed"):
        clauses.append("completed_at = CURRENT_TIMESTAMP")

    params.append(agent_run_id)
    await conn.execute(
        f"UPDATE agent_runs SET {', '.join(clauses)} WHERE id = ${len(params)}",
        *params,
    )


async def append_task_run_event(conn: aiosqlite.Connection, payload: dict[str, Any]) -> str:
    event_id = payload.get("id") or str(uuid.uuid4())
    await conn.execute(
        """
        INSERT INTO task_run_events (
            id, tenant_id, workspace_id, task_run_id, agent_run_id, runtime_thread_id,
            event_type, event_source, event_ts, payload, trace_id, span_id, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, CURRENT_TIMESTAMP)
        """,
        (
            event_id,
            payload.get("tenant_id"),
            payload.get("workspace_id"),
            payload["task_run_id"],
            payload.get("agent_run_id"),
            payload.get("runtime_thread_id"),
            payload["event_type"],
            payload.get("event_source", "runtime"),
            _dumps(payload.get("payload"), "{}"),
            payload.get("trace_id"),
            payload.get("span_id"),
        ),
    )
    await conn.commit()
    return event_id


async def append_task_run_event_postgres(conn: Any, payload: dict[str, Any]) -> str:
    event_id = payload.get("id") or str(uuid.uuid4())
    await conn.execute(
        """
        INSERT INTO task_run_events (
            id, tenant_id, workspace_id, task_run_id, agent_run_id, runtime_thread_id,
            event_type, event_source, event_ts, payload, trace_id, span_id, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9, $10, $11, CURRENT_TIMESTAMP)
        """,
        event_id,
        payload.get("tenant_id"),
        payload.get("workspace_id"),
        payload["task_run_id"],
        payload.get("agent_run_id"),
        payload.get("runtime_thread_id"),
        payload["event_type"],
        payload.get("event_source", "runtime"),
        _dumps(payload.get("payload"), "{}"),
        payload.get("trace_id"),
        payload.get("span_id"),
    )
    return event_id
