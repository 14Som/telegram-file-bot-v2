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
import re
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

_SYNC_LOCK: Optional[asyncio.Lock] = None


def _sync_lock() -> asyncio.Lock:
    """Restore and save swap the same database, so run one at a time.

    The phone now restores in the background while the UI is already open, so
    a close save could otherwise archive a half-written library.
    """
    global _SYNC_LOCK
    if _SYNC_LOCK is None:
        _SYNC_LOCK = asyncio.Lock()
    return _SYNC_LOCK


def _marker_path() -> Path:
    return appconfig.HOME / "vault_data.json"


def _read_marker() -> Optional[datetime]:
    return _marker_fields()[0]


def _marker_fields() -> Tuple[Optional[datetime], Optional[datetime]]:
    """The last snapshot this device applied or saved, plus the newest copy
    that was skipped because it arrived without any annotations."""
    try:
        data = json.loads(_marker_path().read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None, None

    def parse(key: str) -> Optional[datetime]:
        raw = str(data.get(key) or "")
        try:
            return datetime.fromisoformat(raw) if raw else None
        except ValueError:
            return None

    return parse("last_sync"), parse("skipped")


def _write_marker(when: datetime, skipped: Optional[datetime] = None) -> None:
    try:
        appconfig.ensure_dirs()
        payload = {"last_sync": when.isoformat(timespec="seconds")}
        if skipped is not None:
            payload["skipped"] = skipped.isoformat(timespec="seconds")
        tmp = _marker_path().with_suffix(".tmp")
        tmp.write_text(json.dumps(payload, indent=2), encoding="utf-8")
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


COUNT_KEYS = ("items", "stars", "links", "tags", "notes", "folders")
COUNT_PATTERN = re.compile(
    r"#c " + " ".join(key + r"=(\d+)" for key in COUNT_KEYS)
)
# How many recent snapshots may be downloaded to find the newest one that
# still carries annotations. Only reached when the newest copy has none.
INSPECT_LIMIT = 4


def _counts_from_message(message: Any) -> Optional[Dict[str, int]]:
    """Annotation counts saved in the caption; None for older snapshots."""
    text = getattr(message, "text", None) or getattr(message, "message", "") or ""
    match = COUNT_PATTERN.search(text)
    if match is None:
        return None
    return {key: int(value) for key, value in zip(COUNT_KEYS, match.groups())}


def _annotated(counts: Optional[Dict[str, int]]) -> bool:
    return bool(counts) and any(
        counts.get(key, 0) for key in ("stars", "links", "tags", "notes", "folders")
    )


def _db_counts(db_path: Path) -> Optional[Dict[str, int]]:
    """The same counts, read from a library database (live or unpacked)."""
    if not db_path.exists():
        return None
    try:
        conn = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)
        try:
            tables = {
                row[0]
                for row in conn.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table'"
                )
            }
            counts = {key: 0 for key in COUNT_KEYS}
            if "items" in tables:
                counts["items"] = conn.execute(
                    "SELECT COUNT(*) FROM items"
                ).fetchone()[0]
                counts["tags"] = conn.execute(
                    "SELECT COUNT(*) FROM items WHERE tags != ''"
                ).fetchone()[0]
                counts["notes"] = conn.execute(
                    "SELECT COUNT(*) FROM items WHERE note != ''"
                ).fetchone()[0]
            for key, table in (
                ("stars", "performers"),
                ("links", "item_performers"),
                ("folders", "folders"),
            ):
                if table in tables:
                    counts[key] = conn.execute(
                        f"SELECT COUNT(*) FROM {table}"
                    ).fetchone()[0]
            return counts
        finally:
            conn.close()
    except sqlite3.Error:
        log.exception("Could not read snapshot counts")
        return None


def _annotation_chats(db_path: Path) -> Dict[int, int]:
    """How strongly each channel in a library is annotated.

    One library database can index several vault channels, and stars, tags
    and notes are stored per channel. Restoring it on a phone that is
    pointed at a channel without them makes the app look wiped even though
    the data arrived: the copy just has to be shown from the right channel.
    """
    if not db_path.exists():
        return {}
    try:
        conn = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)
        try:
            tables = {
                row[0]
                for row in conn.execute(
                    "SELECT name FROM sqlite_master WHERE type = 'table'"
                )
            }
            scores: Dict[int, int] = {}
            if "performers" in tables:
                for chat_id, count in conn.execute(
                    "SELECT chat_id, COUNT(*) FROM performers GROUP BY chat_id"
                ):
                    scores[int(chat_id)] = scores.get(int(chat_id), 0) + int(count)
            if {"items", "item_performers"} <= tables:
                for chat_id, count in conn.execute(
                    "SELECT i.chat_id, COUNT(*) FROM item_performers ip"
                    " JOIN items i ON i.id = ip.item_id GROUP BY i.chat_id"
                ):
                    scores[int(chat_id)] = scores.get(int(chat_id), 0) + int(count)
            if "items" in tables:
                for chat_id, count in conn.execute(
                    "SELECT chat_id, COUNT(*) FROM items"
                    " WHERE tags != '' OR note != '' GROUP BY chat_id"
                ):
                    scores[int(chat_id)] = scores.get(int(chat_id), 0) + int(count)
            return scores
        finally:
            conn.close()
    except sqlite3.Error:
        log.exception("Could not read the annotated channels")
        return {}


# A channel needs a real body of annotations before the phone follows it;
# a stray name on the old channel must not keep the library looking empty.
ANNOTATED_MIN = 20


def _annotated_chat(
    scores: Dict[int, int], active: Optional[int]
) -> Optional[int]:
    if not scores:
        return None
    best_chat, best = max(scores.items(), key=lambda entry: entry[1])
    current = scores.get(active or 0, 0)
    if best >= ANNOTATED_MIN and best > current * 4:
        return best_chat
    return None


def _vault_for_chat(chat_id: int, vaults: list) -> Tuple[str, Optional[str]]:
    """The registry id and title for a channel's database chat id."""
    for vault in vaults:
        try:
            if int(vault.get("channel_id") or 0) == chat_id:
                return str(vault.get("id") or f"-100{chat_id}"), vault.get("title")
        except (TypeError, ValueError):
            continue
    wanted = f"-100{chat_id}"
    suffix = str(chat_id)
    for vault in vaults:
        raw = str(vault.get("id") or "")
        if raw == wanted or raw.endswith(suffix):
            return raw, vault.get("title")
    return wanted, None


async def _recent_snapshots(service: Any) -> list:
    """Snapshot messages in the active vault, newest first."""
    client = service._require_ready()
    if service._entity is None:
        return []
    found = []
    async for message in client.iter_messages(
        service._entity, limit=SCAN_LIMIT, wait_time=0
    ):
        stamp = _snapshot_name(_doc_name(message) or "")
        if stamp is not None:
            found.append((stamp, message, None))
    found.sort(key=lambda item: item[0], reverse=True)
    return found


async def _snapshots_for_mobile(service: Any, active_snapshots: list) -> list:
    """Start from the active vault and only walk the rest when it has nothing.

    _all_snapshots lists every known vault's channel, which costs a
    getHistory round-trip per vault on every phone launch. The active vault
    normally holds the newest annotated copy, so use it when it does.
    """
    applied, skipped = _marker_fields()
    for stamp, message, _vault_id in active_snapshots:
        if applied is not None and stamp <= applied:
            break
        if skipped is not None and stamp == skipped:
            continue
        if _annotated(_counts_from_message(message)):
            return active_snapshots
    return await _all_snapshots(service)


async def _all_snapshots(service: Any) -> list:
    """Snapshot messages from every known vault, newest first.

    A phone can open on a vault whose own snapshots never carry annotations
    while another channel holds the desktop's annotated copies. Looking at
    the whole registry keeps that phone from showing an empty-looking
    library on every boot.
    """
    client = service._require_ready()
    status = service.status()
    active = str((status.get("vault") or {}).get("id") or "")
    vaults = sorted(
        status.get("vaults") or [],
        key=lambda vault: str(vault.get("id") or "") != active,
    )
    found = []
    for vault in vaults:
        vault_id = str(vault.get("id") or "")
        title = str(vault.get("title") or vault_id)
        try:
            if vault_id == active:
                entity = service._entity
            else:
                entity, _info = await service._resolve_target(vault_id)
        except Exception:
            log.exception("Could not open the vault %s", title)
            continue
        if entity is None:
            continue
        try:
            async for message in client.iter_messages(
                entity, limit=SCAN_LIMIT, wait_time=0
            ):
                stamp = _snapshot_name(_doc_name(message) or "")
                if stamp is not None:
                    found.append((stamp, message, vault_id))
        except Exception:
            log.exception("Could not list the snapshots in %s", title)
    found.sort(key=lambda item: item[0], reverse=True)
    return found


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
    async with _sync_lock():
        return await _save(service)


async def _save(service: Any) -> Dict[str, Any]:
    client = service._require_ready()
    entity = service._entity
    if entity is None:
        return {"saved": False, "reason": "no vault"}
    applied, skipped = _marker_fields()
    local_counts = _db_counts(appconfig.LIBRARY_PATH)
    local_annotated = _annotated(local_counts)
    latest = await find_latest(service)
    if latest is not None:
        latest_counts = _counts_from_message(latest[1])
        if _annotated(latest_counts) and not local_annotated:
            # Scanning from Telegram produces an index without stars, tags or
            # folder settings. Uploading it would replace a good vault copy
            # with an empty one and the next launch would look wiped.
            log.info("Vault snapshot kept: it holds annotations this library lost")
            return {"saved": False, "reason": "vault holds annotations"}
        # If the vault already holds a snapshot newer than the one this
        # device applied, uploading the copy in memory would roll the library
        # back. A stale phone has usually just written to the vault itself; a
        # desktop left open while the phone saved reaches the same state.
        # A device with no marker (fresh install, cleared app data) has never
        # applied the vault's copy, so it must restore first. The phone never
        # trusts file times; the desktop can still compare them when it has no
        # marker, because its database only moves when it applies a snapshot.
        # The one exception is a newer copy this device inspected and
        # rejected as annotation-free: a good save must be able to supersede
        # it.
        if applied is not None:
            stale = latest[0] > applied
        elif IS_MOBILE:
            stale = True
        else:
            try:
                local_dt = datetime.fromtimestamp(appconfig.LIBRARY_PATH.stat().st_mtime)
            except OSError:
                local_dt = None
            stale = local_dt is not None and latest[0] > local_dt
        if stale:
            repair = (
                skipped is not None
                and latest[0] == skipped
                and local_annotated
            )
            if not repair:
                log.info("Vault snapshot kept: the vault already has a newer copy")
                return {"saved": False, "reason": "newer snapshot in the vault"}
    when = datetime.now()
    name = f"{PREFIX}{when.strftime(STAMP_FORMAT)}{SUFFIX}"
    appconfig.ensure_dirs()
    thumbs = 0
    counts = {key: 0 for key in COUNT_KEYS}
    with tempfile.TemporaryDirectory(dir=_stage(), prefix="save-") as tmp:
        work = Path(tmp)
        db_snap = work / "library.db"
        _snapshot_db(db_snap)
        counts = _db_counts(db_snap) or counts
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
                            "counts": counts,
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
                caption=(
                    f"{MARKER} {name} #c "
                    + " ".join(f"{key}={counts[key]}" for key in COUNT_KEYS)
                ),
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


def _annotation_score(conn: sqlite3.Connection, schema: str) -> int:
    tables = {
        row[0]
        for row in conn.execute(
            f"SELECT name FROM {schema}.sqlite_master WHERE type = 'table'"
        )
    }
    total = 0
    for table in ("performers", "item_performers", "collections", "saved_views", "tag_meta"):
        if table in tables:
            total += conn.execute(f"SELECT COUNT(*) FROM {schema}.{table}").fetchone()[0]
    if "items" in tables:
        total += conn.execute(
            f"SELECT COUNT(*) FROM {schema}.items"
            " WHERE tags != '' OR note != '' OR favorite = 1 OR imdb_id != ''"
        ).fetchone()[0]
    return total


def _keep_annotations(target: Path) -> None:
    """Carry this device's stars, tags, notes and folder settings into a
    restored library that arrived without any of them.

    A device that scanned straight from Telegram uploads an index-only copy;
    applying it would silently wipe customisations the other device never had.
    Row ids differ between two such libraries, so star links and annotations
    travel by (chat, message) instead of item id.
    """
    old = appconfig.LIBRARY_PATH
    if not old.exists():
        return
    try:
        conn = sqlite3.connect(str(target))
        try:
            conn.execute("ATTACH DATABASE ? AS old", (str(old),))
            if _annotation_score(conn, "main") > 0 or _annotation_score(conn, "old") == 0:
                return
            for table in ("performers", "collections", "saved_views", "tag_meta", "folders"):
                cols = ", ".join(
                    row[1] for row in conn.execute(f"PRAGMA main.table_info({table})")
                )
                conn.execute(
                    f"INSERT OR IGNORE INTO main.{table} ({cols})"
                    f" SELECT {cols} FROM old.{table}"
                )
            conn.execute(
                "INSERT OR IGNORE INTO main.item_performers (item_id, performer_id)"
                " SELECT mi.id, op.performer_id"
                " FROM old.item_performers op"
                " JOIN old.items oi ON oi.id = op.item_id"
                " JOIN main.items mi ON mi.chat_id = oi.chat_id"
                " AND mi.message_id = oi.message_id"
            )
            conn.execute(
                "INSERT OR IGNORE INTO main.collection_items (collection_id, item_id, added_at)"
                " SELECT ci.collection_id, mi.id, ci.added_at"
                " FROM old.collection_items ci"
                " JOIN old.items oi ON oi.id = ci.item_id"
                " JOIN main.items mi ON mi.chat_id = oi.chat_id"
                " AND mi.message_id = oi.message_id"
            )
            conn.execute(
                "UPDATE main.items AS m SET"
                " tags = oi.tags, note = oi.note, favorite = oi.favorite,"
                " imdb_id = oi.imdb_id, imdb_json = oi.imdb_json,"
                " imdb_poster_version = oi.imdb_poster_version"
                " FROM old.items AS oi"
                " WHERE oi.chat_id = m.chat_id AND oi.message_id = m.message_id"
                " AND (oi.tags != '' OR oi.note != '' OR oi.favorite = 1 OR oi.imdb_id != '')"
            )
            conn.commit()
            log.info(
                "Restored library had no annotations; kept this device's %d star(s)",
                conn.execute("SELECT COUNT(*) FROM main.performers").fetchone()[0],
            )
        finally:
            conn.close()
    except sqlite3.Error:
        log.exception("Could not keep this device's annotations")


async def restore(service: Any) -> Dict[str, Any]:
    async with _sync_lock():
        return await _restore_locked(service)


async def _restore_locked(service: Any) -> Dict[str, Any]:
    # The desktop keeps the whole library, so its local annotations say which
    # channel holds the stars; point there before deciding what to restore.
    # The phone has no local annotations on a fresh install and must restore
    # first, then follow, so it can be reopened on its default vault.
    switched_to = None if IS_MOBILE else await _follow_annotated_vault(service)
    result = await _restore_snapshot(service)
    if IS_MOBILE:
        # Runs on every boot, including when the index is already current:
        # the phone can reopen on its default vault, which may hold none of
        # the stars and tags that live in another channel of this library.
        switched_to = await _follow_annotated_vault(service)
    if switched_to:
        result = {**result, "switched_to": switched_to}
    return result


async def _restore_snapshot(service: Any) -> Dict[str, Any]:
    if service._entity is None:
        return {"restored": False, "reason": "no vault"}
    recent = await _recent_snapshots(service)
    if IS_MOBILE:
        recent = await _snapshots_for_mobile(service, recent)
    if not recent:
        return {"restored": False, "reason": "no snapshot in the vault yet"}
    newest_stamp = recent[0][0]
    # The marker records the last snapshot this device applied or saved. A
    # library sync also touches the database, so comparing file times would
    # stop a phone from ever picking up folder changes made on the desktop.
    applied, skipped = _marker_fields()
    if applied is not None:
        if newest_stamp <= applied:
            return {"restored": False, "reason": "local data is up to date"}
    elif not IS_MOBILE:
        # The phone never trusts its file times: a DB touched later can still
        # hold an older index, and keeping it would let the phone save that
        # stale copy over the vault (which is how stars and tags were lost).
        try:
            local_dt = datetime.fromtimestamp(appconfig.LIBRARY_PATH.stat().st_mtime)
        except OSError:
            local_dt = None
        if local_dt is not None and local_dt > newest_stamp:
            return {"restored": False, "reason": "local data is newer"}
    # The copy rejected last time is still never downloaded again, but a
    # newer annotated copy in another vault must not be hidden behind it.
    candidates = [
        item for item in recent if applied is None or item[0] > applied
    ]
    if skipped is not None:
        candidates = [item for item in candidates if item[0] != skipped]
    if not candidates:
        reason = (
            "newer copy is annotation-free"
            if skipped is not None
            else "local data is up to date"
        )
        return {"restored": False, "reason": reason}
    # A fresh phone has nothing local to merge, so an annotation-free newest
    # snapshot would leave it looking empty even though an annotated copy is
    # still in the vault. Walk back to the newest copy that carries them.
    fast = next(
        (
            item
            for item in candidates
            if _annotated(_counts_from_message(item[1]))
        ),
        None,
    )
    queue = [fast] if fast else candidates[:INSPECT_LIMIT]
    chosen = None
    degraded = None
    appconfig.ensure_dirs()
    with tempfile.TemporaryDirectory(dir=_stage(), prefix="restore-") as tmp:
        work = Path(tmp)
        for index, (stamp, message, vault_id) in enumerate(queue):
            zip_path = work / f"{PREFIX}{stamp.strftime(STAMP_FORMAT)}{SUFFIX}"
            unpacked = work / f"snap-{index}"
            try:
                # Telethon's download_media reads one 128 KiB stream; the
                # service helper uses four 512 KiB streams, which is what
                # makes the phone's first open after a desktop save quick.
                await service.download_to(message, zip_path)
                with zipfile.ZipFile(zip_path) as archive:
                    members = _safe_members(archive)
                    if not any(m.filename == "library.db" for m in members):
                        continue
                    unpacked.mkdir()
                    for member in members:
                        archive.extract(member, unpacked)
            finally:
                _shred(zip_path)
            counts = _db_counts(unpacked / "library.db") or {}
            if _annotated(counts):
                chosen = (stamp, unpacked, vault_id)
                break
            if degraded is None:
                degraded = (stamp, unpacked, vault_id)
            # A copy without annotations is only usable when this device has
            # its own to carry over, and even then an older intact copy is
            # better than merging into a degraded library.
            if index + 1 >= len(queue):
                break
        if chosen is None:
            if degraded is None:
                return {"restored": False, "reason": "unreadable snapshot"}
            chosen = degraded
        stamp, unpacked, _vault_id = chosen
        skipped_stamp = (
            newest_stamp if stamp != newest_stamp else None
        )
        favorites = _local_favorites()
        _keep_annotations(unpacked / "library.db")
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
    _write_marker(stamp, skipped_stamp)
    if skipped_stamp is not None:
        log.warning(
            "Skipped the annotation-free snapshot %s; restored %s instead",
            skipped_stamp.isoformat(timespec="seconds"),
            stamp.isoformat(timespec="seconds"),
        )
    log.info("Library data restored from the vault: %s", stamp.isoformat(timespec="seconds"))
    return {
        "restored": True,
        "stamp": stamp.isoformat(timespec="seconds"),
        "skipped": (
            skipped_stamp.isoformat(timespec="seconds")
            if skipped_stamp is not None
            else None
        ),
    }


async def _follow_annotated_vault(service: Any) -> Optional[str]:
    """Point the app at the channel of this library that holds the stars.

    Either app can reopen on its default vault, which can be a channel whose
    slice of the library carries no stars, tags or notes. Switching costs
    nothing and keeps the library from looking wiped after an install. A vault
    chosen as the default is never overridden: the lock screen offers the
    picker for the sessions that want a different one.
    """
    settings = appconfig.load_settings()
    if str(settings.get("default_vault") or "").strip():
        return None
    vaults = service.status().get("vaults") or []
    vault_info = service.status().get("vault") or {}
    try:
        active_id: Optional[int] = int(vault_info.get("channel_id") or 0)
    except (TypeError, ValueError):
        active_id = None
    target = _annotated_chat(
        _annotation_chats(appconfig.LIBRARY_PATH), active_id or None
    )
    if target is None:
        return None
    try:
        vault_id, title = _vault_for_chat(target, vaults)
        await service.set_vault(vault_id)
        switched_to = str(title or vault_id)
        log.warning(
            "Switched the active vault to %s: it holds the stars and tags",
            switched_to,
        )
        return switched_to
    except Exception:
        log.exception("Could not switch to the vault holding annotations")
        return None
