"""
VEGA REST + SSE surface.

POST /api/vega/chat
    Body: {"goal": str, "thread_id"?: str}
    Returns: SSE stream of graph events:
        - status   : VEGA's routing / worker progress notes
        - output   : worker artifact (one per worker that ran)
        - final    : VEGA's summary back to Boss
        - done     : terminal marker (includes thread_id)
        - error    : pipeline error

GET /api/vega/task/{thread_id}
    Inspect the latest checkpointed state.
"""
from __future__ import annotations

import json
import uuid
from typing import Any, AsyncIterator

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from vega.graph import runtime
from vega.supervisor import WORKER_REGISTRY

router = APIRouter(prefix="/api/vega", tags=["vega"])


class ChatRequest(BaseModel):
    goal: str
    thread_id: str | None = None
    user_id: str | None = None
    tenant_id: str | None = None
    business_sector_id: str | None = None
    workspace_id: str | None = None
    workspace_name: str | None = None
    task_run_id: str | None = None
    file_refs: list[dict[str, Any]] = Field(default_factory=list)
    memory_refs: list[dict[str, Any]] = Field(default_factory=list)
    knowledge_refs: list[dict[str, Any]] = Field(default_factory=list)
    billing_tags: dict[str, str] = Field(default_factory=dict)
    request_tags: dict[str, str] = Field(default_factory=dict)
    trace_id: str | None = None


def _sse(type_: str, **kwargs) -> str:
    return json.dumps({"type": type_, **kwargs}, ensure_ascii=False)


@router.post("/chat")
async def chat(req: ChatRequest):
    """Run the VEGA graph and stream events as SSE."""
    if runtime.graph is None:
        raise HTTPException(503, "VEGA runtime not initialized")

    thread_id = req.thread_id or f"task-{uuid.uuid4().hex[:12]}"
    task_run_id = req.task_run_id or f"run-{uuid.uuid4().hex[:12]}"
    metadata = {
        "thread_id": thread_id,
        "user_id": req.user_id,
        "tenant_id": req.tenant_id,
        "business_sector_id": req.business_sector_id,
        "workspace_id": req.workspace_id,
        "workspace_name": req.workspace_name,
        "task_run_id": task_run_id,
        "trace_id": req.trace_id,
        "request_tags": req.request_tags,
        "billing_tags": req.billing_tags,
    }
    config = {
        "configurable": {
            "thread_id": thread_id,
            "workspace_id": req.workspace_id,
            "task_run_id": task_run_id,
            "business_sector_id": req.business_sector_id,
        },
        "metadata": metadata,
        "recursion_limit": 25,
    }

    initial_state = {
        "goal": req.goal,
        "user_id": req.user_id,
        "tenant_id": req.tenant_id,
        "business_sector_id": req.business_sector_id,
        "workspace_id": req.workspace_id,
        "workspace_name": req.workspace_name,
        "task_run_id": task_run_id,
        "thread_id": thread_id,
        "file_refs": req.file_refs,
        "memory_refs": req.memory_refs,
        "knowledge_refs": req.knowledge_refs,
        "billing_tags": req.billing_tags,
        "trace_id": req.trace_id,
        "request_tags": req.request_tags,
    }

    await runtime.upsert_task_run(
        {
            "id": task_run_id,
            "tenant_id": req.tenant_id,
            "business_sector_id": req.business_sector_id,
            "workspace_id": req.workspace_id,
            "workspace_name": req.workspace_name,
            "user_id": req.user_id,
            "agent_key": "vega",
            "title": req.goal[:120],
            "goal": req.goal,
            "status": "queued",
            "trigger_source": "workspace" if req.workspace_id else "api",
            "thread_id": thread_id,
            "billing_tags": req.billing_tags,
            "request_tags": req.request_tags,
            "file_refs": req.file_refs,
            "memory_refs": req.memory_refs,
            "knowledge_refs": req.knowledge_refs,
        }
    )
    await runtime.attach_runtime_thread(task_run_id=task_run_id, thread_id=thread_id)
    await runtime.append_task_run_event(
        {
            "tenant_id": req.tenant_id,
            "workspace_id": req.workspace_id,
            "task_run_id": task_run_id,
            "event_type": "task.created",
            "event_source": "runtime",
            "trace_id": req.trace_id,
            "payload": {
                "goal": req.goal,
                "thread_id": thread_id,
                "workspace_id": req.workspace_id,
                "business_sector_id": req.business_sector_id,
            },
        }
    )

    async def generate() -> AsyncIterator[str]:
        await runtime.update_task_run_status(task_run_id=task_run_id, status="running", mark_started=True)
        await runtime.append_task_run_event(
            {
                "tenant_id": req.tenant_id,
                "workspace_id": req.workspace_id,
                "task_run_id": task_run_id,
                "event_type": "task.started",
                "event_source": "runtime",
                "trace_id": req.trace_id,
                "payload": {"thread_id": thread_id},
            }
        )
        yield _sse(
            "status",
            message=f"VEGA 接收目标：{req.goal}",
            thread_id=thread_id,
            workspace_id=req.workspace_id,
            task_run_id=task_run_id,
        )

        # Already-emitted worker outputs (so re-runs don't double-fire on resume)
        emitted_outputs = 0

        try:
            async for snapshot in runtime.graph.astream(
                initial_state,
                config=config,
                stream_mode="values",
            ):
                # snapshot is the full TaskState after each node executes.
                # Emit any newly-appended outputs since last yield.
                outputs = snapshot.get("outputs", [])
                while emitted_outputs < len(outputs):
                    art = outputs[emitted_outputs]
                    yield _sse(
                        "output",
                        worker=art["worker"],
                        content=art["content"],
                        meta=art.get("meta", {}),
                        workspace_id=snapshot.get("workspace_id"),
                        task_run_id=snapshot.get("task_run_id") or task_run_id,
                    )
                    await runtime.append_task_run_event(
                        {
                            "tenant_id": req.tenant_id,
                            "workspace_id": req.workspace_id,
                            "task_run_id": task_run_id,
                            "event_type": "worker.output",
                            "event_source": "worker",
                            "trace_id": req.trace_id,
                            "payload": {
                                "worker": art["worker"],
                                "agent_run_id": art.get("meta", {}).get("agent_run_id"),
                                "chars": art.get("meta", {}).get("chars"),
                            },
                        }
                    )
                    emitted_outputs += 1

                nxt = snapshot.get("next_worker")
                if nxt and nxt != "FINALIZE":
                    yield _sse(
                        "status",
                        message=f"VEGA → {nxt}",
                        next=nxt,
                        workspace_id=snapshot.get("workspace_id"),
                        task_run_id=snapshot.get("task_run_id") or task_run_id,
                    )

            # Pull the final checkpointed state for the summary.
            final_state = await runtime.graph.aget_state(config)
            values = final_state.values if final_state else {}
            final_reply = values.get("final_reply", "")
            await runtime.update_task_run_status(
                task_run_id=task_run_id,
                status="completed",
                final_reply=final_reply,
                mark_completed=True,
            )
            await runtime.append_task_run_event(
                {
                    "tenant_id": req.tenant_id,
                    "workspace_id": req.workspace_id,
                    "task_run_id": task_run_id,
                    "event_type": "task.completed",
                    "event_source": "runtime",
                    "trace_id": req.trace_id,
                    "payload": {
                        "thread_id": thread_id,
                        "workers_run": values.get("completed", []),
                    },
                }
            )
            if final_reply:
                yield _sse(
                    "final",
                    message=final_reply,
                    workspace_id=values.get("workspace_id"),
                    task_run_id=values.get("task_run_id") or task_run_id,
                )

            yield _sse(
                "done",
                thread_id=thread_id,
                workspace_id=values.get("workspace_id"),
                task_run_id=values.get("task_run_id") or task_run_id,
                workers_run=values.get("completed", []),
            )

        except Exception as exc:
            await runtime.update_task_run_status(
                task_run_id=task_run_id,
                status="failed",
                error_message=str(exc),
                mark_completed=True,
            )
            await runtime.append_task_run_event(
                {
                    "tenant_id": req.tenant_id,
                    "workspace_id": req.workspace_id,
                    "task_run_id": task_run_id,
                    "event_type": "task.failed",
                    "event_source": "runtime",
                    "trace_id": req.trace_id,
                    "payload": {
                        "thread_id": thread_id,
                        "error": str(exc),
                    },
                }
            )
            yield _sse(
                "error",
                message=f"VEGA 执行失败：{exc}",
                workspace_id=req.workspace_id,
                task_run_id=task_run_id,
            )

    return EventSourceResponse(generate())


@router.get("/task/{thread_id}")
async def get_task(thread_id: str) -> dict[str, Any]:
    """Inspect a task's latest checkpointed state."""
    if runtime.graph is None:
        raise HTTPException(503, "VEGA runtime not initialized")

    config = {"configurable": {"thread_id": thread_id}}
    snap = await runtime.graph.aget_state(config)
    if not snap or not snap.values:
        raise HTTPException(404, f"Task {thread_id} not found")

    v = snap.values
    persisted = await runtime.get_task_run_by_thread_id(thread_id)
    return {
        "thread_id": thread_id,
        "task_run": persisted,
        "goal": v.get("goal"),
        "tenant_id": v.get("tenant_id"),
        "business_sector_id": v.get("business_sector_id"),
        "workspace_id": v.get("workspace_id"),
        "workspace_name": v.get("workspace_name"),
        "task_run_id": v.get("task_run_id"),
        "file_refs": v.get("file_refs", []),
        "memory_refs": v.get("memory_refs", []),
        "knowledge_refs": v.get("knowledge_refs", []),
        "billing_tags": v.get("billing_tags", {}),
        "completed": v.get("completed", []),
        "next_worker": v.get("next_worker"),
        "outputs": v.get("outputs", []),
        "final_reply": v.get("final_reply"),
    }


@router.get("/workers")
async def list_workers() -> dict[str, Any]:
    return {"workers": WORKER_REGISTRY}
