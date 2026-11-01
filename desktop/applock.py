"""4-digit PIN lock for the explorer window."""

from __future__ import annotations

import hashlib
import re
import secrets
import threading
import time

from . import appconfig

PIN_RE = re.compile(r"^\d{4}$")
CODE_RE = re.compile(r"^\d{6}$")
SALT_KEY = "pin_salt"
HASH_KEY = "pin_hash"
SKIPPED_KEY = "pin_skipped"
_ROUNDS = 120_000
RECOVERY_TTL = 10 * 60
RECOVERY_COOLDOWN = 60
RECOVERY_MAX_TRIES = 5


def _derive(pin: str, salt_hex: str) -> str:
    digest = hashlib.pbkdf2_hmac(
        "sha256", pin.encode("utf-8"), bytes.fromhex(salt_hex), _ROUNDS
    )
    return digest.hex()


def has_pin() -> bool:
    settings = appconfig.load_settings()
    return bool(settings.get(SALT_KEY) and settings.get(HASH_KEY))


def pin_skipped() -> bool:
    return bool(appconfig.load_settings().get(SKIPPED_KEY))


def verify(pin: str) -> bool:
    settings = appconfig.load_settings()
    salt = settings.get(SALT_KEY)
    stored = settings.get(HASH_KEY)
    if not salt or not stored:
        return False
    try:
        return secrets.compare_digest(_derive(pin, str(salt)), str(stored))
    except (TypeError, ValueError):
        return False


def set_pin(pin: str) -> None:
    if not PIN_RE.fullmatch(pin or ""):
        raise ValueError("The PIN must be exactly 4 digits.")
    salt = secrets.token_hex(16)
    appconfig.save_settings(
        {SALT_KEY: salt, HASH_KEY: _derive(pin, salt), SKIPPED_KEY: ""}
    )


def clear_pin() -> None:
    appconfig.save_settings({SALT_KEY: "", HASH_KEY: ""})


def mark_skipped() -> None:
    appconfig.save_settings({SKIPPED_KEY: "1"})


class _Recovery:
    """One pending Telegram-delivered code, kept in memory only."""

    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.salt = ""
        self.digest = ""
        self.expires = 0.0
        self.tries = 0
        self.sent_at = 0.0

    def clear(self) -> None:
        self.salt = ""
        self.digest = ""
        self.expires = 0.0
        self.tries = 0
        self.sent_at = 0.0


_recovery = _Recovery()


def recovery_wait() -> int:
    with _recovery.lock:
        if not _recovery.sent_at:
            return 0
        left = RECOVERY_COOLDOWN - (time.time() - _recovery.sent_at)
        return max(0, int(left) + 1) if left > 0 else 0


def issue_recovery_code() -> str:
    code = f"{secrets.randbelow(1_000_000):06d}"
    salt = secrets.token_hex(16)
    with _recovery.lock:
        _recovery.salt = salt
        _recovery.digest = _derive(code, salt)
        _recovery.expires = time.time() + RECOVERY_TTL
        _recovery.tries = 0
        _recovery.sent_at = time.time()
    return code


def cancel_recovery() -> None:
    with _recovery.lock:
        _recovery.clear()


def recovery_pending() -> bool:
    with _recovery.lock:
        return bool(_recovery.digest) and time.time() <= _recovery.expires


def verify_recovery_code(code: str) -> bool:
    with _recovery.lock:
        if not _recovery.digest or time.time() > _recovery.expires:
            _recovery.clear()
            return False
        if _recovery.tries >= RECOVERY_MAX_TRIES:
            _recovery.clear()
            return False
        _recovery.tries += 1
        if not CODE_RE.fullmatch(code or ""):
            return False
        try:
            ok = secrets.compare_digest(
                _derive(code, _recovery.salt), _recovery.digest
            )
        except (TypeError, ValueError):
            ok = False
        if ok or _recovery.tries >= RECOVERY_MAX_TRIES:
            _recovery.clear()
        return ok
