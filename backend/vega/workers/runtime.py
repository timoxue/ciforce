"""Shared execution runtime for text-based workers."""
from __future__ import annotations

import asyncio
import os
import time
from dataclasses import dataclass
from typing import Any, AsyncIterator

from llm_client import build_async_openai_client, llm_model
from ..state import TaskState, WorkerOutput


@dataclass(frozen=True)
class TextWorkerSpec:
    key: str
    agent_id: str
    name: str
    role: str
    description: str
    input_expectation: list[str]
    output_promise: list[str]
    unsupported_scenarios: list[str]
    system_prompt: str
    user_prompt_suffix: str
    search_enabled: bool = False
    max_sources: int = 8
    max_tokens: int = 3000
    temperature: float = 0.4
    start_message: str = "Task received"
    search_message: str = "Searching references"
    analyze_message: str = "Generating output"
    done_message: str = "Task completed"


def manifest_from_spec(spec: TextWorkerSpec) -> dict[str, Any]:
    return {
        "agent_id": spec.agent_id,
        "name": spec.name,
        "role": spec.role,
        "description": spec.description,
        "input_expectation": spec.input_expectation,
        "output_promise": spec.output_promise,
        "unsupported_scenarios": spec.unsupported_scenarios,
        "max_duration_minutes": 15,
        "cost_per_task": 15.0,
        "runtime": "text",
        "search_enabled": spec.search_enabled,
    }


def _client():
    return build_async_openai_client()


async def search_duckduckgo(query: str, max_results: int = 8) -> list[dict[str, Any]]:
    """Best-effort web search. Returns [] on any failure."""
    try:
        from ddgs import DDGS

        def _sync() -> list[dict[str, Any]]:
            with DDGS() as ddgs:
                return list(ddgs.text(query, max_results=max_results, backend="html"))

        loop = asyncio.get_event_loop()
        return await asyncio.wait_for(loop.run_in_executor(None, _sync), timeout=15)
    except Exception:
        return []


def _build_context(search_hits: list[dict[str, Any]]) -> str:
    if not search_hits:
        return "Note: no live web references were retrieved for this run.\n\n"

    blocks = []
    for idx, item in enumerate(search_hits, 1):
        blocks.append(
            f"[{idx}] {item.get('title', '')}\n"
            f"Source: {item.get('href', '')}\n"
            f"{item.get('body', '')}"
        )
    return "Reference materials:\n\n" + "\n\n---\n\n".join(blocks) + "\n\n"


def _truncate_text(value: str, limit: int = 280) -> str:
    normalized = " ".join(value.split())
    if len(normalized) <= limit:
        return normalized
    return normalized[: limit - 3] + "..."


def _format_ref_block(refs: list[dict[str, Any]], *, label: str, limit: int = 5) -> str:
    if not refs:
        return ""

    lines = [f"{label}:"]
    for idx, item in enumerate(refs[:limit], 1):
        title = item.get("title") or item.get("name") or item.get("id") or f"{label}-{idx}"
        summary = item.get("summary") or item.get("content") or item.get("uri") or ""
        line = f"- {title}"
        if summary:
            line += f": {_truncate_text(str(summary), 180)}"
        lines.append(line)
    if len(refs) > limit:
        lines.append(f"- ... and {len(refs) - limit} more")
    return "\n".join(lines) + "\n\n"


def build_state_context_block(state: TaskState) -> str:
    parts: list[str] = []

    if state.get("workspace_name") or state.get("workspace_id"):
        workspace_label = state.get("workspace_name") or state.get("workspace_id")
        parts.append(f"Workspace context:\n- Workspace: {workspace_label}")
        if state.get("business_sector_id"):
            parts[-1] += f"\n- Business sector id: {state['business_sector_id']}"
        if state.get("task_run_id"):
            parts[-1] += f"\n- Task run id: {state['task_run_id']}"
        parts[-1] += "\n"

    file_refs = state.get("file_refs", [])
    memory_refs = state.get("memory_refs", [])
    knowledge_refs = state.get("knowledge_refs", [])

    parts.append(_format_ref_block(file_refs, label="Workspace files"))
    parts.append(_format_ref_block(memory_refs, label="Workspace memory"))
    parts.append(_format_ref_block(knowledge_refs, label="Knowledge references"))

    return "".join(part for part in parts if part).strip()


async def stream_text_worker(
    spec: TextWorkerSpec,
    goal: str,
    *,
    max_sources: int | None = None,
    state_context: str | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """Run a text worker and emit normalized progress events."""
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key or "your-deepseek-key" in api_key:
        yield {"type": "error", "message": "Please configure OPENAI_API_KEY in backend/.env"}
        return

    yield {"type": "status", "message": f"{spec.name}: {spec.start_message}", "progress": 5}

    results: list[dict[str, Any]] = []
    limit = max_sources or spec.max_sources
    if spec.search_enabled:
        yield {"type": "status", "message": f"{spec.name}: {spec.search_message}", "progress": 20}
        results = await search_duckduckgo(goal, max_results=limit)
        for row in results:
            yield {
                "type": "source",
                "url": row.get("href", ""),
                "title": row.get("title", ""),
            }

    yield {"type": "status", "message": f"{spec.name}: {spec.analyze_message}", "progress": 55}

    context_block = _build_context(results)
    user_message = (
        f"Task goal:\n{goal}\n\n"
        f"{state_context + chr(10) + chr(10) if state_context else ''}"
        f"{context_block}"
        f"{spec.user_prompt_suffix}"
    )

    total_chars = 0
    content_parts: list[str] = []
    try:
        stream = await _client().chat.completions.create(
            model=llm_model(),
            messages=[
                {"role": "system", "content": spec.system_prompt},
                {"role": "user", "content": user_message},
            ],
            stream=True,
            max_tokens=spec.max_tokens,
            temperature=spec.temperature,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta.content or ""
            if not delta:
                continue
            total_chars += len(delta)
            content_parts.append(delta)
            yield {"type": "content", "content": delta}
    except Exception as exc:
        yield {"type": "error", "message": f"{spec.name} failed: {exc}"}
        return

    artifact: WorkerOutput = {
        "worker": spec.key,
        "content": "".join(content_parts),
        "meta": {
            "agent_id": spec.agent_id,
            "sources": [row.get("href", "") for row in results if row.get("href")],
            "search_hits": len(results),
            "chars": total_chars,
            "runtime": "text",
        },
    }
    yield {
        "type": "done",
        "message": spec.done_message,
        "progress": 100,
        "worker": spec.key,
        "artifact": artifact,
        "total_length": total_chars,
    }


async def run_text_worker(
    spec: TextWorkerSpec,
    goal: str,
    *,
    max_sources: int | None = None,
    state_context: str | None = None,
) -> WorkerOutput:
    artifact: WorkerOutput | None = None
    async for event in stream_text_worker(spec, goal, max_sources=max_sources, state_context=state_context):
        if event["type"] == "done":
            artifact = event["artifact"]
        if event["type"] == "error":
            raise RuntimeError(event["message"])
    if artifact is None:
        raise RuntimeError(f"{spec.key} produced no artifact")
    return artifact


async def run_stateful_text_worker(
    state: TaskState,
    spec: TextWorkerSpec,
    *,
    max_sources: int | None = None,
) -> dict[str, Any]:
    from ..graph import runtime as vega_runtime

    state_context = build_state_context_block(state)
    started = time.perf_counter()
    agent_run_id = await vega_runtime.create_agent_run(
        {
            "tenant_id": state.get("tenant_id"),
            "business_sector_id": state.get("business_sector_id"),
            "workspace_id": state.get("workspace_id"),
            "task_run_id": state.get("task_run_id"),
            "agent_key": spec.key,
            "run_role": "worker",
            "status": "running",
            "model_name": llm_model(),
            "model_provider": os.getenv("OPENAI_BASE_URL", "https://api.deepseek.com/v1"),
        }
    )
    await vega_runtime.append_task_run_event(
        {
            "tenant_id": state.get("tenant_id"),
            "workspace_id": state.get("workspace_id"),
            "task_run_id": state.get("task_run_id"),
            "agent_run_id": agent_run_id,
            "event_type": "agent.started",
            "event_source": "worker",
            "trace_id": state.get("trace_id"),
            "payload": {
                "agent_key": spec.key,
                "agent_name": spec.name,
                "workspace_id": state.get("workspace_id"),
                "task_run_id": state.get("task_run_id"),
            },
        }
    )
    try:
        artifact = await run_text_worker(
            spec,
            state["goal"],
            max_sources=max_sources,
            state_context=state_context,
        )
    except Exception as exc:
        duration_ms = int((time.perf_counter() - started) * 1000)
        await vega_runtime.update_agent_run(
            agent_run_id,
            {
                "status": "failed",
                "duration_ms": duration_ms,
                "error_type": "worker_error",
                "error_message": str(exc),
                "mark_completed": True,
            },
        )
        await vega_runtime.append_task_run_event(
            {
                "tenant_id": state.get("tenant_id"),
                "workspace_id": state.get("workspace_id"),
                "task_run_id": state.get("task_run_id"),
                "agent_run_id": agent_run_id,
                "event_type": "agent.failed",
                "event_source": "worker",
                "trace_id": state.get("trace_id"),
                "payload": {
                    "agent_key": spec.key,
                    "duration_ms": duration_ms,
                    "error": str(exc),
                },
            }
        )
        raise
    artifact["meta"].update(
        {
            "workspace_id": state.get("workspace_id"),
            "workspace_name": state.get("workspace_name"),
            "business_sector_id": state.get("business_sector_id"),
            "task_run_id": state.get("task_run_id"),
            "agent_run_id": agent_run_id,
            "file_ref_count": len(state.get("file_refs", [])),
            "memory_ref_count": len(state.get("memory_refs", [])),
            "knowledge_ref_count": len(state.get("knowledge_refs", [])),
        }
    )
    duration_ms = int((time.perf_counter() - started) * 1000)
    await vega_runtime.update_agent_run(
        agent_run_id,
        {
            "status": "completed",
            "output_tokens": artifact["meta"].get("chars", 0),
            "tool_call_count": 0,
            "duration_ms": duration_ms,
            "total_cost_usd": 0,
            "mark_completed": True,
        },
    )
    await vega_runtime.append_task_run_event(
        {
            "tenant_id": state.get("tenant_id"),
            "workspace_id": state.get("workspace_id"),
            "task_run_id": state.get("task_run_id"),
            "agent_run_id": agent_run_id,
            "event_type": "agent.completed",
            "event_source": "worker",
            "trace_id": state.get("trace_id"),
            "payload": {
                "agent_key": spec.key,
                "duration_ms": duration_ms,
                "output_chars": artifact["meta"].get("chars", 0),
                "search_hits": artifact["meta"].get("search_hits", 0),
            },
        }
    )
    return {
        "outputs": [*state.get("outputs", []), artifact],
        "completed": [*state.get("completed", []), spec.key],
        "messages": [
            {
                "role": "assistant",
                "name": spec.key,
                "content": (
                    f"[{spec.name}] completed with {artifact['meta']['chars']} chars"
                    f" for workspace {state.get('workspace_name') or state.get('workspace_id') or 'n/a'}"
                ),
            }
        ],
    }
