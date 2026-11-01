"""Telegram (MTProto) backend for the desktop explorer.

Uses a user account session instead of the Bot API so the app can show
thumbnails, stream any size and upload up to 2 GB.
"""

from __future__ import annotations

import asyncio
import contextlib
import io
import json
import logging
import mimetypes
import os
import shutil
import time
from collections import deque
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncIterator, Dict, List, Optional, Set, Tuple

import segno
from telethon import TelegramClient, errors, types, utils
from telethon.tl.functions.channels import (
    CreateChannelRequest,
    EditAdminRequest,
    EditTitleRequest,
    GetFullChannelRequest,
    InviteToChannelRequest,
)
from telethon.tl.types import (
    ChannelParticipantsAdmins,
    ChatAdminRights,
    DocumentAttributeAnimated,
    DocumentAttributeAudio,
    DocumentAttributeFilename,
    DocumentAttributeSticker,
    DocumentAttributeVideo,
    PeerChannel,
)

from . import appconfig
from . import filetypes
from . import vaultstore
from .catalog import Catalog, clean_folder_path, clean_name, default_folder

log = logging.getLogger("tfe.tg")

APP_VERSION = "1.0"
MAX_UPLOAD = 2 * 1024 * 1024 * 1024
PREMIUM_MAX_UPLOAD = 4 * 1024 * 1024 * 1024
# Incremental syncs only read new messages; a full pass (which also notices
# deleted items) runs this often so the index cannot drift forever.
RECONCILE_DAYS = 7
RECONCILE_SECONDS = RECONCILE_DAYS * 24 * 3600
# Every channel the Explorer creates for storage carries this marker in its
# description, so a fresh install can find the vaults again.
VAULT_MARKER = "Telegram File Explorer vault"
VAULT_ABOUT = (
    f"{VAULT_MARKER}. Files stay in this channel; the app keeps an index on "
    "your PC and a copy of the index here."
)
ACTIVE_TRANSFER_STATES = {
    "queued",
    "uploading",
    "splitting",
    "downloading",
    "merging",
}
# Largest single Telegram upload that actually succeeds: the server allows
# at most 4000 upload parts of 512 KiB per file, so an exactly-2-GiB volume
# (4096 parts) is rejected with FilePartsInvalidError. Split parts must stay
# at or below this size.
PART_SIZE = 2000 * 1024 * 1024
# Each GetFile request is latency-bound, so keep several in flight. A window
# of 4 x 1 MiB is enough to hide RTT to a distant DC without flooding.
DOWNLOAD_STREAMS = 4
DOWNLOAD_SEGMENT = 1024 * 1024
# Uploads use one connection too; Telegram caps a file part at 512 KiB, and
# larger parts mean fewer round trips than Telethon's size-based defaults.
UPLOAD_PART_KB = 512
UPLOAD_PART_MIN_BYTES = 10 * 1024 * 1024
# Telegram caps one GetFile request at 512 KiB. Asking for more makes Telethon
# switch to its generic iterator (extra alignment requests), so stay at the cap
# and let each segment be a couple of back-to-back chunks instead.
DOWNLOAD_CHUNK = 512 * 1024

# Telegram Desktop's published app credentials. They let the first sign-in
# start without a my.telegram.org app; custom credentials always take priority.
BUILTIN_API_ID = 2040
BUILTIN_API_HASH = "b18441a1ff607e10a989891a5462e627"

_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "audio/mpeg": ".mp3",
    "audio/ogg": ".ogg",
    "audio/mp4": ".m4a",
}

_LABELS = {
    "image": "Photo",
    "video": "Video",
    "audio": "Audio",
    "voice": "Voice note",
    "document": "File",
    "sticker": "Sticker",
    "gif": "Animation",
    "other": "File",
}


def sniff_media(path: Path) -> Tuple[str, Optional[str]]:
    """Identify video/audio/image from the file header.

    Files without a known extension are otherwise sent to Telegram as plain
    documents, which clients cannot stream or preview.
    """
    try:
        with open(path, "rb") as handle:
            head = handle.read(4096)
    except OSError:
        return "document", None
    if len(head) >= 12 and head[4:8] == b"ftyp":
        brand = head[8:12]
        if brand == b"qt  ":
            return "video", "video/quicktime"
        if brand in (b"M4A ", b"M4B ", b"M4P "):
            return "audio", "audio/mp4"
        return "video", "video/mp4"
    if head[:4] == b"\x1aE\xdf\xa3":
        return ("video", "video/webm") if b"webm" in head[:64].lower() else (
            "video",
            "video/x-matroska",
        )
    if head[:4] == b"RIFF":
        if head[8:12] == b"AVI ":
            return "video", "video/avi"
        if head[8:12] == b"WAVE":
            return "audio", "audio/wav"
        if head[8:12] == b"WEBP":
            return "image", "image/webp"
    if head[:4] == b"\x30\x26\xb2\x75":
        return "video", "video/x-ms-wmv"
    if head[:4] in (b"\x00\x00\x01\xba", b"\x00\x00\x01\xb3"):
        return "video", "video/mpeg"
    if head[:3] == b"FLV":
        return "video", "video/x-flv"
    if head[:4] == b"OggS":
        return ("video", "video/ogg") if b"theora" in head.lower() else (
            "audio",
            "audio/ogg",
        )
    if head[:3] == b"ID3" or head[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
        return "audio", "audio/mpeg"
    if head[:4] == b"fLaC":
        return "audio", "audio/flac"
    if head[:3] == b"\xff\xd8\xff":
        return "image", "image/jpeg"
    if head[:8] == b"\x89PNG\r\n\x1a\n":
        return "image", "image/png"
    if head[:4] == b"GIF8":
        return "image", "image/gif"
    if len(head) >= 377 and head[0] == head[188] == head[376] == 0x47:
        return "video", "video/mp2t"
    return "document", None


def media_hint(path: Path, name: str) -> Tuple[str, Optional[str]]:
    """Content sniffing first, then the file extension as a fallback."""
    kind, mime = sniff_media(path)
    if kind != "document":
        return kind, mime
    guess = mimetypes.guess_type(name)[0] or ""
    if guess.startswith("video/"):
        return "video", guess
    if guess.startswith("audio/"):
        return "audio", guess
    if guess.startswith("image/"):
        return "image", guess
    return "document", None


class TGError(Exception):
    """An error that is safe and useful to show in the UI."""


class TransferCancelled(TGError):
    """Raised inside a transfer when the user cancels it."""


def friendly_error(exc: Exception) -> str:
    if isinstance(exc, TGError):
        return str(exc)
    if isinstance(exc, errors.FloodWaitError):
        return f"Telegram asked us to wait {exc.seconds} seconds. Try again later."
    if isinstance(exc, errors.SessionPasswordNeededError):
        return "Two-step verification is enabled on this account."
    if isinstance(exc, errors.PasswordHashInvalidError):
        return "That two-step verification password is not correct."
    if isinstance(exc, errors.PhoneCodeInvalidError):
        return "That login code is not correct."
    if isinstance(exc, errors.PhoneCodeExpiredError):
        return "That login code expired. Request a new one."
    if isinstance(exc, errors.PhoneCodeEmptyError):
        return "Enter the code Telegram sent you."
    if isinstance(exc, errors.PhoneNumberInvalidError):
        return "That phone number is not valid. Include the country code, e.g. +91…"
    if isinstance(exc, errors.PhoneNumberBannedError):
        return "This phone number is banned from Telegram."
    if isinstance(exc, errors.ApiIdInvalidError):
        return "That API ID and API hash do not match. Copy them from my.telegram.org."
    if isinstance(exc, errors.ApiIdPublishedFloodError):
        return (
            "Telegram flagged the app credentials. Try QR sign-in; if that also "
            "fails, add your own API ID and hash from my.telegram.org (the site "
            "may need a different network or a later retry)."
        )
    if isinstance(exc, errors.AuthKeyUnregisteredError):
        return "The saved login was revoked. Log in again."
    if isinstance(exc, errors.ChannelPrivateError):
        return "That channel is private or this account is not a member."
    if isinstance(exc, (errors.UsernameNotOccupiedError, errors.UsernameInvalidError)):
        return "That channel username was not found."
    if isinstance(exc, errors.ChatAdminRequiredError):
        return "This account needs admin rights in the channel to do that."
    if isinstance(exc, errors.MessageDeleteForbiddenError):
        return "Telegram did not allow deleting this message."
    if isinstance(exc, (ConnectionError, asyncio.TimeoutError)):
        return "Could not reach Telegram. Check the internet connection and retry."
    name = type(exc).__name__
    text = str(exc).strip()
    lowered = text.lower()
    if "file_too_large" in lowered or "too large" in lowered:
        return "Telegram rejected the file because it is too large for this account."
    return f"Telegram error ({name}){': ' + text if text and len(text) < 200 else ''}"


def _attr(attributes: Any, cls: Any) -> Optional[Any]:
    for attribute in attributes or ():
        if isinstance(attribute, cls):
            return attribute
    return None


def _photo_size(photo: Any) -> int:
    best = 0
    for size in getattr(photo, "sizes", None) or ():
        value = getattr(size, "size", None)
        if isinstance(value, int):
            best = max(best, value)
        for part in getattr(size, "sizes", None) or ():
            if isinstance(part, int):
                best = max(best, part)
    return best


def _dimensions(photo: Any) -> Tuple[Optional[int], Optional[int]]:
    best = None
    for size in getattr(photo, "sizes", None) or ():
        width = getattr(size, "w", None)
        height = getattr(size, "h", None)
        if width and height and (best is None or width * height > best[0] * best[1]):
            best = (width, height)
    return best if best else (None, None)


class TelegramService:
    def __init__(self) -> None:
        self.client: Optional[TelegramClient] = None
        self._settings = appconfig.load_settings()
        self._state = "setup"
        self._authorized = False
        self._user: Optional[Dict[str, Any]] = None
        self._entity: Any = None
        self._vault: Optional[Dict[str, Any]] = None
        self._last_error: Optional[str] = None
        self._phone: Optional[str] = None
        self._code_hash: Optional[str] = None
        self._qr_task: Optional[asyncio.Task] = None
        self._qr_url: Optional[str] = None
        self._qr_svg: Optional[str] = None
        self._qr_expires: Optional[int] = None
        self._qr_version = 0
        self._qr_error: Optional[str] = None
        self._lock = asyncio.Lock()
        self.sync_state: Dict[str, Any] = {
            "running": False,
            "scanned": 0,
            "total": 0,
            "stored": 0,
            "imported": 0,
            "error": None,
            "started": None,
            "finished": None,
        }
        self.transfers: Dict[str, Dict[str, Any]] = {}
        self.cancelled_clients: Set[str] = set()
        self._thumb_locks: Dict[int, asyncio.Lock] = {}
        self._thumb_sem: Optional[asyncio.Semaphore] = None
        self._message_cache: Dict[int, Tuple[float, Any]] = {}
        self._vault_registry: List[Dict[str, str]] = appconfig.load_vaults()
        self._vaults_cache: Optional[List[Dict[str, Any]]] = None
        self._vaults_cache_at = 0.0
        self._vaults_lock = asyncio.Lock()

    # ------------------------------------------------------------------ state
    def _flagged_vaults(self, entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        active_id = str((self._vault or {}).get("id") or "")
        default_id = str(self._settings.get("default_vault") or "")
        return [
            {
                **vault,
                "active": vault["id"] == active_id,
                "default": vault["id"] == default_id,
            }
            for vault in entries
        ]

    def _public_vaults(self) -> List[Dict[str, Any]]:
        default_id = str(self._settings.get("default_vault") or "")
        entries = self._flagged_vaults(self._vault_registry)
        if self._vault and not any(entry["active"] for entry in entries):
            entries.insert(
                0,
                {
                    "id": str(self._vault["id"]),
                    "title": self._vault.get("title") or str(self._vault["id"]),
                    "username": self._vault.get("username") or "",
                    "icon": self._vault.get("icon")
                    or appconfig.pick_vault_icon(
                        entry.get("icon") for entry in entries
                    ),
                    "active": True,
                    "default": str(self._vault["id"]) == default_id,
                },
            )
        return entries[: appconfig.VAULT_LIMIT]

    def status(self) -> Dict[str, Any]:
        return {
            "app": "telegram-file-explorer",
            "version": APP_VERSION,
            "state": self._state,
            "authorized": self._authorized,
            "user": self._user,
            "max_upload": PREMIUM_MAX_UPLOAD if (self._user or {}).get("premium") else MAX_UPLOAD,
            "vault": self._vault,
            "vaults": self._public_vaults(),
            "vault_configured": bool(self._settings.get("vault")),
            "has_api": bool(self._settings.get("api_id") and self._settings.get("api_hash")),
            "quick_api": True,
            "credentials": "custom" if (self._settings.get("api_id") and self._settings.get("api_hash")) else "builtin",
            "bot_index_linked": self.is_bot_vault(),
            "error": self._last_error,
            "sync": dict(self.sync_state),
        }

    def is_bot_vault(self) -> bool:
        if not self._vault:
            return False
        expected = appconfig.default_vault().strip()
        if not expected:
            return False
        try:
            return int(self._vault["id"]) == int(expected)
        except (KeyError, TypeError, ValueError):
            return str(self._vault.get("id")) == expected

    async def start(self) -> None:
        self._cleanup_cache()
        settings = appconfig.load_settings()
        self._settings = settings
        try:
            await self._ensure_client()
            if await self.client.is_user_authorized():
                await self._complete_login()
            else:
                self._state = "login"
        except Exception as exc:  # startup must not kill the local server
            self._state = "error"
            self._last_error = friendly_error(exc)

    async def close(self) -> None:
        await self.cancel_qr()
        if self.client is not None:
            try:
                await self.client.disconnect()
            except Exception:
                pass

    async def _ensure_client(self) -> TelegramClient:
        if self.client is None:
            settings = appconfig.load_settings()
            self._settings = settings
            api_id = str(settings.get("api_id") or "").strip()
            api_hash = str(settings.get("api_hash") or "").strip()
            if not api_id.isdigit() or not api_hash:
                api_id = str(BUILTIN_API_ID)
                api_hash = BUILTIN_API_HASH
            try:
                api_id_int = int(api_id)
            except ValueError:
                raise TGError("API ID must be a number.")
            appconfig.ensure_dirs()
            self.client = TelegramClient(
                str(appconfig.SESSION_PATH),
                api_id_int,
                api_hash,
                device_model="Telegram File Explorer",
                system_version="Windows",
                app_version=APP_VERSION,
                connection_retries=3,
                request_retries=3,
                auto_reconnect=True,
            )
        if not self.client.is_connected():
            await self.client.connect()
        return self.client

    def _require_client(self) -> TelegramClient:
        if self.client is None:
            raise TGError("Log in first.")
        return self.client

    def _require_ready(self) -> TelegramClient:
        client = self._require_client()
        if not self._authorized:
            raise TGError("Log in first.")
        if self._entity is None:
            raise TGError("Choose your Telegram channel first.")
        return client

    async def send_self_message(self, text: str) -> int:
        """Post text to the account's Saved Messages (readable on any device)."""
        client = self._require_client()
        if not self._authorized:
            raise TGError("Sign in to Telegram first.")
        message = await client.send_message("me", text)
        return int(getattr(message, "id", 0) or 0)

    # ------------------------------------------------------------------ login
    async def configure(
        self, api_id: str = "", api_hash: str = "", vault: str = ""
    ) -> Dict[str, Any]:
        self._last_error = None
        await self.cancel_qr()
        if self._authorized:
            if vault is not None and str(vault).strip():
                return await self.set_vault(str(vault).strip())
            return self.status()

        api_id = str(api_id or "").strip()
        api_hash = str(api_hash or "").strip()
        if not api_id.isdigit():
            raise TGError("API ID must be the number from my.telegram.org.")
        if len(api_hash) < 20:
            raise TGError("API hash looks too short. Copy it from my.telegram.org.")

        changed = (
            api_id != str(self._settings.get("api_id") or "")
            or api_hash != str(self._settings.get("api_hash") or "")
        )
        self._settings = appconfig.save_settings({"api_id": api_id, "api_hash": api_hash})
        if vault:
            self._settings = appconfig.save_settings({"vault": vault})
        if changed and self.client is not None:
            try:
                await self.client.disconnect()
            except Exception:
                pass
            self.client = None
        await self._ensure_client()
        self._state = "login" if not await self.client.is_user_authorized() else "ready"
        if self._state == "ready":
            await self._complete_login()
        return self.status()

    async def set_vault(self, vault: str) -> Dict[str, Any]:
        """Switch the storage vault (channel) used by every operation."""
        self._last_error = None
        blocker = self._switch_blocker()
        if blocker:
            raise TGError(blocker)
        if not self._authorized:
            raise TGError("Log in first.")
        raw = str(vault or "").strip()
        if not raw:
            raise TGError("Choose a channel first.")
        entity, info = await self._resolve_target(raw)
        self._activate_vault(entity, info)
        self._state = "ready"
        self._last_error = None
        return self.status()

    def _switch_blocker(self) -> Optional[str]:
        if self.sync_state.get("running"):
            return "Wait for the current sync to finish before changing vaults."
        for transfer in self.transfers.values():
            if transfer.get("busy") or transfer.get("state") in ACTIVE_TRANSFER_STATES:
                return "Wait for the current uploads and downloads to finish before changing vaults."
        return None

    def _activate_vault(self, entity: Any, info: Dict[str, Any]) -> None:
        info = dict(info)
        if info.get("icon") not in appconfig.VAULT_ICONS:
            known = next(
                (
                    vault.get("icon")
                    for vault in self._vault_registry
                    if vault["id"] == str(info["id"])
                ),
                None,
            )
            info["icon"] = known or appconfig.pick_vault_icon(
                vault.get("icon") for vault in self._vault_registry
            )
        self._entity = entity
        self._vault = info
        self._settings = appconfig.save_settings(
            {"vault": str(info["id"]), "vault_title": info["title"]}
        )
        self._remember_vault(info)
        # Message ids repeat across channels, so a cached message from the
        # previous vault must never be served after a switch.
        self._message_cache.clear()
        self.sync_state = {
            "running": False,
            "scanned": 0,
            "total": 0,
            "stored": 0,
            "imported": 0,
            "error": None,
            "started": None,
            "finished": None,
        }

    def _remember_vault(self, info: Dict[str, Any]) -> None:
        entry = {
            "id": str(info.get("id")),
            "title": str(info.get("title") or info.get("id")),
            "username": str(info.get("username") or ""),
            "icon": str(info.get("icon") or ""),
        }
        try:
            self._vault_registry = appconfig.remember_vault(entry)
        except OSError:
            self._vault_registry = [
                item for item in self._vault_registry if item["id"] != entry["id"]
            ]
            self._vault_registry.insert(0, entry)
        self._vaults_cache = None
        self._vaults_cache_at = 0.0

    async def send_code(self, phone: str) -> Dict[str, Any]:
        self._last_error = None
        await self.cancel_qr()
        phone = str(phone or "").strip().replace(" ", "").replace("-", "")
        if not phone.startswith("+") and phone.isdigit():
            phone = "+" + phone
        if len(phone) < 8:
            raise TGError("Enter the full phone number with country code.")
        client = await self._ensure_client()
        if await client.is_user_authorized():
            await self._complete_login()
            return self.status()
        self._phone = phone
        try:
            sent = await client.send_code_request(phone)
        except Exception as exc:
            raise TGError(friendly_error(exc))
        self._code_hash = sent.phone_code_hash
        self._state = "code"
        hint = getattr(sent, "next_type", None)
        return {
            **self.status(),
            "phone": phone,
            "code_type": type(sent.type).__name__ if getattr(sent, "type", None) else None,
            "hint": hint,
        }

    async def verify_code(self, code: str) -> Dict[str, Any]:
        self._last_error = None
        await self.cancel_qr()
        code = str(code or "").strip().replace(" ", "")
        if not code:
            raise TGError("Enter the code Telegram sent you.")
        client = self._require_client()
        if not self._phone:
            raise TGError("Request a login code first.")
        try:
            await client.sign_in(
                phone=self._phone, code=code, phone_code_hash=self._code_hash
            )
        except errors.SessionPasswordNeededError:
            self._state = "password"
            return self.status()
        except errors.PhoneCodeExpiredError as exc:
            self._state = "login"
            raise TGError(friendly_error(exc))
        except errors.PhoneCodeInvalidError as exc:
            raise TGError(friendly_error(exc))
        except Exception as exc:
            raise TGError(friendly_error(exc))
        await self._complete_login()
        return self.status()

    async def verify_password(self, password: str) -> Dict[str, Any]:
        self._last_error = None
        await self.cancel_qr()
        if not password:
            raise TGError("Enter your two-step verification password.")
        client = self._require_client()
        try:
            await client.sign_in(password=password)
        except Exception as exc:
            raise TGError(friendly_error(exc))
        await self._complete_login()
        return self.status()

    # -------------------------------------------------------------------- qr
    def qr_payload(self) -> Dict[str, Any]:
        return {
            "state": self._state,
            "authorized": self._authorized,
            "qr": {
                "url": self._qr_url,
                "svg": self._qr_svg,
                "expires": self._qr_expires,
                "version": self._qr_version,
            },
            "error": self._qr_error,
            "status": self.status(),
        }

    async def start_qr(self) -> Dict[str, Any]:
        self._last_error = None
        client = await self._ensure_client()
        if await client.is_user_authorized():
            await self._complete_login()
            return self.qr_payload()
        await self.cancel_qr()
        try:
            qr = await client.qr_login()
        except Exception as exc:
            raise TGError(friendly_error(exc))
        self._qr_error = None
        self._publish_qr(qr)
        self._state = "qr"
        self._qr_task = asyncio.create_task(self._qr_loop(qr))
        return self.qr_payload()

    def _publish_qr(self, qr: Any) -> None:
        self._qr_url = qr.url
        self._qr_svg = _qr_svg(qr.url)
        self._qr_expires = int(qr.expires.timestamp())
        self._qr_version += 1

    async def _qr_loop(self, qr: Any) -> None:
        client = self._require_client()
        try:
            while True:
                try:
                    await qr.wait()
                    break
                except asyncio.TimeoutError:
                    await qr.recreate()
                    self._publish_qr(qr)
            self._qr_url = None
            self._qr_svg = None
            self._qr_expires = None
            if not await client.is_user_authorized():
                self._state = "password"
                return
            await self._complete_login()
        except errors.SessionPasswordNeededError:
            self._qr_url = None
            self._qr_svg = None
            self._qr_expires = None
            self._state = "password"
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            self._qr_url = None
            self._qr_svg = None
            self._qr_expires = None
            self._qr_error = friendly_error(exc)
            self._last_error = self._qr_error
            self._state = "login"
        finally:
            if self._qr_task is asyncio.current_task():
                self._qr_task = None

    async def cancel_qr(self) -> Dict[str, Any]:
        task = self._qr_task
        self._qr_task = None
        if task is not None and task is not asyncio.current_task() and not task.done():
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await task
        self._qr_url = None
        self._qr_svg = None
        self._qr_expires = None
        if self._state == "qr":
            self._state = "login"
        return self.qr_payload()

    async def _complete_login(self) -> None:
        await self.cancel_qr()
        client = self._require_client()
        me = await client.get_me()
        self._authorized = True
        self._user = {
            "id": me.id,
            "first_name": me.first_name or "",
            "last_name": me.last_name or "",
            "username": me.username or "",
            "phone": me.phone or "",
            "premium": bool(getattr(me, "premium", False)),
        }
        self._state = "ready"
        self._last_error = None
        try:
            await self._resolve_vault()
        except TGError as exc:
            self._entity = None
            self._vault = None
            self._last_error = str(exc)

    async def logout(self) -> Dict[str, Any]:
        self._last_error = None
        await self.cancel_qr()
        if self.sync_state.get("running"):
            raise TGError("Wait for the current sync to finish before signing out.")
        if self.client is not None:
            try:
                await self.client.log_out()
            except Exception:
                pass
            try:
                await self.client.disconnect()
            except Exception:
                pass
        self.client = None
        self._authorized = False
        self._user = None
        self._entity = None
        self._vault = None
        self._phone = None
        self._code_hash = None
        self._state = "login"
        self._message_cache.clear()
        appconfig.clear_session_files()
        return self.status()

    async def reconnect(self) -> Dict[str, Any]:
        if self.sync_state.get("running"):
            raise TGError("Wait for the current sync to finish before reconnecting.")
        await self.cancel_qr()
        if self.client is not None:
            try:
                await self.client.disconnect()
            except Exception:
                pass
        self.client = None
        await self.start()
        return self.status()

    # ---------------------------------------------------------------- channel
    @staticmethod
    def _normalize_target(raw: str) -> str:
        value = str(raw or "").strip()
        if value.startswith("http://") or value.startswith("https://"):
            value = value.split("://", 1)[1]
        if value.startswith("t.me/"):
            parts = value.split("?", 1)[0].split("#", 1)[0].split("/")
            value = parts[1] if len(parts) > 1 else ""
            if value == "c" and len(parts) > 2:
                value = parts[2]
        if value.startswith("@") and not value.startswith("@+"):
            value = value[1:]
        return value.strip()

    async def _resolve_target(self, raw: str) -> Tuple[Any, Dict[str, Any]]:
        client = self._require_client()
        value = self._normalize_target(raw)
        if not value:
            raise TGError("Choose the Telegram channel that stores your files.")
        try:
            number = int(value)
        except ValueError:
            number = None
        try:
            if number is not None and number > 0:
                try:
                    entity = await client.get_entity(PeerChannel(number))
                except Exception:
                    entity = await client.get_entity(number)
            else:
                entity = await client.get_entity(number if number is not None else value)
        except Exception as exc:
            raise TGError(
                "Could not open that channel. Make sure this account is a member."
            ) from exc
        if not getattr(entity, "title", None):
            raise TGError("That ID belongs to a user, not a channel.")
        peer_id = utils.get_peer_id(entity)
        title = entity.title or str(peer_id)
        username = getattr(entity, "username", None) or ""
        return entity, {
            "id": peer_id,
            "channel_id": entity.id,
            "title": title,
            "username": username,
        }

    async def _resolve_vault(self) -> None:
        preferred = str(self._settings.get("default_vault") or "").strip()
        last = str(self._settings.get("vault") or "").strip()
        raw = preferred or last
        if not raw:
            raise TGError("Choose the Telegram channel that stores your files.")
        if not self._authorized:
            return
        try:
            entity, info = await self._resolve_target(raw)
        except TGError:
            if not preferred or not last:
                raise
            entity, info = await self._resolve_target(last)
        self._activate_vault(entity, info)

    def set_default_vault(self, vault: str = "") -> Dict[str, Any]:
        """Remember which vault opens on launch; empty means last used."""
        raw = str(vault or "").strip()
        if raw:
            known = {entry["id"] for entry in self._vault_registry}
            current = str((self._vault or {}).get("id") or "")
            if raw not in known and raw != current:
                raise TGError("That storage vault is not in the list.")
        self._settings = appconfig.save_settings({"default_vault": raw})
        return self.status()

    def _active_chat_id(self) -> Optional[int]:
        try:
            return int((self._vault or {}).get("channel_id"))
        except (TypeError, ValueError):
            return None

    async def list_vaults(self, refresh: bool = False) -> List[Dict[str, Any]]:
        """Return every known storage channel, scanning Telegram when needed."""
        client = self._require_client()
        if not self._authorized:
            raise TGError("Log in first.")
        now = time.time()
        if (
            not refresh
            and self._vaults_cache is not None
            and now - self._vaults_cache_at < 120
        ):
            return self._flagged_vaults(self._vaults_cache)
        async with self._vaults_lock:
            if (
                not refresh
                and self._vaults_cache is not None
                and time.time() - self._vaults_cache_at < 120
            ):
                return self._flagged_vaults(self._vaults_cache)
            merged: Dict[str, Dict[str, str]] = {
                entry["id"]: dict(entry) for entry in self._vault_registry
            }
            if self._vault:
                merged[str(self._vault["id"])] = {
                    "id": str(self._vault["id"]),
                    "title": self._vault.get("title") or str(self._vault["id"]),
                    "username": self._vault.get("username") or "",
                    "icon": self._vault.get("icon") or "",
                }
            try:
                await self._scan_vaults(client, merged)
            except Exception as exc:
                if not merged:
                    raise TGError(friendly_error(exc))
                log.warning("Vault scan incomplete: %s", friendly_error(exc))
            # Every vault gets a distinct icon the first time it is seen.
            taken = {
                entry["icon"]
                for entry in merged.values()
                if entry.get("icon") in appconfig.VAULT_ICONS
            }
            for entry in merged.values():
                if entry.get("icon") not in appconfig.VAULT_ICONS:
                    entry["icon"] = appconfig.pick_vault_icon(taken)
                    taken.add(entry["icon"])
            active_id = str((self._vault or {}).get("id") or "")
            entries = list(merged.values())
            entries.sort(
                key=lambda entry: (
                    entry["id"] != active_id,
                    entry["title"].casefold(),
                )
            )
            self._vault_registry = entries[: appconfig.VAULT_LIMIT]
            try:
                appconfig.save_settings(
                    {"vaults": json.dumps(self._vault_registry)}
                )
            except OSError:
                pass
            self._vaults_cache = [dict(entry) for entry in self._vault_registry]
            self._vaults_cache_at = time.time()
            return self._flagged_vaults(self._vault_registry)

    async def _scan_vaults(
        self, client: TelegramClient, found: Dict[str, Dict[str, str]]
    ) -> None:
        active_id = str((self._vault or {}).get("id") or "")
        candidates: List[Any] = []
        async for dialog in client.iter_dialogs(limit=500):
            entity = dialog.entity
            if not isinstance(entity, types.Channel) or getattr(entity, "left", False):
                continue
            if not (getattr(entity, "creator", False) or getattr(entity, "admin_rights", None)):
                continue
            if str(utils.get_peer_id(entity)) in found:
                continue
            candidates.append(entity)
            if len(candidates) >= 40:
                break
        for entity in candidates:
            vault_id = str(utils.get_peer_id(entity))
            marked = vault_id == active_id or await self._looks_like_vault(
                client, entity
            )
            if marked:
                found[vault_id] = {
                    "id": vault_id,
                    "title": entity.title or vault_id,
                    "username": getattr(entity, "username", None) or "",
                }

    async def _looks_like_vault(self, client: TelegramClient, entity: Any) -> bool:
        about = str(getattr(entity, "about", "") or "")
        if VAULT_MARKER.casefold() in about.casefold():
            return True
        try:
            full = await client(GetFullChannelRequest(channel=entity))
            about = str(getattr(getattr(full, "full_chat", None), "about", "") or "")
            if VAULT_MARKER.casefold() in about.casefold():
                return True
        except Exception:
            pass
        # The original vault predates the marker; its data snapshots identify it.
        try:
            async for message in client.iter_messages(entity, limit=15, wait_time=0):
                document = getattr(message, "document", None)
                for attribute in getattr(document, "attributes", None) or ():
                    name = getattr(attribute, "file_name", None) or ""
                    if name.startswith("tfe-data-") and name.endswith(".zip"):
                        return True
        except Exception:
            pass
        return False

    async def _find_helper_bot(self) -> Optional[Any]:
        """Find the storage bot: the remembered one, or a bot admin of any vault.

        The bot is a normal user account to the MTProto session, so discovering
        it from an existing vault's admins avoids ever touching the bot token.
        """
        client = self._require_client()
        username = str(appconfig.load_settings().get("helper_bot") or "").strip().lstrip("@")
        if username:
            try:
                entity = await client.get_entity(username)
                if getattr(entity, "bot", False):
                    return entity
                log.warning("The helper_bot setting @%s is not a bot", username)
            except Exception as exc:
                log.warning("Could not resolve helper bot @%s: %s", username, friendly_error(exc))

        candidates: List[Any] = []
        if self._entity is not None:
            candidates.append(self._entity)
        for entry in self._vault_registry:
            try:
                entity = await client.get_entity(int(entry["id"]))
            except Exception:
                continue
            if isinstance(entity, types.Channel):
                candidates.append(entity)

        seen: Set[int] = set()
        for entity in candidates:
            entity_id = int(getattr(entity, "id", 0) or 0)
            if entity_id in seen:
                continue
            seen.add(entity_id)
            try:
                async for user in client.iter_participants(
                    entity, filter=ChannelParticipantsAdmins
                ):
                    if getattr(user, "bot", False) and getattr(user, "username", None):
                        appconfig.save_settings({"helper_bot": user.username})
                        log.info("Storage bot detected: @%s", user.username)
                        return user
            except Exception as exc:
                log.debug(
                    "Could not inspect admins of %s: %s",
                    entity_id,
                    friendly_error(exc),
                )
        return None

    async def _promote_helper_bot(self, channel: Any, bot: Any) -> Optional[str]:
        """Invite the bot and grant posting rights; returns an error text or None."""
        client = self._require_client()
        username = getattr(bot, "username", None) or "the storage bot"
        try:
            await client(InviteToChannelRequest(channel, [bot]))
        except errors.UserAlreadyParticipantError:
            pass
        except Exception as exc:
            log.debug("Invite of @%s did not complete: %s", username, friendly_error(exc))
        try:
            await client(
                EditAdminRequest(
                    channel,
                    bot,
                    ChatAdminRights(post_messages=True),
                    "Storage",
                )
            )
        except Exception as exc:
            return friendly_error(exc)
        return None

    async def add_helper_bot(self, vault_id: Optional[str] = None) -> Dict[str, Any]:
        """Add the storage bot as an admin of a vault (the active one by default)."""
        client = self._require_client()
        if not self._authorized:
            raise TGError("Log in first.")
        target = self._entity
        if vault_id:
            try:
                target = await client.get_entity(int(vault_id))
            except Exception as exc:
                raise TGError(friendly_error(exc))
        if target is None:
            raise TGError("Choose a vault first.")
        bot = await self._find_helper_bot()
        if bot is None:
            return {
                "added": False,
                "reason": "no_bot",
                "message": "No storage bot was found. Add the bot to a vault once, then try again.",
            }
        error = await self._promote_helper_bot(target, bot)
        if error:
            return {
                "added": False,
                "reason": "error",
                "username": bot.username,
                "message": error,
            }
        log.info("Storage bot @%s added to vault %s", bot.username, vault_id or self._vault.get("id"))
        return {"added": True, "username": bot.username}

    async def create_vault(self, name: str) -> Dict[str, Any]:
        """Create a private Telegram channel and make it the active vault."""
        self._last_error = None
        blocker = self._switch_blocker()
        if blocker:
            raise TGError(blocker)
        client = self._require_client()
        if not self._authorized:
            raise TGError("Log in first.")
        title = " ".join(str(name or "").split()).strip()
        if not title:
            raise TGError("Give the new vault a name.")
        if len(title) > 128:
            raise TGError("That name is too long (128 characters at most).")
        try:
            result = await client(
                CreateChannelRequest(
                    title=title,
                    about=VAULT_ABOUT,
                    megagroup=False,
                    broadcast=True,
                )
            )
        except Exception as exc:
            raise TGError(friendly_error(exc))
        created = next(
            (
                chat
                for chat in getattr(result, "chats", None) or ()
                if isinstance(chat, types.Channel)
            ),
            None,
        )
        if created is None:
            raise TGError(
                "Telegram created the channel but did not return it. "
                "Restart the app to find it."
            )
        # Look for the bot while the previous vault is still active, so its
        # admins can reveal which bot belongs to this setup.
        try:
            bot = await self._find_helper_bot()
        except Exception:
            log.exception("Could not locate the storage bot for the new vault")
            bot = None
        entity, info = await self._resolve_target(str(created.id))
        self._activate_vault(entity, info)
        self._state = "ready"
        self._last_error = None
        log.info("Created storage vault %s (%s)", info["title"], info["id"])
        bot_result: Dict[str, Any] = {"added": False, "reason": "no_bot"}
        if bot is not None:
            error = await self._promote_helper_bot(entity, bot)
            if error:
                bot_result = {
                    "added": False,
                    "reason": "error",
                    "username": bot.username,
                    "message": error,
                }
                log.warning(
                    "Storage bot could not be added to %s: %s", info["title"], error
                )
            else:
                bot_result = {"added": True, "username": bot.username}
                log.info(
                    "Storage bot @%s added to the new vault %s",
                    bot.username,
                    info["title"],
                )
        return {
            "vault": self._vault,
            "vaults": self._public_vaults(),
            "bot": bot_result,
        }

    async def rename_vault(self, vault_id: str, title: str) -> Dict[str, Any]:
        """Rename a storage channel so the app and Telegram stay in sync."""
        self._last_error = None
        client = self._require_client()
        if not self._authorized:
            raise TGError("Log in first.")
        clean = " ".join(str(title or "").split()).strip()
        if not clean:
            raise TGError("Give the vault a name.")
        if len(clean) > 128:
            raise TGError("That name is too long (128 characters at most).")
        target = str(vault_id or "").strip()
        if not target:
            raise TGError("Choose a vault first.")
        active_id = str((self._vault or {}).get("id") or "")
        if target == active_id and self._entity is not None:
            entity = self._entity
        else:
            entity, _ = await self._resolve_target(target)
        if not isinstance(entity, types.Channel):
            raise TGError("Only channels can be storage vaults.")
        try:
            await client(EditTitleRequest(channel=entity, title=clean))
        except errors.ChatAdminRequiredError as exc:
            raise TGError(
                "You need to be an admin of this channel to rename it."
            ) from exc
        except Exception as exc:
            raise TGError(friendly_error(exc))
        try:
            entity.title = clean
        except Exception:
            pass
        if target == active_id:
            # Updating the active vault's title must not disturb a running
            # sync the way a real switch does.
            self._vault = {**self._vault, "title": clean}
            self._settings = appconfig.save_settings({"vault_title": clean})
            self._remember_vault(self._vault)
        else:
            entry = next(
                (vault for vault in self._vault_registry if vault["id"] == target),
                None,
            )
            if entry is not None:
                self._vault_registry = appconfig.update_vault(
                    {**entry, "title": clean}
                )
            self._vaults_cache = None
            self._vaults_cache_at = 0.0
        log.info("Renamed storage vault %s in Telegram", target)
        return {"vault": self._vault, "vaults": self._public_vaults()}

    def set_vault_icon(self, vault_id: str, icon: str) -> Dict[str, Any]:
        """Pick the icon that tells this vault apart in the switcher."""
        self._last_error = None
        target = str(vault_id or "").strip()
        if not target:
            raise TGError("Choose a vault first.")
        chosen = str(icon or "").strip()
        if chosen not in appconfig.VAULT_ICONS:
            raise TGError("Pick one of the offered icons.")
        entry = next(
            (vault for vault in self._vault_registry if vault["id"] == target),
            None,
        )
        if entry is None and self._vault and str(self._vault.get("id")) == target:
            entry = {
                "id": target,
                "title": self._vault.get("title") or target,
                "username": self._vault.get("username") or "",
                "icon": chosen,
            }
        if entry is None:
            raise TGError("That vault is not in the list. Refresh and try again.")
        self._vault_registry = appconfig.update_vault({**entry, "icon": chosen})
        if self._vault and str(self._vault.get("id")) == target:
            self._vault = {**self._vault, "icon": chosen}
        self._vaults_cache = None
        self._vaults_cache_at = 0.0
        return {"vault": self._vault, "vaults": self._public_vaults()}

    async def list_channels(self, query: str = "") -> List[Dict[str, Any]]:
        client = self._require_client()
        if not self._authorized:
            raise TGError("Log in first.")
        needle = (query or "").strip().lower()
        found: List[Dict[str, Any]] = []
        try:
            async for dialog in client.iter_dialogs(limit=500):
                entity = dialog.entity
                if not isinstance(entity, types.Channel):
                    continue
                title = entity.title or "(untitled)"
                username = entity.username or ""
                if needle and needle not in title.lower() and needle not in username.lower():
                    continue
                found.append(
                    {
                        "id": utils.get_peer_id(entity),
                        "title": title,
                        "username": username,
                        "broadcast": bool(getattr(entity, "broadcast", False)),
                        "megagroup": bool(getattr(entity, "megagroup", False)),
                        "members": getattr(entity, "participants_count", None),
                    }
                )
        except Exception as exc:
            raise TGError(friendly_error(exc))
        found.sort(key=lambda x: (not x["broadcast"], x["title"].lower()))
        return found

    # ------------------------------------------------------------------- sync
    async def sync(
        self, catalog: Catalog, bot_db: Path, full: bool = False
    ) -> bool:
        """Index the active vault; False when another sync is already running.

        New messages are read from the stored message-id cursor. A complete
        pass runs when the vault was never scanned, when the last complete
        pass is older than ``RECONCILE_DAYS``, or when ``full`` is set; that
        pass also hides items deleted from the channel.
        """
        if self.sync_state.get("running"):
            return False
        self.sync_state = {
            "running": True,
            "scanned": 0,
            "total": 0,
            "stored": 0,
            "imported": 0,
            "hidden": 0,
            "mode": "full",
            "error": None,
            "started": datetime.now().isoformat(timespec="seconds"),
            "finished": None,
        }
        try:
            client = self._require_ready()
            if self._vault is None:
                await self._resolve_vault()
            chat_id = int(self._entity.id)
            cursor = catalog.sync_cursor(chat_id)
            last_id = int(cursor.get("last_message_id") or 0)
            latest_full = self._cursor_age(cursor.get("last_full_at") or "")
            complete = (
                full
                or last_id <= 0
                or latest_full is None
                or latest_full > RECONCILE_SECONDS
            )
            self.sync_state["mode"] = "full" if complete else "incremental"
            total = 0
            if complete:
                try:
                    result = await client.get_messages(self._entity, limit=0)
                    total = int(getattr(result, "total", 0) or 0)
                except Exception:
                    total = 0
            self.sync_state["total"] = total
            stored = 0
            scanned = 0
            newest = last_id
            seen: Optional[set] = set() if complete else None
            batch: List[Dict[str, Any]] = []
            async for message in client.iter_messages(
                self._entity,
                limit=None,
                wait_time=0,
                min_id=0 if complete else last_id,
            ):
                scanned += 1
                message_id = int(message.id)
                newest = max(newest, message_id)
                if seen is not None:
                    seen.add(message_id)
                info = self.describe(message, chat_id)
                if info is not None and vaultstore.is_snapshot_name(
                    str(info.get("name") or "")
                ):
                    # The library backups this app posts into the channel are
                    # not files; indexing them only adds rows to hide again.
                    info = None
                if info is not None:
                    batch.append(info)
                    stored += 1
                    if len(batch) >= 200:
                        catalog.upsert_many(batch)
                        batch.clear()
                        self.sync_state["scanned"] = scanned
                        self.sync_state["stored"] = stored
                        await asyncio.sleep(0)
                if scanned % 25 == 0:
                    self.sync_state["scanned"] = scanned
                    self.sync_state["stored"] = stored
            if batch:
                catalog.upsert_many(batch)
            self.sync_state["scanned"] = scanned
            self.sync_state["stored"] = stored
            if complete and total == 0:
                self.sync_state["total"] = scanned
            if complete and seen is not None and not self.is_bot_vault():
                self.sync_state["hidden"] = catalog.hide_missing(chat_id, seen)
            catalog.set_sync_cursor(chat_id, newest, full=complete)
            if self.is_bot_vault():
                self.sync_state["imported"] = catalog.import_from_bot(bot_db, chat_id)
        except Exception as exc:
            self.sync_state["error"] = friendly_error(exc)
        finally:
            self.sync_state["running"] = False
            self.sync_state["finished"] = datetime.now().isoformat(timespec="seconds")
        return True

    @staticmethod
    def _cursor_age(stamp: str) -> Optional[float]:
        """Seconds since the last complete pass; None when unknown."""
        if not stamp:
            return None
        try:
            then = datetime.fromisoformat(stamp)
        except ValueError:
            return None
        if then.tzinfo is None:
            then = then.astimezone()
        return max(0.0, (datetime.now().astimezone() - then).total_seconds())


    def describe(self, message: Any, chat_id: int) -> Optional[Dict[str, Any]]:
        if message is None:
            return None
        photo = getattr(message, "photo", None)
        document = getattr(message, "document", None)
        if photo is None and (document is None or not getattr(document, "id", 0)):
            return None
        attributes = list(getattr(document, "attributes", None) or ())
        file_info = getattr(message, "file", None)
        mime = (
            getattr(file_info, "mime_type", None)
            or getattr(document, "mime_type", None)
            or ""
        )
        video_attr = _attr(attributes, DocumentAttributeVideo)
        audio_attr = _attr(attributes, DocumentAttributeAudio)
        is_sticker = _attr(attributes, DocumentAttributeSticker) is not None
        is_animated = _attr(attributes, DocumentAttributeAnimated) is not None
        if photo is not None:
            kind = "image"
        elif is_sticker:
            kind = "sticker"
        elif is_animated:
            kind = "gif"
        elif video_attr is not None:
            kind = "video"
        elif audio_attr is not None:
            kind = "voice" if getattr(audio_attr, "voice", False) else "audio"
        elif mime.startswith("image/"):
            kind = "image"
        elif mime.startswith("video/"):
            kind = "video"
        elif mime.startswith("audio/"):
            kind = "audio"
        elif document is not None:
            kind = "document"
        else:
            kind = "other"

        name = None
        filename_attr = _attr(attributes, DocumentAttributeFilename)
        if filename_attr is not None and getattr(filename_attr, "file_name", None):
            name = filename_attr.file_name
        if not name:
            name = getattr(file_info, "name", None)
        caption = getattr(message, "message", None) or None
        if not name and caption:
            candidate = caption.strip()
            stem, extension = os.path.splitext(candidate)
            if extension and len(candidate) <= 160:
                name = candidate
        date = getattr(message, "date", None)
        if date is None:
            date = datetime.now().astimezone()
        stamp = date.astimezone().strftime("%Y-%m-%d %H.%M.%S")
        if not name:
            extension = _EXTENSIONS.get(mime) or mimetypes.guess_extension(mime or "")
            if not extension:
                extension = {
                    "image": ".jpg",
                    "video": ".mp4",
                    "audio": ".mp3",
                    "voice": ".ogg",
                    "sticker": ".webp",
                    "gif": ".mp4",
                }.get(kind, "")
            name = f"{_LABELS.get(kind, 'File')} {stamp}{extension}"

        width = getattr(video_attr, "w", None) if video_attr else None
        height = getattr(video_attr, "h", None) if video_attr else None
        duration = (
            getattr(video_attr, "duration", None)
            or getattr(audio_attr, "duration", None)
            or getattr(file_info, "duration", None)
        )
        if photo is not None:
            p_width, p_height = _dimensions(photo)
            width = width or p_width
            height = height or p_height
        size = getattr(file_info, "size", None)
        if not size:
            size = getattr(document, "size", None) if document is not None else _photo_size(photo)
        has_thumb = bool(getattr(document, "thumbs", None)) or photo is not None
        if kind == "sticker" and getattr(document, "mime_type", "") == "image/webp":
            has_thumb = True
        name = clean_name(name or f"{_LABELS.get(kind, 'File')} {stamp}")
        # STL/3MF and CAD documents get their own families so they can be
        # filtered, previewed and inspected separately from plain documents.
        kind = filetypes.classify(name, kind)
        return {
            "chat_id": chat_id,
            "message_id": int(message.id),
            "doc_id": getattr(document, "id", None) if document is not None else None,
            "access_hash": getattr(document, "access_hash", None) if document is not None else None,
            "name": name,
            "kind": kind,
            "mime": mime or None,
            "size": int(size) if size else None,
            "width": int(width) if width else None,
            "height": int(height) if height else None,
            "duration": int(duration) if duration else None,
            "folder": default_folder(kind),
            "caption": caption,
            "tg_date": date.isoformat(),
            "has_thumb": has_thumb,
        }

    # ------------------------------------------------------------------ media
    async def get_message(
        self, message_id: int, chat_id: Optional[int] = None
    ) -> Any:
        client = self._require_ready()
        active = self._active_chat_id()
        if chat_id is not None and active is not None and int(chat_id) != active:
            raise TGError("That file belongs to another vault. Switch back to it first.")
        cached = self._message_cache.get(int(message_id))
        if cached and time.time() - cached[0] < 600:
            return cached[1]
        try:
            message = await client.get_messages(self._entity, ids=int(message_id))
        except Exception as exc:
            raise TGError(friendly_error(exc))
        if message is None:
            return None
        self._message_cache[int(message_id)] = (time.time(), message)
        if len(self._message_cache) > 300:
            oldest = min(self._message_cache, key=lambda key: self._message_cache[key][0])
            self._message_cache.pop(oldest, None)
        return message

    async def stream_chunks(self, message: Any, start: int, length: int) -> AsyncIterator[bytes]:
        remaining = max(0, int(length))
        if remaining == 0:
            return
        client = self._require_ready()
        offset = max(0, int(start))
        end = offset + remaining
        segment = DOWNLOAD_SEGMENT
        streams = max(1, min(DOWNLOAD_STREAMS, (remaining + segment - 1) // segment))

        async def fetch(position: int, size: int) -> bytes:
            buffer = bytearray()
            cursor = 0
            request = min(segment, DOWNLOAD_CHUNK)
            while cursor < size:
                need = size - cursor
                # The limit counts chunks, not bytes; assume the smallest chunk
                # Telegram may return so a short response can never end a
                # segment early. The iterator is closed explicitly so a borrowed
                # DC sender is handed back instead of waiting for the GC.
                iterator = client.iter_download(
                    message,
                    offset=position + cursor,
                    request_size=request,
                    limit=max(1, (need + request - 1) // request),
                )
                got = 0
                try:
                    async for chunk in iterator:
                        buffer.extend(chunk)
                        got += len(chunk)
                        if got >= need:
                            break
                finally:
                    await iterator.close()
                if got == 0:
                    # No progress: the server has no more data from here, so
                    # stop rather than spin on the same offset.
                    break
                cursor += got
            return bytes(buffer[:size])

        pending: "deque[Tuple[int, asyncio.Task[bytes]]]" = deque()
        next_position = offset

        def schedule() -> None:
            nonlocal next_position
            while next_position < end and len(pending) < streams:
                size = min(segment, end - next_position)
                pending.append(
                    (size, asyncio.create_task(fetch(next_position, size)))
                )
                next_position += size

        try:
            schedule()
            while pending:
                size, task = pending.popleft()
                try:
                    data = await task
                except asyncio.CancelledError:
                    task.cancel()
                    raise
                if len(data) < size:
                    # Never hand a hole to the player or the saved file.
                    raise TGError("The download ended before the file was complete.")
                yield data
                schedule()
        except asyncio.CancelledError:
            raise
        except TGError:
            raise
        except Exception as exc:
            raise TGError(friendly_error(exc)) from exc
        finally:
            for _, task in pending:
                task.cancel()

    async def thumbnail(self, item: Dict[str, Any]) -> Optional[Tuple[bytes, str]]:
        client = self._require_ready()
        item_id = int(item["id"])
        lock = self._thumb_locks.setdefault(item_id, asyncio.Lock())
        async with lock:
            # A folder of thumbnails fires many requests at once; cap the
            # downloads so media streams keep their share of the network.
            if self._thumb_sem is None:
                self._thumb_sem = asyncio.Semaphore(4)
            async with self._thumb_sem:
                message = await self.get_message(
                    int(item["message_id"]), item.get("chat_id")
                )
                if message is None:
                    return None
                # For photos index 1 is a small preview; -1 fetches the full image.
                indexes = (1, -1) if getattr(message, "photo", None) is not None else (-1,)
                data = None
                for index in indexes:
                    buffer = io.BytesIO()
                    try:
                        await client.download_media(message, file=buffer, thumb=index)
                    except Exception:
                        continue
                    data = buffer.getvalue()
                    if data:
                        break
                if not data:
                    size = int(item.get("size") or 0)
                    kind = item.get("kind")
                    if kind in {"sticker", "image", "gif"} and 0 < size <= 6 * 1024 * 1024:
                        try:
                            data = await client.download_media(message, file=bytes)
                        except Exception:
                            data = None
                if not data:
                    return None
                return bytes(data), _sniff_image(data)

    async def media_info(self, item: Dict[str, Any]) -> Tuple[Any, int, str]:
        message = await self.get_message(
            int(item["message_id"]), item.get("chat_id")
        )
        if message is None:
            raise TGError("This file no longer exists in the channel.")
        file_info = getattr(message, "file", None)
        size = int(item.get("size") or getattr(file_info, "size", 0) or 0)
        mime = (
            item.get("mime")
            or getattr(file_info, "mime_type", None)
            or "application/octet-stream"
        )
        if not size:
            document = getattr(message, "document", None)
            size = int(getattr(document, "size", 0) or 0)
        return message, size, mime

    async def download_to(self, message: Any, path: Path, progress=None) -> None:
        self._require_ready()
        file_info = getattr(message, "file", None)
        size = int(getattr(file_info, "size", 0) or 0)
        if not size:
            document = getattr(message, "document", None)
            size = int(getattr(document, "size", 0) or 0)
        if not size:
            client = self._require_ready()
            await client.download_media(
                message, file=str(path), progress_callback=progress
            )
            return
        written = 0
        with path.open("wb") as handle:
            async for chunk in self.stream_chunks(message, 0, size):
                handle.write(chunk)
                written += len(chunk)
                if progress is not None:
                    progress(written, size)

    async def edit_caption(
        self, message_id: int, name: str, chat_id: Optional[int] = None
    ) -> None:
        client = self._require_ready()
        message = await self.get_message(int(message_id), chat_id)
        if message is None:
            return
        if getattr(message, "sticker", None) is not None or getattr(
            message, "video_note", None
        ) is not None:
            return
        try:
            await client.edit_message(self._entity, int(message_id), name)
        except errors.MessageNotModifiedError:
            return
        except Exception as exc:
            raise TGError(friendly_error(exc))

    async def delete_message(
        self, message_id: int, chat_id: Optional[int] = None
    ) -> None:
        client = self._require_ready()
        active = self._active_chat_id()
        if chat_id is not None and active is not None and int(chat_id) != active:
            raise TGError("That file belongs to another vault. Switch back to it first.")
        try:
            await client.delete_messages(self._entity, [int(message_id)])
        except Exception as exc:
            raise TGError(friendly_error(exc))
        self._message_cache.pop(int(message_id), None)

    async def copy_messages(self, message_ids: List[int]) -> List[Dict[str, Any]]:
        client = self._require_ready()
        if self._vault is None:
            await self._resolve_vault()
        chat_id = int(self._entity.id)
        try:
            forwarded = await client.forward_messages(
                self._entity, [int(value) for value in message_ids], from_peer=self._entity
            )
        except Exception as exc:
            raise TGError(friendly_error(exc))
        copied: List[Dict[str, Any]] = []
        for message in forwarded or []:
            info = self.describe(message, chat_id)
            if info is not None:
                copied.append(info)
        return copied

    # ----------------------------------------------------------------- upload
    def new_transfer(self, name: str, size: int, client: str = "") -> str:
        transfer_id = f"t{int(time.time() * 1000)}-{len(self.transfers)}"
        cancelled = bool(client) and client in self.cancelled_clients
        self.transfers[transfer_id] = {
            "id": transfer_id,
            "name": name,
            "size": size,
            "sent": 0,
            "state": "cancelled" if cancelled else "queued",
            "error": None,
            "item_id": None,
            "item_ids": [],
            "client": client,
            "cancel": cancelled,
            "busy": True,
            "started": datetime.now().isoformat(timespec="seconds"),
        }
        self._prune_transfers()
        return transfer_id

    def cancel_transfer(self, transfer_id: str) -> bool:
        transfer = self.transfers.get(transfer_id)
        if transfer is None or transfer.get("cancel"):
            return False
        if transfer.get("state") in {"done", "error", "cancelled", "ready"}:
            return False
        transfer["cancel"] = True
        transfer["state"] = "cancelled"
        return True

    def cancel_client(self, client: str) -> int:
        client = str(client or "").strip()
        if not client:
            return 0
        if len(self.cancelled_clients) > 500:
            self.cancelled_clients.clear()
        self.cancelled_clients.add(client)
        return sum(
            1
            for transfer in list(self.transfers.values())
            if transfer.get("client") == client and self.cancel_transfer(transfer["id"])
        )

    def _prune_transfers(self) -> None:
        if len(self.transfers) <= 60:
            return
        finished = [
            key for key, value in self.transfers.items()
            if value["state"] in {"done", "error", "cancelled", "ready"}
            and not value.get("busy")
        ]
        for key in finished[: len(self.transfers) - 60]:
            self.transfers.pop(key, None)

    def _progress(self, transfer_id: str, sent: int, total: int) -> None:
        transfer = self.transfers.get(transfer_id)
        if transfer is None:
            return
        transfer["sent"] = int(sent or 0)
        transfer["size"] = int(total or transfer["size"] or 0)
        transfer["state"] = "uploading"

    async def upload_one(self, entry: Dict[str, Any], catalog: Catalog) -> Dict[str, Any]:
        client = self._require_ready()
        # Pin the target channel for the whole upload: a vault switch must
        # never redirect a file (or its cleanup) into another channel.
        target = self._entity
        chat_id = int(target.id)
        transfer_id = entry["transfer_id"]
        name = clean_name(entry["name"])
        path = Path(entry["path"])
        folder = clean_folder_path(entry.get("folder") or "", "")
        transfer = self.transfers.get(transfer_id)
        if transfer is None or transfer.get("cancel"):
            raise TransferCancelled()
        shared = bool(entry.get("shared"))
        sent_base = int(entry.get("sent_base") or 0)
        transfer["state"] = "uploading"
        kind, mime = media_hint(path, name)
        attributes = [DocumentAttributeFilename(name)]
        if kind == "video":
            attributes.append(
                DocumentAttributeVideo(
                    duration=0, w=1, h=1, supports_streaming=True
                )
            )
        elif kind == "audio":
            attributes.append(DocumentAttributeAudio(duration=0))
        # Telegram's photo pipeline recompresses images; keep originals intact.
        keep_original = kind == "image"

        def report(sent: int, total: int) -> None:
            # Telethon calls this between upload parts; raising aborts the upload.
            if transfer.get("cancel"):
                raise TransferCancelled()
            if shared:
                # Split volumes upload in parallel; sum every volume so the
                # bar only moves forward.
                index = int(entry.get("part_index") or 0)
                progress = transfer.setdefault("part_progress", {})
                progress[index] = (sent_base, int(sent or 0))
                done = sum(base + value for base, value in progress.values())
                self._progress(transfer_id, done, None)
            else:
                self._progress(transfer_id, sent_base + sent, total)

        try:
            # Telethon picks 128-256 KiB parts below 750 MiB, which leaves the
            # upload round-trip bound. 512 KiB is Telegram's maximum part size,
            # so pre-upload large files ourselves and hand the InputFile over.
            uploaded = None
            if path.stat().st_size > UPLOAD_PART_MIN_BYTES:
                uploaded = await client.upload_file(
                    str(path),
                    part_size_kb=UPLOAD_PART_KB,
                    progress_callback=report,
                )
            message = await client.send_file(
                target,
                uploaded if uploaded is not None else str(path),
                caption=name,
                force_document=keep_original,
                mime_type=mime,
                attributes=attributes,
                supports_streaming=kind == "video",
                # Without this Telegram turns silent videos into animations.
                nosound_video=True if kind == "video" else None,
                progress_callback=None if uploaded is not None else report,
            )
            if transfer.get("cancel"):
                # The upload finished before the cancel landed; remove the
                # message so a cancelled file never shows up in the channel.
                try:
                    await client.delete_messages(target, [message.id])
                except Exception:
                    pass
                raise TransferCancelled()
            info = self.describe(message, chat_id)
            if info is None:
                raise TGError("Telegram stored the file but it could not be indexed.")
            item_id = catalog.upsert(info)
            if shared:
                transfer.setdefault("item_ids", []).append(int(item_id))
            if folder:
                catalog.create_folder(folder, chat_id)
                catalog.update(item_id, folder=folder, folder_source="user")
            item = catalog.get(item_id)
            if shared:
                # The caller marks the whole split transfer done once every
                # volume has finished; one part finishing proves nothing.
                if transfer is not None:
                    transfer.update(
                        state="uploading",
                        item_id=transfer.get("item_id") or item_id,
                        error=None,
                    )
            else:
                transfer.update(
                    state="done", sent=transfer["size"], item_id=item_id, error=None
                )
            return item or {}
        except Exception as exc:
            if transfer.get("cancel") or isinstance(exc, TransferCancelled):
                transfer.update(state="cancelled", error=None)
                raise TransferCancelled() from exc
            message = friendly_error(exc)
            transfer.update(state="error", error=message)
            raise TGError(message)
        finally:
            try:
                path.unlink(missing_ok=True)
            except OSError:
                pass
            parent = path.parent
            try:
                if parent.is_dir() and not any(parent.iterdir()):
                    parent.rmdir()
            except OSError:
                pass

    def _cleanup_cache(self) -> None:
        appconfig.ensure_dirs()
        stale_uploads = time.time() - 24 * 3600
        try:
            for entry in (appconfig.CACHE_DIR / "uploads").iterdir():
                if entry.is_dir() and entry.stat().st_mtime < stale_uploads:
                    shutil.rmtree(entry, ignore_errors=True)
        except OSError:
            pass
        try:
            for entry in (appconfig.CACHE_DIR / "merge").iterdir():
                if entry.is_dir() and entry.stat().st_mtime < stale_uploads:
                    shutil.rmtree(entry, ignore_errors=True)
        except OSError:
            pass
        stale_thumbs = time.time() - 30 * 24 * 3600
        for pattern in ("*.thumb", "*.tmp"):
            try:
                for entry in appconfig.THUMB_DIR.glob(pattern):
                    if entry.stat().st_mtime < stale_thumbs:
                        entry.unlink(missing_ok=True)
            except OSError:
                pass


def _sniff_image(data: bytes) -> str:
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"GIF8"):
        return "image/gif"
    if len(data) > 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return "image/jpeg"


def _qr_svg(url: str) -> str:
    buffer = io.BytesIO()
    segno.make(url, error="m").save(
        buffer, kind="svg", scale=8, border=2, dark="#14213d", light="#ffffff"
    )
    return buffer.getvalue().decode("utf-8")
