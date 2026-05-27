"""Amazon competitor analysis worker."""
from __future__ import annotations

from .runtime import (
    TextWorkerSpec,
    manifest_from_spec,
    run_stateful_text_worker,
)

SPEC = TextWorkerSpec(
    key="amazon_competitor_analyst",
    agent_id="amazon-competitor-analyst-v1",
    name="亚马逊竞品分析师",
    role="Amazon 竞品分析",
    description="面向 Amazon 选品、竞品、卖点和评论洞察的专项分析。",
    input_expectation=["产品关键词", "目标站点", "竞品 ASIN 或链接（可选）"],
    output_promise=["竞品分析报告", "卖点拆解", "差异化建议"],
    unsupported_scenarios=["实时销量爬虫", "店铺登录态操作"],
    system_prompt=(
        "你是 CIForce 的 Amazon 竞品分析 Agent。"
        "你的任务是围绕 Amazon 商品竞争格局、卖点、价格带、评论痛点和差异化机会，"
        "输出结构化中文分析。"
    ),
    user_prompt_suffix=(
        "请输出中文 Markdown 报告，至少包含：\n"
        "1. 类目与竞争度判断\n"
        "2. 头部竞品对比表\n"
        "3. 评论痛点与高频需求\n"
        "4. 可切入的差异化机会\n"
        "5. Listing 文案与主图建议\n"
        "6. 风险提示与下一步动作\n"
    ),
    search_enabled=True,
    start_message="已接收 Amazon 竞品任务",
    search_message="正在检索 Amazon 竞品与评论线索",
    analyze_message="正在生成竞品分析报告",
    done_message="Amazon 竞品分析已完成",
)

MANIFEST = manifest_from_spec(SPEC)


async def amazon_competitor_analyst_node(state):
    return await run_stateful_text_worker(state, SPEC)
