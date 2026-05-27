# backend/routes/presales.py
"""
ARIA 售前智能体后端路由
  POST /api/presales/chat    — SSE streaming，转发给 DeepSeek with function calling
  GET  /api/marketplace/match — 搜索 mock 人才市场
  POST /api/requirements      — 创建需求单
  GET  /api/requirements      — 获取所有需求单
"""
import json
import os
import uuid
from datetime import datetime
from typing import Annotated, Any

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from llm_client import build_async_openai_client, llm_model

router = APIRouter()

def get_client():
    return build_async_openai_client()

# ── In-memory store for requirements (MVP) ───────────────────────────────────

_requirements: list[dict] = []

# ── Mock marketplace data ────────────────────────────────────────────────────

MOCK_AGENTS = [
    {"id": "agent-1",  "name": "小王", "role": "社交媒体文案", "category": "电商营销", "roi": "850%", "price": "￥0.05/篇", "rating": 4.9, "description": "擅长抓住网络热点，生产极具传播力的文案。", "tags": ["电商", "内容", "爆款"]},
    {"id": "agent-2",  "name": "小陈", "role": "短视频剪辑",   "category": "短视频",   "roi": "620%", "price": "￥2.0/个",  "rating": 4.7, "description": "高效完成视频剪辑与后期处理，节奏感极强。", "tags": ["视频", "节奏感"]},
    {"id": "agent-3",  "name": "数据侠", "role": "市场趋势分析", "category": "数据挖掘", "roi": "420%", "price": "￥5.0/报",  "rating": 4.8, "description": "深度挖掘行业数据，生成可执行洞察报告。", "tags": ["数据", "分析"]},
    {"id": "agent-4",  "name": "译境",  "role": "多语言本地化",  "category": "多语言",   "roi": "380%", "price": "￥0.1/字", "rating": 4.6, "description": "支持 12 种语言的高质量翻译和本地化。", "tags": ["翻译", "多语言", "跨境"]},
    {"id": "agent-5",  "name": "客服星", "role": "智能客服",     "category": "客户服务", "roi": "510%", "price": "￥199/月", "rating": 4.8, "description": "7×24 小时自动处理客户咨询，支持多渠道。", "tags": ["客服", "自动化", "多渠道"]},
    {"id": "agent-6",  "name": "设计院", "role": "视觉素材生成", "category": "创意设计", "roi": "290%", "price": "￥3.0/张", "rating": 4.5, "description": "快速生成符合品牌调性的营销视觉素材。", "tags": ["设计", "品牌", "视觉"]},
    {"id": "agent-7",  "name": "办公精", "role": "文档自动化",   "category": "办公自动化","roi": "340%", "price": "￥99/月",  "rating": 4.6, "description": "自动生成报告、合同、会议纪要等办公文档。", "tags": ["文档", "自动化", "办公"]},
    {"id": "agent-8",  "name": "跨境通", "role": "跨境电商全案", "category": "电商营销", "roi": "720%", "price": "￥499/月", "rating": 4.9, "description": "一站式跨境电商运营：选品+文案+客服+物流。", "tags": ["跨境", "电商", "多语言", "客服"]},
]

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "电商营销": ["电商", "营销", "文案", "转化", "促销", "产品描述"],
    "短视频":   ["视频", "剪辑", "抖音", "短视频", "直播"],
    "数据挖掘": ["数据", "分析", "报告", "洞察", "市场"],
    "创意设计": ["设计", "视觉", "图片", "品牌", "素材"],
    "客户服务": ["客服", "售后", "咨询", "回复", "用户"],
    "办公自动化":["文档", "办公", "报告", "自动化", "会议"],
    "多语言":   ["翻译", "多语言", "本地化", "出海", "跨境", "英语", "日语"],
}

def match_agents(keywords: list[str], category: str | None, budget_max: float | None) -> list[dict]:
    scored: list[tuple[int, dict]] = []
    kw_lower = [k.lower() for k in keywords]

    for agent in MOCK_AGENTS:
        score = 0
        agent_text = " ".join(agent["tags"] + [agent["role"], agent["description"]]).lower()
        for kw in kw_lower:
            if kw in agent_text:
                score += 2
        for cat, cat_kws in CATEGORY_KEYWORDS.items():
            for kw in kw_lower:
                if kw in cat_kws and agent["category"] == cat:
                    score += 3
        if category and agent["category"] == category:
            score += 5
        if budget_max is not None:
            price_str = agent["price"].replace("￥", "").split("/")[0]
            try:
                price_val = float(price_str)
                if price_val > budget_max:
                    score = 0
            except ValueError:
                pass

        if score > 0:
            scored.append((score, agent))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [a for _, a in scored[:3]]

# ── Models ────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    messages: list[dict[str, Any]]
    tools: list[dict[str, Any]] | None = None

class RequirementCreate(BaseModel):
    title: str
    draft: dict[str, Any]
    conversationSummary: str
    createdAt: str

# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/api/presales/chat")
async def presales_chat(req: ChatRequest):
    """SSE streaming：转发给 DeepSeek with function calling"""
    client = get_client()

    async def generate():
        model = llm_model()
        kwargs: dict[str, Any] = {
            "model": model,
            "messages": req.messages,
            "stream": True,
            "max_tokens": 2048,
            "temperature": 0.7,
        }
        if req.tools:
            kwargs["tools"] = req.tools
            kwargs["tool_choice"] = "auto"

        async with client.chat.completions.stream(**kwargs) as stream:
            async for chunk in stream:
                yield f"data: {chunk.model_dump_json()}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/api/marketplace/match")
async def marketplace_match(q: list[str] = Query(default=[]), category: str | None = None, budget: float | None = None):
    """搜索人才市场，返回匹配的智能体列表"""
    import logging
    logging.info(f"marketplace_match called with q={q!r} category={category!r}")
    results = match_agents(q, category, budget)
    return {"matches": results, "total": len(results), "debug_q": q}


@router.post("/api/requirements")
async def create_requirement(req: RequirementCreate):
    """创建待招募需求单，分配数字工位号"""
    position_number = f"POS-{len(_requirements) + 1:04d}"
    record = {
        "id": str(uuid.uuid4()),
        "positionNumber": position_number,
        "title": req.title,
        "draft": req.draft,
        "conversationSummary": req.conversationSummary,
        "createdAt": req.createdAt or datetime.utcnow().isoformat(),
        "status": "open",
    }
    _requirements.append(record)
    return record


@router.get("/api/requirements")
async def list_requirements():
    """返回所有待招募需求单（后台管理用）"""
    return {"requirements": _requirements, "total": len(_requirements)}
