"""CIForce backend entrypoint."""
from __future__ import annotations

import json
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from auth import init_db as init_auth_db
from auth import router as auth_router
from routes.agents import mount_static, router as agents_router
from routes.presales import router as presales_router
from routes.vega import router as vega_router
from routes.workspaces import router as workspaces_router
from vega.graph import runtime as vega_runtime
from vega.registry import TEXT_WORKER_SPECS
from vega.workers.runtime import stream_text_worker
from workspace_store import workspace_store

load_dotenv(override=False)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_auth_db()
    await workspace_store.setup()
    await vega_runtime.setup()
    print(f"  VEGA   : LangGraph ready ({vega_runtime.db_path})")
    print(f"  Workers: {', '.join(vega_runtime.workers)}")
    print("  Workspace: postgres store ready")
    print("  Auth   : file store ready")
    try:
        yield
    finally:
        await vega_runtime.teardown()
        await workspace_store.teardown()


app = FastAPI(title="CIForce API", version="0.3.0", lifespan=lifespan)

origins = os.getenv("CORS_ORIGINS", "http://localhost:3003").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(presales_router)
app.include_router(vega_router)
app.include_router(agents_router)
app.include_router(workspaces_router)
app.include_router(auth_router)
mount_static(app)


class ResearchRequest(BaseModel):
    query: str
    agent_id: str = "data-analyst-v1"
    max_sources: int = 8


def _sse(type_: str, **kwargs) -> str:
    return json.dumps({"type": type_, **kwargs}, ensure_ascii=False)


@app.post("/api/research")
async def research(req: ResearchRequest):
    """Legacy alias for the unified data_analyst agent runtime."""
    spec = TEXT_WORKER_SPECS["data_analyst"]

    async def generate():
        async for event in stream_text_worker(spec, req.query, max_sources=req.max_sources):
            payload = {k: v for k, v in event.items() if k not in {"artifact", "type"}}
            yield _sse(event["type"], **payload)

    return EventSourceResponse(generate())


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "llm": os.getenv("SMART_LLM_MODEL", "deepseek-chat"),
        "base_url": os.getenv("OPENAI_BASE_URL", "https://api.deepseek.com/v1"),
        "retriever": "duckduckgo",
        "api_key_set": bool(os.getenv("OPENAI_API_KEY")),
        "vega": {
            "ready": vega_runtime.graph is not None,
            "workers": vega_runtime.workers,
            "metadata_store": os.getenv("VEGA_RUNTIME_STORE", "sqlite"),
            "checkpoint": vega_runtime.db_path,
        },
    }


@app.get("/")
async def root():
    return {"name": "CIForce API", "version": "0.3.0", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    print(f"\nCIForce Backend  http://localhost:{port}")
    print(f"  LLM    : {os.getenv('SMART_LLM_MODEL', 'deepseek-chat')}")
    print(f"  Search : duckduckgo (best effort)")
    print(f"  Docs   : http://localhost:{port}/docs\n")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
