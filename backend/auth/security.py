"""Password hashing + session token primitives.

Prefer bcrypt when available. If the runtime cannot install/import it,
fall back to stdlib PBKDF2 so local development can still boot.
secrets.token_urlsafe for opaque session tokens (32 bytes = 256 bits entropy,
plenty against bruteforce; no need for JWT since sessions live in our DB).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import string

try:
    import bcrypt  # type: ignore
except ImportError:
    bcrypt = None

COOKIE_NAME = "ciforce_session"
SESSION_TTL = 7 * 24 * 3600  # 7 days
CODE_TTL = 10 * 60           # 10 min
RESEND_COOLDOWN = 60         # seconds between resend
PBKDF2_PREFIX = "pbkdf2_sha256"
PBKDF2_ROUNDS = 600_000
PBKDF2_SALT_BYTES = 16


def _hash_with_pbkdf2(plain: str) -> str:
    salt = os.urandom(PBKDF2_SALT_BYTES)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        plain.encode("utf-8"),
        salt,
        PBKDF2_ROUNDS,
    )
    salt_b64 = base64.b64encode(salt).decode("ascii")
    digest_b64 = base64.b64encode(digest).decode("ascii")
    return f"{PBKDF2_PREFIX}${PBKDF2_ROUNDS}${salt_b64}${digest_b64}"


def _verify_pbkdf2(plain: str, hashed: str) -> bool:
    try:
        prefix, rounds, salt_b64, digest_b64 = hashed.split("$", 3)
        if prefix != PBKDF2_PREFIX:
            return False
        salt = base64.b64decode(salt_b64.encode("ascii"))
        expected = base64.b64decode(digest_b64.encode("ascii"))
        actual = hashlib.pbkdf2_hmac(
            "sha256",
            plain.encode("utf-8"),
            salt,
            int(rounds),
        )
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def hash_password(plain: str) -> str:
    if bcrypt is not None:
        return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")
    return _hash_with_pbkdf2(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        if hashed.startswith(f"{PBKDF2_PREFIX}$"):
            return _verify_pbkdf2(plain, hashed)
        if bcrypt is None:
            return False
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def new_session_token() -> str:
    return secrets.token_urlsafe(32)


def new_verification_code() -> str:
    """6-digit numeric code. Numeric (not alphanumeric) so it's easy to type on mobile."""
    return "".join(secrets.choice(string.digits) for _ in range(6))
