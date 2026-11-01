"""Keeps the Explorer's library data inside the vault channel.

The index (folders, names, tags, notes, favorites), the settings and the
user-picked artwork are packed into a ``tfe-data-*.zip`` document and posted
into the vault channel — on every app close and after every completed sync,
keeping the ten most recent copies. On launch the newest archive is downloaded
and restored whenever it is newer than the local data, so the whole library
comes back even if the PC's data folder (or the EXE) is gone.

Generated imagery is not uploaded: auto thumbnails, IMDb posters and video
storyboards rebuild themselves from Telegram or the network, and bundling
them made snapshots grow with the whole library. Only hand-picked covers and
star portraits travel, because those cannot be regenerated.

The MTProto session file is deliberately never uploaded: it is a login
credential and can be recreated in seconds with the QR sign-in.
"""

from __future__ import annotations

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

from . import appconfig

log = logging.getLogger("tfe.vaultstore")

MARKER = "#tfedata"
PREFIX = "tfe-data-"
SUFFIX = ".zip"
STAMP_FORMAT = "%Y%m%d-%H%M%S"
KEEP = 10
SCAN_LIMIT = 120


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
            keep.append(path)
        elif len(parts) == 2 and parts[0] == "stars":
            keep.append(path)
    return keep


async def save(service: Any) -> Dict[str, Any]:
    client = service._require_ready()
    entity = service._entity
    if entity is None:
        return {"saved": False, "reason": "no vault"}
    when = datetime.now()
    name = f"{PREFIX}{when.strftime(STAMP_FORMAT)}{SUFFIX}"
    appconfig.ensure_dirs()
    thumbs = 0
    with tempfile.TemporaryDirectory(prefix="tfe-vault-") as tmp:
        work = Path(tmp)
        db_snap = work / "library.db"
        _snapshot_db(db_snap)
        zip_path = work / name
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
        await client.send_file(
            entity,
            str(zip_path),
            caption=f"{MARKER} {name}",
            force_document=True,
            attributes=[DocumentAttributeFilename(name)],
        )
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


async def restore(service: Any) -> Dict[str, Any]:
    client = service._require_ready()
    if service._entity is None:
        return {"restored": False, "reason": "no vault"}
    best = await find_latest(service)
    if best is None:
        return {"restored": False, "reason": "no snapshot in the vault yet"}
    stamp, message = best
    try:
        local_dt = datetime.fromtimestamp(appconfig.LIBRARY_PATH.stat().st_mtime)
    except OSError:
        local_dt = None
    if local_dt is not None and local_dt > stamp:
        return {"restored": False, "reason": "local data is newer"}
    appconfig.ensure_dirs()
    with tempfile.TemporaryDirectory(prefix="tfe-restore-") as tmp:
        work = Path(tmp)
        zip_path = work / "snapshot.zip"
        await client.download_media(message, file=str(zip_path))
        with zipfile.ZipFile(zip_path) as archive:
            members = _safe_members(archive)
            if not any(m.filename == "library.db" for m in members):
                return {"restored": False, "reason": "unreadable snapshot"}
            unpacked = work / "unpack"
            unpacked.mkdir()
            for member in members:
                archive.extract(member, unpacked)
        os.replace(unpacked / "library.db", appconfig.LIBRARY_PATH)
        for suffix in ("-wal", "-shm", "-journal"):
            try:
                Path(str(appconfig.LIBRARY_PATH) + suffix).unlink(missing_ok=True)
            except OSError:
                pass
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
    _write_marker(stamp)
    log.info("Library data restored from the vault: %s", stamp.isoformat(timespec="seconds"))
    return {"restored": True, "stamp": stamp.isoformat(timespec="seconds")}
