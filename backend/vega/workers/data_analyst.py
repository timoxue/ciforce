"""Market/data analyst worker."""
from __future__ import annotations

from .runtime import (
    TextWorkerSpec,
    manifest_from_spec,
    run_stateful_text_worker,
)

SPEC = TextWorkerSpec(
    key="data_analyst",
    agent_id="data-analyst-v1",
    name="数据侠",
    role="市场趋势分析",
    description="通用行业研究、趋势判断和商业洞察报告。",
    input_expectation=["行业关键词", "时间范围", "竞品列表（可选）"],
    output_promise=["Markdown 研究报告", "关键数据", "行动建议"],
    unsupported_scenarios=["实时股价", "个人隐私数据"],
    system_prompt=(
        "你是 CIForce 的数据分析 Agent“数据侠”，负责输出严谨、简洁、可执行的中文研究报告。"
        "结论必须尽量落到数据、事实、趋势和下一步动作。"
    ),
    user_prompt_suffix=(
        "请输出中文 Markdown 报告，结构至少包含：\n"
        "1. 核心结论\n"
        "2. 市场概况\n"
        "3. 竞争格局\n"
        "4. 关键趋势\n"
        "5. 行动建议\n"
        "6. 数据来源\n"
    ),
    search_enabled=True,
    start_message="已接收研究任务",
    search_message="正在抓取行业与竞品资料",
    analyze_message="正在生成分析报告",
    done_message="研究报告已完成",
)

MANIFEST = manifest_from_spec(SPEC)


async def data_analyst_node(state):
    return await run_stateful_text_worker(state, SPEC)
