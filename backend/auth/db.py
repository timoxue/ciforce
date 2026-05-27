"""File-backed store for users / verification codes / sessions.

SQLite is unreliable in this local Windows workspace, so auth state is kept
in a small JSON file for development. Callers use asyncio.to_thread, so a
simple process-local lock is enough here.
"""
from __future__ import annotations

import json
import os
import threading
import time
from pathlib import Path
from typing import Any, Optional

STORE_PATH = Path(os.getenv("AUTH_DB_PATH", "data/auth.json"))
_LOCK = threading.RLock()


def _default_state() -> dict[str, Any]:
    return {
        "next_user_id": 1,
        "users": [],
        "verification_codes": [],
        "sessions": [],
    }


def _ensure_store() -> None:
    STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not STORE_PATH.exists():
        _save_state(_default_state())


def _load_state() -> dict[str, Any]:
    _ensure_store()
    with STORE_PATH.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _save_state(state: dict[str, Any]) -> None:
    STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with STORE_PATH.open("w", encoding="utf-8") as fh:
        json.dump(state, fh, ensure_ascii=False, separators=(",", ":"))


def _copy_row(row: Optional[dict[str, Any]]) -> Optional[dict[str, Any]]:
    return dict(row) if row else None


def init_db() -> None:
    with _LOCK:
        _ensure_store()


def get_user_by_email(email: str) -> Optional[dict[str, Any]]:
    with _LOCK:
        state = _load_state()
        row = next((u for u in state["users"] if u["email"] == email), None)
        return _copy_row(row)


def get_user_by_id(user_id: int) -> Optional[dict[str, Any]]:
    with _LOCK:
        state = _load_state()
        row = next((u for u in state["users"] if u["id"] == user_id), None)
        return _copy_row(row)


def create_or_update_unverified_user(email: str, password_hash: str) -> int:
    now = int(time.time())
    with _LOCK:
        state = _load_state()
        row = next((u for u in state["users"] if u["email"] == email), None)
        if row and row["verified"]:
            raise ValueError("already_verified")
        if row:
            row["password_hash"] = password_hash
            row["verified"] = 1
            _save_state(state)
            return int(row["id"])

        user_id = int(state["next_user_id"])
        state["next_user_id"] = user_id + 1
        state["users"].append(
            {
                "id": user_id,
                "email": email,
                "password_hash": password_hash,
                "verified": 1,
                "onboarding_done": 0,
                "created_at": now,
            }
        )
        _save_state(state)
        return user_id


def mark_onboarding_done(user_id: int) -> None:
    with _LOCK:
        state = _load_state()
        row = next((u for u in state["users"] if u["id"] == user_id), None)
        if row:
            row["onboarding_done"] = 1
            _save_state(state)


def upsert_code(email: str, code: str, ttl_seconds: int = 600) -> None:
    now = int(time.time())
    with _LOCK:
        state = _load_state()
        row = next((c for c in state["verification_codes"] if c["email"] == email), None)
        if row:
            row["code"] = code
            row["expires_at"] = now + ttl_seconds
            row["last_sent_at"] = now
            row["attempts"] = 0
        else:
            state["verification_codes"].append(
                {
                    "email": email,
                    "code": code,
                    "expires_at": now + ttl_seconds,
                    "last_sent_at": now,
                    "attempts": 0,
                }
            )
        _save_state(state)


def last_sent_at(email: str) -> int:
    with _LOCK:
        state = _load_state()
        row = next((c for c in state["verification_codes"] if c["email"] == email), None)
        return int(row["last_sent_at"]) if row else 0


def take_code(email: str, code: str) -> bool:
    now = int(time.time())
    with _LOCK:
        state = _load_state()
        row = next((c for c in state["verification_codes"] if c["email"] == email), None)
        if not row:
            return False
        if int(row["attempts"]) >= 5:
            return False
        if int(row["expires_at"]) < now:
            return False
        if row["code"] != code:
            row["attempts"] = int(row["attempts"]) + 1
            _save_state(state)
            return False

        state["verification_codes"] = [
            c for c in state["verification_codes"] if c["email"] != email
        ]
        _save_state(state)
        return True


def create_session(user_id: int, token: str, ttl_seconds: int) -> None:
    now = int(time.time())
    with _LOCK:
        state = _load_state()
        state["sessions"].append(
            {
                "token": token,
                "user_id": user_id,
                "created_at": now,
                "expires_at": now + ttl_seconds,
            }
        )
        _save_state(state)


def get_session_user(token: str) -> Optional[dict[str, Any]]:
    now = int(time.time())
    with _LOCK:
        state = _load_state()
        state["sessions"] = [s for s in state["sessions"] if int(s["expires_at"]) > now]
        session = next((s for s in state["sessions"] if s["token"] == token), None)
        if not session:
            _save_state(state)
            return None
        user = next((u for u in state["users"] if u["id"] == session["user_id"]), None)
        _save_state(state)
        return _copy_row(user)


def delete_session(token: str) -> None:
    with _LOCK:
        state = _load_state()
        state["sessions"] = [s for s in state["sessions"] if s["token"] != token]
        _save_state(state)


def gc_sessions() -> int:
    now = int(time.time())
    with _LOCK:
        state = _load_state()
        before = len(state["sessions"])
        state["sessions"] = [s for s in state["sessions"] if int(s["expires_at"]) > now]
        deleted = before - len(state["sessions"])
        if deleted:
            _save_state(state)
        return deleted
