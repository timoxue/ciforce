"""POST /api/auth/{signup,verify,login,logout,resend}, GET /me.

Cookie-based session: signup-verify or login sets HttpOnly cookie
`ciforce_session`; every protected route reads it via `current_user` dep.
"""
from __future__ import annotations

import asyncio
import re
import time
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pydantic import BaseModel, Field, field_validator

from . import db
from .mailer import send_verification_code
from .security import (
    COOKIE_NAME, SESSION_TTL, CODE_TTL, RESEND_COOLDOWN,
    hash_password, verify_password,
    new_session_token, new_verification_code,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ── request / response models ────────────────────────────────────────────────

class EmailReq(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        email = value.strip().lower()
        if not EMAIL_RE.match(email):
            raise ValueError("invalid_email")
        return email


class SignupReq(EmailReq):
    pass


class VerifyReq(EmailReq):
    code: str = Field(min_length=6, max_length=6)
    password: str = Field(min_length=8, max_length=128)


class LoginReq(EmailReq):
    password: str = Field(min_length=1, max_length=128)


class ResendReq(EmailReq):
    pass


class UserOut(BaseModel):
    id: int
    email: str
    verified: bool
    onboarding_done: bool
    created_at: int

    @classmethod
    def from_row(cls, row) -> "UserOut":
        return cls(
            id=row["id"],
            email=row["email"],
            verified=bool(row["verified"]),
            onboarding_done=bool(row["onboarding_done"]),
            created_at=row["created_at"],
        )


# ── cookie helpers ──────────────────────────────────────────────────────────

def _set_session_cookie(resp: Response, token: str) -> None:
    # Secure=False so it works on http://localhost in dev; flip via env in prod.
    import os
    secure = os.getenv("AUTH_COOKIE_SECURE", "false").lower() == "true"
    resp.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=SESSION_TTL,
        httponly=True,
        samesite="lax",
        secure=secure,
        path="/",
    )


def _clear_session_cookie(resp: Response) -> None:
    resp.delete_cookie(key=COOKIE_NAME, path="/")


# ── auth dependency ─────────────────────────────────────────────────────────

async def current_user(ciforce_session: Optional[str] = Cookie(default=None)):
    if not ciforce_session:
        raise HTTPException(401, "not_authenticated")
    row = await asyncio.to_thread(db.get_session_user, ciforce_session)
    if not row:
        raise HTTPException(401, "session_invalid_or_expired")
    return row


# ── routes ──────────────────────────────────────────────────────────────────

@router.post("/signup", status_code=202)
async def signup(req: SignupReq):
    """Generate + send verification code. Does NOT create the user yet —
    the user row is only created on /verify, so abandoned signups leave no
    junk in the users table."""
    user = await asyncio.to_thread(db.get_user_by_email, req.email)
    if user and user["verified"]:
        raise HTTPException(409, "email_already_registered")

    last = await asyncio.to_thread(db.last_sent_at, req.email)
    wait = RESEND_COOLDOWN - (int(time.time()) - last)
    if wait > 0:
        raise HTTPException(429, f"resend_cooldown:{wait}")

    code = new_verification_code()
    await asyncio.to_thread(db.upsert_code, req.email, code, CODE_TTL)
    await asyncio.to_thread(send_verification_code, req.email, code)
    return {"ok": True, "cooldown": RESEND_COOLDOWN}


@router.post("/resend", status_code=202)
async def resend(req: ResendReq):
    return await signup(SignupReq(email=req.email))


@router.post("/verify")
async def verify(req: VerifyReq, resp: Response):
    ok = await asyncio.to_thread(db.take_code, req.email, req.code)
    if not ok:
        raise HTTPException(400, "code_invalid_or_expired")

    pw_hash = await asyncio.to_thread(hash_password, req.password)
    try:
        user_id = await asyncio.to_thread(
            db.create_or_update_unverified_user, req.email, pw_hash,
        )
    except ValueError:
        raise HTTPException(409, "email_already_registered")

    token = new_session_token()
    await asyncio.to_thread(db.create_session, user_id, token, SESSION_TTL)
    _set_session_cookie(resp, token)

    row = await asyncio.to_thread(db.get_user_by_id, user_id)
    return {"user": UserOut.from_row(row)}


@router.post("/login")
async def login(req: LoginReq, resp: Response):
    row = await asyncio.to_thread(db.get_user_by_email, req.email)
    if not row or not verify_password(req.password, row["password_hash"]):
        raise HTTPException(401, "invalid_credentials")
    if not row["verified"]:
        raise HTTPException(403, "email_not_verified")

    token = new_session_token()
    await asyncio.to_thread(db.create_session, row["id"], token, SESSION_TTL)
    _set_session_cookie(resp, token)
    return {"user": UserOut.from_row(row)}


@router.post("/logout")
async def logout(resp: Response, ciforce_session: Optional[str] = Cookie(default=None)):
    if ciforce_session:
        await asyncio.to_thread(db.delete_session, ciforce_session)
    _clear_session_cookie(resp)
    return {"ok": True}


@router.get("/me")
async def me(user=Depends(current_user)):
    return {"user": UserOut.from_row(user)}


@router.post("/onboarding-done")
async def mark_onboarding(user=Depends(current_user)):
    await asyncio.to_thread(db.mark_onboarding_done, user["id"])
    return {"ok": True}
