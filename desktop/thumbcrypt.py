"""PIN-wrapped encryption for every preview image cached on disk.

Thumbnails, picked covers, star portraits, posters and storyboard sheets are
written as ``TFEC1`` envelopes, so the files are useless without the master
key. The 64-byte master key lives in ``thumbs/.thumbkey``: wrapped with a key
derived from the PIN when the app has one, and stored bare when it does not.
Nothing image-shaped is ever written in the clear.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
import secrets
import tempfile
import threading
from pathlib import Path
from typing import Optional

from . import appconfig

log = logging.getLogger("tfe.thumbcrypt")

MAGIC = b"TFEC1"
KEY_PATH = appconfig.THUMB_DIR / ".thumbkey"
KEY_WRAP = b"TFEK1"
KEY_RAW = b"TFEK0"
BLOCK = 64 * 1024
NONCE = 16
TAG = 32
KEY_LEN = 64
ROUNDS = 210_000
IMAGE_SUFFIXES = (".thumb", ".img", ".jpg", ".jpeg", ".png", ".webp")

_lock = threading.Lock()
_key: Optional[bytes] = None


# ------------------------------------------------------------------ cipher --
def _xor(enc_key: bytes, nonce: bytes, data: bytes) -> bytes:
    """HMAC-SHA256 counter keystream, XORed in big chunks for speed."""
    out = bytearray(len(data))
    view = memoryview(data)
    counter = 0
    for start in range(0, len(data), BLOCK):
        chunk = view[start:start + BLOCK]
        pieces = []
        for offset in range(0, len(chunk), 32):
            counter += 1
            pieces.append(
                hmac.new(
                    enc_key, nonce + counter.to_bytes(8, "big"), hashlib.sha256
                ).digest()
            )
        stream = b"".join(pieces)[:len(chunk)]
        size = len(chunk)
        mixed = int.from_bytes(chunk, "big") ^ int.from_bytes(stream, "big")
        out[start:start + size] = mixed.to_bytes(size, "big")
    return bytes(out)


def _seal(key: bytes, data: bytes) -> bytes:
    nonce = secrets.token_bytes(NONCE)
    body = _xor(key[:32], nonce, data)
    tag = hmac.new(key[32:], MAGIC + nonce + body, hashlib.sha256).digest()
    return MAGIC + nonce + body + tag


def _open(key: bytes, blob: bytes) -> Optional[bytes]:
    if len(blob) < len(MAGIC) + NONCE + TAG:
        return None
    nonce = blob[len(MAGIC):len(MAGIC) + NONCE]
    body = blob[len(MAGIC) + NONCE:-TAG]
    tag = blob[-TAG:]
    expected = hmac.new(key[32:], MAGIC + nonce + body, hashlib.sha256).digest()
    if not hmac.compare_digest(tag, expected):
        return None
    return _xor(key[:32], nonce, body)


# ------------------------------------------------------------------- files --
def _write_atomic(path: Path, blob: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    handle, name = tempfile.mkstemp(
        dir=str(path.parent), prefix=".tfc-", suffix=".tmp"
    )
    try:
        with os.fdopen(handle, "wb") as fh:
            fh.write(blob)
        os.replace(name, path)
    except BaseException:
        try:
            os.unlink(name)
        except OSError:
            pass
        raise


def _active_key() -> Optional[bytes]:
    if _key is not None:
        return _key
    try:
        blob = KEY_PATH.read_bytes()
    except OSError:
        return None
    if blob.startswith(KEY_RAW) and len(blob) == len(KEY_RAW) + KEY_LEN:
        return blob[len(KEY_RAW):]
    return None


def _is_image(path: Path) -> bool:
    return path.suffix.lower() in IMAGE_SUFFIXES


def read_bytes(path: Path) -> Optional[bytes]:
    """Decrypt one cached preview; legacy plain files are sealed in place."""
    try:
        blob = path.read_bytes()
    except OSError:
        return None
    key = _active_key()
    if not blob.startswith(MAGIC):
        if key is not None:
            try:
                _write_atomic(path, _seal(key, blob))
            except OSError:
                pass
        return blob
    if key is None:
        return None
    data = _open(key, blob)
    if data is None:
        try:
            path.unlink()
        except OSError:
            pass
    return data


def write_bytes(path: Path, data: bytes) -> None:
    key = _active_key()
    if key is None:
        raise RuntimeError("Unlock the app to store previews.")
    _write_atomic(path, _seal(key, data))


def seal_file(path: Path) -> bool:
    """Encrypt a file that is still in the clear; True when it changed."""
    key = _active_key()
    if key is None:
        return False
    try:
        blob = path.read_bytes()
    except OSError:
        return False
    if blob.startswith(MAGIC):
        return False
    try:
        _write_atomic(path, _seal(key, blob))
    except OSError:
        return False
    return True


# -------------------------------------------------------------------- keys --
def _derive(pin: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac(
        "sha256", (pin or "").encode("utf-8"), salt, ROUNDS, dklen=KEY_LEN
    )


def _wrap_key(master: bytes, pin: str) -> None:
    salt = secrets.token_bytes(16)
    kek = _derive(pin, salt)
    nonce = secrets.token_bytes(NONCE)
    body = _xor(kek[:32], nonce, master)
    tag = hmac.new(kek[32:], KEY_WRAP + salt + nonce + body, hashlib.sha256).digest()
    _write_atomic(KEY_PATH, KEY_WRAP + salt + nonce + body + tag)


def _unwrap_key(blob: bytes, pin: str) -> Optional[bytes]:
    start = len(KEY_WRAP)
    salt = blob[start:start + 16]
    nonce = blob[start + 16:start + 16 + NONCE]
    body = blob[start + 16 + NONCE:-TAG]
    tag = blob[-TAG:]
    if len(salt) != 16 or len(body) != KEY_LEN:
        return None
    kek = _derive(pin, salt)
    expected = hmac.new(
        kek[32:], KEY_WRAP + salt + nonce + body, hashlib.sha256
    ).digest()
    if not hmac.compare_digest(tag, expected):
        return None
    return _xor(kek[:32], nonce, body)


def ensure_key() -> None:
    """Give a fresh install a master key before anything is cached."""
    if KEY_PATH.is_file():
        return
    _write_atomic(KEY_PATH, KEY_RAW + secrets.token_bytes(KEY_LEN))


def unlock(pin: str) -> None:
    """Load the master key for this session, wrapping it when a PIN exists."""
    global _key
    try:
        blob = KEY_PATH.read_bytes()
    except OSError:
        blob = b""
    master: Optional[bytes] = None
    if blob.startswith(KEY_WRAP):
        master = _unwrap_key(blob, pin)
        if master is None:
            log.warning("Preview key does not match this PIN; starting a fresh cache")
    elif blob.startswith(KEY_RAW) and len(blob) == len(KEY_RAW) + KEY_LEN:
        master = blob[len(KEY_RAW):]
    with _lock:
        if master is None:
            if blob:
                _wipe_images()
            master = secrets.token_bytes(KEY_LEN)
            if pin:
                _wrap_key(master, pin)
            else:
                _write_atomic(KEY_PATH, KEY_RAW + master)
        elif pin and blob.startswith(KEY_RAW):
            _wrap_key(master, pin)
        _key = master


def lock() -> None:
    global _key
    with _lock:
        _key = None


def set_pin(pin: str) -> None:
    """Re-wrap the master key after the PIN is set or reset."""
    global _key
    with _lock:
        if _key is None:
            try:
                blob = KEY_PATH.read_bytes()
            except OSError:
                blob = b""
            if blob.startswith(KEY_RAW) and len(blob) == len(KEY_RAW) + KEY_LEN:
                _key = blob[len(KEY_RAW):]
            else:
                _wipe_images()
                _key = secrets.token_bytes(KEY_LEN)
        _wrap_key(_key, pin)


def clear_pin() -> None:
    """Keep the cache readable when the app no longer has a PIN."""
    global _key
    with _lock:
        if _key is None:
            return
        _write_atomic(KEY_PATH, KEY_RAW + _key)


# --------------------------------------------------------------- migration --
def _wipe_images() -> None:
    for root in (appconfig.THUMB_DIR, appconfig.CACHE_DIR / "thumbpicks"):
        if not root.is_dir():
            continue
        for path in root.rglob("*"):
            if path.is_file() and path != KEY_PATH and _is_image(path):
                try:
                    path.unlink()
                except OSError:
                    pass


def migrate() -> int:
    """Encrypt previews left in the clear by an older build."""
    key = _active_key()
    if key is None:
        return 0
    sealed = 0
    for root in (appconfig.THUMB_DIR, appconfig.CACHE_DIR / "thumbpicks"):
        if not root.is_dir():
            continue
        for path in root.rglob("*"):
            if not path.is_file() or path == KEY_PATH or not _is_image(path):
                continue
            try:
                blob = path.read_bytes()
            except OSError:
                continue
            if blob.startswith(MAGIC):
                continue
            try:
                _write_atomic(path, _seal(key, blob))
            except OSError:
                continue
            sealed += 1
    if sealed:
        log.info("Encrypted %d cached preview file(s)", sealed)
    return sealed
