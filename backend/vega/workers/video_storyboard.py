"""Video storyboard worker."""
from __future__ import annotations

from .runtime import (
    TextWorkerSpec,
    manifest_from_spec,
    run_stateful_text_worker,
)

SPEC = TextWorkerSpec(
    key="video_storyboard",
    agent_id="video-storyboard-v1",
    name="视频分镜导演",
    role="短视频分镜与脚本",
    description="将营销目标转成短视频脚本、分镜、镜头节奏和 CTA 方案。",
    input_expectation=["产品或主题", "目标平台", "时长", "风格要求（可选）"],
    output_promise=["分镜脚本", "镜头表", "字幕与 CTA 建议"],
    unsupported_scenarios=["成片剪辑", "真人拍摄执行"],
    system_prompt=(
        "你是 CIForce 的视频分镜 Agent。"
        "你擅长把商业需求拆成适合短视频平台的脚本与镜头语言，"
        "输出必须直接可拍、可剪、可交给视频团队执行。"
    ),
    user_prompt_suffix=(
        "请输出中文 Markdown，至少包含：\n"
        "1. 视频定位与核心钩子\n"
        "2. 分镜表（镜头号/时长/画面/旁白/字幕/转场）\n"
        "3. 节奏建议\n"
        "4. 拍摄注意事项\n"
        "5. CTA 与封面标题建议\n"
    ),
    search_enabled=False,
    start_message="已接收视频分镜任务",
    analyze_message="正在生成分镜脚本",
    done_message="视频分镜已完成",
)

MANIFEST = manifest_from_spec(SPEC)


async def video_storyboard_node(state):
    return await run_stateful_text_worker(state, SPEC)
