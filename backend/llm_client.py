"""Shared LLM client helpers."""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

import httpx
from dotenv import dotenv_values
from openai import AsyncOpenAI


ENV_PATH = Path(__file__).resolve().parent / ".env"


def _env_flag(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@lru_cache(maxsize=1)
def _dotenv_values() -> dict[str, str | None]:
    if not ENV_PATH.exists():
        return {}
    return dotenv_values(ENV_PATH)


def _llm_setting(name: str, default: str = "") -> str:
    prefer_dotenv = _env_flag("OPENAI_DOTENV_OVERRIDE", False)
    if prefer_dotenv:
        value = _dotenv_values().get(name)
        if value:
            return value
    return os.getenv(name, default)


def build_async_openai_client() -> AsyncOpenAI:
    """Build an AsyncOpenAI client with predictable proxy behavior."""
    trust_env = _env_flag("OPENAI_TRUST_ENV", False)
    timeout = float(_llm_setting("OPENAI_TIMEOUT_SECONDS", "60"))
    http_client = httpx.AsyncClient(
        timeout=timeout,
        trust_env=trust_env,
    )
    return AsyncOpenAI(
        api_key=_llm_setting("OPENAI_API_KEY", ""),
        base_url=_llm_setting("OPENAI_BASE_URL", "https://api.deepseek.com/v1"),
        http_client=http_client,
    )


def llm_model(default: str = "deepseek-chat") -> str:
    return _llm_setting("SMART_LLM_MODEL", default)
