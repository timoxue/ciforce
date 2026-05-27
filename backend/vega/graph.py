"""VEGA graph assembly + checkpoint plumbing."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import aiosqlite
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.graph import END, START, StateGraph

from .persistence import (
    RuntimeStore,
    SqliteRuntimeStore,
    create_runtime_store,
)
from .registry import WORKER_NODES
from .state import TaskState
from .supervisor import route_from_supervisor, vega_supervisor

DEFAULT_DB_PATH = Path(__file__).resolve().parent.parent / "data" / "vega.db"


def _build_graph() -> StateGraph:
    graph = StateGraph(TaskState)
    graph.add_node("vega", vega_supervisor)

    for worker_id, worker_node in WORKER_NODES.items():
        graph.add_node(worker_id, worker_node)
        graph.add_edge(worker_id, "vega")

    graph.add_edge(START, "vega")
    graph.add_conditional_edges(
        "vega",
        route_from_supervisor,
        {**{worker_id: worker_id for worker_id in WORKER_NODES}, "__end__": END},
    )
    return graph


class VegaRuntime:
    """Single long-lived runtime for the compiled LangGraph."""

    def __init__(self) -> None:
        self._checkpoint_conn: aiosqlite.Connection | None = None
        self._checkpoint_path: Path = DEFAULT_DB_PATH
        self._checkpoint_uses_store_conn = False
        self._store: RuntimeStore | None = None
        self._saver: AsyncSqliteSaver | None = None
        self.graph: Any = None

    async def setup(self) -> None:
        metadata_sqlite_db_path = os.getenv("VEGA_RUNTIME_DB_PATH") or str(DEFAULT_DB_PATH)
        self._store = create_runtime_store(sqlite_db_path=metadata_sqlite_db_path)
        await self._store.setup()
        checkpoint_db_path = Path(os.getenv("VEGA_CHECKPOINT_DB_PATH") or str(DEFAULT_DB_PATH))
        self._checkpoint_path = checkpoint_db_path
        self._checkpoint_conn = await self._setup_checkpoint_connection(checkpoint_db_path)
        self._saver = AsyncSqliteSaver(self._checkpoint_conn)
        self.graph = _build_graph().compile(checkpointer=self._saver)

    async def teardown(self) -> None:
        if self._checkpoint_conn is not None and not self._checkpoint_uses_store_conn:
            await self._checkpoint_conn.close()
        self._checkpoint_conn = None
        self._checkpoint_uses_store_conn = False
        if self._store is not None:
            await self._store.teardown()
            self._store = None

    @property
    def workers(self) -> list[str]:
        return list(WORKER_NODES.keys())

    @property
    def db_path(self) -> str:
        return str(self._checkpoint_path)

    async def upsert_task_run(self, payload: dict[str, Any]) -> None:
        await self._require_store().upsert_task_run(payload)

    async def attach_runtime_thread(self, *, task_run_id: str, thread_id: str, engine: str = "langgraph") -> str:
        return await self._require_store().attach_runtime_thread(
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
        await self._require_store().update_task_run_status(
            task_run_id=task_run_id,
            status=status,
            final_reply=final_reply,
            error_message=error_message,
            mark_started=mark_started,
            mark_completed=mark_completed,
        )

    async def get_task_run_by_thread_id(self, thread_id: str) -> dict[str, Any] | None:
        return await self._require_store().get_task_run_by_thread_id(thread_id)

    async def create_agent_run(self, payload: dict[str, Any]) -> str:
        return await self._require_store().create_agent_run(payload)

    async def update_agent_run(self, agent_run_id: str, payload: dict[str, Any]) -> None:
        await self._require_store().update_agent_run(agent_run_id, payload)

    async def append_task_run_event(self, payload: dict[str, Any]) -> str:
        return await self._require_store().append_task_run_event(payload)

    def _require_store(self) -> RuntimeStore:
        if self._store is None:
            raise RuntimeError("VEGA runtime store not initialized")
        return self._store

    async def _setup_checkpoint_connection(self, checkpoint_db_path: Path) -> aiosqlite.Connection:
        if isinstance(self._store, SqliteRuntimeStore):
            store_conn = self._store.connection
            if store_conn is None:
                raise RuntimeError("SQLite runtime store connection not initialized")
            if self._store.db_path.resolve() == checkpoint_db_path.resolve():
                self._checkpoint_uses_store_conn = True
                return store_conn

        checkpoint_db_path.parent.mkdir(parents=True, exist_ok=True)
        self._checkpoint_uses_store_conn = False
        return await aiosqlite.connect(str(checkpoint_db_path))


runtime = VegaRuntime()
