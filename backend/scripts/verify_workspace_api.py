"""Smoke-test the workspace business APIs against a running backend."""
from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request


def request_json(method: str, url: str, payload: dict | None = None) -> dict:
    data = None
    headers = {"Content-Type": "application/json"}
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} failed: {exc.code} {body}") from exc


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    args = parser.parse_args()

    suffix = hex(int(time.time() * 1000))[-8:]
    base_url = args.base_url.rstrip("/")

    sector_resp = request_json(
        "POST",
        f"{base_url}/api/business-sectors",
        {
            "name": f"Smoke Sector {suffix}",
            "tenant_id": "smoke-tenant",
            "description": "Created by workspace API smoke test",
            "created_by": "smoke-user",
            "settings": {"mode": "smoke"},
        },
    )
    sector = sector_resp["business_sector"]

    workspace_resp = request_json(
        "POST",
        f"{base_url}/api/workspaces",
        {
            "name": f"Smoke Workspace {suffix}",
            "business_sector_id": sector["id"],
            "description": "Created by workspace API smoke test",
            "created_by": "smoke-user",
            "canvas_state": {"nodes": [], "edges": [], "viewport": {"x": 0, "y": 0, "zoom": 1}},
            "settings": {"mode": "smoke"},
        },
    )
    workspace = workspace_resp["workspace"]

    canvas_resp = request_json(
        "PATCH",
        f"{base_url}/api/workspaces/{workspace['id']}/canvas",
        {
            "canvas_state": {
                "nodes": [{"id": "agent-data-analyst", "type": "agent"}],
                "edges": [],
                "viewport": {"x": 10, "y": 20, "zoom": 0.9},
            }
        },
    )

    sector_workspaces = request_json(
        "GET",
        f"{base_url}/api/business-sectors/{sector['id']}/workspaces?tenant_id=smoke-tenant",
    )
    task_runs = request_json("GET", f"{base_url}/api/workspaces/{workspace['id']}/task-runs")

    print(
        json.dumps(
            {
                "ok": True,
                "business_sector": sector,
                "workspace": canvas_resp["workspace"],
                "sector_workspace_count": len(sector_workspaces["workspaces"]),
                "task_run_count": len(task_runs["task_runs"]),
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
