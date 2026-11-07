"""Keeps the Explorer's library data inside the vault channel.

The index (folders, names, tags, notes, favorites), the settings and the
user-picked artwork are packed into a ``tfe-data-*.zip`` document and posted
into the vault channel — on every app close and after every completed sync,
keeping the ten most recent copies. On launch the newest archive is downloaded
and restored whenever it is newer than the last copy this device applied, so
the whole library comes back even if the PC's data folder (or the EXE) is gone.
The phone does the same: it restores on launch and uploads the updated index
when the app closes, unless the vault already holds a snapshot newer than the
one this device applied (uploading that stale copy would roll the desktop
library back).

Snapshots are staged in ``HOME/cache/vault`` and wiped after use: the archive
is overwritten with zeros and deleted once it has been unpacked or uploaded,
and leftovers from an interrupted run are removed on the next launch, so no
index archive ever ends up in a Downloads folder.

Generated imagery is not uploaded: auto thumbnails, IMDb posters and video
storyboards rebuild themselves from Telegram or the network, and bundling
them made snapshots grow with the whole library. Only hand-picked covers and
star portraits travel, because those cannot be regenerated.

The MTProto session file is deliberately never uploaded: it is a login
credential and can be recreated in seconds with the QR sign-in.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import shutil
import sqlite3
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from telethon.tl.types import DocumentAttributeFilename

from . import appconfig, thumbcrypt

log = logging.getLogger("tfe.vaultstore")

MARKER = "#tfedata"
PREFIX = "tfe-data-"
SUFFIX = ".zip"
STAMP_FORMAT = "%Y%m%d-%H%M%S"
KEEP = 10
SCAN_LIMIT = 120
IS_MOBILE = bool(os.environ.get("TFE_MOBILE"))
STAGE_DIR = appconfig.CACHE_DIR / "vault"
WIPE_CHUNK = 1024 * 1024
# Telethon picks 128 KiB parts on its own, which made a 40 MB snapshot outlive
# the close-time timeout while a video stream shared the link. 512 KiB is
# Telegram's maximum part size.
UPLOAD_PART_KB = 512

_SAVE_LOCK: Optional[asyncio.Lock] = None


def _save_lock() -> asyncio.Lock:
    """A sync save and a close save can overlap; upload one at a time."""
    global _SAVE_LOCK
    if _SAVE_LOCK is None:
        _SAVE_LOCK = asyncio.Lock()
    return _SAVE_LOCK


def _marker_path() -> Path:
    return appconfig.HOME / "vault_data.json"


def _read_marker() -> Optional[datetime]:
    try:
        data = json.loads(_marker_path().read_text(encoding="utf-8"))
        stamp = str(data.get("last_sync") or "")
        return datetime.fromisoformat(stamp) if stamp else None
    except (OSError, ValueError):
        return None


def _write_marker(when: datetime) -> None:
    try:
        appconfig.ensure_dirs()
        tmp = _marker_path().with_suffix(".tmp")
        tmp.write_text(
            json.dumps({"last_sync": when.isoformat(timespec="seconds")}, indent=2),
            encoding="utf-8",
        )
        os.replace(tmp, _marker_path())
    except OSError:
        log.exception("Could not write the vault data marker")


def _stage() -> Path:
    STAGE_DIR.mkdir(parents=True, exist_ok=True)
    return STAGE_DIR


def _shred(path: Path) -> None:
    """Overwrite a staged snapshot with zeros, then delete it."""
    try:
        with path.open("r+b") as handle:
            zeros = b"\0" * WIPE_CHUNK
            remaining = path.stat().st_size
            while remaining > 0:
                chunk = zeros[: min(remaining, WIPE_CHUNK)]
                handle.write(chunk)
                remaining -= len(chunk)
            handle.flush()
            os.fsync(handle.fileno())
    except OSError:
        pass
    try:
        path.unlink()
    except OSError:
        pass


def purge_local_cache() -> int:
    """Delete snapshot archives an interrupted run left behind."""
    removed = 0
    stage = _stage()
    for root in (stage, Path(tempfile.gettempdir())):
        try:
            entries = list(root.iterdir())
        except OSError:
            continue
        for entry in entries:
            try:
                if entry.is_dir():
                    # Old builds unpacked into the system temp folder.
                    if entry.name.startswith(
                        ("tfe-restore-", "tfe-vault-", "save-", "restore-")
                    ):
                        shutil.rmtree(entry, ignore_errors=True)
                        removed += 1
                elif entry.name.startswith(PREFIX) and entry.suffix.lower() == ".zip":
                    _shred(entry)
                    removed += 1
                elif root == stage and entry.name in ("library.db", "snapshot.zip"):
                    _shred(entry)
                    removed += 1
            except OSError:
                continue
    return removed


def _doc_name(message: Any) -> Optional[str]:
    document = getattr(message, "document", None)
    if document is None:
        return None
    for attr in getattr(document, "attributes", None) or []:
        name = getattr(attr, "file_name", None)
        if name:
            return name
    return None


def _snapshot_name(name: str) -> Optional[datetime]:
    if not name.startswith(PREFIX) or not name.endswith(SUFFIX):
        return None
    try:
        return datetime.strptime(name[len(PREFIX):-len(SUFFIX)], STAMP_FORMAT)
    except ValueError:
        return None


def is_snapshot_name(name: str) -> bool:
    return _snapshot_name(name) is not None


async def find_latest(service: Any) -> Optional[Tuple[datetime, Any]]:
    client = service._require_ready()
    if service._entity is None:
        return None
    best: Optional[Tuple[datetime, Any]] = None
    async for message in client.iter_messages(
        service._entity, limit=SCAN_LIMIT, wait_time=0
    ):
        stamp = _snapshot_name(_doc_name(message) or "")
        if stamp is None:
            continue
        if best is None or stamp > best[0]:
            best = (stamp, message)
    return best


def _snapshot_db(dest: Path) -> None:
    source = sqlite3.connect(str(appconfig.LIBRARY_PATH))
    try:
        target = sqlite3.connect(str(dest))
        try:
            source.backup(target)
        finally:
            target.close()
    finally:
        source.close()


def _safe_members(archive: zipfile.ZipFile) -> list:
    members = []
    for member in archive.infolist():
        name = member.filename.replace("\\", "/")
        if name.startswith("/") or ".." in name.split("/"):
            continue
        if name != "library.db" and name != "settings.json" and not name.startswith("thumbs/"):
            continue
        members.append(member)
    return members


def _snapshot_thumbs() -> list:
    """Artwork worth travelling: picked covers and star portraits only."""
    keep = []
    root = appconfig.THUMB_DIR
    if not root.is_dir():
        return keep
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(root)
        parts = rel.parts
        if len(parts) == 1 and rel.name.endswith(".custom.jpg"):
            thumbcrypt.seal_file(path)
            keep.append(path)
        elif len(parts) == 2 and parts[0] == "stars":
            thumbcrypt.seal_file(path)
            keep.append(path)
    if thumbcrypt.KEY_PATH.is_file():
        keep.append(thumbcrypt.KEY_PATH)
    return keep


async def save(service: Any) -> Dict[str, Any]:
    async with _save_lock():
        return await _save(service)


async def _save(service: Any) -> Dict[str, Any]:
    client = service._require_ready()
    entity = service._entity
    if entity is None:
        return {"saved": False, "reason": "no vault"}
    applied = _read_marker()
    if IS_MOBILE and applied is not None:
        # The phone mirrors the desktop library. If the vault already holds a
        # snapshot newer than the one this device applied, uploading the copy
        # in memory would roll the desktop library back.
        latest = await find_latest(service)
        if latest is not None and latest[0] > applied:
            log.info("Vault snapshot kept: the vault already has a newer copy")
            return {"saved": False, "reason": "newer snapshot in the vault"}
    when = datetime.now()
    name = f"{PREFIX}{when.strftime(STAMP_FORMAT)}{SUFFIX}"
    appconfig.ensure_dirs()
    thumbs = 0
    with tempfile.TemporaryDirectory(dir=_stage(), prefix="save-") as tmp:
        work = Path(tmp)
        db_snap = work / "library.db"
        _snapshot_db(db_snap)
        zip_path = work / name
        try:
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
                archive.write(db_snap, "library.db")
                if appconfig.SETTINGS_PATH.exists():
                    archive.write(appconfig.SETTINGS_PATH, "settings.json")
                for thumb in _snapshot_thumbs():
                    archive.write(
                        thumb,
                        f"thumbs/{thumb.relative_to(appconfig.THUMB_DIR).as_posix()}",
                    )
                    thumbs += 1
                archive.writestr(
                    "manifest.json",
                    json.dumps(
                        {
                            "app": "telegram-file-explorer",
                            "saved": when.isoformat(timespec="seconds"),
                            "thumbs": thumbs,
                            "thumb_policy": "covers+stars",
                        },
                        indent=2,
                    ),
                )
            uploaded = await client.upload_file(
                str(zip_path), part_size_kb=UPLOAD_PART_KB
            )
            await client.send_file(
                entity,
                uploaded,
                caption=f"{MARKER} {name}",
                force_document=True,
                attributes=[DocumentAttributeFilename(name)],
            )
        finally:
            _shred(zip_path)
    _write_marker(when)
    log.info("Vault data snapshot saved: %s (%d thumbs)", name, thumbs)
    await _prune_old(client, entity)
    return {"saved": True, "name": name, "thumbs": thumbs}


async def _snapshot_messages(client: Any, entity: Any) -> list:
    """Every vault-data snapshot message in the channel."""
    found = []
    # Telegram search returns only some of the older uploads, so walk the
    # history to make sure every stale copy is found.
    async for message in client.iter_messages(entity, limit=None, wait_time=0):
        stamp = _snapshot_name(_doc_name(message) or "")
        if stamp is not None:
            found.append((stamp, message.id))
    return found


async def _prune_old(client: Any, entity: Any) -> None:
    try:
        found = await _snapshot_messages(client, entity)
    except Exception:
        log.exception("Could not list old vault data snapshots")
        return
    found.sort(reverse=True)
    stale = [message_id for _, message_id in found[KEEP:]]
    if not stale:
        return
    try:
        await client.delete_messages(entity, stale)
        log.info("Pruned %d old vault data snapshot(s)", len(stale))
    except Exception:
        log.exception("Could not prune old vault data snapshots")


def _merge_settings(backup_path: Path) -> None:
    try:
        backup = json.loads(backup_path.read_text(encoding="utf-8"))
        current = appconfig.load_settings()
        merged = dict(current)
        for key in (
            "api_id",
            "api_hash",
            "vault",
            "vault_title",
            "default_vault",
            "pin_salt",
            "pin_hash",
            "pin_skipped",
        ):
            if not str(current.get(key) or "").strip() and backup.get(key):
                merged[key] = str(backup[key]).strip()
        # The vault list travels inside the snapshot so a new PC discovers the
        # other storage channels again; an existing local list always wins.
        try:
            current_vaults = json.loads(str(current.get("vaults") or "[]"))
        except ValueError:
            current_vaults = []
        try:
            backup_vaults = json.loads(str(backup.get("vaults") or "[]"))
        except ValueError:
            backup_vaults = []
        if not current_vaults and backup_vaults:
            merged["vaults"] = json.dumps(backup_vaults)
        appconfig.save_settings(
            {key: value for key, value in merged.items() if key in appconfig.DEFAULTS}
        )
    except (OSError, ValueError):
        log.exception("Could not merge settings from the vault snapshot")


def _local_favorites() -> list:
    """Favorites picked on this device, keyed the same way as snapshots."""
    if not appconfig.LIBRARY_PATH.exists():
        return []
    try:
        conn = sqlite3.connect(str(appconfig.LIBRARY_PATH))
        try:
            return conn.execute(
                "SELECT chat_id, message_id FROM items WHERE favorite = 1"
            ).fetchall()
        finally:
            conn.close()
    except sqlite3.Error:
        log.exception("Could not read this device's favorites")
        return []


def _keep_favorites(favorites: list) -> None:
    if not favorites:
        return
    try:
        conn = sqlite3.connect(str(appconfig.LIBRARY_PATH))
        try:
            conn.executemany(
                "UPDATE items SET favorite = 1 WHERE chat_id = ? AND message_id = ?",
                favorites,
            )
            conn.commit()
        finally:
            conn.close()
    except sqlite3.Error:
        log.exception("Could not keep this device's favorites")


async def restore(service: Any) -> Dict[str, Any]:
    client = service._require_ready()
    if service._entity is None:
        return {"restored": False, "reason": "no vault"}
    best = await find_latest(service)
    if best is None:
        return {"restored": False, "reason": "no snapshot in the vault yet"}
    stamp, message = best
    # The marker records the last snapshot this device applied or saved. A
    # library sync also touches the database, so comparing file times would
    # stop a phone from ever picking up folder changes made on the desktop.
    applied = _read_marker()
    if applied is not None:
        if stamp <= applied:
            return {"restored": False, "reason": "local data is up to date"}
    else:
        try:
            local_dt = datetime.fromtimestamp(appconfig.LIBRARY_PATH.stat().st_mtime)
        except OSError:
            local_dt = None
        if local_dt is not None and local_dt > stamp:
            return {"restored": False, "reason": "local data is newer"}
    appconfig.ensure_dirs()
    with tempfile.TemporaryDirectory(dir=_stage(), prefix="restore-") as tmp:
        work = Path(tmp)
        zip_path = work / f"{PREFIX}{stamp.strftime(STAMP_FORMAT)}{SUFFIX}"
        try:
            await client.download_media(message, file=str(zip_path))
            with zipfile.ZipFile(zip_path) as archive:
                members = _safe_members(archive)
                if not any(m.filename == "library.db" for m in members):
                    return {"restored": False, "reason": "unreadable snapshot"}
                unpacked = work / "unpack"
                unpacked.mkdir()
                for member in members:
                    archive.extract(member, unpacked)
            favorites = _local_favorites()
            os.replace(unpacked / "library.db", appconfig.LIBRARY_PATH)
            for suffix in ("-wal", "-shm", "-journal"):
                try:
                    Path(str(appconfig.LIBRARY_PATH) + suffix).unlink(missing_ok=True)
                except OSError:
                    pass
            _keep_favorites(favorites)
            thumbs_root = unpacked / "thumbs"
            if thumbs_root.is_dir():
                for thumb in thumbs_root.rglob("*"):
                    if thumb.is_file():
                        target = appconfig.THUMB_DIR / thumb.relative_to(thumbs_root)
                        target.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(thumb, target)
            backup_settings = unpacked / "settings.json"
            if backup_settings.exists():
                _merge_settings(backup_settings)
        finally:
            _shred(zip_path)
    _write_marker(stamp)
    log.info("Library data restored from the vault: %s", stamp.isoformat(timespec="seconds"))
    return {"restored": True, "stamp": stamp.isoformat(timespec="seconds")}
