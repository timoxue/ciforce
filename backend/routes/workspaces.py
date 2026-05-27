"""Business sector and workspace API surface."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from workspace_store import workspace_store

router = APIRouter(tags=["workspaces"])


class BusinessSectorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    tenant_id: str = "default"
    slug: str | None = None
    description: str | None = None
    status: str = "active"
    sort_order: int = 0
    icon: str | None = None
    color: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)
    created_by: str | None = None


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    business_sector_id: str
    tenant_id: str | None = None
    slug: str | None = None
    description: str | None = None
    status: str = "active"
    canvas_state: dict[str, Any] = Field(default_factory=dict)
    settings: dict[str, Any] = Field(default_factory=dict)
    created_by: str | None = None


class WorkspaceCanvasUpdate(BaseModel):
    canvas_state: dict[str, Any] = Field(default_factory=dict)


@router.get("/api/business-sectors")
async def list_business_sectors(
    tenant_id: str = "default",
    include_archived: bool = False,
) -> dict[str, Any]:
    sectors = await workspace_store.list_business_sectors(
        tenant_id=tenant_id,
        include_archived=include_archived,
    )
    return {"business_sectors": sectors}


@router.post("/api/business-sectors", status_code=201)
async def create_business_sector(req: BusinessSectorCreate) -> dict[str, Any]:
    try:
        sector = await workspace_store.create_business_sector(req.model_dump())
    except Exception as exc:
        raise HTTPException(400, f"Failed to create business sector: {exc}") from exc
    return {"business_sector": sector}


@router.get("/api/business-sectors/{sector_id}/workspaces")
async def list_sector_workspaces(
    sector_id: str,
    tenant_id: str | None = None,
    include_archived: bool = False,
) -> dict[str, Any]:
    sector = await workspace_store.get_business_sector(sector_id)
    if sector is None:
        raise HTTPException(404, f"Business sector not found: {sector_id}")

    workspaces = await workspace_store.list_workspaces(
        business_sector_id=sector_id,
        tenant_id=tenant_id,
        include_archived=include_archived,
    )
    return {"business_sector": sector, "workspaces": workspaces}


@router.post("/api/workspaces", status_code=201)
async def create_workspace(req: WorkspaceCreate) -> dict[str, Any]:
    try:
        workspace = await workspace_store.create_workspace(req.model_dump())
    except LookupError as exc:
        raise HTTPException(404, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(400, f"Failed to create workspace: {exc}") from exc
    return {"workspace": workspace}


@router.get("/api/workspaces/{workspace_id}")
async def get_workspace(workspace_id: str) -> dict[str, Any]:
    workspace = await workspace_store.get_workspace(workspace_id)
    if workspace is None:
        raise HTTPException(404, f"Workspace not found: {workspace_id}")
    return {"workspace": workspace}


@router.patch("/api/workspaces/{workspace_id}/canvas")
async def update_workspace_canvas(
    workspace_id: str,
    req: WorkspaceCanvasUpdate,
) -> dict[str, Any]:
    workspace = await workspace_store.update_workspace_canvas(
        workspace_id=workspace_id,
        canvas_state=req.canvas_state,
    )
    if workspace is None:
        raise HTTPException(404, f"Workspace not found: {workspace_id}")
    return {"workspace": workspace}


@router.get("/api/workspaces/{workspace_id}/task-runs")
async def list_workspace_task_runs(
    workspace_id: str,
    limit: int = Query(default=50, ge=1, le=200),
) -> dict[str, Any]:
    workspace = await workspace_store.get_workspace(workspace_id)
    if workspace is None:
        raise HTTPException(404, f"Workspace not found: {workspace_id}")

    task_runs = await workspace_store.list_workspace_task_runs(
        workspace_id=workspace_id,
        limit=limit,
    )
    return {"workspace": workspace, "task_runs": task_runs}
