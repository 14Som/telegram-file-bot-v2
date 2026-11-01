"""Local HTTP server that powers the Telegram File Explorer window."""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import re
import secrets
import shutil
import sqlite3
import struct
import sys
import threading
import time
import uuid
import zlib
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, AsyncIterator, Dict, List, Optional, Set, Tuple
from urllib.parse import quote

from fastapi import FastAPI, File, Form, HTTPException, Query, Request, Response, UploadFile
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.concurrency import run_in_threadpool

from . import (
    appconfig,
    applock,
    filetypes,
    iteminfo,
    mediatools,
    movielookup,
    serverstatus,
    starlookup,
    storyboard,
    streamcache,
    thumbpick,
    vaultstore,
    winshell,
)
from .catalog import (
    Catalog,
    clean_folder_path,
    clean_name,
    folder_leaf,
    join_folder,
    normalize_tags,
)
from .splitmerge import merge_parts, parse_part_name, split_file
from .tg import (
    MAX_UPLOAD,
    PART_SIZE,
    TGError,
    TelegramService,
    TransferCancelled,
    friendly_error,
    media_hint,
)

log = logging.getLogger("tfe.server")

QUIT = threading.Event()
COOKIE = "tfe_session"
UI_DIR = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent.parent)) / "desktop" / "ui"
UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
# API paths that stay reachable while the app is PIN-locked (status, lock
# control and quit — none of them expose file data).
LOCK_OPEN_PATHS = {
    "/api/ping",
    "/api/status",
    "/api/unlock",
    "/api/lock",
    "/api/pin/recover",
    "/api/pin/reset",
    "/api/quit",
}
# Files above Telegram's per-file cap are split into volumes; this is the
# largest source file the app will accept and split.
SPLIT_HARD_CAP = 64 * 1024 ** 3
# Uploads are RTT-bound (Telegram takes 512 KiB parts), so a few files or
# volumes can be in flight at once. Stay modest to avoid FloodWait.
UPLOAD_CONCURRENCY = 4
_upload_gate: Optional[asyncio.Semaphore] = None


def _upload_semaphore() -> asyncio.Semaphore:
    global _upload_gate
    if _upload_gate is None:
        _upload_gate = asyncio.Semaphore(UPLOAD_CONCURRENCY)
    return _upload_gate
CSP = (
    "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; "
    "font-src 'self' data:; "
    "style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; "
    "frame-src 'self' blob:; object-src 'none'; base-uri 'none'; "
    "form-action 'self'; frame-ancestors 'self'"
)
PUBLIC_ITEM_KEYS = (
    "id", "message_id", "name", "kind", "kind_label", "mime", "size", "width",
    "height", "duration", "folder", "tags", "favorite", "caption", "note",
    "tg_date", "added_at", "hidden", "has_thumb", "thumb_version", "play_pos",
)


class SetupBody(BaseModel):
    api_id: str = ""
    api_hash: str = ""
    vault: str = ""


class VaultBody(BaseModel):
    vault: str


class VaultSwitchBody(BaseModel):
    id: str


class VaultDefaultBody(BaseModel):
    id: str = ""


class VaultCreateBody(BaseModel):
    name: str


class VaultBotBody(BaseModel):
    id: str = ""


class VaultRenameBody(BaseModel):
    id: str
    title: str


class VaultIconBody(BaseModel):
    id: str
    icon: str


class PhoneBody(BaseModel):
    phone: str


class CodeBody(BaseModel):
    code: str


class PasswordBody(BaseModel):
    password: str


class PinBody(BaseModel):
    pin: str = ""


class PinResetBody(BaseModel):
    code: str = ""
    pin: str = ""


class ItemPatch(BaseModel):
    name: Optional[str] = None
    folder: Optional[str] = None
    tags: Optional[str] = None
    favorite: Optional[bool] = None
    hidden: Optional[bool] = None
    note: Optional[str] = None


class MergeBody(BaseModel):
    item_id: int


class PlaybackBody(BaseModel):
    position: float = 0
    duration: float = 0


class MpvBody(BaseModel):
    position: float = 0


class ThumbPickBody(BaseModel):
    index: int


class TransferCancelBody(BaseModel):
    client: str = ""


class BatchIdsBody(BaseModel):
    item_ids: List[int]


class BatchDeleteBody(BatchIdsBody):
    remote: bool = False


class BatchFavoriteBody(BatchIdsBody):
    favorite: bool = True


class BatchMoveBody(BatchIdsBody):
    folder: str


class BatchCopyBody(BatchIdsBody):
    folder: str = ""


class BatchRenameBody(BatchIdsBody):
    template: str = "{name}"
    preview: bool = False


class CollectionBody(BaseModel):
    name: str = ""


class CollectionAddBody(BatchIdsBody):
    remove: bool = False


class ViewBody(BaseModel):
    name: str = ""
    data: Dict[str, Any] = {}


class TagMetaBody(BaseModel):
    tag: str = ""
    color: str = ""
    group: str = ""


class ThumbImageBody(BaseModel):
    image: str = ""


class StarBody(BaseModel):
    name: str = ""
    aliases: Optional[str] = None
    note: Optional[str] = None
    country: Optional[str] = None
    birthdate: Optional[str] = None
    height: Optional[str] = None
    hair: Optional[str] = None
    eyes: Optional[str] = None
    measurements: Optional[str] = None
    tattoos: Optional[str] = None
    piercings: Optional[str] = None
    favorite: Optional[bool] = None


class StarIdsBody(BaseModel):
    star_ids: List[int] = []


class BatchStarsBody(BatchIdsBody):
    star_ids: List[int] = []


class StarImageBody(BaseModel):
    item_id: int


class StarLookupBody(BaseModel):
    overwrite: bool = False


class MovieSearchBody(BaseModel):
    query: str = ""


class MovieBody(BaseModel):
    imdb_id: str
    add_cast: bool = True


class FolderBody(BaseModel):
    name: str
    icon: Optional[str] = None
    note: Optional[str] = None


class FolderPatch(BaseModel):
    name: str
    new_name: Optional[str] = None
    icon: Optional[str] = None
    note: Optional[str] = None


def _state(request: Request) -> Any:
    return request.app.state


def _spawn(state: Any, coro: Any) -> asyncio.Task:
    task = asyncio.create_task(coro)
    state.tasks.add(task)
    task.add_done_callback(state.tasks.discard)
    return task


def _host_allowed(host: str) -> bool:
    host = (host or "").strip().lower()
    if not host:
        return False
    if host.startswith("["):
        name = host[1 : host.find("]")] if "]" in host else host
    else:
        name = host.rsplit(":", 1)[0] if host.count(":") == 1 else host
    return name in {"127.0.0.1", "localhost", "::1"}


def _mutation_guard(request: Request) -> Optional[JSONResponse]:
    state = _state(request)
    if request.headers.get("x-tfe") != "1":
        return JSONResponse({"detail": "Missing app request header."}, status_code=403)
    if request.cookies.get(COOKIE) != state.key:
        return JSONResponse(
            {"detail": "This window is not authenticated. Reload the app."},
            status_code=403,
        )
    return None


def _telegram_link(item: Dict[str, Any], vault: Optional[Dict[str, Any]]) -> Optional[str]:
    if not vault:
        return None
    message_id = item.get("message_id")
    if not message_id:
        return None
    username = vault.get("username")
    if username:
        return f"https://t.me/{username}/{message_id}"
    try:
        channel_id = int(vault.get("channel_id") or vault.get("id"))
    except (TypeError, ValueError):
        return None
    channel_id = abs(channel_id)
    if channel_id > 1_000_000_000_000:
        channel_id -= 1_000_000_000_000
    return f"https://t.me/c/{channel_id}/{message_id}"


def public_item(item: Dict[str, Any], vault: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    data = {key: item.get(key) for key in PUBLIC_ITEM_KEYS if key in item}
    data["favorite"] = bool(item.get("favorite"))
    data["has_thumb"] = bool(item.get("has_thumb"))
    data["tag_list"] = (item.get("tags") or "").split()
    data["part_of"] = item.get("part_of")
    data["telegram_link"] = _telegram_link(item, vault)
    data["thumb_url"] = (
        f"/api/thumb/{item['id']}?v={int(item.get('thumb_version') or 0)}"
        if item.get("has_thumb")
        else None
    )
    data["stream_url"] = f"/api/stream/{item['id']}"
    data["download_url"] = f"/api/download/{item['id']}"
    data["imdb_id"] = str(item.get("imdb_id") or "")
    movie = None
    if item.get("imdb_json"):
        try:
            movie = json.loads(item["imdb_json"])
        except (TypeError, ValueError):
            movie = None
    data["movie"] = movie
    poster_version = int(item.get("imdb_poster_version") or 0)
    data["movie_poster_url"] = (
        f"/api/movies/{item['id']}/poster?v={poster_version}"
        if poster_version
        else None
    )
    meta = None
    if item.get("meta_json"):
        try:
            meta = json.loads(item["meta_json"])
        except (TypeError, ValueError):
            meta = None
    data["meta"] = meta
    data["family"] = filetypes.classify(
        str(item.get("name") or ""), str(item.get("kind") or "")
    )
    data["viewer"] = filetypes.viewer_format(str(item.get("name") or ""))
    return data


def _vault(status: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    return status.get("vault")


def _status_chat_id(status: Dict[str, Any]) -> Optional[int]:
    vault = status.get("vault")
    if not vault:
        return None
    try:
        channel_id = vault.get("channel_id")
        return int(channel_id) if channel_id else None
    except (TypeError, ValueError):
        return None


def _chat_id(state: Any) -> Optional[int]:
    return _status_chat_id(state.service.status())


async def _scoped_item(state: Any, item_id: int) -> Dict[str, Any]:
    item = await run_in_threadpool(state.catalog.get, item_id)
    chat_id = _chat_id(state)
    if item is None or chat_id is None or int(item.get("chat_id")) != int(chat_id):
        raise HTTPException(status_code=404, detail="File not found in this channel.")
    return item


def _star_image_path(star_id: int) -> Path:
    return appconfig.THUMB_DIR / "stars" / f"{int(star_id)}.img"


def _public_star(star: Dict[str, Any]) -> Dict[str, Any]:
    data = dict(star)
    version = int(data.get("image_version") or 0)
    data["image_url"] = (
        f"/api/stars/{data['id']}/image?v={version}" if version else None
    )
    return data


async def _scoped_star(state: Any, star_id: int) -> Dict[str, Any]:
    star = await run_in_threadpool(state.catalog.performer, star_id, _chat_id(state))
    if star is None:
        raise HTTPException(status_code=404, detail="Star not found in this vault.")
    return star


async def _attach_stars(state: Any, items: List[Dict[str, Any]]) -> None:
    if not items:
        return
    found = await run_in_threadpool(
        state.catalog.performers_for_items, [int(item["id"]) for item in items]
    )
    for item in items:
        item["stars"] = found.get(int(item["id"]), [])


def _looks_like_image(data: bytes) -> bool:
    return bool(
        data.startswith(b"\xff\xd8\xff")
        or data.startswith(b"\x89PNG\r\n\x1a\n")
        or data.startswith(b"GIF8")
        or (
            len(data) > 12
            and data[:4] == b"RIFF"
            and data[8:12] == b"WEBP"
        )
    )


def _store_star_image(star_id: int, data: bytes) -> int:
    path = _star_image_path(star_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_bytes(data)
    os.replace(tmp, path)
    return int(time.time() * 1000)


def _movie_poster_path(item_id: int) -> Path:
    return appconfig.THUMB_DIR / "movies" / f"{int(item_id)}.img"


def _store_movie_poster(item_id: int, data: bytes) -> int:
    path = _movie_poster_path(item_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_bytes(data)
    os.replace(tmp, path)
    return int(time.time() * 1000)


def _link_movie_cast(
    state: Any,
    chat_id: Optional[int],
    item_id: int,
    cast: List[Dict[str, Any]],
) -> Tuple[List[Tuple[Dict[str, Any], Dict[str, Any]]], int]:
    """Create or reuse star records for the IMDb cast and assign them."""
    linked: List[Tuple[Dict[str, Any], Dict[str, Any]]] = []
    created = 0
    for person in cast or []:
        name = clean_name(str(person.get("name") or ""), "")
        if not name:
            continue
        star = state.catalog.performer_by_name(chat_id, name)
        if star is None:
            try:
                star = state.catalog.create_performer(chat_id, name=name)
                created += 1
            except ValueError:
                star = state.catalog.performer_by_name(chat_id, name)
        if star is None:
            continue
        linked.append((star, person))
    if linked:
        state.catalog.add_item_performers(
            [int(item_id)], [int(star["id"]) for star, _ in linked], chat_id
        )
    return linked, created


def _store_cast_portraits(
    state: Any,
    chat_id: Optional[int],
    linked: List[Tuple[Dict[str, Any], Dict[str, Any]]],
    limit: int = 8,
) -> int:
    saved = 0
    for star, person in linked:
        if saved >= limit:
            break
        if int(star.get("image_version") or 0):
            continue
        data = movielookup.image(str(person.get("image") or ""), small=True)
        if not data:
            continue
        version = _store_star_image(int(star["id"]), data)
        state.catalog.set_performer_image(int(star["id"]), chat_id, version)
        saved += 1
    return saved


async def _portrait_bytes(
    state: Any, item: Dict[str, Any]
) -> Optional[Tuple[bytes, str]]:
    item_id = int(item["id"])
    custom = thumbpick.custom_path(item_id)
    if custom.is_file():
        return await run_in_threadpool(custom.read_bytes), "image/jpeg"
    cache = appconfig.THUMB_DIR / f"{item_id}.thumb"
    if cache.is_file():
        data = await run_in_threadpool(cache.read_bytes)
        return data, _sniff_image(data)
    if not item.get("has_thumb"):
        return None
    try:
        return await state.service.thumbnail(item)
    except TGError:
        return None


def _part_groups(state: Any) -> Dict[str, Dict[str, Any]]:
    """Group archive volumes by shared base name within the vault channel."""
    chat_id = _chat_id(state)
    groups: Dict[str, Dict[str, Any]] = {}
    if chat_id is None:
        return groups
    for row in state.catalog.name_index(chat_id):
        part = parse_part_name(row.get("name") or "")
        if part is None:
            continue
        key = f"{part['base'].lower()}|{part['ext']}"
        entry = groups.setdefault(
            key,
            {"base": part["base"], "count": 0, "size": 0, "nums": {}},
        )
        entry["count"] += 1
        entry["size"] += int(row.get("size") or 0)
        entry["nums"][int(part["num"])] = int(row["id"])
    return groups


def _attach_part_info(state: Any, items: List[Dict[str, Any]]) -> None:
    if not items:
        return
    groups = _part_groups(state)
    if not groups:
        return
    for item in items:
        part = parse_part_name(item.get("name") or "")
        if part is None:
            continue
        entry = groups.get(f"{part['base'].lower()}|{part['ext']}")
        if entry is None or entry["count"] < 2:
            continue
        item["part_of"] = {
            "base": entry["base"],
            "num": int(part["num"]),
            "count": entry["count"],
            "size": entry["size"],
        }


def parse_range(header: Optional[str], size: int) -> Optional[Tuple[int, int]]:
    """Return an inclusive (start, end) tuple, or None for an invalid range."""
    if not header or not header.strip():
        return None
    value = header.strip()
    if not value.lower().startswith("bytes="):
        return None
    spec = value[6:].split(",", 1)[0].strip()
    if "-" not in spec:
        return None
    start_text, end_text = spec.split("-", 1)
    try:
        if start_text == "":
            suffix = int(end_text)
            if suffix <= 0 or size <= 0:
                return None
            start = max(0, size - suffix)
            end = size - 1
        else:
            start = int(start_text)
            end = int(end_text) if end_text else size - 1
            if start < 0 or end < start or start >= max(size, 1):
                return None
            end = min(end, size - 1)
    except ValueError:
        return None
    return start, end


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


def _content_disposition(name: str, download: bool) -> str:
    ascii_name = re.sub(r"[^A-Za-z0-9._ ()-]", "_", name or "file").strip() or "file"
    return (
        f"{'attachment' if download else 'inline'}; filename=\"{ascii_name}\";"
        f" filename*=UTF-8''{quote(name or 'file')}"
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    appconfig.ensure_dirs()
    state = app.state
    state.service = TelegramService()
    state.key = secrets.token_urlsafe(32)
    state.bot_db = appconfig.PROJECT_DIR / "data" / "files.db"
    state.last_activity = time.time()
    state.tasks: Set[asyncio.Task] = set()
    state.merge_jobs: Dict[str, Dict[str, Any]] = {}
    state.vault_restore: Dict[str, Any] = {}
    await state.service.start()
    info = state.service.status()
    if info["authorized"] and info.get("vault"):
        try:
            state.vault_restore = await vaultstore.restore(state.service)
            if state.vault_restore.get("restored"):
                log.info(
                    "Library restored from the vault (%s)",
                    state.vault_restore.get("stamp"),
                )
        except Exception:
            log.exception("Vault data restore failed; using the local library")
    # After restore: a PIN that arrived with the vault snapshot must lock the
    # app on this boot too.
    state.locked = applock.has_pin()
    state.catalog = Catalog(appconfig.LIBRARY_PATH, _status_chat_id(state.service.status()))
    marked = await run_in_threadpool(
        state.catalog.ensure_has_thumb, _custom_thumb_ids()
    )
    if marked:
        log.info("Kept %d custom thumbnail(s) visible", marked)
    info = state.service.status()
    if info["authorized"] and info.get("vault"):
        # Snapshot zips uploaded since the last sync are indexed on boot; hide
        # them right away instead of leaving them visible until the next sync.
        _spawn(state, _hide_snapshots_quietly(state))
        _spawn(state, _prime_vaults(state))
    try:
        yield
    finally:
        for task in list(state.tasks):
            task.cancel()
        info = state.service.status()
        if info["authorized"] and info.get("vault"):
            try:
                await asyncio.wait_for(vaultstore.save(state.service), timeout=120.0)
            except Exception:
                log.exception("Vault data save on close failed")
        await state.service.close()


app = FastAPI(
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    title="Telegram File Explorer",
)


@app.middleware("http")
async def guard(request: Request, call_next):
    if not _host_allowed(request.headers.get("host", "")):
        return JSONResponse({"detail": "Local access only."}, status_code=403)
    state = _state(request)
    is_api = request.url.path.startswith("/api/")
    if is_api:
        state.last_activity = time.time()
    if is_api and request.url.path != "/api/ping":
        if request.cookies.get(COOKIE) != state.key:
            blocked = JSONResponse(
                {"detail": "This window is not authenticated. Reload the app."},
                status_code=403,
            )
            _apply_cookie(blocked, state.key)
            return blocked
    if is_api and state.locked and request.url.path not in LOCK_OPEN_PATHS:
        blocked = JSONResponse({"detail": "The app is locked."}, status_code=423)
        _apply_cookie(blocked, state.key)
        return blocked
    if request.method in UNSAFE_METHODS:
        blocked = _mutation_guard(request)
        if blocked is not None:
            _apply_cookie(blocked, _state(request).key)
            return blocked
    response = await call_next(request)
    _apply_cookie(response, _state(request).key)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    content_type = response.headers.get("content-type", "")
    if content_type.startswith("text/html"):
        response.headers.setdefault("Content-Security-Policy", CSP)
        response.headers.setdefault("Cache-Control", "no-store")
    elif request.url.path.startswith("/static/"):
        response.headers.setdefault("Cache-Control", "no-store")
    return response


def _apply_cookie(response: Response, key: str) -> None:
    if response.headers.get("set-cookie"):
        return
    response.set_cookie(
        COOKIE, key, httponly=True, samesite="strict", path="/", max_age=7 * 24 * 3600
    )


@app.exception_handler(TGError)
async def on_tg_error(request: Request, exc: TGError):
    return JSONResponse({"detail": str(exc)}, status_code=400)


@app.exception_handler(sqlite3.Error)
async def on_db_error(request: Request, exc: sqlite3.Error):
    log.exception("Database error on %s", request.url.path)
    return JSONResponse(
        {"detail": "The local library database could not be read. Close other copies and retry."},
        status_code=500,
    )


@app.exception_handler(Exception)
async def on_unhandled(request: Request, exc: Exception):
    log.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(
        {"detail": "Something went wrong. See explorer.log for details."},
        status_code=500,
    )


# ------------------------------------------------------------------- UI files
@app.get("/", include_in_schema=False)
async def index():
    return FileResponse(UI_DIR / "index.html", media_type="text/html")


@app.get("/favicon.svg", include_in_schema=False)
async def favicon():
    return FileResponse(UI_DIR / "favicon.svg", media_type="image/svg+xml")


app.mount("/static", StaticFiles(directory=str(UI_DIR)), name="static")


# --------------------------------------------------------------------- status
@app.get("/api/ping")
async def ping():
    return {"app": "telegram-file-explorer", "version": "2.0"}


@app.get("/api/status")
async def status(request: Request):
    state = _state(request)
    payload = state.service.status()
    payload["split_max"] = SPLIT_HARD_CAP
    chat_id = _chat_id(state)
    payload["stats"] = state.catalog.stats(chat_id)
    payload["folder_count"] = len(state.catalog.folders(chat_id))
    payload["tag_count"] = len(state.catalog.tags(chat_id))
    payload["locked"] = state.locked
    payload["pin_set"] = applock.has_pin()
    payload["pin_skipped"] = applock.pin_skipped()
    payload["pin_recovery"] = bool(payload.get("authorized")) and applock.has_pin()
    return JSONResponse(payload, headers={"Cache-Control": "no-store"})


SERVER_STATUS_SECONDS = 20.0


@app.get("/api/server")
async def server_status(request: Request):
    state = _state(request)
    cached = getattr(state, "server_status", None)
    now = time.time()
    if cached and now - cached.get("at", 0.0) < SERVER_STATUS_SECONDS:
        return JSONResponse(cached["data"], headers={"Cache-Control": "no-store"})
    info = state.service.status()
    if not (info.get("authorized") and info.get("vault")):
        data = {"state": "unknown", "reason": "Sign-in needed"}
    else:
        data = await serverstatus.read(state.service)
    state.server_status = {"at": now, "data": data}
    return JSONResponse(data, headers={"Cache-Control": "no-store"})


# ------------------------------------------------------------------ app lock
@app.post("/api/unlock")
async def unlock(body: PinBody, request: Request):
    state = _state(request)
    if not applock.has_pin():
        state.locked = False
        return {"unlocked": True}
    if not applock.verify(body.pin or ""):
        await asyncio.sleep(1.2)
        raise TGError("Wrong PIN.")
    state.locked = False
    return {"unlocked": True}


@app.post("/api/lock")
async def lock_now(request: Request):
    state = _state(request)
    if not applock.has_pin():
        raise TGError("Set a PIN first (Settings → Security).")
    state.locked = True
    return {"locked": True}


# ------------------------------------------------------------------- cache
CACHE_DIRS = ("stream", "thumbpicks", "inspect", "external", "reupload", "merge", "uploads")
REGENERATED_THUMB_DIRS = ("storyboards", "movies")


def _sweep_cache_dir(root: Path, totals: Dict[str, int]) -> None:
    if not root.is_dir():
        return
    dirs: List[Path] = []
    for path in root.rglob("*"):
        if path.is_dir():
            dirs.append(path)
            continue
        try:
            size = path.stat().st_size
            path.unlink()
        except OSError:
            totals["skipped"] += 1
            continue
        totals["freed"] += size
        totals["removed"] += 1
    for path in sorted(dirs, key=lambda item: len(item.parts), reverse=True):
        try:
            path.rmdir()
        except OSError:
            pass
    try:
        root.rmdir()
    except OSError:
        pass


def _clear_cache_files() -> Dict[str, int]:
    """Delete regenerable local data; picked covers and star art stay."""
    totals = {"freed": 0, "removed": 0, "skipped": 0}
    for name in CACHE_DIRS:
        _sweep_cache_dir(appconfig.CACHE_DIR / name, totals)
    for name in REGENERATED_THUMB_DIRS:
        _sweep_cache_dir(appconfig.THUMB_DIR / name, totals)
    for pattern in ("*.thumb", "*.tmp"):
        for path in appconfig.THUMB_DIR.glob(pattern):
            try:
                size = path.stat().st_size
                path.unlink()
            except OSError:
                totals["skipped"] += 1
                continue
            totals["freed"] += size
            totals["removed"] += 1
    return totals


def _transfers_busy(state: Any) -> bool:
    if state.service.sync_state.get("running"):
        return True
    for transfer in state.service.transfers.values():
        if transfer.get("busy"):
            return True
        if str(transfer.get("state") or "") not in {"done", "cancelled", "error"}:
            return True
    return False


@app.post("/api/cache/clear")
async def clear_cache(request: Request):
    state = _state(request)
    if state.locked:
        raise TGError("Unlock the app first.")
    if _transfers_busy(state):
        raise TGError("Wait for the current sync, upload or merge to finish.")
    totals = await run_in_threadpool(_clear_cache_files)
    log.info(
        "Cleared local cache: %d file(s), %.1f MB (%d in use)",
        totals["removed"],
        totals["freed"] / 1e6,
        totals["skipped"],
    )
    return totals


@app.post("/api/pin/set")
async def pin_set(body: PinBody, request: Request):
    state = _state(request)
    if state.locked:
        raise TGError("Unlock the app first.")
    try:
        applock.set_pin(body.pin or "")
    except ValueError as exc:
        raise TGError(str(exc))
    return {"pin_set": True}


@app.post("/api/pin/remove")
async def pin_remove(body: PinBody, request: Request):
    state = _state(request)
    if state.locked:
        raise TGError("Unlock the app first.")
    if applock.has_pin() and not applock.verify(body.pin or ""):
        await asyncio.sleep(1.2)
        raise TGError("Wrong PIN.")
    applock.clear_pin()
    state.locked = False
    return {"pin_set": False}


@app.post("/api/pin/skip")
async def pin_skip(request: Request):
    applock.mark_skipped()
    return {"skipped": True}


@app.post("/api/pin/recover")
async def pin_recover(request: Request):
    state = _state(request)
    if not applock.has_pin():
        raise TGError("There is no PIN to reset.")
    if not state.service.status().get("authorized"):
        raise TGError("Sign in to Telegram first; the recovery code is delivered there.")
    wait = applock.recovery_wait()
    if wait:
        raise TGError(f"Wait {wait} seconds before asking for another code.")
    code = applock.issue_recovery_code()
    try:
        message_id = await state.service.send_self_message(
            "Telegram File Explorer recovery code: "
            f"{code}\n\n"
            "Enter it on the lock screen within 10 minutes to set a new PIN. "
            "If you did not ask for this, ignore it and change your Telegram password."
        )
    except Exception as exc:
        applock.cancel_recovery()
        raise TGError(friendly_error(exc))
    log.info("PIN recovery code sent to Saved Messages (message %s)", message_id)
    return {
        "sent": True,
        "delivery": "Saved Messages",
        "retry_after": applock.RECOVERY_COOLDOWN,
    }


@app.post("/api/pin/reset")
async def pin_reset(body: PinResetBody, request: Request):
    state = _state(request)
    if not applock.has_pin():
        raise TGError("There is no PIN to reset.")
    if not applock.PIN_RE.fullmatch(body.pin or ""):
        raise TGError("The PIN must be exactly 4 digits.")
    if not applock.verify_recovery_code((body.code or "").strip()):
        await asyncio.sleep(1.2)
        raise TGError("Wrong or expired code. Ask for a new code.")
    applock.set_pin(body.pin)
    state.locked = False
    log.info("PIN reset with a Telegram recovery code")
    return {"pin_set": True, "unlocked": True}


def _thumb_cached(item_id: int) -> bool:
    return (
        appconfig.THUMB_DIR / f"{item_id}.thumb"
    ).is_file() or thumbpick.custom_path(item_id).is_file()


def _custom_thumb_ids() -> List[int]:
    ids: List[int] = []
    try:
        for path in appconfig.THUMB_DIR.glob("*.custom.jpg"):
            head = path.name.split(".", 1)[0]
            if head.isdigit():
                ids.append(int(head))
    except OSError:
        pass
    return ids


def _folders_with_covers(state, chat_id) -> List[Dict[str, Any]]:
    # Covers are fetched separately for the folders the UI is showing, so the
    # nav stays cheap even with a large library.
    return state.catalog.folders(chat_id)


@app.get("/api/folder-covers")
async def folder_covers(request: Request, folder: List[str] = Query(default=[])):
    state = _state(request)
    wanted = [name for name in folder if name][:80]
    covers = await run_in_threadpool(
        state.catalog.folder_covers,
        _chat_id(state),
        paths=wanted,
    )
    payload = {
        path: [
            {
                "url": f"/api/thumb/{cover['id']}?v={cover['version']}",
                "kind": cover["kind"],
            }
            for cover in entries
        ]
        for path, entries in covers.items()
    }
    return JSONResponse({"covers": payload}, headers={"Cache-Control": "no-store"})


@app.get("/api/nav")
async def nav(request: Request):
    state = _state(request)
    chat_id = _chat_id(state)
    payload = {
        "folders": _folders_with_covers(state, chat_id),
        "tags": state.catalog.tags(chat_id)[:120],
        "kinds": state.catalog.kinds(chat_id),
        "stats": state.catalog.stats(chat_id),
        "stars": state.catalog.performer_count(chat_id),
        "collections": state.catalog.collections(chat_id),
        "views": state.catalog.views(chat_id),
        "vault": state.service.status().get("vault"),
    }
    return JSONResponse(payload, headers={"Cache-Control": "no-store"})


@app.post("/api/folders")
async def create_folder(body: FolderBody, request: Request):
    state = _state(request)
    chat_id = _chat_id(state)
    try:
        name = await run_in_threadpool(
            state.catalog.create_folder, body.name, chat_id
        )
        if body.icon is not None or body.note is not None:
            await run_in_threadpool(
                state.catalog.set_folder_meta, name, body.icon, body.note, chat_id
            )
    except ValueError as exc:
        raise TGError(str(exc))
    return {
        "folder": name,
        "info": state.catalog.folder_info(name, chat_id),
        "folders": _folders_with_covers(state, chat_id),
    }


@app.patch("/api/folders")
async def update_folder(body: FolderPatch, request: Request):
    state = _state(request)
    chat_id = _chat_id(state)
    name = body.name
    if body.new_name is not None and body.new_name.strip() and body.new_name != body.name:
        old = clean_folder_path(body.name, "")
        try:
            name = await run_in_threadpool(
                state.catalog.rename_folder, body.name, body.new_name, chat_id
            )
        except ValueError as exc:
            raise TGError(str(exc))
        if chat_id is not None and state.service.is_bot_vault() and old:
            await run_in_threadpool(
                state.catalog.sync_folder_to_bot,
                state.bot_db,
                chat_id,
                old,
                name,
            )
    elif body.icon is None and body.note is None:
        raise TGError("Nothing to change.")
    if body.icon is not None or body.note is not None:
        try:
            await run_in_threadpool(
                state.catalog.set_folder_meta, name, body.icon, body.note, chat_id
            )
        except ValueError as exc:
            raise TGError(str(exc))
    return {
        "folder": name,
        "info": state.catalog.folder_info(name, chat_id),
        "folders": _folders_with_covers(state, chat_id),
    }


@app.get("/api/folders/info")
async def folder_info(request: Request, name: str = Query(..., max_length=180)):
    state = _state(request)
    info = await run_in_threadpool(state.catalog.folder_info, name, _chat_id(state))
    if info is None:
        raise HTTPException(status_code=404, detail="Folder not found.")
    return info


@app.delete("/api/folders")
async def delete_folder(request: Request, name: str = Query(..., max_length=180)):
    state = _state(request)
    removed = await run_in_threadpool(
        state.catalog.delete_folder, name, _chat_id(state)
    )
    if not removed:
        raise TGError("Only empty folders can be removed.")
    return {"deleted": True, "folders": _folders_with_covers(state, _chat_id(state))}


ZIP64_LIMIT = 0xFFFFFFFF


def _dos_stamp(value: Optional[str]) -> Tuple[int, int]:
    try:
        moment = datetime.fromisoformat((value or "").replace("Z", "+00:00"))
        if moment.tzinfo is not None:
            moment = moment.astimezone()
    except ValueError:
        moment = datetime.now()
    if moment.year < 1980:
        moment = datetime.now()
    dos_time = (moment.hour << 11) | (moment.minute << 5) | (moment.second // 2)
    dos_date = ((moment.year - 1980) << 9) | (moment.month << 5) | moment.day
    return dos_time, dos_date


def _zip_local_header(
    name: bytes, dos_time: int, dos_date: int, directory: bool, force_zip64: bool
) -> bytes:
    if directory:
        flags = 0x800
        version = 20
        extra = b""
    else:
        flags = 0x808
        version = 45 if force_zip64 else 20
        extra = struct.pack("<HHQQ", 0x0001, 16, 0, 0) if force_zip64 else b""
    return (
        struct.pack(
            "<IHHHHHIIIHH",
            0x04034B50,
            version,
            flags,
            0,
            dos_time,
            dos_date,
            0,
            0,
            0,
            len(name),
            len(extra),
        )
        + name
        + extra
    )


def _zip_central_header(
    name: bytes,
    dos_time: int,
    dos_date: int,
    crc: int,
    size: int,
    offset: int,
    directory: bool,
) -> bytes:
    flags = 0x800 if directory else 0x808
    external = ((0o40755 << 16) | 0x10) if directory else (0o100644 << 16)
    version = 20
    extra = b""
    size_field = size
    offset_field = offset
    if size >= ZIP64_LIMIT or offset >= ZIP64_LIMIT:
        version = 45
        values = b""
        if size >= ZIP64_LIMIT:
            values += struct.pack("<QQ", size, size)
            size_field = ZIP64_LIMIT
        if offset >= ZIP64_LIMIT:
            values += struct.pack("<Q", offset)
            offset_field = ZIP64_LIMIT
        extra = struct.pack("<HH", 0x0001, len(values)) + values
    return (
        struct.pack(
            "<IHHHHHHIIIHHHHHII",
            0x02014B50,
            version,
            version,
            flags,
            0,
            dos_time,
            dos_date,
            crc,
            size_field,
            size_field,
            len(name),
            len(extra),
            0,
            0,
            0,
            external,
            offset_field,
        )
        + name
        + extra
    )


def _zip_end(
    entries: List[Tuple[bytes, int, int, int, int, int, bool]], cd_offset: int
) -> bytes:
    directory = b"".join(
        _zip_central_header(name, dos_time, dos_date, crc, size, offset, is_dir)
        for name, dos_time, dos_date, crc, size, offset, is_dir in entries
    )
    count = len(entries)
    size = len(directory)
    if count >= 0xFFFF or size >= ZIP64_LIMIT or cd_offset >= ZIP64_LIMIT:
        eocd64 = struct.pack(
            "<IQHHIIQQQQ",
            0x06064B50,
            44,
            45,
            45,
            0,
            0,
            count,
            count,
            size,
            cd_offset,
        )
        locator = struct.pack("<IIQI", 0x07064B50, 0, cd_offset + size, 1)
        return (
            directory
            + eocd64
            + locator
            + struct.pack(
                "<IHHHHIIH",
                0x06054B50,
                0,
                0,
                0xFFFF,
                0xFFFF,
                ZIP64_LIMIT,
                ZIP64_LIMIT,
                0,
            )
        )
    return directory + struct.pack(
        "<IHHHHIIH", 0x06054B50, 0, 0, count, count, size, cd_offset, 0
    )


async def _zip_stream(
    state: Any,
    root_label: str,
    dir_names: List[str],
    items: List[Dict[str, Any]],
) -> AsyncIterator[bytes]:
    root = clean_name(root_label, "Folder")
    central: List[Tuple[bytes, int, int, int, int, int, bool]] = []
    used: Set[str] = set()
    offset = 0

    def unique(candidate: str, directory: bool) -> str:
        base, ext = os.path.splitext(candidate.rstrip("/"))
        attempt = candidate
        index = 2
        while attempt.lower() in used:
            attempt = f"{base} ({index}){ext}" + ("/" if directory else "")
            index += 1
        used.add(attempt.lower())
        return attempt

    stamp = _dos_stamp(None)
    folder_paths = [f"{root}/"]
    for rel in dir_names:
        if rel:
            folder_paths.append(f"{root}/{rel.strip('/')}/")
    for raw_path in folder_paths:
        arcname = unique(raw_path, True)
        raw = arcname.encode("utf-8")
        header = _zip_local_header(raw, stamp[0], stamp[1], True, False)
        central.append((raw, stamp[0], stamp[1], 0, 0, offset, True))
        offset += len(header)
        yield header

    for item in items:
        folder = item.get("folder") or ""
        if folder.lower() == root_label.lower():
            rel_folder = ""
        elif folder.lower().startswith(root_label.lower() + "/"):
            rel_folder = folder[len(root_label) + 1 :]
        else:
            rel_folder = ""
        candidate = (
            f"{root}/{rel_folder}/{item.get('name') or 'file'}"
            if rel_folder
            else f"{root}/{item.get('name') or 'file'}"
        )
        try:
            message, size, _mime = await state.service.media_info(item)
        except Exception as exc:
            log.warning("Skipping %s in folder archive: %s", item.get("id"), exc)
            continue
        force_zip64 = size >= ZIP64_LIMIT
        arcname = unique(candidate, False)
        raw = arcname.encode("utf-8")
        dos_time, dos_date = _dos_stamp(item.get("tg_date"))
        header = _zip_local_header(raw, dos_time, dos_date, False, force_zip64)
        header_offset = offset
        yield header
        offset += len(header)
        crc = 0
        written = 0
        async for chunk in state.service.stream_chunks(message, 0, size):
            if not chunk:
                continue
            crc = zlib.crc32(chunk, crc)
            written += len(chunk)
            yield chunk
        if force_zip64:
            descriptor = struct.pack(
                "<IIQQ", 0x08074B50, crc & ZIP64_LIMIT, written, written
            )
        else:
            descriptor = struct.pack(
                "<IIII", 0x08074B50, crc & ZIP64_LIMIT, written, written
            )
        yield descriptor
        offset += written + len(descriptor)
        central.append(
            (
                raw,
                dos_time,
                dos_date,
                crc & ZIP64_LIMIT,
                written,
                header_offset,
                False,
            )
        )
    yield _zip_end(central, offset)


@app.get("/api/folders/download")
async def download_folder(request: Request, name: str = Query(..., max_length=180)):
    state = _state(request)
    folder = clean_folder_path(name, "")
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found.")
    chat_id = _chat_id(state)
    info = await run_in_threadpool(state.catalog.folder_info, folder, chat_id)
    if info is None:
        raise HTTPException(status_code=404, detail="Folder not found.")
    items = await run_in_threadpool(state.catalog.folder_items, folder, chat_id)
    all_folders = await run_in_threadpool(state.catalog.folders, chat_id)
    lower = folder.lower()
    dir_names = [
        entry["folder"][len(folder) + 1 :]
        for entry in all_folders
        if entry["folder"].lower().startswith(lower + "/")
    ]
    zip_name = f"{folder_leaf(folder)}.zip"
    return StreamingResponse(
        _zip_stream(state, folder_leaf(folder), dir_names, items),
        media_type="application/zip",
        headers={
            "Content-Disposition": _content_disposition(zip_name, True),
            "Cache-Control": "no-store",
        },
    )


# ---------------------------------------------------------------------- login
@app.post("/api/setup")
async def setup(body: SetupBody, request: Request):
    state = _state(request)
    await state.service.configure(body.api_id, body.api_hash, body.vault)
    return state.service.status()


@app.post("/api/login/qr/start")
async def login_qr_start(request: Request):
    state = _state(request)
    return await state.service.start_qr()


@app.get("/api/login/qr")
async def login_qr_state(request: Request):
    state = _state(request)
    return state.service.qr_payload()


@app.post("/api/login/qr/cancel")
async def login_qr_cancel(request: Request):
    state = _state(request)
    return await state.service.cancel_qr()


@app.post("/api/vault")
async def set_vault(body: VaultBody, request: Request):
    state = _state(request)
    if not body.vault.strip():
        raise TGError("Choose a channel first.")
    await state.service.set_vault(body.vault)
    return state.service.status()


@app.get("/api/vaults")
async def list_vaults(request: Request, refresh: bool = False):
    state = _state(request)
    info = state.service.status()
    if not info["authorized"]:
        return JSONResponse(
            {"vaults": info.get("vaults") or [], "vault": info.get("vault")},
            headers={"Cache-Control": "no-store"},
        )
    entries = await state.service.list_vaults(refresh)
    return JSONResponse(
        {"vaults": entries, "vault": state.service.status().get("vault")},
        headers={"Cache-Control": "no-store"},
    )


async def _after_vault_change(state: Any) -> Dict[str, Any]:
    chat_id = _chat_id(state)
    if chat_id is not None:
        await run_in_threadpool(state.catalog.adopt_unscoped_folders, chat_id)
    _spawn(state, _sync_and_snapshot(state))
    await asyncio.sleep(0)
    info = state.service.status()
    return {
        "vault": info.get("vault"),
        "vaults": info.get("vaults"),
        "sync": info.get("sync"),
    }


@app.post("/api/vaults/switch")
async def switch_vault(body: VaultSwitchBody, request: Request):
    state = _state(request)
    if not body.id.strip():
        raise TGError("Choose a vault first.")
    await state.service.set_vault(body.id)
    return await _after_vault_change(state)


@app.post("/api/vaults/default")
async def set_default_vault(body: VaultDefaultBody, request: Request):
    state = _state(request)
    return state.service.set_default_vault(body.id)


@app.post("/api/vaults/create")
async def create_vault(body: VaultCreateBody, request: Request):
    state = _state(request)
    result = await state.service.create_vault(body.name)
    data = await _after_vault_change(state)
    data["bot"] = result.get("bot")
    return data


@app.post("/api/vaults/bot")
async def add_vault_bot(body: VaultBotBody, request: Request):
    state = _state(request)
    return await state.service.add_helper_bot(body.id.strip() or None)


@app.post("/api/vaults/rename")
async def rename_vault(body: VaultRenameBody, request: Request):
    state = _state(request)
    return await state.service.rename_vault(body.id.strip(), body.title)


@app.post("/api/vaults/icon")
async def set_vault_icon(body: VaultIconBody, request: Request):
    state = _state(request)
    return state.service.set_vault_icon(body.id.strip(), body.icon)


@app.get("/api/channels")
async def channels(request: Request, q: str = Query("", max_length=100)):
    state = _state(request)
    return {"channels": await state.service.list_channels(q)}


@app.post("/api/login/send_code")
async def login_send_code(body: PhoneBody, request: Request):
    state = _state(request)
    return await state.service.send_code(body.phone)


@app.post("/api/login/code")
async def login_code(body: CodeBody, request: Request):
    state = _state(request)
    return await state.service.verify_code(body.code)


@app.post("/api/login/password")
async def login_password(body: PasswordBody, request: Request):
    state = _state(request)
    return await state.service.verify_password(body.password)


@app.post("/api/logout")
async def logout(request: Request):
    state = _state(request)
    return await state.service.logout()


@app.post("/api/reconnect")
async def reconnect(request: Request):
    state = _state(request)
    return await state.service.reconnect()


@app.post("/api/quit")
async def quit_app(request: Request):
    QUIT.set()
    return {"quitting": True}


# ----------------------------------------------------------------------- sync
@app.post("/api/sync")
async def sync_now(request: Request, full: bool = False):
    state = _state(request)
    info = state.service.status()
    if info["sync"].get("running"):
        return {"started": False, "sync": info["sync"]}
    if not info["authorized"]:
        raise TGError("Log in first.")
    if not info["vault"]:
        raise TGError("Choose your channel first.")
    _spawn(state, _sync_and_snapshot(state, full))
    await asyncio.sleep(0)
    return {"started": True, "sync": state.service.sync_state}


async def _sync_and_snapshot(state, full: bool = False) -> None:
    if not await state.service.sync(state.catalog, state.bot_db, full=full):
        return
    info = state.service.status()
    if not (info["authorized"] and info.get("vault")):
        return
    try:
        await vaultstore.save(state.service)
    except Exception:
        log.exception("Vault data save after sync failed")
        return
    try:
        await _hide_snapshots(state)
    except Exception:
        log.exception("Could not hide vault data snapshots")


async def _hide_snapshots(state) -> None:
    chat_id = _chat_id(state)
    result = await run_in_threadpool(
        state.catalog.list,
        q=vaultstore.PREFIX,
        limit=50,
        chat_id=chat_id,
    )
    for item in result.get("items", []):
        await run_in_threadpool(state.catalog.hide, item["id"])
    removed = await run_in_threadpool(
        state.catalog.prune_snapshots, chat_id, vaultstore.KEEP
    )
    if removed:
        log.info("Removed %d stale snapshot row(s) from the library", removed)


async def _hide_snapshots_quietly(state) -> None:
    try:
        await _hide_snapshots(state)
    except Exception:
        log.exception("Could not hide vault data snapshots at startup")


async def _prime_vaults(state) -> None:
    """Discover storage channels in the background as soon as the app opens."""
    try:
        entries = await state.service.list_vaults(refresh=True)
        log.info("Found %d storage vault(s)", len(entries))
    except Exception as exc:
        log.warning("Could not scan for storage vaults: %s", friendly_error(exc))


@app.get("/api/sync")
async def sync_status(request: Request):
    return {"sync": _state(request).service.sync_state}


# ---------------------------------------------------------------------- items
@app.get("/api/items")
async def items(
    request: Request,
    q: str = Query("", max_length=200),
    kind: str = Query("", max_length=30),
    folder: str = Query("", max_length=180),
    tag: str = Query("", max_length=80),
    favorite: bool = False,
    hidden: bool = False,
    recursive: bool = False,
    note: bool = False,
    star: Optional[int] = Query(None, ge=1),
    collection: Optional[int] = Query(None, ge=1),
    watching: bool = False,
    min_size: Optional[int] = Query(None, ge=0),
    max_size: Optional[int] = Query(None, ge=0),
    after: str = Query("", max_length=10),
    before: str = Query("", max_length=10),
    sort: str = Query("date", max_length=20),
    direction: str = Query("desc", max_length=4),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    cursor: str = Query("", max_length=400),
):
    state = _state(request)
    for value in (after, before):
        if value and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            raise TGError("Dates must use the YYYY-MM-DD format.")
    if min_size is not None and max_size is not None and min_size > max_size:
        raise TGError("The minimum size is larger than the maximum size.")
    result = await run_in_threadpool(
        state.catalog.list,
        q=q,
        kind=kind,
        folder=folder,
        tag=tag,
        favorite=favorite,
        sort=sort,
        direction=direction,
        limit=limit,
        offset=offset,
        hidden_only=hidden,
        chat_id=_chat_id(state),
        min_size=min_size,
        max_size=max_size,
        after=after,
        before=before,
        has_note=note,
        recursive=recursive,
        performer=star,
        collection=collection,
        watching=watching,
        cursor=cursor,
    )
    vault = _vault(state.service.status())
    result["items"] = [public_item(item, vault) for item in result["items"]]
    _attach_part_info(state, result["items"])
    await _attach_stars(state, result["items"])
    return JSONResponse(result, headers={"Cache-Control": "no-store"})


@app.get("/api/items/{item_id}")
async def get_item(item_id: int, request: Request):
    state = _state(request)
    item = await _scoped_item(state, item_id)
    public = public_item(item, _vault(state.service.status()))
    public["collections"] = await run_in_threadpool(
        state.catalog.item_collections, item_id, _chat_id(state)
    )
    _attach_part_info(state, [public])
    await _attach_stars(state, [public])
    return public


@app.patch("/api/items/{item_id}")
async def patch_item(item_id: int, body: ItemPatch, request: Request):
    state = _state(request)
    item = await _scoped_item(state, item_id)
    warning: Optional[str] = None
    if body.name is not None:
        name = clean_name(body.name, "")
        if not name:
            raise TGError("A file name cannot be empty.")
        item = await run_in_threadpool(state.catalog.rename, item_id, name)
        if item is None:
            raise HTTPException(status_code=404, detail="File not found.")
        if state.service.is_bot_vault():
            Catalog.sync_to_bot(state.bot_db, item["message_id"], name=item["name"])
        try:
            await state.service.edit_caption(
                item["message_id"], item["name"], item.get("chat_id")
            )
        except TGError as exc:
            warning = (
                "Renamed in the explorer, but the Telegram caption could not be "
                f"updated: {exc}"
            )
    if body.folder is not None:
        folder = clean_folder_path(body.folder, "")
        if not folder:
            raise TGError("Choose or type a folder name.")
        item = await run_in_threadpool(state.catalog.move, item_id, folder)
        if item is not None and state.service.is_bot_vault():
            Catalog.sync_to_bot(
                state.bot_db, item["message_id"], category=folder.lower()
            )
    if body.tags is not None:
        item = await run_in_threadpool(state.catalog.set_tags, item_id, body.tags)
        if item is not None and state.service.is_bot_vault():
            Catalog.sync_to_bot(state.bot_db, item["message_id"], tags=item["tags"])
    if body.favorite is not None:
        item = await run_in_threadpool(
            state.catalog.set_favorite, item_id, body.favorite
        )
        if item is not None and state.service.is_bot_vault():
            Catalog.sync_to_bot(
                state.bot_db, item["message_id"], favorite=1 if body.favorite else 0
            )
    if body.hidden is not None:
        item = await run_in_threadpool(
            state.catalog.update, item_id, hidden=1 if body.hidden else 0
        )
    if body.note is not None:
        item = await run_in_threadpool(state.catalog.set_note, item_id, body.note)
    if item is None:
        raise HTTPException(status_code=404, detail="File not found.")
    public = public_item(item, _vault(state.service.status()))
    await _attach_stars(state, [public])
    return {"item": public, "warning": warning}


@app.post("/api/items/{item_id}/position")
async def save_position(item_id: int, body: PlaybackBody, request: Request):
    state = _state(request)
    item = await _scoped_item(state, item_id)
    position = max(0.0, float(body.position or 0))
    duration = float(body.duration or item.get("duration") or 0)
    # Finished files start from the beginning next time.
    if duration and position >= duration - 5:
        position = 0.0
    await run_in_threadpool(
        state.catalog.update,
        item_id,
        play_pos=round(position, 2),
        played_at=datetime.now().isoformat(timespec="seconds") if position else "",
    )
    return {"saved": True, "play_pos": position}


# --------------------------------------------------------------------- movies
@app.post("/api/items/{item_id}/movie/search")
async def movie_search(item_id: int, body: MovieSearchBody, request: Request):
    state = _state(request)
    item = await _scoped_item(state, item_id)
    guess = movielookup.guess_title(item.get("name") or "")
    query = str(body.query or "").strip() or str(guess.get("query") or "")
    if not query:
        raise TGError("Type a movie name to search IMDb.")
    try:
        results = await run_in_threadpool(movielookup.search, query)
        if not results and guess.get("query") and query != guess["query"]:
            results = await run_in_threadpool(
                movielookup.search, str(guess["query"])
            )
    except movielookup.LookupError as exc:
        raise TGError(str(exc))
    for result in results:
        poster = str(result.pop("poster", "") or "")
        result["poster_url"] = (
            "/api/imdb/image?url=" + quote(poster, safe="") if poster else None
        )
    return {
        "query": query,
        "year": guess.get("year"),
        "results": results,
        "url": "https://www.imdb.com/",
    }


@app.post("/api/items/{item_id}/movie")
async def attach_movie(item_id: int, body: MovieBody, request: Request):
    state = _state(request)
    item = await _scoped_item(state, item_id)
    try:
        result = await run_in_threadpool(movielookup.lookup, body.imdb_id)
    except movielookup.LookupError as exc:
        raise TGError(str(exc))
    movie = result["movie"]
    poster = result.get("image_bytes")
    poster_version = (
        await run_in_threadpool(_store_movie_poster, item["id"], poster)
        if poster
        else 0
    )
    item = await run_in_threadpool(
        state.catalog.update,
        item["id"],
        imdb_id=movie["id"],
        imdb_json=json.dumps(movie, ensure_ascii=False),
        imdb_poster_version=poster_version,
    )
    linked: List[Tuple[Dict[str, Any], Dict[str, Any]]] = []
    created = 0
    portraits = 0
    if body.add_cast:
        linked, created = await run_in_threadpool(
            _link_movie_cast, state, _chat_id(state), item["id"], movie.get("cast")
        )
        portraits = await run_in_threadpool(
            _store_cast_portraits, state, _chat_id(state), linked
        )
    public = public_item(item, _vault(state.service.status()))
    await _attach_stars(state, [public])
    return {
        "item": public,
        "movie": movie,
        "poster": bool(poster_version),
        "cast_linked": len(linked),
        "cast_created": created,
        "portraits": portraits,
    }


@app.delete("/api/items/{item_id}/movie")
async def clear_movie(item_id: int, request: Request):
    state = _state(request)
    item = await _scoped_item(state, item_id)
    item = await run_in_threadpool(
        state.catalog.update,
        item["id"],
        imdb_id="",
        imdb_json="",
        imdb_poster_version=0,
    )
    await run_in_threadpool(
        _movie_poster_path(item["id"]).unlink, missing_ok=True
    )
    public = public_item(item, _vault(state.service.status()))
    await _attach_stars(state, [public])
    return {"item": public, "cleared": True}


@app.get("/api/movies/{item_id}/poster")
async def movie_poster(item_id: int, request: Request):
    state = _state(request)
    item = await _scoped_item(state, item_id)
    if int(item.get("imdb_poster_version") or 0) <= 0:
        raise HTTPException(status_code=404, detail="No poster for this file.")
    path = _movie_poster_path(item["id"])
    if not await run_in_threadpool(path.is_file):
        raise HTTPException(status_code=404, detail="No poster for this file.")
    data = await run_in_threadpool(path.read_bytes)
    return Response(
        content=data,
        media_type=_sniff_image(data),
        headers={"Cache-Control": "private, max-age=86400"},
    )


@app.get("/api/imdb/image")
async def imdb_image(url: str = Query("", max_length=1200)):
    data = await run_in_threadpool(movielookup.image, url, True)
    if not data:
        raise HTTPException(status_code=404, detail="Image not available.")
    return Response(
        content=data,
        media_type=_sniff_image(data),
        headers={"Cache-Control": "private, max-age=86400"},
    )


# ---------------------------------------------------------------------- stars
@app.get("/api/stars")
async def stars(
    request: Request,
    q: str = Query("", max_length=120),
    item: Optional[int] = Query(None, ge=1),
    limit: int = Query(500, ge=1, le=2000),
):
    state = _state(request)
    found = await run_in_threadpool(
        state.catalog.performers, _chat_id(state), q, limit
    )
    payload = [_public_star(star) for star in found]
    if item is not None:
        scoped = await _scoped_item(state, item)
        assigned = {
            entry["id"]
            for entry in await run_in_threadpool(
                state.catalog.item_performers, scoped["id"]
            )
        }
        for star in payload:
            star["assigned"] = int(star["id"]) in assigned
    return JSONResponse(
        {"stars": payload, "total": len(payload)},
        headers={"Cache-Control": "no-store"},
    )


@app.post("/api/stars")
async def create_star(body: StarBody, request: Request):
    state = _state(request)
    values = body.model_dump(exclude_unset=True)
    if not str(values.get("name") or "").strip():
        raise TGError("A star needs a name.")
    try:
        star = await run_in_threadpool(
            state.catalog.create_performer, _chat_id(state), **values
        )
    except ValueError as exc:
        raise TGError(str(exc))
    return _public_star(star)


@app.patch("/api/stars/{star_id}")
async def update_star(star_id: int, body: StarBody, request: Request):
    state = _state(request)
    await _scoped_star(state, star_id)
    values = body.model_dump(exclude_unset=True)
    if "name" in values and not str(values["name"] or "").strip():
        raise TGError("A star needs a name.")
    try:
        star = await run_in_threadpool(
            state.catalog.update_performer,
            star_id,
            _chat_id(state),
            **values,
        )
    except ValueError as exc:
        raise TGError(str(exc))
    if star is None:
        raise HTTPException(status_code=404, detail="Star not found in this vault.")
    return _public_star(star)


@app.delete("/api/stars/{star_id}")
async def delete_star(star_id: int, request: Request):
    state = _state(request)
    await _scoped_star(state, star_id)
    removed = await run_in_threadpool(
        state.catalog.delete_performer, star_id, _chat_id(state)
    )
    if not removed:
        raise HTTPException(status_code=404, detail="Star not found in this vault.")
    await run_in_threadpool(
        _star_image_path(star_id).unlink, missing_ok=True
    )
    return {"deleted": True, "star_id": star_id}


@app.get("/api/stars/{star_id}/image")
async def star_image(star_id: int, request: Request):
    state = _state(request)
    await _scoped_star(state, star_id)
    path = _star_image_path(star_id)
    if not await run_in_threadpool(path.is_file):
        raise HTTPException(status_code=404, detail="No star image yet.")
    data = await run_in_threadpool(path.read_bytes)
    return Response(
        content=data,
        media_type=_sniff_image(data),
        headers={"Cache-Control": "private, max-age=86400"},
    )


@app.get("/api/stars/{star_id}")
async def star_detail(star_id: int, request: Request):
    state = _state(request)
    return _public_star(await _scoped_star(state, star_id))


@app.post("/api/stars/{star_id}/image/from-item")
async def star_image_from_item(
    star_id: int, body: StarImageBody, request: Request
):
    state = _state(request)
    await _scoped_star(state, star_id)
    item = await _scoped_item(state, body.item_id)
    result = await _portrait_bytes(state, item)
    if not result:
        raise TGError("That file has no thumbnail to use yet.")
    data, _ = result
    version = await run_in_threadpool(_store_star_image, star_id, data)
    await run_in_threadpool(
        state.catalog.set_performer_image, star_id, _chat_id(state), version
    )
    return _public_star(await _scoped_star(state, star_id))


@app.post("/api/stars/{star_id}/image")
async def star_image_upload(
    star_id: int, request: Request, file: UploadFile = File(...)
):
    state = _state(request)
    await _scoped_star(state, star_id)
    limit = 12 * 1024 * 1024
    data = await file.read(limit + 1)
    await file.close()
    if not data:
        raise TGError("The image is empty.")
    if len(data) > limit:
        raise TGError("Choose an image under 12 MB.")
    if not _looks_like_image(data):
        raise TGError("That file is not a JPEG, PNG, GIF or WebP image.")
    version = await run_in_threadpool(_store_star_image, star_id, data)
    await run_in_threadpool(
        state.catalog.set_performer_image, star_id, _chat_id(state), version
    )
    return _public_star(await _scoped_star(state, star_id))


@app.post("/api/stars/{star_id}/lookup")
async def star_lookup(
    star_id: int, body: StarLookupBody, request: Request
):
    state = _state(request)
    star = await _scoped_star(state, star_id)
    try:
        result = await run_in_threadpool(
            starlookup.lookup,
            str(star.get("name") or ""),
            str(star.get("aliases") or ""),
        )
    except starlookup.LookupError as exc:
        raise TGError(str(exc))
    fields = result.get("fields") or {}
    updates = starlookup.apply_fields(star, fields, body.overwrite)
    if updates:
        star = await run_in_threadpool(
            state.catalog.update_performer,
            star_id,
            _chat_id(state),
            **updates,
        )
    image_saved = False
    image = result.get("image_bytes")
    if image and (body.overwrite or not int(star.get("image_version") or 0)):
        version = await run_in_threadpool(_store_star_image, star_id, image)
        await run_in_threadpool(
            state.catalog.set_performer_image, star_id, _chat_id(state), version
        )
        star = await _scoped_star(state, star_id)
        image_saved = True
    return {
        "star": _public_star(star),
        "source": result.get("source"),
        "source_url": result.get("source_url"),
        "title": result.get("title"),
        "applied": sorted(updates),
        "image": image_saved,
    }


@app.put("/api/items/{item_id}/stars")
async def set_item_stars(
    item_id: int, body: StarIdsBody, request: Request
):
    state = _state(request)
    item = await _scoped_item(state, item_id)
    try:
        assigned = await run_in_threadpool(
            state.catalog.set_item_performers,
            item["id"],
            body.star_ids,
            _chat_id(state),
        )
    except ValueError as exc:
        raise TGError(str(exc))
    return {"item_id": item["id"], "stars": assigned}


@app.post("/api/items/stars")
async def add_item_stars(body: BatchStarsBody, request: Request):
    state = _state(request)
    ids = list(dict.fromkeys(int(value) for value in body.item_ids))[:500]
    if not ids:
        raise TGError("Choose at least one file.")
    star_ids = list(dict.fromkeys(int(value) for value in body.star_ids))
    if not star_ids:
        raise TGError("Choose at least one star.")
    try:
        links = await run_in_threadpool(
            state.catalog.add_item_performers,
            ids,
            star_ids,
            _chat_id(state),
        )
    except ValueError as exc:
        raise TGError(str(exc))
    return {"files": len(ids), "stars": len(star_ids), "links": links}


# ----------------------------------------------------- 3D, CAD and extras
INSPECT_MAX_BYTES = 512 * 1024 ** 2
SHELL_THUMB_MAX_BYTES = 256 * 1024 ** 2
_external_locks: Dict[int, asyncio.Lock] = {}
_shell_thumb_locks: Dict[int, asyncio.Lock] = {}


def _scratch_path(item: Dict[str, Any], tag: str) -> Path:
    folder = appconfig.CACHE_DIR / tag / f"{int(item['id'])}-{uuid.uuid4().hex[:10]}"
    folder.mkdir(parents=True, exist_ok=True)
    return folder / clean_name(str(item.get("name") or "file"), "file")


async def _download_item_copy(state: Any, item: Dict[str, Any], tag: str) -> Path:
    message, _size, _mime = await state.service.media_info(item)
    path = _scratch_path(item, tag)
    try:
        await state.service.download_to(message, path)
    except Exception:
        shutil.rmtree(path.parent, ignore_errors=True)
        raise
    return path


def _drop_copy(path: Path) -> None:
    shutil.rmtree(path.parent, ignore_errors=True)


def _public_meta(info: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    return info if isinstance(info, dict) else None


@app.post("/api/items/{item_id}/inspect")
async def inspect_item(item_id: int, request: Request):
    state = _state(request)
    item = await _scoped_item(state, item_id)
    size = int(item.get("size") or 0)
    if size > INSPECT_MAX_BYTES:
        info = {
            "type": item.get("kind") or "file",
            "fields": [],
            "size": size,
            "note": "This file is too large to inspect on this PC.",
        }
    else:
        path = await _download_item_copy(state, item, "inspect")
        try:
            info = await run_in_threadpool(
                iteminfo.inspect_file, path, str(item.get("name") or path.name)
            )
        finally:
            _drop_copy(path)
    info.setdefault("size", size)
    updated = await run_in_threadpool(
        state.catalog.update,
        item_id,
        meta_json=json.dumps(info, ensure_ascii=False),
    )
    public = public_item(updated or item, _vault(state.service.status()))
    await _attach_stars(state, [public])
    return {"item": public, "info": info}


async def _windows_thumbnail(state: Any, item: Dict[str, Any]) -> bytes:
    if os.name != "nt":
        raise TGError("Windows previews are only available on Windows.")
    size = int(item.get("size") or 0)
    if size > SHELL_THUMB_MAX_BYTES:
        raise TGError("This file is too large to build a Windows preview.")
    cache = appconfig.THUMB_DIR / f"{int(item['id'])}.thumb"
    lock = _shell_thumb_locks.setdefault(int(item["id"]), asyncio.Lock())
    async with lock:
        if cache.is_file():
            return await run_in_threadpool(cache.read_bytes)
        path = await _download_item_copy(state, item, "shellthumb")
        try:
            data = await run_in_threadpool(winshell.thumbnail, path, 640)
        finally:
            _drop_copy(path)
        if not data:
            raise TGError("Windows has no preview for this file.")
        appconfig.THUMB_DIR.mkdir(parents=True, exist_ok=True)
        tmp = cache.with_suffix(".tmp")
        await run_in_threadpool(tmp.write_bytes, data)
        os.replace(tmp, cache)
        await run_in_threadpool(
            state.catalog.update,
            item["id"],
            has_thumb=1,
            thumb_version=int(time.time()),
        )
        return data


@app.post("/api/items/{item_id}/thumb/windows")
async def windows_thumbnail(item_id: int, request: Request):
    state = _state(request)
    item = await _scoped_item(state, item_id)
    await _windows_thumbnail(state, item)
    updated = await run_in_threadpool(state.catalog.get, item_id)
    public = public_item(updated or item, _vault(state.service.status()))
    await _attach_stars(state, [public])
    return {"item": public, "ok": True}


@app.post("/api/items/{item_id}/thumb/image")
async def set_thumb_image(item_id: int, body: ThumbImageBody, request: Request):
    state = _state(request)
    item = await _scoped_item(state, item_id)
    marker = "data:image/jpeg;base64,"
    raw = str(body.image or "").strip()
    if not raw.startswith(marker):
        raise TGError("Send the thumbnail as a JPEG image.")
    try:
        data = base64.b64decode(raw[len(marker):], validate=True)
    except Exception:
        raise TGError("That image could not be read.")
    if (
        not data
        or len(data) > 8 * 1024 * 1024
        or not data.startswith(b"\xff\xd8")
    ):
        raise TGError("That image is not a usable JPEG.")
    target = thumbpick.custom_path(item_id)
    target.parent.mkdir(parents=True, exist_ok=True)
    await run_in_threadpool(target.write_bytes, data)
    updated = await run_in_threadpool(
        state.catalog.update,
        item_id,
        has_thumb=1,
        thumb_version=int(time.time()),
    )
    public = public_item(updated or item, _vault(state.service.status()))
    await _attach_stars(state, [public])
    return {"item": public, "ok": True}


@app.post("/api/items/{item_id}/open-external")
async def open_external_item(item_id: int, request: Request):
    state = _state(request)
    item = await _scoped_item(state, item_id)
    if os.name != "nt":
        raise TGError("Opening files in their own app is only available on Windows.")
    lock = _external_locks.setdefault(int(item["id"]), asyncio.Lock())
    async with lock:
        folder = appconfig.CACHE_DIR / "external" / str(int(item["id"]))
        folder.mkdir(parents=True, exist_ok=True)
        path = folder / clean_name(str(item.get("name") or "file"), "file")
        size = int(item.get("size") or 0)
        if not path.is_file() or (size and path.stat().st_size != size):
            message, _size, _mime = await state.service.media_info(item)
            await state.service.download_to(message, path)
        await run_in_threadpool(os.startfile, str(path))
    return {"opened": True, "name": path.name}


def _rename_target(item: Dict[str, Any], template: str, index: int) -> str:
    stem, ext = os.path.splitext(str(item.get("name") or ""))
    folder = str(item.get("folder") or "")
    values = {
        "name": stem,
        "ext": ext.lstrip("."),
        "kind": str(item.get("kind_label") or item.get("kind") or "File"),
        "folder": folder_leaf(folder) if folder else "Other",
        "date": str(item.get("tg_date") or item.get("added_at") or "")[:10],
        "n": index,
        "nn": f"{index:02d}",
    }

    class _Values(dict):
        def __missing__(self, key: str) -> str:
            return "{" + key + "}"

    try:
        proposed = str(template or "{name}").format_map(_Values(values))
    except (ValueError, IndexError, KeyError):
        raise TGError("That name template is not valid.")
    if "ext" not in str(template or ""):
        proposed += ext
    return clean_name(proposed, stem or "file")


@app.post("/api/batch/rename")
async def batch_rename(body: BatchRenameBody, request: Request):
    state = _state(request)
    items = await _batch_items(state, body.item_ids)
    proposed: List[Dict[str, Any]] = []
    used: Dict[str, int] = {}
    for index, item in enumerate(items, start=1):
        target = _rename_target(item, body.template, index)
        key = target.lower()
        if key in used:
            used[key] += 1
            stem, ext = os.path.splitext(target)
            target = f"{stem} ({used[key]}){ext}"
        else:
            used[key] = 1
        proposed.append({"id": item["id"], "from": item.get("name"), "to": target})
    changes = [entry for entry in proposed if entry["from"] != entry["to"]]
    if body.preview:
        return {"renames": proposed, "applied": 0, "preview": True}
    applied = 0
    warnings = 0
    for item, entry in zip(items, proposed):
        if entry["from"] == entry["to"]:
            continue
        updated = await run_in_threadpool(state.catalog.rename, item["id"], entry["to"])
        if updated is None:
            continue
        applied += 1
        if state.service.is_bot_vault():
            Catalog.sync_to_bot(state.bot_db, updated["message_id"], name=updated["name"])
        try:
            await state.service.edit_caption(
                updated["message_id"], updated["name"], updated.get("chat_id")
            )
        except TGError:
            warnings += 1
    return {"renames": changes, "applied": applied, "warnings": warnings, "preview": False}


@app.get("/api/collections")
async def list_collections(request: Request):
    state = _state(request)
    return {"collections": state.catalog.collections(_chat_id(state))}


@app.post("/api/collections")
async def create_collection(body: CollectionBody, request: Request):
    state = _state(request)
    try:
        collection = await run_in_threadpool(
            state.catalog.create_collection, body.name, _chat_id(state)
        )
    except ValueError as exc:
        raise TGError(str(exc))
    return {"collection": collection}


@app.patch("/api/collections/{collection_id}")
async def rename_collection(collection_id: int, body: CollectionBody, request: Request):
    state = _state(request)
    try:
        await run_in_threadpool(
            state.catalog.rename_collection, collection_id, body.name, _chat_id(state)
        )
    except ValueError as exc:
        raise TGError(str(exc))
    return {"collections": state.catalog.collections(_chat_id(state))}


@app.delete("/api/collections/{collection_id}")
async def delete_collection(collection_id: int, request: Request):
    state = _state(request)
    removed = await run_in_threadpool(
        state.catalog.delete_collection, collection_id, _chat_id(state)
    )
    if not removed:
        raise HTTPException(status_code=404, detail="Collection not found.")
    return {"deleted": True, "collections": state.catalog.collections(_chat_id(state))}


@app.post("/api/collections/{collection_id}/items")
async def collection_items(collection_id: int, body: CollectionAddBody, request: Request):
    state = _state(request)
    ids = list(dict.fromkeys(int(value) for value in body.item_ids))[:BATCH_LIMIT]
    try:
        changed = await run_in_threadpool(
            state.catalog.collection_add,
            collection_id,
            ids,
            _chat_id(state),
            body.remove,
        )
    except ValueError as exc:
        raise TGError(str(exc))
    return {
        "changed": changed,
        "removed": body.remove,
        "collections": state.catalog.collections(_chat_id(state)),
    }


@app.get("/api/saved-views")
async def list_views(request: Request):
    state = _state(request)
    return {"views": state.catalog.views(_chat_id(state))}


@app.post("/api/saved-views")
async def create_saved_view(body: ViewBody, request: Request):
    state = _state(request)
    try:
        view = await run_in_threadpool(
            state.catalog.create_view, body.name, body.data, _chat_id(state)
        )
    except ValueError as exc:
        raise TGError(str(exc))
    return {"view": view, "views": state.catalog.views(_chat_id(state))}


@app.delete("/api/saved-views/{view_id}")
async def delete_saved_view(view_id: int, request: Request):
    state = _state(request)
    removed = await run_in_threadpool(
        state.catalog.delete_view, view_id, _chat_id(state)
    )
    if not removed:
        raise HTTPException(status_code=404, detail="View not found.")
    return {"deleted": True, "views": state.catalog.views(_chat_id(state))}


@app.post("/api/tags/meta")
async def tag_meta(body: TagMetaBody, request: Request):
    state = _state(request)
    try:
        await run_in_threadpool(
            state.catalog.set_tag_meta,
            body.tag,
            _chat_id(state),
            body.color,
            body.group,
        )
    except ValueError as exc:
        raise TGError(str(exc))
    return {"tags": state.catalog.tags(_chat_id(state))[:120]}


@app.get("/api/reports/duplicates")
async def duplicate_report(request: Request, limit: int = Query(100, ge=1, le=500)):
    state = _state(request)
    report = await run_in_threadpool(
        state.catalog.duplicates, _chat_id(state), limit
    )
    vault = _vault(state.service.status())
    for group in report["groups"]:
        group["items"] = [public_item(item, vault) for item in group["items"]]
        _attach_part_info(state, group["items"])
        await _attach_stars(state, group["items"])
    return report


@app.get("/api/reports/stats")
async def storage_report(request: Request):
    state = _state(request)
    report = await run_in_threadpool(state.catalog.library_stats, _chat_id(state))
    vault = _vault(state.service.status())
    report["largest"] = [public_item(item, vault) for item in report["largest"]]
    _attach_part_info(state, report["largest"])
    return report


@app.get("/api/items/{item_id}/revisions")
async def item_revisions(item_id: int, request: Request):
    state = _state(request)
    item = await _scoped_item(state, item_id)
    rows = await run_in_threadpool(
        state.catalog.revisions, item, _chat_id(state)
    )
    vault = _vault(state.service.status())
    items = [public_item(row, vault) for row in rows]
    _attach_part_info(state, items)
    await _attach_stars(state, items)
    return {"items": items, "base": item.get("name")}


@app.get("/api/tools")
async def tools_status():
    return mediatools.status()


@app.post("/api/tools/{tool}/install")
async def tools_install(tool: str):
    try:
        return mediatools.install(tool)
    except KeyError:
        raise HTTPException(status_code=404, detail="Unknown media tool.")


@app.post("/api/items/{item_id}/mpv")
async def open_in_mpv(item_id: int, body: MpvBody, request: Request):
    state = _state(request)
    item = await _scoped_item(state, item_id)
    if mediatools.tool_path("mpv") is None:
        raise HTTPException(status_code=409, detail="mpv is not installed yet.")
    url = f"{request.base_url}api/stream/{item_id}"
    position = float(body.position or item.get("play_pos") or 0)
    try:
        await run_in_threadpool(
            mediatools.launch_mpv,
            url,
            item.get("name") or "Video",
            position,
            state.key,
        )
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Could not start mpv: {exc}")
    return {"launched": True}


@app.get("/api/storyboard/{item_id}")
async def storyboard_info(item_id: int, request: Request):
    state = _state(request)
    item = await _scoped_item(state, item_id)
    url = f"{request.base_url}api/stream/{item_id}"
    return await run_in_threadpool(storyboard.describe, item, url, state.key)


@app.get("/api/storyboard/{item_id}/sprite.jpg")
async def storyboard_sprite(item_id: int, request: Request):
    state = _state(request)
    item = await _scoped_item(state, item_id)
    sprite = storyboard.sprite_path(item)
    if not sprite.is_file():
        raise HTTPException(status_code=404, detail="No preview sheet yet.")
    return FileResponse(
        sprite, media_type="image/jpeg", headers={"Cache-Control": "max-age=3600"}
    )


# --------------------------------------------------------------- thumb picker
def _picker_payload(item_id: int, data: Dict[str, Any]) -> Dict[str, Any]:
    if data.get("state") == "ready":
        data["candidates"] = [
            {
                "index": index,
                "time": second,
                "url": f"/api/thumb-picker/{item_id}/{index}?v={data['version']}",
            }
            for index, second in enumerate(data.get("times") or [], start=1)
        ]
        data["custom"] = thumbpick.custom_path(item_id).is_file()
    return data


@app.get("/api/thumb-picker/{item_id}")
async def thumb_picker_info(item_id: int, request: Request, force: bool = False):
    state = _state(request)
    item = await _scoped_item(state, item_id)
    if force:
        await run_in_threadpool(thumbpick.reset, item)
    url = f"{request.base_url}api/stream/{item_id}"
    data = await run_in_threadpool(thumbpick.describe, item, url, state.key)
    return _picker_payload(item_id, data)


@app.post("/api/thumb-picker/{item_id}/shuffle")
async def thumb_picker_shuffle(item_id: int, request: Request):
    state = _state(request)
    item = await _scoped_item(state, item_id)
    url = f"{request.base_url}api/stream/{item_id}"
    data = await run_in_threadpool(thumbpick.describe, item, url, state.key, True)
    return _picker_payload(item_id, data)


@app.get("/api/thumb-picker/{item_id}/{index}")
async def thumb_picker_frame(item_id: int, index: int, request: Request):
    state = _state(request)
    item = await _scoped_item(state, item_id)
    path = thumbpick.frame_path(item, index)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="That frame is not ready.")
    return FileResponse(
        path, media_type="image/jpeg", headers={"Cache-Control": "private, max-age=3600"}
    )


@app.post("/api/thumb-picker/{item_id}/select")
async def thumb_picker_select(item_id: int, body: ThumbPickBody, request: Request):
    state = _state(request)
    item = await _scoped_item(state, item_id)
    try:
        await run_in_threadpool(thumbpick.select, item, body.index)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError:
        raise HTTPException(status_code=409, detail="Generate the frames first.")
    updated = await run_in_threadpool(
        state.catalog.update,
        item_id,
        has_thumb=1,
        thumb_version=int(time.time()),
    )
    public = public_item(updated or item, _vault(state.service.status()))
    await _attach_stars(state, [public])
    return public


@app.delete("/api/items/{item_id}")
async def delete_item(item_id: int, request: Request, remote: bool = False):
    state = _state(request)
    item = await _scoped_item(state, item_id)
    if remote:
        await state.service.delete_message(item["message_id"], item.get("chat_id"))
        await run_in_threadpool(state.catalog.delete, item_id)
        if state.service.is_bot_vault():
            Catalog.clear_bot_vault(state.bot_db, item["message_id"])
        return {"deleted": True, "remote": True, "item_id": item_id}
    await run_in_threadpool(state.catalog.hide, item_id)
    return {"deleted": True, "remote": False, "item_id": item_id}


@app.post("/api/items/{item_id}/reupload")
async def reupload_item(item_id: int, request: Request):
    """Download a stored document and send it again as media (video/audio)."""
    state = _state(request)
    item = await _scoped_item(state, item_id)
    if item.get("kind") != "document" or parse_part_name(item.get("name") or ""):
        raise TGError("Only single stored files can be re-uploaded.")
    info = state.service.status()
    if not (info["authorized"] and info.get("vault")):
        raise TGError("Log in and choose your channel before uploading.")
    transfer_id = state.service.new_transfer(
        item.get("name") or "file", int(item.get("size") or 0)
    )
    _spawn(state, _reupload_item(state, item, transfer_id))
    await asyncio.sleep(0)
    return {"transfer": state.service.transfers[transfer_id]}


async def _reupload_item(state: Any, item: Dict[str, Any], transfer_id: str) -> None:
    transfer = state.service.transfers.get(transfer_id)
    workdir = appconfig.CACHE_DIR / "reupload" / transfer_id
    try:
        workdir.mkdir(parents=True, exist_ok=True)
        path = workdir / (item.get("name") or "file")
        message = await state.service.get_message(
            int(item["message_id"]), item.get("chat_id")
        )
        if message is None:
            raise TGError("This file no longer exists in the channel.")

        def progress(sent: int, total: int) -> None:
            if transfer is not None and transfer.get("cancel"):
                raise TransferCancelled()
            if transfer is not None:
                transfer.update(
                    state="downloading",
                    sent=int(sent or 0),
                    size=int(total or transfer["size"] or 0),
                )

        await state.service.download_to(message, path, progress)
        kind, _ = media_hint(path, item.get("name") or "")
        if kind == "document":
            raise TGError("That file is not a video, audio or image.")
        if transfer is not None and transfer.get("cancel"):
            raise TransferCancelled()
        if transfer is not None:
            transfer.update(state="uploading", sent=0)
        fresh = await state.service.upload_one(
            {
                "path": str(path),
                "name": item.get("name") or path.name,
                "folder": item.get("folder") or "",
                "transfer_id": transfer_id,
            },
            state.catalog,
        )
        keep: Dict[str, Any] = {}
        for key in ("tags", "tags_source", "note"):
            if item.get(key):
                keep[key] = item[key]
        if item.get("favorite"):
            keep["favorite"] = item["favorite"]
            keep["fav_source"] = item.get("fav_source") or "user"
        if keep and fresh.get("id"):
            await run_in_threadpool(state.catalog.update, fresh["id"], **keep)
        await state.service.delete_message(item["message_id"], item.get("chat_id"))
        await run_in_threadpool(state.catalog.delete, item["id"])
        if state.service.is_bot_vault():
            Catalog.clear_bot_vault(state.bot_db, item["message_id"])
    except TransferCancelled:
        if transfer is not None:
            transfer.update(state="cancelled", error=None)
    except Exception as exc:
        message = friendly_error(exc)
        if transfer is not None:
            transfer.update(state="error", error=message)
        log.warning("Re-upload failed for %s: %s", item.get("name"), message)
    finally:
        if transfer is not None:
            transfer["busy"] = False
        shutil.rmtree(workdir, ignore_errors=True)


BATCH_LIMIT = 300


def _parse_id_query(ids: str) -> List[int]:
    values: List[int] = []
    for part in re.split(r"[^0-9]+", ids or ""):
        if part:
            values.append(int(part))
    return list(dict.fromkeys(values))


def _collect_batch_items(
    state: Any, item_ids: List[int]
) -> List[Dict[str, Any]]:
    ids = list(dict.fromkeys(int(value) for value in item_ids))[:BATCH_LIMIT]
    if not ids:
        raise TGError("Select at least one file.")
    chat_id = _chat_id(state)
    found: List[Dict[str, Any]] = []
    for item_id in ids:
        item = state.catalog.get(item_id)
        if item is None or chat_id is None or int(item.get("chat_id")) != int(chat_id):
            raise HTTPException(status_code=404, detail="File not found in this channel.")
        found.append(item)
    return found


async def _batch_items(state: Any, item_ids: List[int]) -> List[Dict[str, Any]]:
    return await run_in_threadpool(_collect_batch_items, state, item_ids)


@app.post("/api/batch/delete")
async def batch_delete(body: BatchDeleteBody, request: Request):
    state = _state(request)
    items = await _batch_items(state, body.item_ids)
    removed = 0
    if body.remote:
        for item in items:
            await state.service.delete_message(item["message_id"], item.get("chat_id"))
            await run_in_threadpool(state.catalog.delete, item["id"])
            if state.service.is_bot_vault():
                Catalog.clear_bot_vault(state.bot_db, item["message_id"])
            removed += 1
    else:
        for item in items:
            await run_in_threadpool(state.catalog.hide, item["id"])
            removed += 1
    return {"deleted": removed, "remote": body.remote}


@app.post("/api/batch/favorite")
async def batch_favorite(body: BatchFavoriteBody, request: Request):
    state = _state(request)
    items = await _batch_items(state, body.item_ids)

    def apply() -> int:
        count = 0
        for item in items:
            updated = state.catalog.set_favorite(item["id"], body.favorite)
            if updated is not None:
                count += 1
                if state.service.is_bot_vault():
                    Catalog.sync_to_bot(
                        state.bot_db,
                        updated["message_id"],
                        favorite=1 if body.favorite else 0,
                    )
        return count

    return {"updated": await run_in_threadpool(apply), "favorite": body.favorite}


@app.post("/api/batch/move")
async def batch_move(body: BatchMoveBody, request: Request):
    state = _state(request)
    folder = clean_folder_path(body.folder, "")
    if not folder:
        raise TGError("Choose or type a folder name.")
    items = await _batch_items(state, body.item_ids)

    def apply() -> int:
        count = 0
        for item in items:
            updated = state.catalog.move(item["id"], folder)
            if updated is not None:
                count += 1
                if state.service.is_bot_vault():
                    Catalog.sync_to_bot(
                        state.bot_db, updated["message_id"], category=folder.lower()
                    )
        return count

    return {"moved": await run_in_threadpool(apply), "folder": folder}


@app.post("/api/batch/copy")
async def batch_copy(body: BatchCopyBody, request: Request):
    state = _state(request)
    folder = clean_folder_path(body.folder, "")
    items = await _batch_items(state, body.item_ids)
    if len(items) > 40:
        raise TGError("Copy up to 40 files at a time.")
    copied = await state.service.copy_messages([item["message_id"] for item in items])

    def apply() -> List[int]:
        created: List[int] = []
        for info in copied:
            info["folder"] = folder
            info["folder_source"] = "user"
            created.append(state.catalog.upsert(info))
        return created

    created = await run_in_threadpool(apply)
    return {"copied": len(created), "folder": folder, "item_ids": created}


@app.get("/api/batch/info")
async def batch_info(request: Request, ids: str = Query("", max_length=4000)):
    state = _state(request)
    items = await _batch_items(state, _parse_id_query(ids))
    vault = _vault(state.service.status())
    return {"items": [public_item(item, vault) for item in items]}


@app.get("/api/batch/download")
async def batch_download(request: Request, ids: str = Query("", max_length=4000)):
    state = _state(request)
    items = await _batch_items(state, _parse_id_query(ids))
    zip_name = "Selected files.zip"
    return StreamingResponse(
        _zip_stream(state, "Selected files", [], items),
        media_type="application/zip",
        headers={
            "Content-Disposition": _content_disposition(zip_name, True),
            "Cache-Control": "no-store",
        },
    )


# -------------------------------------------------------------------- uploads
@app.post("/api/upload")
async def upload(
    request: Request,
    files: List[UploadFile] = File(...),
    folder: str = Form(""),
    paths: str = Form("[]"),
    client: str = Form(""),
):
    state = _state(request)
    info = state.service.status()
    if not info["authorized"] or not info["vault"]:
        raise TGError("Log in and choose your channel before uploading.")
    if not files:
        raise TGError("Choose at least one file.")
    max_upload = int(info.get("max_upload") or MAX_UPLOAD)
    try:
        requested = json.loads(paths) if paths else []
    except json.JSONDecodeError:
        requested = []
    if not isinstance(requested, list):
        requested = []
    base_folder = clean_folder_path(folder, "")
    client_id = re.sub(r"[^a-z0-9-]", "", (client or "").lower())[:64]
    batch = uuid.uuid4().hex
    batch_dir = appconfig.CACHE_DIR / "uploads" / batch
    entries: List[Dict[str, Any]] = []
    try:
        for index, upload_file in enumerate(files):
            raw = requested[index] if index < len(requested) else upload_file.filename
            parts = [
                part
                for part in str(raw or "").replace("\\", "/").split("/")
                if part not in {"", ".", ".."}
            ]
            name = clean_name(
                parts[-1] if parts else (upload_file.filename or f"File {index + 1}")
            )
            rel_dir = clean_folder_path("/".join(parts[:-1]), "")
            target_folder = join_folder(base_folder, rel_dir) if rel_dir else base_folder
            target_dir = batch_dir / str(index)
            target_dir.mkdir(parents=True, exist_ok=True)
            target = target_dir / name
            total = 0
            try:
                with target.open("wb") as handle:
                    while True:
                        chunk = await upload_file.read(4 * 1024 * 1024)
                        if not chunk:
                            break
                        total += len(chunk)
                        if total > SPLIT_HARD_CAP:
                            raise HTTPException(
                                status_code=413,
                                detail=(
                                    f"{name} is larger than the "
                                    f"{SPLIT_HARD_CAP // (1024 ** 3)} GB limit this "
                                    "app can split into parts."
                                ),
                            )
                        handle.write(chunk)
            finally:
                await upload_file.close()
            if total == 0:
                raise HTTPException(status_code=400, detail=f"{name} is empty.")
            label = join_folder(rel_dir, name) or name
            transfer_id = state.service.new_transfer(label, total, client=client_id)
            entries.append(
                {
                    "path": str(target),
                    "name": name,
                    "folder": target_folder,
                    "transfer_id": transfer_id,
                    "split": total > PART_SIZE,
                }
            )
    except Exception:
        for entry in entries:
            state.service.transfers.pop(entry["transfer_id"], None)
        await run_in_threadpool(shutil.rmtree, batch_dir, True)
        raise
    if not entries:
        raise TGError("No files were received.")
    _spawn(state, _run_uploads(state, entries))
    return {
        "transfers": [state.service.transfers[entry["transfer_id"]] for entry in entries]
    }


async def _discard_transfer_items(state: Any, transfer: Dict[str, Any]) -> None:
    """Remove parts a split upload already sent before it was cancelled."""
    ids = list(dict.fromkeys(int(value) for value in transfer.get("item_ids") or []))
    transfer["item_ids"] = []
    for item_id in ids:
        item = await run_in_threadpool(state.catalog.get, item_id)
        if item is None:
            continue
        try:
            await state.service.delete_message(
                item["message_id"], item.get("chat_id")
            )
        except TGError as exc:
            log.warning("Could not remove cancelled part %s: %s", item_id, exc)
            continue
        await run_in_threadpool(state.catalog.delete, item_id)
        if state.service.is_bot_vault():
            Catalog.clear_bot_vault(state.bot_db, item["message_id"])


async def _run_uploads(state: Any, entries: List[Dict[str, Any]]) -> None:
    gate = _upload_semaphore()
    await asyncio.gather(
        *(_run_upload_entry(state, entry, gate) for entry in entries),
        return_exceptions=True,
    )


async def _run_upload_entry(
    state: Any, entry: Dict[str, Any], gate: asyncio.Semaphore
) -> None:
    transfer = state.service.transfers.get(entry["transfer_id"])
    original = Path(entry["path"])
    try:
        if entry.get("split"):
            if transfer is not None:
                if transfer.get("cancel"):
                    raise TransferCancelled()
                transfer.update(state="splitting", sent=0)
            workdir = appconfig.CACHE_DIR / "uploads" / f"split-{uuid.uuid4().hex}"
            try:
                try:
                    volumes = await run_in_threadpool(
                        split_file, original, workdir, PART_SIZE
                    )
                except Exception as exc:
                    detail = str(exc) or "The file could not be split into parts."
                    raise HTTPException(status_code=500, detail=detail) from exc
                if transfer is not None:
                    transfer["parts"] = len(volumes)
                try:
                    original.unlink(missing_ok=True)
                except OSError:
                    pass
                bases: List[int] = []
                total = 0
                for volume in volumes:
                    bases.append(total)
                    total += volume.stat().st_size

                async def upload_volume(
                    index: int, volume: Path, sent_base: int
                ) -> None:
                    async with gate:
                        if transfer is not None and transfer.get("cancel"):
                            raise TransferCancelled()
                        await state.service.upload_one(
                            {
                                **entry,
                                "path": str(volume),
                                "name": volume.name,
                                "sent_base": sent_base,
                                "part_index": index,
                                "shared": True,
                            },
                            state.catalog,
                        )

                results = await asyncio.gather(
                    *(
                        upload_volume(index, volume, bases[index])
                        for index, volume in enumerate(volumes)
                    ),
                    return_exceptions=True,
                )
                if transfer is not None and transfer.get("cancel"):
                    raise TransferCancelled()
                problem = next(
                    (result for result in results if isinstance(result, BaseException)),
                    None,
                )
                if problem is not None:
                    raise problem
                if transfer is not None:
                    transfer.update(state="done", sent=transfer["size"], error=None)
            finally:
                shutil.rmtree(workdir, ignore_errors=True)
        else:
            async with gate:
                await state.service.upload_one(entry, state.catalog)
    except TransferCancelled:
        if transfer is not None:
            transfer.update(state="cancelled", error=None)
            await _discard_transfer_items(state, transfer)
        log.info("Upload cancelled for %s", entry["name"])
    except Exception as exc:
        message = friendly_error(exc) if not isinstance(exc, HTTPException) else exc.detail
        if transfer is not None:
            transfer.update(state="error", error=message)
        log.warning("Upload failed for %s: %s", entry["name"], message)
    finally:
        if transfer is not None:
            transfer["busy"] = False
        path = original
        try:
            path.unlink(missing_ok=True)
            if path.parent.is_dir() and not any(path.parent.iterdir()):
                path.parent.rmdir()
                if path.parent.parent.is_dir() and not any(path.parent.parent.iterdir()):
                    path.parent.parent.rmdir()
        except OSError:
            pass


@app.get("/api/transfers")
async def transfers(request: Request):
    state = _state(request)
    return {"transfers": list(state.service.transfers.values())[-80:]}


@app.post("/api/transfers/cancel")
async def cancel_client_transfers(body: TransferCancelBody, request: Request):
    state = _state(request)
    return {"cancelled": state.service.cancel_client(body.client)}


@app.post("/api/transfers/{transfer_id}/cancel")
async def cancel_transfer(transfer_id: str, request: Request):
    state = _state(request)
    if not state.service.cancel_transfer(transfer_id):
        raise HTTPException(status_code=404, detail="This transfer already finished.")
    return {"ok": True}


# ------------------------------------------------------------------ merge
@app.post("/api/merge")
async def start_merge(body: MergeBody, request: Request):
    state = _state(request)
    item = await _scoped_item(state, body.item_id)
    part = parse_part_name(item.get("name") or "")
    if part is None:
        raise TGError("This file is not a split archive part.")
    groups = _part_groups(state)
    entry = groups.get(f"{part['base'].lower()}|{part['ext']}")
    if entry is None or entry["count"] < 2:
        raise TGError(
            "No other parts of this file are in the library, so it cannot be "
            "joined into the complete file."
        )
    nums = sorted(entry["nums"])
    missing = [n for n in range(1, (nums[-1] if nums else 1) + 1) if n not in entry["nums"]]
    if missing:
        listed = ", ".join(f".{n:03d}" for n in missing[:8])
        raise TGError(
            f"Parts {listed} are missing from the library. "
            "Upload or unhide them before downloading the complete file."
        )
    ordered_items = []
    total_size = 0
    for number in range(1, len(nums) + 1):
        row = state.catalog.get(entry["nums"][number])
        if row is None:
            raise TGError("A part went missing from the library. Sync and retry.")
        ordered_items.append(row)
        total_size += int(row.get("size") or 0)
    job_id = uuid.uuid4().hex[:16]
    transfer_id = state.service.new_transfer(entry["base"], total_size)
    transfer = state.service.transfers[transfer_id]
    transfer["state"] = "downloading"
    transfer["parts"] = len(ordered_items)
    job = {
        "id": job_id,
        "transfer_id": transfer_id,
        "items": ordered_items,
        "dir": appconfig.CACHE_DIR / "merge" / job_id,
        "name": entry["base"],
    }
    state.merge_jobs[job_id] = job
    _spawn(state, _run_merge(state, job))
    return {"transfer": transfer, "job": job_id}


async def _run_merge(state: Any, job: Dict[str, Any]) -> None:
    transfer = state.service.transfers.get(job["transfer_id"])
    parts_dir = job["dir"] / "parts"
    try:
        parts_dir.mkdir(parents=True, exist_ok=True)
        downloaded: List[Path] = []
        for index, part_item in enumerate(job["items"], start=1):
            if transfer is not None:
                if transfer.get("cancel"):
                    raise TransferCancelled()
                transfer["state"] = "downloading"
            message, size, _mime = await state.service.media_info(part_item)
            target = parts_dir / clean_name(
                part_item.get("name") or f"part-{index:03d}"
            )
            with target.open("wb") as handle:
                async for chunk in state.service.stream_chunks(message, 0, size):
                    if QUIT.is_set():
                        raise TGError("The app is shutting down.")
                    if transfer is not None and transfer.get("cancel"):
                        raise TransferCancelled()
                    handle.write(chunk)
                    if transfer is not None:
                        transfer["sent"] = int(transfer.get("sent") or 0) + len(chunk)
            downloaded.append(target)
        if transfer is not None:
            if transfer.get("cancel"):
                raise TransferCancelled()
            transfer["state"] = "merging"
        final, final_name = await run_in_threadpool(merge_parts, downloaded, job["dir"])
        if transfer is not None and transfer.get("cancel"):
            raise TransferCancelled()
        job["path"] = str(final)
        job["name"] = final_name
        if transfer is not None:
            transfer.update(
                state="ready",
                sent=transfer["size"],
                result_url=f"/api/merged/{job['id']}",
                result_name=final_name,
                error=None,
            )
    except TransferCancelled:
        if transfer is not None:
            transfer.update(state="cancelled", error=None)
        log.info("Merge cancelled for %s", job.get("name"))
        state.merge_jobs.pop(job["id"], None)
        shutil.rmtree(job["dir"], ignore_errors=True)
    except Exception as exc:
        if isinstance(exc, HTTPException):
            message = str(exc.detail)
        elif isinstance(exc, TGError):
            message = str(exc)
        else:
            message = friendly_error(exc)
        if transfer is not None:
            transfer.update(state="error", error=message)
        log.warning("Merge failed for %s: %s", job.get("name"), message)
        state.merge_jobs.pop(job["id"], None)
        shutil.rmtree(job["dir"], ignore_errors=True)
    finally:
        if transfer is not None:
            transfer["busy"] = False


@app.get("/api/merged/{job_id}")
async def merged_download(job_id: str, request: Request):
    state = _state(request)
    job = state.merge_jobs.get(job_id)
    if job is None or not job.get("path"):
        raise HTTPException(
            status_code=404, detail="No merged file is ready for that request."
        )
    path = Path(job["path"])
    if not path.exists():
        raise HTTPException(
            status_code=410,
            detail="The merged file is no longer on this PC. Join the parts again.",
        )
    return FileResponse(
        path,
        media_type="application/octet-stream",
        filename=job.get("name") or path.name,
        headers={"Cache-Control": "no-store"},
    )


# --------------------------------------------------------------------- thumbs
@app.get("/api/thumb/{item_id}")
async def thumb(item_id: int, request: Request):
    state = _state(request)
    item = await _scoped_item(state, item_id)
    custom = thumbpick.custom_path(item_id)
    if custom.is_file():
        data = await run_in_threadpool(custom.read_bytes)
        return Response(
            content=data,
            media_type="image/jpeg",
            headers={"Cache-Control": "private, max-age=86400"},
        )
    cache = appconfig.THUMB_DIR / f"{item_id}.thumb"
    if cache.exists():
        data = await run_in_threadpool(cache.read_bytes)
        media_type = _sniff_image(data)
        return Response(
            content=data,
            media_type=media_type,
            headers={"Cache-Control": "private, max-age=86400"},
        )
    if not item.get("has_thumb"):
        if filetypes.classify(
            str(item.get("name") or ""), str(item.get("kind") or "")
        ) in {"model", "cad"}:
            try:
                data = await _windows_thumbnail(state, item)
            except Exception:
                data = None
            if data:
                return Response(
                    content=data,
                    media_type=_sniff_image(data),
                    headers={"Cache-Control": "private, max-age=86400"},
                )
        raise HTTPException(status_code=404, detail="No thumbnail.")
    try:
        result = await state.service.thumbnail(item)
    except TGError:
        result = None
    if not result:
        raise HTTPException(status_code=404, detail="No thumbnail.")
    data, media_type = result
    appconfig.THUMB_DIR.mkdir(parents=True, exist_ok=True)
    tmp = cache.with_suffix(".tmp")
    await run_in_threadpool(tmp.write_bytes, data)
    os.replace(tmp, cache)
    return Response(
        content=data,
        media_type=media_type,
        headers={"Cache-Control": "private, max-age=86400"},
    )


# -------------------------------------------------------------------- streams
@app.get("/api/stream/{item_id}")
async def stream(item_id: int, request: Request):
    return await _serve_media(request, item_id, download=False)


@app.head("/api/stream/{item_id}")
async def stream_head(item_id: int, request: Request):
    return await _serve_media(request, item_id, download=False)


@app.get("/api/download/{item_id}")
async def download(item_id: int, request: Request):
    return await _serve_media(request, item_id, download=True)


@app.head("/api/download/{item_id}")
async def download_head(item_id: int, request: Request):
    return await _serve_media(request, item_id, download=True)


# Players ask for "bytes=0-"; serving a large slice up front gives them a
# comfortable buffer instead of a stream of tiny requests. Blocks are cached
# on disk by streamcache, so repeats and seeks stay local.
INLINE_STREAM_WINDOW = 32 * 1024 * 1024


async def _serve_media(request: Request, item_id: int, download: bool) -> Response:
    state = _state(request)
    item = await _scoped_item(state, item_id)
    message, size, mime = await state.service.media_info(item)
    name = item.get("name") or "file"
    headers = {
        "Accept-Ranges": "bytes",
        "Content-Disposition": _content_disposition(name, download),
        "Cache-Control": "private, max-age=3600",
        "ETag": f'W/"{item["message_id"]}-{size}"',
    }
    range_header = request.headers.get("range")
    if range_header:
        parsed = parse_range(range_header, size)
        if parsed is None:
            headers["Content-Range"] = f"bytes */{size}"
            return Response(status_code=416, headers=headers)
        start, end = parsed
        if not download:
            end = min(end, start + INLINE_STREAM_WINDOW - 1)
        length = end - start + 1
        headers["Content-Range"] = f"bytes {start}-{end}/{size}"
        headers["Content-Length"] = str(length)
        status_code = 206
    elif not download and size > INLINE_STREAM_WINDOW:
        start, length = 0, INLINE_STREAM_WINDOW
        headers["Content-Range"] = f"bytes 0-{INLINE_STREAM_WINDOW - 1}/{size}"
        headers["Content-Length"] = str(length)
        status_code = 206
    else:
        start, length = 0, size
        headers["Content-Length"] = str(size)
        status_code = 200
    if request.method == "HEAD":
        return Response(status_code=status_code, headers=headers, media_type=mime)

    cache_key = f"{item.get('chat_id')}-{item['message_id']}-{size}"
    can_cache = not download and size > 4 * 1024 * 1024

    async def body() -> AsyncIterator[bytes]:
        sent = 0
        if can_cache:
            try:
                async for chunk in streamcache.read(
                    state.service, message, cache_key, start, length, size
                ):
                    if QUIT.is_set():
                        return
                    sent += len(chunk)
                    yield chunk
                return
            except OSError:
                # Cache trouble mid-stream: the client reconnects and retries.
                if sent:
                    return
        async for chunk in state.service.stream_chunks(message, start, length):
            if QUIT.is_set():
                return
            yield chunk

    return StreamingResponse(
        body(), status_code=status_code, headers=headers, media_type=mime
    )
