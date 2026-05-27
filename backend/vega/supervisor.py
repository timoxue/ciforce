"""VEGA supervisor that routes goals to registered workers."""
from __future__ import annotations

import json
import os
import re
from typing import Any

from llm_client import build_async_openai_client, llm_model
from .registry import WORKER_MANIFESTS
from .state import TaskState

ROUTER_SYSTEM = """你是 VEGA，CIForce 的数字 COO。
你只负责调度，不亲自执行任务。

可用 Worker：
{worker_table}

规则：
- 如果任务还没交给任何 Worker，请挑选最适合的一个。
- 如果已有 Worker 产出已经足够回答目标，可输出 FINALIZE。
- 严格只输出 JSON：{{"next":"<worker_id|FINALIZE>","reason":"<一句话>"}}"""

WORKER_REGISTRY = WORKER_MANIFESTS

_JSON_RE = re.compile(r"\{.*\}", re.S)


def _client():
    return build_async_openai_client()


def _worker_table() -> str:
    lines = []
    for worker_id, manifest in WORKER_REGISTRY.items():
        lines.append(
            f"- {worker_id} ({manifest['name']}, {manifest['role']}): "
            f"输入={manifest['input_expectation']}，输出={manifest['output_promise']}"
        )
    return "\n".join(lines)


def _keyword_route(goal: str) -> str:
    goal_lc = goal.lower()
    if "amazon" in goal_lc or "亚马逊" in goal or "asin" in goal_lc:
        return "amazon_competitor_analyst"
    if "分镜" in goal or "storyboard" in goal_lc or "脚本" in goal:
        return "video_storyboard"
    return "data_analyst"


def _fallback_route(state: TaskState) -> dict[str, str]:
    completed = set(state.get("completed", []))
    candidate = _keyword_route(state.get("goal", ""))
    if candidate not in completed:
        return {"next": candidate, "reason": f"fallback: route to {candidate}"}

    for worker_id in WORKER_REGISTRY:
        if worker_id not in completed:
            return {"next": worker_id, "reason": f"fallback: try {worker_id}"}
    return {"next": "FINALIZE", "reason": "fallback: all workers ran"}


async def vega_supervisor(state: TaskState) -> dict[str, Any]:
    completed = state.get("completed", [])
    outputs = state.get("outputs", [])

    if state.get("next_worker") == "FINALIZE":
        return {}

    if completed and all(worker in completed for worker in WORKER_REGISTRY):
        final = await _summarize(state)
        return {
            "next_worker": "FINALIZE",
            "final_reply": final,
            "messages": [{"role": "assistant", "name": "vega", "content": final}],
        }

    user_payload = {
        "goal": state["goal"],
        "business_sector_id": state.get("business_sector_id"),
        "workspace_id": state.get("workspace_id"),
        "workspace_name": state.get("workspace_name"),
        "task_run_id": state.get("task_run_id"),
        "file_ref_count": len(state.get("file_refs", [])),
        "memory_ref_count": len(state.get("memory_refs", [])),
        "knowledge_ref_count": len(state.get("knowledge_refs", [])),
        "completed": completed,
        "latest_output_preview": outputs[-1]["content"][:300] if outputs else None,
    }
    try:
        resp = await _client().chat.completions.create(
            model=llm_model(),
            messages=[
                {"role": "system", "content": ROUTER_SYSTEM.format(worker_table=_worker_table())},
                {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
            ],
            temperature=0.2,
            max_tokens=200,
            stream=False,
        )
        raw = resp.choices[0].message.content or ""
        match = _JSON_RE.search(raw)
        decision = json.loads(match.group(0)) if match else _fallback_route(state)
    except Exception:
        decision = _fallback_route(state)

    nxt = decision.get("next", "FINALIZE")
    if nxt not in WORKER_REGISTRY and nxt != "FINALIZE":
        nxt = "FINALIZE"

    update: dict[str, Any] = {
        "next_worker": nxt,
        "messages": [
            {
                "role": "assistant",
                "name": "vega",
                "content": f"[VEGA] -> {nxt} | {decision.get('reason', '')}",
            }
        ],
    }
    if nxt == "FINALIZE":
        update["final_reply"] = await _summarize(state)
        update["messages"][0]["content"] = update["final_reply"]
    return update


async def _summarize(state: TaskState) -> str:
    outputs = state.get("outputs", [])
    if not outputs:
        return "Boss，本次任务还没有可用产出，请补充更具体的目标。"

    artifacts = "\n\n".join(
        f"### {item['worker']} output\n{item['content']}" for item in outputs
    )
    try:
        resp = await _client().chat.completions.create(
            model=llm_model(),
            messages=[
                {
                    "role": "system",
                    "content": (
                        "你是 VEGA。请基于 Worker 产出向 Boss 汇报："
                        "先给一句话总结，再给 3 条关键发现，最后给下一步建议。"
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Goal:\n{state['goal']}\n\n"
                        f"Workspace:\n"
                        f"- workspace_id: {state.get('workspace_id')}\n"
                        f"- workspace_name: {state.get('workspace_name')}\n"
                        f"- business_sector_id: {state.get('business_sector_id')}\n"
                        f"- task_run_id: {state.get('task_run_id')}\n\n"
                        f"{artifacts}\n\n请开始汇报。"
                    ),
                },
            ],
            temperature=0.5,
            max_tokens=600,
            stream=False,
        )
        return resp.choices[0].message.content or ""
    except Exception as exc:
        return f"Boss，Worker 已经产出结果，但 VEGA 汇总失败：{exc}"


def route_from_supervisor(state: TaskState) -> str:
    nxt = state.get("next_worker")
    if nxt and nxt in WORKER_REGISTRY:
        return nxt
    return "__end__"
