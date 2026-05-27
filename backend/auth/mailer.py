"""Email sender.

Currently writes to stdout — `docker compose logs -f backend` shows the code.
Swap MAILER for an Aliyun DirectMail client when ready; route handlers don't
need to change.
"""
from __future__ import annotations

import os
from typing import Protocol


class Mailer(Protocol):
    def send_verification_code(self, email: str, code: str) -> None: ...


class ConsoleMailer:
    def send_verification_code(self, email: str, code: str) -> None:
        box_top = "┌" + "─" * 56 + "┐"
        box_bot = "└" + "─" * 56 + "┘"
        print(box_top, flush=True)
        print(f"│  [CIForce] verification code for {email:<22}│", flush=True)
        print(f"│  ↳ CODE = {code}    (valid 10 min, dev console only)    │", flush=True)
        print(box_bot, flush=True)


# Default mailer; can be replaced at runtime/test time.
MAILER: Mailer = ConsoleMailer()


def send_verification_code(email: str, code: str) -> None:
    MAILER.send_verification_code(email, code)


# Hook for future Aliyun DirectMail wiring:
#   if os.getenv("ALIYUN_MAIL_AK"):
#       from .aliyun_mail import AliyunMailer
#       MAILER = AliyunMailer(...)
