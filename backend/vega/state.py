"""
TaskState — the shared blackboard that flows through the LangGraph.

Worker nodes read `goal` / prior outputs, append to `messages` and `outputs`,
then return control to VEGA who decides the next step.
"""
from __future__ import annotations

from typing import Annotated, Any, Literal, TypedDict

from langgraph.graph.message import add_messages


WorkerName = str
"""Worker ids are registered dynamically in ``vega.registry``."""


class ContextRef(TypedDict, total=False):
    id: str
    title: str
    name: str
    kind: str
    uri: str
    content: str
    summary: str
    meta: dict[str, Any]


class WorkerOutput(TypedDict):
    worker: str          # which worker produced this
    content: str         # final textual artifact (markdown report, copy, etc.)
    meta: dict[str, Any] # sources, tokens, duration, etc.


class TaskState(TypedDict, total=False):
    # ── Inputs ──────────────────────────────────────────────────────────────
    goal: str
    """Boss's natural-language goal. Set once when the graph starts."""

    user_id: str | None
    tenant_id: str | None
    business_sector_id: str | None
    workspace_id: str | None
    workspace_name: str | None
    task_run_id: str | None
    thread_id: str | None
    file_refs: list[ContextRef]
    memory_refs: list[ContextRef]
    knowledge_refs: list[ContextRef]
    billing_tags: dict[str, str]
    trace_id: str | None
    request_tags: dict[str, str]

    # ── Conversation log (LangGraph reducer auto-appends) ───────────────────
    messages: Annotated[list[dict], add_messages]

    # ── Execution trace ─────────────────────────────────────────────────────
    plan: list[str]
    """VEGA's decomposition into ordered worker calls."""

    completed: list[str]
    """Worker names that have produced output this run."""

    next_worker: WorkerName | Literal["FINALIZE"] | None
    """Set by the supervisor; read by the conditional edge."""

    outputs: list[WorkerOutput]
    """Append-only list of worker artifacts."""

    final_reply: str
    """VEGA's summary back to Boss after FINALIZE."""
