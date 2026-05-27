"""Inspect VEGA task run metadata from the configured Postgres store."""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


async def main() -> None:
    parser = argparse.ArgumentParser(description="Inspect VEGA task run metadata")
    parser.add_argument("--task-run-id", dest="task_run_id")
    parser.add_argument("--thread-id", dest="thread_id")
    args = parser.parse_args()

    if not args.task_run_id and not args.thread_id:
        raise SystemExit("Provide --task-run-id or --thread-id")

    load_dotenv(ROOT / ".env", override=False)
    dsn = os.getenv("VEGA_RUNTIME_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not dsn:
        raise SystemExit("VEGA_RUNTIME_DATABASE_URL or DATABASE_URL is required")

    import asyncpg

    conn = await asyncpg.connect(dsn)
    try:
        task_run = None
        if args.task_run_id:
            task_run = await conn.fetchrow(
                "SELECT * FROM task_runs WHERE id = $1 LIMIT 1",
                args.task_run_id,
            )
        elif args.thread_id:
            task_run = await conn.fetchrow(
                """
                SELECT tr.*
                FROM task_runs tr
                LEFT JOIN runtime_threads rt ON rt.task_run_id = tr.id
                WHERE rt.thread_id = $1 OR tr.thread_id = $1
                ORDER BY tr.created_at DESC
                LIMIT 1
                """,
                args.thread_id,
            )

        if task_run is None:
            raise SystemExit("Task run not found")

        task_run_id = task_run["id"]
        agent_runs = await conn.fetch(
            """
            SELECT id, agent_key, run_role, status, error_type, error_message,
                   duration_ms, input_tokens, output_tokens, total_cost_usd,
                   created_at, completed_at
            FROM agent_runs
            WHERE task_run_id = $1
            ORDER BY created_at
            """,
            task_run_id,
        )
        events = await conn.fetch(
            """
            SELECT event_type, event_source, event_ts, payload
            FROM task_run_events
            WHERE task_run_id = $1
            ORDER BY event_ts
            """,
            task_run_id,
        )
    finally:
        await conn.close()

    print(
        json.dumps(
            {
                "task_run": dict(task_run),
                "agent_runs": [dict(row) for row in agent_runs],
                "events": [dict(row) for row in events],
            },
            ensure_ascii=False,
            indent=2,
            default=str,
        )
    )


if __name__ == "__main__":
    asyncio.run(main())
