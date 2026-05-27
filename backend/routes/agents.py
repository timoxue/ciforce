"""
External Agent adapters — wraps third-party AI services as CIForce agents.

Currently:
  POST /api/agents/product-shot/run
      → DashScope `wanx-background-generation-v2`
      → SSE stream with status / source / output(image url) / done / error

DashScope async task lifecycle (per Aliyun docs):
  1. POST /api/v1/services/aigc/background-generation/generation
       header: X-DashScope-Async: enable
       body:   { model, input: { ref_image_url, prompt, ... }, parameters: { n } }
       → { output: { task_id, task_status: "PENDING" } }
  2. Poll GET /api/v1/tasks/{task_id} until task_status in ("SUCCEEDED", "FAILED")
       → on success: output.results = [{ url: "https://..." }, ...]
"""
from __future__ import annotations

import asyncio
import base64
import io
import json
import os
import time
import uuid
from pathlib import Path
from typing import Any, AsyncIterator

import httpx
import oss2
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from vega.registry import TEXT_WORKER_SPECS, WORKER_MANIFESTS
from vega.workers.runtime import stream_text_worker

router = APIRouter(prefix="/api/agents", tags=["agents"])

DASHSCOPE_BASE = "https://dashscope.aliyuncs.com"
SUBMIT_URL = f"{DASHSCOPE_BASE}/api/v1/services/aigc/background-generation/generation/"
TASK_URL_TMPL = f"{DASHSCOPE_BASE}/api/v1/tasks/{{task_id}}"
MODEL = "wanx-background-generation-v2"
MODEL_VERSION = "v3"

# Where uploaded refs live locally (kept as a debug breadcrumb; the actual
# image DashScope reads is the one we push to Aliyun OSS).
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "data" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ── helpers ──────────────────────────────────────────────────────────────────

def _sse(type_: str, **kwargs) -> str:
    return json.dumps({"type": type_, **kwargs}, ensure_ascii=False)


def _api_key() -> str:
    k = os.getenv("DASHSCOPE_API_KEY", "")
    if not k:
        raise HTTPException(500, "DASHSCOPE_API_KEY not set in backend/.env")
    return k


def _scene_suffix(scene: str) -> str:
    """Map UI scene id → extra prompt phrase. Keeps the user prompt clean."""
    return {
        "studio":    "柔光摄影棚，米色背景，自然阴影，杂志级商品摄影",
        "lifestyle": "生活方式场景，自然光，温暖氛围",
        "nature":    "户外自然光，蓝天/绿植背景，清新质感",
        "minimal":   "极简白色背景，超清晰商品摄影",
        "festive":   "节日氛围，彩色装饰，喜庆色调",
    }.get(scene, "")


def _ratio_size(ratio: str) -> str:
    """Kept for log messages only (background-generation v2 doesn't take size)."""
    return {
        "1:1":  "1024×1024",
        "4:5":  "1024×1280",
        "16:9": "1280×720",
        "9:16": "720×1280",
    }.get(ratio, "1024×1024")


def _decode_b64(image_b64: str) -> bytes:
    """Accept dataURL or raw base64; return decoded bytes."""
    if "," in image_b64:
        image_b64 = image_b64.split(",", 1)[1]
    return base64.b64decode(image_b64)


_rembg_session = None  # lazy: only built on first request, ~170MB model

def _remove_background(data: bytes) -> bytes:
    """Cut out the product from any input image; return RGBA PNG bytes
    where pixels outside the subject are transparent.

    DashScope `wanx-background-generation-v2` infers the subject from the
    alpha channel, so without this step it sees a fully-opaque image and
    can't tell what to keep vs. replace.
    """
    global _rembg_session
    try:
        from rembg import remove, new_session
        if _rembg_session is None:
            # u2net is the default; u2netp is smaller/faster, isnet-anime exists
            # for stylized art. u2net works well for product shots.
            _rembg_session = new_session("u2net")
        return remove(data, session=_rembg_session)
    except Exception:
        # Fall through: at least force RGBA so DashScope doesn't reject for shape
        return data


def _ensure_rgba_png(data: bytes) -> tuple[bytes, str]:
    """Ensure the image is a 4-channel RGBA PNG. Used as a backstop after
    rembg has already produced an RGBA buffer."""
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(data))
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        out = io.BytesIO()
        img.save(out, format="PNG")
        return out.getvalue(), "png"
    except Exception:
        return data, "png"


def _guess_ext(data: bytes) -> str:
    """Tiny magic-byte sniff so we set the right content-type."""
    if data.startswith(b"\x89PNG"):           return "png"
    if data.startswith(b"\xff\xd8\xff"):       return "jpg"
    if data.startswith(b"GIF8"):              return "gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP": return "webp"
    return "png"


_oss_bucket_cache: oss2.Bucket | None = None

def _oss_bucket() -> oss2.Bucket:
    global _oss_bucket_cache
    if _oss_bucket_cache is not None:
        return _oss_bucket_cache
    ak = os.getenv("OSS_ACCESS_KEY_ID", "")
    sk = os.getenv("OSS_ACCESS_KEY_SECRET", "")
    endpoint = os.getenv("OSS_ENDPOINT", "")
    bucket = os.getenv("OSS_BUCKET", "")
    if not all([ak, sk, endpoint, bucket]):
        raise HTTPException(500, "OSS_* env vars missing in backend/.env")
    # Endpoint must be a full URL for oss2
    if not endpoint.startswith("http"):
        endpoint = f"https://{endpoint}"
    _oss_bucket_cache = oss2.Bucket(oss2.Auth(ak, sk), endpoint, bucket)
    return _oss_bucket_cache


def _upload_to_oss(image_b64: str) -> str:
    """Decode → rembg (remove background) → ensure RGBA PNG → push to OSS,
    return public HTTPS URL."""
    raw = _decode_b64(image_b64)
    cut = _remove_background(raw)
    data, ext = _ensure_rgba_png(cut)
    key = f"ciforce/uploads/{uuid.uuid4().hex}.{ext}"
    bucket = _oss_bucket()
    bucket.put_object(key, data, headers={"Content-Type": "image/png"})
    try:
        (UPLOAD_DIR / Path(key).name).write_bytes(data)
    except Exception:
        pass
    endpoint = os.getenv("OSS_ENDPOINT", "")
    endpoint_host = endpoint.replace("https://", "").replace("http://", "").rstrip("/")
    bucket_name = os.getenv("OSS_BUCKET", "")
    return f"https://{bucket_name}.{endpoint_host}/{key}"


def mount_static(_app) -> None:
    """Kept for backward compat with main.py; now a no-op since DashScope
    reads from Aliyun OSS rather than this server."""
    return


# ── request / response models ────────────────────────────────────────────────

class ProductShotRequest(BaseModel):
    image_base64: str           # dataURL or raw base64 — required (this is image-edit, not t2i)
    prompt: str
    scene: str = "studio"
    ratio: str = "1:1"
    variants: int = 1
    public_origin: str | None = None


class TextAgentRunRequest(BaseModel):
    goal: str
    max_sources: int | None = None


@router.get("/catalog")
async def agent_catalog() -> dict[str, Any]:
    text_agents = [{"key": key, **manifest} for key, manifest in WORKER_MANIFESTS.items()]
    return {
        "agents": [
            *text_agents,
            {
                "key": "product-shot",
                "agent_id": "product-shot-v1",
                "name": "商品图场景生成",
                "role": "图像背景生成",
                "description": "商品图抠图、换背景和多场景变体生成。",
                "runtime": "image",
            },
        ]
    }


# ── route ────────────────────────────────────────────────────────────────────

@router.post("/product-shot/run")
async def product_shot_run(req: ProductShotRequest):
    """Stream SSE events through a DashScope wanx-background-generation-v2 task.

    Wraps the product image and a scene prompt; DashScope keeps the product
    intact and re-paints the background.
    """
    api_key = _api_key()

    async def generate() -> AsyncIterator[str]:
        try:
            yield _sse("info", text=f"接收任务 · 模型={MODEL}/{MODEL_VERSION} · 场景={req.scene} · 数量={req.variants}")

            # 1) Push uploaded image to Aliyun OSS (public-read) so DashScope can fetch it.
            if not req.image_base64:
                yield _sse("error", text="缺少商品图（background-generation 需要参考图）")
                return

            yield _sse("work", text="抠除原背景中…（首次运行会下载 ~170MB 模型，请稍候）")
            try:
                # Run blocking rembg + OSS put on a thread so SSE stays responsive.
                ref_url = await asyncio.to_thread(_upload_to_oss, req.image_base64)
            except HTTPException as exc:
                yield _sse("error", text=str(exc.detail))
                return
            except Exception as exc:
                yield _sse("error", text=f"抠图/上传失败：{exc}")
                return

            yield _sse("work", text=f"透明底素材已就绪：{ref_url.rsplit('/', 1)[1]}")

            # 2) Submit the async task.
            full_prompt = (req.prompt + " · " + _scene_suffix(req.scene)).strip(" ·")
            yield _sse("work", text=f"prompt: {full_prompt[:80]}{'…' if len(full_prompt) > 80 else ''}")

            submit_body = {
                "model": MODEL,
                "input": {
                    "base_image_url": ref_url,
                    "ref_prompt": full_prompt,
                },
                "parameters": {
                    "n": max(1, min(req.variants, 4)),
                    "ref_prompt_weight": 0.5,
                    "model_version": MODEL_VERSION,
                },
            }
            headers = {
                "Authorization": f"Bearer {api_key}",
                "X-DashScope-Async": "enable",
                "Content-Type": "application/json",
            }

            yield _sse("work", text=f"调用 {MODEL} · {_ratio_size(req.ratio)}")

            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(SUBMIT_URL, headers=headers, json=submit_body)
                if resp.status_code >= 400:
                    yield _sse("error", text=f"提交失败 ({resp.status_code}): {resp.text[:400]}")
                    return
                payload = resp.json()

                task_id = payload.get("output", {}).get("task_id")
                if not task_id:
                    yield _sse("error", text=f"未拿到 task_id：{payload}")
                    return
                yield _sse("work", text=f"任务已提交 · id={task_id[:12]}…")

                # 3) Poll until done.
                poll_headers = {"Authorization": f"Bearer {api_key}"}
                deadline = time.time() + 180
                last_status = ""
                while True:
                    if time.time() > deadline:
                        yield _sse("error", text="任务超时（>180s）")
                        return
                    await asyncio.sleep(3.5)
                    r = await client.get(TASK_URL_TMPL.format(task_id=task_id),
                                         headers=poll_headers)
                    if r.status_code >= 400:
                        yield _sse("error", text=f"轮询失败 ({r.status_code}): {r.text[:400]}")
                        return
                    body = r.json()
                    status = body.get("output", {}).get("task_status", "UNKNOWN")
                    if status != last_status:
                        yield _sse("work", text=f"任务状态：{status}")
                        last_status = status
                    if status == "SUCCEEDED":
                        results = body.get("output", {}).get("results", []) or []
                        urls = [r.get("url") for r in results if r.get("url")]
                        if not urls:
                            yield _sse("error", text=f"任务成功但 results 为空：{body}")
                            return
                        yield _sse("ok", text=f"完成 · {len(urls)} 张")
                        yield _sse("done", images=urls, prompt=full_prompt)
                        return
                    if status in ("FAILED", "UNKNOWN"):
                        msg = body.get("output", {}).get("message", body)
                        yield _sse("error", text=f"任务失败：{msg}")
                        return

        except httpx.HTTPError as exc:
            yield _sse("error", text=f"网络错误：{exc}")
        except Exception as exc:
            yield _sse("error", text=f"未处理异常：{exc}")

    return EventSourceResponse(generate())


@router.post("/{agent_key}/run")
async def run_text_agent(agent_key: str, req: TextAgentRunRequest):
    spec = TEXT_WORKER_SPECS.get(agent_key)
    if spec is None:
        raise HTTPException(404, f"Unknown text agent: {agent_key}")

    async def generate() -> AsyncIterator[str]:
        async for event in stream_text_worker(spec, req.goal, max_sources=req.max_sources):
            payload = {k: v for k, v in event.items() if k not in {"artifact", "type"}}
            yield _sse(event["type"], **payload)

    return EventSourceResponse(generate())


@router.get("/product-shot/health")
async def product_shot_health() -> dict[str, Any]:
    return {
        "key_set": bool(os.getenv("DASHSCOPE_API_KEY")),
        "model": MODEL,
        "model_version": MODEL_VERSION,
        "endpoint": SUBMIT_URL,
        "upload_dir": str(UPLOAD_DIR),
    }
