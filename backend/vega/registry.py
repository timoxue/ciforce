"""Central worker registry used by VEGA and direct agent routes."""
from __future__ import annotations

from typing import Any

from .workers.amazon_competitor_analyst import (
    MANIFEST as AMAZON_COMPETITOR_ANALYST_MANIFEST,
    SPEC as AMAZON_COMPETITOR_ANALYST_SPEC,
    amazon_competitor_analyst_node,
)
from .workers.data_analyst import (
    MANIFEST as DATA_ANALYST_MANIFEST,
    SPEC as DATA_ANALYST_SPEC,
    data_analyst_node,
)
from .workers.runtime import TextWorkerSpec
from .workers.video_storyboard import (
    MANIFEST as VIDEO_STORYBOARD_MANIFEST,
    SPEC as VIDEO_STORYBOARD_SPEC,
    video_storyboard_node,
)

TEXT_WORKER_SPECS: dict[str, TextWorkerSpec] = {
    DATA_ANALYST_SPEC.key: DATA_ANALYST_SPEC,
    AMAZON_COMPETITOR_ANALYST_SPEC.key: AMAZON_COMPETITOR_ANALYST_SPEC,
    VIDEO_STORYBOARD_SPEC.key: VIDEO_STORYBOARD_SPEC,
}

WORKER_MANIFESTS: dict[str, dict[str, Any]] = {
    DATA_ANALYST_SPEC.key: DATA_ANALYST_MANIFEST,
    AMAZON_COMPETITOR_ANALYST_SPEC.key: AMAZON_COMPETITOR_ANALYST_MANIFEST,
    VIDEO_STORYBOARD_SPEC.key: VIDEO_STORYBOARD_MANIFEST,
}

WORKER_NODES = {
    DATA_ANALYST_SPEC.key: data_analyst_node,
    AMAZON_COMPETITOR_ANALYST_SPEC.key: amazon_competitor_analyst_node,
    VIDEO_STORYBOARD_SPEC.key: video_storyboard_node,
}
