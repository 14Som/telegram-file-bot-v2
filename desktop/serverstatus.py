"""Tells the window whether the server bot is alive.

The bot edits one pinned message (#tfeheartbeat) in the owner chat every
minute. The Explorer's MTProto session belongs to the same owner, so it reads
that message from any PC without knowing the VM address or the bot token.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any, Dict, Optional

from telethon.tl.types import InputMessagesFilterPinned

log = logging.getLogger("tfe.serverstatus")

MARKER = "#tfeheartbeat"
ONLINE_SECONDS = 180
STALE_SECONDS = 900
BOT_LOOKUP_SECONDS = 600.0
SCAN_LIMIT = 20

_bot: Dict[str, Any] = {"entity": None, "tried": 0.0}


def _payload(text: str) -> Optional[Dict[str, Any]]:
    if not text or MARKER not in text:
        return None
    try:
        data = json.loads(text.split(MARKER, 1)[1].strip())
    except ValueError:
        return None
    return data if isinstance(data, dict) else None


async def _helper_bot(service: Any) -> Optional[Any]:
    now = time.time()
    if _bot["entity"] is not None and now - _bot["tried"] < BOT_LOOKUP_SECONDS:
        return _bot["entity"]
    if now - _bot["tried"] < 30.0:
        return _bot["entity"]
    _bot["tried"] = now
    try:
        _bot["entity"] = await service._find_helper_bot()
    except Exception:
        log.exception("Could not locate the storage bot")
        _bot["entity"] = None
    return _bot["entity"]


async def _pinned_payload(client: Any, bot: Any, timeout: float) -> Optional[Dict[str, Any]]:
    async def read() -> Optional[Dict[str, Any]]:
        messages = await client.get_messages(
            bot, limit=5, filter=InputMessagesFilterPinned()
        )
        for message in messages or []:
            data = _payload(getattr(message, "message", "") or "")
            if data is not None:
                return data
        return None

    try:
        return await asyncio.wait_for(read(), timeout)
    except asyncio.TimeoutError:
        raise
    except Exception as exc:
        log.debug("Pinned heartbeat unreadable: %s", exc)
        return None


async def _recent_payload(client: Any, bot: Any, timeout: float) -> Optional[Dict[str, Any]]:
    async def read() -> Optional[Dict[str, Any]]:
        async for message in client.iter_messages(bot, limit=SCAN_LIMIT):
            data = _payload(getattr(message, "message", "") or "")
            if data is not None:
                return data
        return None

    try:
        return await asyncio.wait_for(read(), timeout)
    except asyncio.TimeoutError:
        raise
    except Exception as exc:
        log.debug("Recent heartbeat unreadable: %s", exc)
        return None


async def read(service: Any, timeout: float = 12.0) -> Dict[str, Any]:
    try:
        client = service._require_ready()
    except Exception:
        return {"state": "unknown", "reason": "Sign-in needed"}
    bot = await _helper_bot(service)
    if bot is None:
        return {"state": "unknown", "reason": "Storage bot not found"}
    try:
        data = await _pinned_payload(client, bot, timeout)
        if data is None:
            data = await _recent_payload(client, bot, timeout)
    except asyncio.TimeoutError:
        return {"state": "unknown", "reason": "Telegram timed out"}
    if data is None:
        return {"state": "none", "reason": "No heartbeat from the server yet"}
    try:
        ts = int(data.get("ts") or 0)
    except (TypeError, ValueError):
        ts = 0
    if not ts:
        return {"state": "none", "reason": "Heartbeat is unreadable"}
    age = max(0, int(time.time() - ts))
    if age <= ONLINE_SECONDS:
        state = "online"
    elif age <= STALE_SECONDS:
        state = "stale"
    else:
        state = "offline"
    return {
        "state": state,
        "age": age,
        "ts": ts,
        "version": str(data.get("version") or ""),
        "files": int(data.get("files") or 0),
        "uptime": int(data.get("uptime") or 0),
    }
