"""Smoke-test the configured VEGA runtime metadata store."""
from __future__ import annotations

import asyncio
import json
import os
import sys
import tempfile
import uuid
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from vega.persistence import create_runtime_store  # noqa: E402


def _id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


async def main() -> None:
    load_dotenv(ROOT / ".env", override=False)

    store_type = os.getenv("VEGA_RUNTIME_STORE", "sqlite").strip().lower()
    sqlite_db_path: str | None = None
    if store_type == "sqlite" and os.getenv("VEGA_RUNTIME_SMOKE_USE_CONFIGURED_SQLITE", "").lower() != "true":
        sqlite_db_path = str(Path(tempfile.gettempdir()) / f"{_id('vega-smoke')}.db")

    store = create_runtime_store(store_type=store_type, sqlite_db_path=sqlite_db_path)
    await store.setup()
    try:
        task_run_id = _id("smoke-run")
        thread_id = _id("smoke-thread")
        agent_run_id = _id("smoke-agent")

        await store.upsert_task_run(
            {
                "id": task_run_id,
                "tenant_id": "smoke-tenant",
                "business_sector_id": "smoke-sector",
                "workspace_id": "smoke-workspace",
                "workspace_name": "Smoke Workspace",
                "user_id": "smoke-user",
                "agent_key": "vega",
                "title": "Smoke test runtime store",
                "goal": "Verify VEGA runtime persistence",
                "status": "queued",
                "trigger_source": "smoke-test",
                "thread_id": thread_id,
                "billing_tags": {"mode": "smoke"},
                "request_tags": {"source": "script"},
                "file_refs": [],
                "memory_refs": [],
                "knowledge_refs": [],
            }
        )
        runtime_thread_id = await store.attach_runtime_thread(task_run_id=task_run_id, thread_id=thread_id)
        await store.update_task_run_status(task_run_id=task_run_id, status="running", mark_started=True)
        created_agent_run_id = await store.create_agent_run(
            {
                "id": agent_run_id,
                "tenant_id": "smoke-tenant",
                "business_sector_id": "smoke-sector",
                "workspace_id": "smoke-workspace",
                "task_run_id": task_run_id,
                "runtime_thread_id": runtime_thread_id,
                "agent_key": "smoke-worker",
                "run_role": "worker",
                "status": "running",
                "model_name": "smoke-model",
                "model_provider": "smoke-provider",
            }
        )
        await store.update_agent_run(
            created_agent_run_id,
            {
                "status": "completed",
                "output_tokens": 42,
                "duration_ms": 123,
                "total_cost_usd": 0,
                "mark_completed": True,
            },
        )
        event_id = await store.append_task_run_event(
            {
                "tenant_id": "smoke-tenant",
                "workspace_id": "smoke-workspace",
                "task_run_id": task_run_id,
                "agent_run_id": created_agent_run_id,
                "runtime_thread_id": runtime_thread_id,
                "event_type": "smoke.completed",
                "event_source": "script",
                "payload": {
                    "thread_id": thread_id,
                    "note": "runtime store smoke test completed",
                },
            }
        )
        task_run = await store.get_task_run_by_thread_id(thread_id)
    finally:
        await store.teardown()

    print(
        json.dumps(
            {
                "ok": True,
                "store_type": store_type,
                "sqlite_db_path": sqlite_db_path,
                "task_run_id": task_run_id,
                "thread_id": thread_id,
                "runtime_thread_id": runtime_thread_id,
                "agent_run_id": created_agent_run_id,
                "event_id": event_id,
                "task_run": task_run,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    asyncio.run(main())
