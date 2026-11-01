"""Local SQLite catalog for the desktop explorer.

Telegram is the storage; this file only holds names, folders, tags and
references to channel messages so the UI can be fast and searchable.
"""

from __future__ import annotations

import base64
import json
import os
import re
import sqlite3
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

from . import filetypes

SCHEMA = """
CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    message_id INTEGER NOT NULL,
    doc_id INTEGER,
    access_hash INTEGER,
    name TEXT NOT NULL,
    name_source TEXT NOT NULL DEFAULT 'telegram',
    kind TEXT NOT NULL DEFAULT 'other',
    mime TEXT,
    size INTEGER,
    width INTEGER,
    height INTEGER,
    duration INTEGER,
    folder TEXT NOT NULL DEFAULT 'Other',
    folder_source TEXT NOT NULL DEFAULT 'default',
    tags TEXT NOT NULL DEFAULT '',
    tags_source TEXT NOT NULL DEFAULT 'default',
    favorite INTEGER NOT NULL DEFAULT 0,
    fav_source TEXT NOT NULL DEFAULT 'default',
    caption TEXT,
    note TEXT NOT NULL DEFAULT '',
    tg_date TEXT,
    added_at TEXT NOT NULL DEFAULT (datetime('now')),
    hidden INTEGER NOT NULL DEFAULT 0,
    thumb_version INTEGER NOT NULL DEFAULT 0,
    has_thumb INTEGER NOT NULL DEFAULT 1,
    play_pos REAL NOT NULL DEFAULT 0,
    played_at TEXT NOT NULL DEFAULT '',
    imdb_id TEXT NOT NULL DEFAULT '',
    imdb_json TEXT NOT NULL DEFAULT '',
    imdb_poster_version INTEGER NOT NULL DEFAULT 0,
    meta_json TEXT NOT NULL DEFAULT '',
    UNIQUE(chat_id, message_id)
);
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_items_folder ON items(folder COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_items_kind ON items(kind);
CREATE INDEX IF NOT EXISTS idx_items_message ON items(message_id);
CREATE INDEX IF NOT EXISTS idx_items_chat_date ON items(
    chat_id, hidden, COALESCE(tg_date, added_at) DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_items_chat_size ON items(
    chat_id, hidden, COALESCE(size, 0) DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_items_chat_name ON items(
    chat_id, hidden, name COLLATE NOCASE, id);
CREATE INDEX IF NOT EXISTS idx_items_chat_folder ON items(
    chat_id, hidden, folder COLLATE NOCASE, name COLLATE NOCASE, id);
CREATE INDEX IF NOT EXISTS idx_items_chat_kind ON items(
    chat_id, hidden, kind, name COLLATE NOCASE, id);
CREATE INDEX IF NOT EXISTS idx_items_chat_favorite ON items(
    chat_id, hidden, favorite, COALESCE(tg_date, added_at) DESC);
CREATE TABLE IF NOT EXISTS folders (
    chat_id INTEGER NOT NULL DEFAULT 0,
    name TEXT NOT NULL COLLATE NOCASE,
    icon TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (chat_id, name)
);
CREATE TABLE IF NOT EXISTS performers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    name TEXT NOT NULL COLLATE NOCASE,
    aliases TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT '',
    birthdate TEXT NOT NULL DEFAULT '',
    height TEXT NOT NULL DEFAULT '',
    hair TEXT NOT NULL DEFAULT '',
    eyes TEXT NOT NULL DEFAULT '',
    measurements TEXT NOT NULL DEFAULT '',
    tattoos TEXT NOT NULL DEFAULT '',
    piercings TEXT NOT NULL DEFAULT '',
    favorite INTEGER NOT NULL DEFAULT 0,
    image_version INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (chat_id, name)
);
CREATE INDEX IF NOT EXISTS idx_performers_name ON performers(name COLLATE NOCASE);
CREATE TABLE IF NOT EXISTS item_performers (
    item_id INTEGER NOT NULL,
    performer_id INTEGER NOT NULL,
    PRIMARY KEY (item_id, performer_id)
);
CREATE INDEX IF NOT EXISTS idx_item_performers_star ON item_performers(performer_id);
CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    name TEXT NOT NULL COLLATE NOCASE,
    icon TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (chat_id, name)
);
CREATE TABLE IF NOT EXISTS collection_items (
    collection_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    added_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (collection_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_collection_items_item ON collection_items(item_id);
CREATE TABLE IF NOT EXISTS saved_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    name TEXT NOT NULL COLLATE NOCASE,
    data TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (chat_id, name)
);
CREATE TABLE IF NOT EXISTS tag_meta (
    chat_id INTEGER NOT NULL,
    tag TEXT NOT NULL COLLATE NOCASE,
    color TEXT NOT NULL DEFAULT '',
    grp TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (chat_id, tag)
);
CREATE TABLE IF NOT EXISTS sync_state (
    chat_id INTEGER PRIMARY KEY,
    last_message_id INTEGER NOT NULL DEFAULT 0,
    last_full_at TEXT NOT NULL DEFAULT ''
);
"""

FTS_DDL = """
CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
    name, caption, tags, note, folder, imdb_json,
    content='items', content_rowid='id'
);
CREATE TRIGGER IF NOT EXISTS items_fts_ai AFTER INSERT ON items BEGIN
    INSERT INTO items_fts(rowid, name, caption, tags, note, folder, imdb_json)
    VALUES (new.id, new.name, new.caption, new.tags, new.note, new.folder, new.imdb_json);
END;
CREATE TRIGGER IF NOT EXISTS items_fts_ad AFTER DELETE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, name, caption, tags, note, folder, imdb_json)
    VALUES ('delete', old.id, old.name, old.caption, old.tags, old.note, old.folder, old.imdb_json);
END;
CREATE TRIGGER IF NOT EXISTS items_fts_au AFTER UPDATE OF name, caption, tags, note, folder, imdb_json ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, name, caption, tags, note, folder, imdb_json)
    VALUES ('delete', old.id, old.name, old.caption, old.tags, old.note, old.folder, old.imdb_json);
    INSERT INTO items_fts(rowid, name, caption, tags, note, folder, imdb_json)
    VALUES (new.id, new.name, new.caption, new.tags, new.note, new.folder, new.imdb_json);
END;
"""

FOLDERS_DDL = """
CREATE TABLE IF NOT EXISTS folders (
    chat_id INTEGER NOT NULL DEFAULT 0,
    name TEXT NOT NULL COLLATE NOCASE,
    icon TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (chat_id, name)
);
"""

FOLDER_BY_KIND = {
    "image": "Images",
    "video": "Videos",
    "audio": "Music",
    "voice": "Voice notes",
    "document": "Documents",
    "model": "3D models",
    "cad": "CAD",
    "sticker": "Stickers",
    "gif": "GIFs",
    "other": "Other",
}

SORT_COLUMNS = {
    "name": "name COLLATE NOCASE",
    "date": "COALESCE(tg_date, added_at)",
    "size": "COALESCE(size, 0)",
    "kind": "kind, name COLLATE NOCASE",
    "folder": "folder COLLATE NOCASE, name COLLATE NOCASE",
    "added": "id",
    "star": (
        "COALESCE((SELECT MIN(pf.name COLLATE NOCASE)"
        " FROM item_performers ipf JOIN performers pf ON pf.id = ipf.performer_id"
        " WHERE ipf.item_id = items.id), '~')"
    ),
}

# Sorts whose pages can skip straight past the last seen row. Each tuple lists
# the ORDER BY expressions used as the cursor key; the row id is the final
# tie-breaker. Sorts with computed columns (star, watching) use offset paging.
SORT_KEYS = {
    "name": ("items.name COLLATE NOCASE",),
    "date": ("COALESCE(items.tg_date, items.added_at)",),
    "size": ("COALESCE(items.size, 0)",),
    "kind": ("items.kind", "items.name COLLATE NOCASE"),
    "folder": ("items.folder COLLATE NOCASE", "items.name COLLATE NOCASE"),
    "added": ("items.id",),
}

COUNT_CACHE_SECONDS = 5.0

KIND_RANK = {"image": 0, "video": 1, "gif": 2}

STAR_FIELDS = (
    "name", "aliases", "note", "country", "birthdate", "height",
    "hair", "eyes", "measurements", "tattoos", "piercings",
)

KIND_LABELS = {
    "image": "Image",
    "video": "Video",
    "audio": "Audio",
    "voice": "Voice note",
    "document": "Document",
    "model": "3D model",
    "cad": "CAD file",
    "sticker": "Sticker",
    "gif": "GIF",
    "other": "File",
}

_BAD_NAME = re.compile(r'[\\/:*?"<>|\x00-\x1f]')

UPSERT_SQL = """
INSERT INTO items (chat_id, message_id, doc_id, access_hash, name,
    kind, mime, size, width, height, duration, folder, caption,
    tg_date, has_thumb)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(chat_id, message_id) DO UPDATE SET
    doc_id = excluded.doc_id,
    access_hash = excluded.access_hash,
    kind = excluded.kind,
    mime = excluded.mime,
    size = excluded.size,
    width = excluded.width,
    height = excluded.height,
    duration = excluded.duration,
    caption = COALESCE(excluded.caption, items.caption),
    tg_date = COALESCE(excluded.tg_date, items.tg_date),
    has_thumb = MAX(items.has_thumb, excluded.has_thumb),
    name = CASE WHEN items.name_source = 'telegram'
                THEN excluded.name ELSE items.name END,
    folder = CASE WHEN items.folder_source = 'default'
                  THEN excluded.folder ELSE items.folder END
"""


def clean_name(name: str, fallback: str = "Untitled") -> str:
    name = _BAD_NAME.sub("_", (name or "").strip()).strip(". ")
    name = re.sub(r"\s+", " ", name)
    return name[:180] or fallback


def clean_folder_path(value: str, fallback: str = "") -> str:
    parts: List[str] = []
    for raw in str(value or "").replace("\\", "/").split("/"):
        part = clean_name(raw, "")
        if not part or part in {".", ".."}:
            continue
        candidate = "/".join([*parts, part])
        if len(candidate) > 180:
            break
        parts.append(part)
    return "/".join(parts) or fallback


def folder_parent(path: str) -> str:
    return path.rsplit("/", 1)[0] if "/" in path else ""


def folder_leaf(path: str) -> str:
    return path.rsplit("/", 1)[-1]


def join_folder(path: str, child: str) -> str:
    child = clean_folder_path(child, "")
    if not child:
        return clean_folder_path(path, "")
    return clean_folder_path(f"{path}/{child}" if path else child, "")


def normalize_tags(tags: str) -> str:
    seen: List[str] = []
    for raw in (tags or "").replace(",", " ").split():
        tag = raw.strip().lstrip("#").lower()
        tag = _BAD_NAME.sub("", tag)[:40]
        if tag and tag not in seen:
            seen.append(tag)
    return " ".join(seen)


def default_folder(kind: str) -> str:
    return FOLDER_BY_KIND.get(kind, "Other")


def _like(term: str) -> str:
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    data = dict(row)
    data["favorite"] = bool(data.get("favorite"))
    data["hidden"] = bool(data.get("hidden"))
    data["kind_label"] = KIND_LABELS.get(data.get("kind", "other"), "File")
    return data


_REVISION_TAIL = re.compile(r"[\s._-]+(?:v|rev|r)?[\s._-]*\d{1,3}$", re.IGNORECASE)


def revision_stem(name: str) -> str:
    """Base name shared by revision siblings, or "" when there is no marker."""
    match = _REVISION_TAIL.search(name or "")
    if not match or match.start() == 0:
        return ""
    return (name or "")[: match.start()].strip(" ._-")


class Catalog:
    def __init__(self, path: Path, chat_id: Optional[int] = None):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._cache: Dict[Any, Tuple[float, Any]] = {}
        self.init(chat_id)

    @contextmanager
    def connect(self):
        conn = sqlite3.connect(self.path, timeout=15)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA busy_timeout=15000")
        conn.execute("PRAGMA journal_mode=WAL")
        try:
            yield conn
            conn.commit()
        finally:
            # Any write makes cached counts and folder totals stale.
            if conn.total_changes:
                self._cache.clear()
            conn.close()

    def init(self, chat_id: Optional[int] = None) -> None:
        with self.connect() as conn:
            conn.executescript(SCHEMA)
            columns = {row["name"] for row in conn.execute("PRAGMA table_info(items)")}
            additions = {
                "name_source": "TEXT NOT NULL DEFAULT 'telegram'",
                "folder_source": "TEXT NOT NULL DEFAULT 'default'",
                "tags_source": "TEXT NOT NULL DEFAULT 'default'",
                "fav_source": "TEXT NOT NULL DEFAULT 'default'",
                "note": "TEXT NOT NULL DEFAULT ''",
                "hidden": "INTEGER NOT NULL DEFAULT 0",
                "thumb_version": "INTEGER NOT NULL DEFAULT 0",
                "has_thumb": "INTEGER NOT NULL DEFAULT 1",
                "play_pos": "REAL NOT NULL DEFAULT 0",
                "played_at": "TEXT NOT NULL DEFAULT ''",
                "imdb_id": "TEXT NOT NULL DEFAULT ''",
                "imdb_json": "TEXT NOT NULL DEFAULT ''",
                "imdb_poster_version": "INTEGER NOT NULL DEFAULT 0",
                "meta_json": "TEXT NOT NULL DEFAULT ''",
            }
            for name, ddl in additions.items():
                if name not in columns:
                    conn.execute(f"ALTER TABLE items ADD COLUMN {name} {ddl}")
            folder_columns = {row["name"] for row in conn.execute("PRAGMA table_info(folders)")}
            if "chat_id" not in folder_columns:
                # Older libraries kept one folder table for the single channel.
                # Move those folders onto the vault that is open right now.
                conn.execute("ALTER TABLE folders RENAME TO folders_legacy")
                conn.executescript(FOLDERS_DDL)
                icon = "icon" if "icon" in folder_columns else "''"
                note = "note" if "note" in folder_columns else "''"
                created = (
                    "created_at" if "created_at" in folder_columns else "datetime('now')"
                )
                conn.execute(
                    f"INSERT INTO folders (chat_id, name, icon, note, created_at)"
                    f" SELECT ?, name, {icon}, {note}, {created} FROM folders_legacy",
                    (int(chat_id or 0),),
                )
                conn.execute("DROP TABLE folders_legacy")
            else:
                folder_additions = {
                    "icon": "TEXT NOT NULL DEFAULT ''",
                    "note": "TEXT NOT NULL DEFAULT ''",
                }
                for name, ddl in folder_additions.items():
                    if name not in folder_columns:
                        conn.execute(f"ALTER TABLE folders ADD COLUMN {name} {ddl}")
            conn.execute("UPDATE items SET folder = 'Other' WHERE folder = ''")
            conn.execute("DELETE FROM folders WHERE name = ''")
            # Files indexed before the 3D/CAD families existed are reclassified
            # from their extension so the new type filter finds them.
            rows = conn.execute(
                "SELECT id, name, kind FROM items WHERE kind IN ('document', 'other', '')"
            ).fetchall()
            changes = []
            for row in rows:
                new_kind = filetypes.classify(row["name"] or "", row["kind"] or "")
                if new_kind != row["kind"]:
                    changes.append((new_kind, row["id"]))
            if changes:
                conn.executemany("UPDATE items SET kind = ? WHERE id = ?", changes)
            self.has_fts = False
            try:
                conn.executescript(FTS_DDL)
                conn.execute("INSERT INTO items_fts(items_fts) VALUES('rebuild')")
                self.has_fts = True
            except sqlite3.Error:
                # Older SQLite builds may lack FTS5; plain LIKE search still works.
                self.has_fts = False

    @staticmethod
    def _upsert_values(item: Dict[str, Any]) -> Tuple[Any, ...]:
        kind = filetypes.classify(
            str(item.get("name") or ""), str(item.get("kind") or "other")
        )
        folder = clean_folder_path(
            str(item.get("folder") or default_folder(kind)), "Other"
        )
        return (
            int(item["chat_id"]), int(item["message_id"]), item.get("doc_id"),
            item.get("access_hash"), clean_name(str(item.get("name") or "")),
            kind, item.get("mime"), item.get("size"), item.get("width"),
            item.get("height"), item.get("duration"), folder, item.get("caption"),
            item.get("tg_date") or datetime.now(timezone.utc).isoformat(timespec="seconds"),
            1 if item.get("has_thumb", True) else 0,
        )

    def upsert(self, item: Dict[str, Any]) -> int:
        """Insert a channel message, refreshing technical metadata only.

        Names, folders, tags and favorites are only refreshed while they are
        still automatic, so edits made in the explorer always win.
        """
        with self.connect() as conn:
            conn.execute(UPSERT_SQL, self._upsert_values(item))
            row = conn.execute(
                "SELECT id FROM items WHERE chat_id = ? AND message_id = ?",
                (int(item["chat_id"]), int(item["message_id"])),
            ).fetchone()
            return int(row["id"])

    def upsert_many(self, items: List[Dict[str, Any]]) -> int:
        values = [self._upsert_values(item) for item in items]
        if not values:
            return 0
        with self.connect() as conn:
            conn.executemany(UPSERT_SQL, values)
        return len(values)

    def get(self, item_id: int) -> Optional[Dict[str, Any]]:
        with self.connect() as conn:
            row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
        return row_to_dict(row) if row else None

    def by_message(self, chat_id: int, message_id: int) -> Optional[Dict[str, Any]]:
        with self.connect() as conn:
            row = conn.execute(
                "SELECT * FROM items WHERE chat_id = ? AND message_id = ?",
                (chat_id, message_id),
            ).fetchone()
        return row_to_dict(row) if row else None

    def _where(
        self,
        q: str = "",
        kind: str = "",
        folder: str = "",
        tag: str = "",
        favorite: bool = False,
        include_hidden: bool = False,
        hidden_only: bool = False,
        chat_id: Optional[int] = None,
        min_size: Optional[int] = None,
        max_size: Optional[int] = None,
        after: str = "",
        before: str = "",
        has_note: bool = False,
        recursive: bool = False,
        performer: Optional[int] = None,
        collection: Optional[int] = None,
        watching: bool = False,
    ) -> Tuple[str, List[Any]]:
        if hidden_only:
            clauses: List[str] = ["items.hidden = 1"]
        elif include_hidden:
            clauses = ["1 = 1"]
        else:
            clauses = ["items.hidden = 0"]
        params: List[Any] = []
        if chat_id is not None:
            clauses.append("items.chat_id = ?")
            params.append(int(chat_id))
        terms = [t.lstrip("#").lower() for t in (q or "").split()]
        terms = [t for t in terms if t]
        searched = False
        if terms and getattr(self, "has_fts", False):
            words = []
            for term in terms:
                cleaned = re.sub(r"[^0-9a-z_\u0080-\uffff]+", " ", term).strip()
                words.extend(cleaned.split())
            if words:
                clauses.append(
                    "(" + " AND ".join(
                        "(items.id IN (SELECT rowid FROM items_fts"
                        " WHERE items_fts MATCH ?) OR EXISTS ("
                        "SELECT 1 FROM item_performers ipp"
                        " JOIN performers pf ON pf.id = ipp.performer_id"
                        " WHERE ipp.item_id = items.id AND (pf.name LIKE ? ESCAPE '\\'"
                        " OR pf.aliases LIKE ? ESCAPE '\\')))"
                        for _ in words
                    ) + ")"
                )
                for word in words:
                    like = f"%{_like(word)}%"
                    params += [word + "*", like, like]
                searched = True
        if terms and not searched:
            for term in terms:
                like = f"%{_like(term)}%"
                clauses.append(
                    "(items.name LIKE ? ESCAPE '\\' OR items.caption LIKE ? ESCAPE '\\'"
                    " OR items.tags LIKE ? ESCAPE '\\' OR items.folder LIKE ? ESCAPE '\\'"
                    " OR items.note LIKE ? ESCAPE '\\' OR EXISTS ("
                    "SELECT 1 FROM item_performers ipp"
                    " JOIN performers pf ON pf.id = ipp.performer_id"
                    " WHERE ipp.item_id = items.id AND (pf.name LIKE ? ESCAPE '\\'"
                    " OR pf.aliases LIKE ? ESCAPE '\\')))"
                )
                params += [like] * 7
        if kind and kind != "all":
            clauses.append("items.kind = ?")
            params.append(kind)
        if folder and folder != "all":
            if folder == "__none__":
                clauses.append("items.folder = ''")
            elif recursive:
                clauses.append(
                    "(items.folder = ? COLLATE NOCASE"
                    " OR lower(items.folder) LIKE ? ESCAPE '\\')"
                )
                params += [folder, f"{_like(folder.lower())}/%"]
            else:
                clauses.append("items.folder = ? COLLATE NOCASE")
                params.append(folder)
        if tag:
            clauses.append("(' ' || lower(items.tags) || ' ') LIKE ? ESCAPE '\\'")
            params.append(f"% {_like(tag.lower())} %")
        if favorite:
            clauses.append("items.favorite = 1")
        if min_size is not None and min_size > 0:
            clauses.append("COALESCE(items.size, 0) >= ?")
            params.append(int(min_size))
        if max_size is not None and max_size > 0:
            clauses.append("COALESCE(items.size, 0) <= ?")
            params.append(int(max_size))
        if after:
            clauses.append(
                "substr(COALESCE(items.tg_date, items.added_at), 1, 10) >= ?"
            )
            params.append(after)
        if before:
            clauses.append(
                "substr(COALESCE(items.tg_date, items.added_at), 1, 10) <= ?"
            )
            params.append(before)
        if has_note:
            clauses.append("length(trim(items.note)) > 0")
        if performer is not None:
            clauses.append(
                "EXISTS (SELECT 1 FROM item_performers ipf"
                " WHERE ipf.item_id = items.id AND ipf.performer_id = ?)"
            )
            params.append(int(performer))
        if collection:
            clauses.append(
                "items.id IN (SELECT item_id FROM collection_items"
                " WHERE collection_id = ?)"
            )
            params.append(int(collection))
        if watching:
            clauses.append("items.play_pos > 0")
        return " AND ".join(clauses), params

    @staticmethod
    def _encode_cursor(
        sort: str, order: str, values: List[Any], item_id: int
    ) -> str:
        raw = json.dumps(
            {"s": sort, "o": order, "v": values, "i": int(item_id)},
            separators=(",", ":"),
        )
        return base64.urlsafe_b64encode(raw.encode("utf-8")).decode("ascii").rstrip("=")

    @staticmethod
    def _decode_cursor(cursor: str) -> Optional[Dict[str, Any]]:
        try:
            padded = cursor + "=" * (-len(cursor) % 4)
            raw = base64.urlsafe_b64decode(padded.encode("ascii"))
            data = json.loads(raw.decode("utf-8"))
        except (ValueError, TypeError):
            return None
        if not isinstance(data, dict) or not isinstance(data.get("v"), list):
            return None
        return data

    @staticmethod
    def _keyset_values(sort: str, row: sqlite3.Row) -> List[Any]:
        if sort == "date":
            return [row["tg_date"] or row["added_at"]]
        if sort == "added":
            return [int(row["id"])]
        if sort == "size":
            return [int(row["size"] or 0)]
        if sort == "kind":
            return [row["kind"], row["name"]]
        if sort == "folder":
            return [row["folder"], row["name"]]
        return [row["name"]]

    @staticmethod
    def _keyset_clause(
        keys: Tuple[str, ...], values: List[Any], item_id: int, order: str
    ) -> Tuple[str, List[Any]]:
        compare = "<" if order == "DESC" else ">"
        clauses: List[str] = []
        params: List[Any] = []
        for index, key in enumerate(keys):
            parts = []
            for earlier in range(index):
                parts.append(f"{keys[earlier]} = ?")
                params.append(values[earlier])
            parts.append(f"{key} {compare} ?")
            params.append(values[index])
            clauses.append("(" + " AND ".join(parts) + ")")
        if keys[-1] != "items.id":
            parts = [f"{key} = ?" for key in keys]
            params.extend(values)
            parts.append(f"items.id {compare} ?")
            params.append(int(item_id))
            clauses.append("(" + " AND ".join(parts) + ")")
        return "(" + " OR ".join(clauses) + ")", params

    def list(
        self,
        q: str = "",
        kind: str = "",
        folder: str = "",
        tag: str = "",
        favorite: bool = False,
        sort: str = "date",
        direction: str = "desc",
        limit: int = 100,
        offset: int = 0,
        include_hidden: bool = False,
        hidden_only: bool = False,
        chat_id: Optional[int] = None,
        min_size: Optional[int] = None,
        max_size: Optional[int] = None,
        after: str = "",
        before: str = "",
        has_note: bool = False,
        recursive: bool = False,
        performer: Optional[int] = None,
        collection: Optional[int] = None,
        watching: bool = False,
        cursor: str = "",
    ) -> Dict[str, Any]:
        where, params = self._where(
            q, kind, folder, tag, favorite, include_hidden, hidden_only, chat_id,
            min_size, max_size, after, before, has_note, recursive, performer,
            collection, watching,
        )
        column = SORT_COLUMNS.get(sort, SORT_COLUMNS["date"])
        order = "DESC" if str(direction).lower() == "desc" else "ASC"
        if watching:
            column = "COALESCE(NULLIF(items.played_at, ''), items.tg_date)"
            order = "DESC"
        limit = max(1, min(int(limit or 100), 500))
        offset = max(0, int(offset or 0))
        keys = None if watching else SORT_KEYS.get(sort)
        page_where, page_params = where, list(params)
        next_cursor = ""
        if keys and cursor:
            parsed = self._decode_cursor(cursor)
            if (
                parsed
                and parsed.get("s") == sort
                and parsed.get("o") == order
                and len(parsed.get("v") or []) == len(keys)
            ):
                clause, extra = self._keyset_clause(
                    keys, parsed["v"], int(parsed.get("i") or 0), order
                )
                page_where = f"({where}) AND {clause}"
                page_params = list(params) + extra
                offset = 0
        if keys:
            order_exprs = list(keys)
            if order_exprs[-1] != "items.id":
                order_exprs.append("items.id")
            order_sql = ", ".join(f"{expr} {order}" for expr in order_exprs)
        else:
            order_sql = f"{column} {order}, items.id {order}"
        cache_key = ("list", where, tuple(params))
        now = time.monotonic()
        cached = self._cache.get(cache_key)
        with self.connect() as conn:
            if cached is not None and now - cached[0] <= COUNT_CACHE_SECONDS:
                total, total_size = cached[1]
            else:
                totals = conn.execute(
                    f"SELECT COUNT(*) AS n, COALESCE(SUM(size), 0) AS size"
                    f" FROM items WHERE {where}",
                    params,
                ).fetchone()
                total, total_size = int(totals["n"]), int(totals["size"])
                self._cache[cache_key] = (now, (total, total_size))
            rows = conn.execute(
                f"SELECT * FROM items WHERE {page_where} ORDER BY {order_sql}"
                " LIMIT ? OFFSET ?",
                (*page_params, limit, offset),
            ).fetchall()
        if keys and len(rows) == limit:
            last = rows[-1]
            next_cursor = self._encode_cursor(
                sort, order, self._keyset_values(sort, last), int(last["id"])
            )
        return {
            "items": [row_to_dict(row) for row in rows],
            "total": total,
            "offset": offset,
            "limit": limit,
            "total_size": total_size,
            "next_cursor": next_cursor,
        }

    @staticmethod
    def _insert_ancestors(
        conn: sqlite3.Connection, path: str, chat_id: Optional[int] = None
    ) -> None:
        parts = path.split("/")
        scope = int(chat_id or 0)
        for index in range(1, len(parts) + 1):
            conn.execute(
                "INSERT OR IGNORE INTO folders (chat_id, name) VALUES (?, ?)",
                (scope, "/".join(parts[:index])),
            )

    def folders(self, chat_id: Optional[int] = None) -> List[Dict[str, Any]]:
        cache_key = ("folders", chat_id)
        now = time.monotonic()
        cached = self._cache.get(cache_key)
        if cached is not None and now - cached[0] <= COUNT_CACHE_SECONDS:
            return [dict(entry) for entry in cached[1]]
        clause = "WHERE hidden = 0"
        params: List[Any] = []
        if chat_id is not None:
            clause += " AND chat_id = ?"
            params.append(int(chat_id))
        with self.connect() as conn:
            rows = conn.execute(
                f"SELECT folder, COUNT(*) AS n, COALESCE(SUM(size), 0) AS size"
                f" FROM items {clause} GROUP BY folder",
                params,
            ).fetchall()
            if chat_id is not None:
                meta_rows = conn.execute(
                    "SELECT name, icon, note FROM folders WHERE chat_id = ?",
                    (int(chat_id),),
                ).fetchall()
            else:
                meta_rows = conn.execute(
                    "SELECT name, icon, note FROM folders"
                ).fetchall()
        direct: Dict[str, Tuple[int, int]] = {}
        for row in rows:
            path = clean_folder_path(row["folder"], "")
            if path:
                direct[path] = (int(row["n"]), int(row["size"]))
        meta: Dict[str, Dict[str, Any]] = {}
        for row in meta_rows:
            path = clean_folder_path(row["name"], "")
            if path:
                meta[path] = {"icon": row["icon"] or "", "note": row["note"] or ""}
        paths = set(direct) | set(meta)
        for path in list(paths):
            parts = path.split("/")
            for index in range(1, len(parts) + 1):
                paths.add("/".join(parts[:index]))
        totals: Dict[str, List[int]] = {path: [0, 0] for path in paths}
        for path, (count, size) in direct.items():
            parts = path.split("/")
            for index in range(1, len(parts) + 1):
                prefix = "/".join(parts[:index])
                totals.setdefault(prefix, [0, 0])
                totals[prefix][0] += count
                totals[prefix][1] += size
        entries = []
        for path in paths:
            count, size = totals.get(path, [0, 0])
            direct_count, direct_size = direct.get(path, (0, 0))
            entries.append(
                {
                    "folder": path,
                    "name": folder_leaf(path),
                    "parent": folder_parent(path),
                    "depth": path.count("/"),
                    "n": count,
                    "size": size,
                    "direct_n": direct_count,
                    "direct_size": direct_size,
                    "icon": meta.get(path, {}).get("icon", ""),
                    "note": meta.get(path, {}).get("note", ""),
                }
            )
        entries = sorted(entries, key=lambda value: value["folder"].lower())
        self._cache[cache_key] = (now, entries)
        return [dict(entry) for entry in entries]

    def folder_covers(
        self,
        chat_id: Optional[int] = None,
        per_folder: int = 4,
        has_thumb_file: Optional[Callable[[int], bool]] = None,
        paths: Optional[List[str]] = None,
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Cover items for the requested folders, keyed by lowercased path.

        A folder's covers include files from its subfolders, mirroring the
        recursive file counts shown in the sidebar. Images come first, then
        videos and GIFs, newest first. Only the requested folders are read, so
        the nav never has to walk the whole library.
        """
        if paths is None:
            wanted = [entry["folder"] for entry in self.folders(chat_id)]
        else:
            wanted = [clean_folder_path(path, "") for path in paths]
        wanted = list(dict.fromkeys(path for path in wanted if path))
        covers: Dict[str, List[Dict[str, Any]]] = {}
        if not wanted:
            return covers
        limit = max(per_folder * 3, per_folder)
        clause = "WHERE hidden = 0 AND has_thumb = 1"
        params: List[Any] = []
        if chat_id is not None:
            clause += " AND chat_id = ?"
            params.append(int(chat_id))
        select = (
            "SELECT id, kind, thumb_version, tg_date, added_at FROM items"
        )
        order = (
            " ORDER BY CASE kind WHEN 'image' THEN 0 WHEN 'video' THEN 1"
            " WHEN 'gif' THEN 2 ELSE 3 END,"
            " COALESCE(tg_date, added_at) DESC, id DESC LIMIT ?"
        )
        with self.connect() as conn:
            for path in wanted:
                rows = list(
                    conn.execute(
                        f"{select} {clause}"
                        " AND folder = ? COLLATE NOCASE" + order,
                        (*params, path, limit),
                    ).fetchall()
                )
                rows += conn.execute(
                    f"{select} INDEXED BY idx_items_chat_folder {clause}"
                    " AND folder >= ? AND folder < ?" + order,
                    (*params, f"{path}/", f"{path}0", limit),
                ).fetchall()
                seen = set()
                merged = []
                for row in rows:
                    if int(row["id"]) in seen:
                        continue
                    seen.add(int(row["id"]))
                    merged.append(row)
                merged.sort(key=lambda row: int(row["id"]), reverse=True)
                merged.sort(
                    key=lambda row: row["tg_date"] or row["added_at"], reverse=True
                )
                merged.sort(key=lambda row: KIND_RANK.get(row["kind"], 3))
                items = [
                    {
                        "id": int(row["id"]),
                        "kind": row["kind"] or "other",
                        "version": int(row["thumb_version"] or 0),
                    }
                    for row in merged
                ]
                if has_thumb_file is not None:
                    cached = [item for item in items if has_thumb_file(item["id"])]
                    picked = cached[:per_folder] or items[:per_folder]
                else:
                    picked = items[:per_folder]
                if picked:
                    covers[path.lower()] = picked
        return covers

    def folder_info(
        self, name: str, chat_id: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        folder = clean_folder_path(name, "")
        if not folder:
            return None
        for entry in self.folders(chat_id):
            if entry["folder"].lower() == folder.lower():
                return entry
        return None

    def create_folder(self, name: str, chat_id: Optional[int] = None) -> str:
        folder = clean_folder_path(name, "")
        if not folder:
            raise ValueError("Folder name cannot be empty.")
        scope = int(chat_id or 0)
        with self.connect() as conn:
            existing = conn.execute(
                "SELECT name FROM folders WHERE chat_id = ? AND name = ? COLLATE NOCASE",
                (scope, folder),
            ).fetchone()
            if existing is None:
                existing = conn.execute(
                    "SELECT folder AS name FROM items WHERE chat_id = ?"
                    " AND folder = ? COLLATE NOCASE LIMIT 1",
                    (scope, folder),
                ).fetchone()
            canonical = str(existing["name"]) if existing is not None else folder
            self._insert_ancestors(conn, canonical, scope)
        return canonical

    def set_folder_meta(
        self,
        name: str,
        icon: Optional[str] = None,
        note: Optional[str] = None,
        chat_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        folder = clean_folder_path(name, "")
        if not folder:
            raise ValueError("Folder name cannot be empty.")
        scope = int(chat_id or 0)
        updates: Dict[str, Any] = {}
        if icon is not None:
            clean_icon = re.sub(r"[\r\n\t]", "", str(icon)).strip()[:32]
            updates["icon"] = clean_icon
        if note is not None:
            updates["note"] = str(note).strip()[:4000]
        with self.connect() as conn:
            self._insert_ancestors(conn, folder, scope)
            if updates:
                assignments = ", ".join(f"{key} = ?" for key in updates)
                conn.execute(
                    f"UPDATE folders SET {assignments}"
                    " WHERE chat_id = ? AND name = ? COLLATE NOCASE",
                    (*updates.values(), scope, folder),
                )
        return self.folder_info(folder, chat_id) or {
            "folder": folder,
            "name": folder_leaf(folder),
            "parent": folder_parent(folder),
            "depth": folder.count("/"),
            "n": 0,
            "size": 0,
            "direct_n": 0,
            "direct_size": 0,
            "icon": updates.get("icon", ""),
            "note": updates.get("note", ""),
        }

    def rename_folder(
        self, old_name: str, new_name: str, chat_id: Optional[int] = None
    ) -> str:
        old = clean_folder_path(old_name, "")
        if not old:
            raise ValueError("Folder not found.")
        raw = str(new_name or "").strip()
        if "/" in raw.replace("\\", "/"):
            target = clean_folder_path(raw, "")
        else:
            target = join_folder(folder_parent(old), raw)
        if not target:
            raise ValueError("Folder name cannot be empty.")
        case_only = old.lower() == target.lower()
        scope = int(chat_id or 0)
        with self.connect() as conn:
            exists = conn.execute(
                "SELECT 1 FROM folders WHERE chat_id = ? AND name = ? COLLATE NOCASE"
                " UNION ALL SELECT 1 FROM items WHERE chat_id = ?"
                " AND folder = ? COLLATE NOCASE LIMIT 1",
                (scope, old, scope, old),
            ).fetchone()
            if exists is None:
                raise ValueError("Folder not found.")
            prefix = f"{_like(old.lower())}/%"
            if not case_only:
                conflict = conn.execute(
                    "SELECT 1 FROM folders WHERE chat_id = ?"
                    " AND name = ? COLLATE NOCASE"
                    " UNION ALL SELECT 1 FROM items WHERE chat_id = ?"
                    " AND folder = ? COLLATE NOCASE LIMIT 1",
                    (scope, target, scope, target),
                ).fetchone()
                if conflict is not None:
                    raise ValueError("A folder with that name already exists.")
            conn.execute(
                "UPDATE items SET folder = ? || substr(folder, ?),"
                " folder_source = 'user'"
                " WHERE chat_id = ? AND (folder = ? COLLATE NOCASE"
                " OR lower(folder) LIKE ? ESCAPE '\\')",
                (target, len(old) + 1, scope, old, prefix),
            )
            rows = conn.execute(
                "SELECT name, icon, note FROM folders"
                " WHERE chat_id = ? AND (name = ? COLLATE NOCASE"
                " OR lower(name) LIKE ? ESCAPE '\\')",
                (scope, old, prefix),
            ).fetchall()
            conn.execute(
                "DELETE FROM folders WHERE chat_id = ? AND (name = ? COLLATE NOCASE"
                " OR lower(name) LIKE ? ESCAPE '\\')",
                (scope, old, prefix),
            )
            mapped = [
                (target + row["name"][len(old):], row["icon"], row["note"])
                for row in rows
            ]
            if not any(entry[0].lower() == target.lower() for entry in mapped):
                mapped.append((target, "", ""))
            for path, icon, note in mapped:
                parent = folder_parent(path)
                if parent:
                    self._insert_ancestors(conn, parent, scope)
                conn.execute(
                    "INSERT INTO folders (chat_id, name, icon, note)"
                    " VALUES (?, ?, ?, ?)"
                    " ON CONFLICT(chat_id, name) DO UPDATE SET icon = excluded.icon,"
                    " note = excluded.note",
                    (scope, path, icon, note),
                )
        return target

    def delete_folder(self, name: str, chat_id: Optional[int] = None) -> bool:
        folder = clean_folder_path(name, "")
        if not folder:
            return False
        scope = int(chat_id or 0)
        prefix = f"{_like(folder.lower())}/%"
        with self.connect() as conn:
            items = int(
                conn.execute(
                    "SELECT COUNT(*) AS n FROM items WHERE chat_id = ?"
                    " AND (folder = ? COLLATE NOCASE"
                    " OR lower(folder) LIKE ? ESCAPE '\\')",
                    (scope, folder, prefix),
                ).fetchone()["n"]
            )
            children = int(
                conn.execute(
                    "SELECT COUNT(*) AS n FROM folders WHERE chat_id = ?"
                    " AND lower(name) LIKE ? ESCAPE '\\'",
                    (scope, prefix),
                ).fetchone()["n"]
            )
            if items or children:
                return False
            cur = conn.execute(
                "DELETE FROM folders WHERE chat_id = ? AND name = ? COLLATE NOCASE",
                (scope, folder),
            )
            return cur.rowcount > 0

    def adopt_unscoped_folders(self, chat_id: int) -> int:
        """Claim folder rows migrated before a vault was chosen."""
        try:
            scope = int(chat_id)
        except (TypeError, ValueError):
            return 0
        with self.connect() as conn:
            conn.execute(
                "INSERT OR IGNORE INTO folders (chat_id, name, icon, note, created_at)"
                " SELECT ?, name, icon, note, created_at FROM folders WHERE chat_id = 0",
                (scope,),
            )
            cur = conn.execute("DELETE FROM folders WHERE chat_id = 0")
            return cur.rowcount

    def folder_items(
        self,
        folder: str,
        chat_id: Optional[int] = None,
        include_hidden: bool = False,
    ) -> List[Dict[str, Any]]:
        path = clean_folder_path(folder, "")
        if not path:
            return []
        where, params = self._where(
            folder=path,
            recursive=True,
            include_hidden=include_hidden,
            chat_id=chat_id,
        )
        with self.connect() as conn:
            rows = conn.execute(
                f"SELECT * FROM items WHERE {where}"
                " ORDER BY folder COLLATE NOCASE, name COLLATE NOCASE LIMIT 5000",
                params,
            ).fetchall()
        return [row_to_dict(row) for row in rows]

    def tags(self, chat_id: Optional[int] = None) -> List[Dict[str, Any]]:
        sql = "SELECT tags FROM items WHERE hidden = 0 AND tags != ''"
        params: List[Any] = []
        if chat_id is not None:
            sql += " AND chat_id = ?"
            params.append(int(chat_id))
        with self.connect() as conn:
            rows = conn.execute(sql, params).fetchall()
            meta_rows = conn.execute(
                "SELECT tag, color, grp FROM tag_meta"
                + (" WHERE chat_id = ?" if chat_id is not None else ""),
                ((int(chat_id),) if chat_id is not None else ()),
            ).fetchall()
        counts: Dict[str, int] = {}
        for row in rows:
            for tag in row["tags"].split():
                counts[tag] = counts.get(tag, 0) + 1
        meta = {
            str(row["tag"]).lower(): {
                "name": str(row["tag"]),
                "color": row["color"] or "",
                "group": row["grp"] or "",
            }
            for row in meta_rows
        }
        entries = [
            {
                "tag": tag,
                "count": count,
                "color": meta.get(tag.lower(), {}).get("color", ""),
                "group": meta.get(tag.lower(), {}).get("group", ""),
            }
            for tag, count in counts.items()
        ]
        # Keep colour/group assignments for tags that currently have no files so
        # they come back when the tag is used again.
        entries += [
            {
                "tag": entry["name"],
                "count": 0,
                "color": entry["color"],
                "group": entry["group"],
            }
            for key, entry in meta.items()
            if key not in {tag.lower() for tag in counts}
        ]
        return sorted(
            entries,
            key=lambda entry: (
                entry["group"].lower(),
                -entry["count"],
                entry["tag"].lower(),
            ),
        )

    def set_tag_meta(
        self, tag: str, chat_id: Optional[int], color: str = "", group: str = ""
    ) -> Dict[str, Any]:
        name = str(tag or "").strip().lstrip("#")
        if not name:
            raise ValueError("A tag name is required.")
        color = str(color or "").strip()[:7]
        if color and not re.fullmatch(r"#[0-9a-fA-F]{6}", color):
            color = ""
        group = str(group or "").strip()[:40]
        scope = int(chat_id or 0)
        with self.connect() as conn:
            if not color and not group:
                conn.execute(
                    "DELETE FROM tag_meta WHERE chat_id = ? AND tag = ? COLLATE NOCASE",
                    (scope, name),
                )
            else:
                conn.execute(
                    "INSERT INTO tag_meta (chat_id, tag, color, grp) VALUES (?, ?, ?, ?)"
                    " ON CONFLICT(chat_id, tag) DO UPDATE SET"
                    " color = excluded.color, grp = excluded.grp",
                    (scope, name, color, group),
                )
        return {"tag": name, "color": color, "group": group}

    def kinds(self, chat_id: Optional[int] = None) -> List[Dict[str, Any]]:
        sql = "SELECT kind, COUNT(*) AS n FROM items WHERE hidden = 0"
        params: List[Any] = []
        if chat_id is not None:
            sql += " AND chat_id = ?"
            params.append(int(chat_id))
        sql += " GROUP BY kind ORDER BY n DESC"
        with self.connect() as conn:
            rows = conn.execute(sql, params).fetchall()
        return [
            {"kind": row["kind"], "label": KIND_LABELS.get(row["kind"], "File"),
             "count": int(row["n"])}
            for row in rows
        ]

    def name_index(self, chat_id: Optional[int] = None) -> List[Dict[str, Any]]:
        sql = "SELECT id, name, size FROM items WHERE hidden = 0"
        params: List[Any] = []
        if chat_id is not None:
            sql += " AND chat_id = ?"
            params.append(int(chat_id))
        with self.connect() as conn:
            rows = conn.execute(sql, params).fetchall()
        return [dict(row) for row in rows]

    def stats(self, chat_id: Optional[int] = None) -> Dict[str, Any]:
        clause = "WHERE hidden = 0"
        params: List[Any] = []
        if chat_id is not None:
            clause += " AND chat_id = ?"
            params.append(int(chat_id))
        with self.connect() as conn:
            row = conn.execute(
                f"SELECT COUNT(*) AS n, COALESCE(SUM(size), 0) AS size,"
                f" COALESCE(SUM(favorite), 0) AS favorites,"
                f" COALESCE(SUM(CASE WHEN play_pos > 0 THEN 1 ELSE 0 END), 0) AS playing"
                f" FROM items {clause}",
                params,
            ).fetchone()
            last = conn.execute(
                f"SELECT MAX(added_at) AS added FROM items {clause}", params
            ).fetchone()
            hidden = conn.execute(
                "SELECT COUNT(*) AS n FROM items WHERE hidden = 1"
                + (" AND chat_id = ?" if chat_id is not None else ""),
                params,
            ).fetchone()
        return {
            "count": int(row["n"]),
            "size": int(row["size"]),
            "favorites": int(row["favorites"]),
            "playing": int(row["playing"]),
            "hidden": int(hidden["n"]),
            "last_sync": last["added"] if last else None,
        }

    # ------------------------------------------------------------ collections
    def collections(self, chat_id: Optional[int] = None) -> List[Dict[str, Any]]:
        scope = int(chat_id or 0)
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT c.id, c.name, c.icon, c.note, c.created_at,"
                " (SELECT COUNT(*) FROM collection_items ci"
                "  JOIN items i ON i.id = ci.item_id"
                "  WHERE ci.collection_id = c.id AND i.hidden = 0) AS n,"
                " (SELECT COALESCE(SUM(i.size), 0) FROM collection_items ci"
                "  JOIN items i ON i.id = ci.item_id"
                "  WHERE ci.collection_id = c.id AND i.hidden = 0) AS size,"
                " (SELECT i.id FROM collection_items ci"
                "  JOIN items i ON i.id = ci.item_id"
                "  WHERE ci.collection_id = c.id AND i.hidden = 0 AND i.has_thumb = 1"
                "  ORDER BY ci.added_at DESC LIMIT 1) AS cover"
                " FROM collections c WHERE c.chat_id = ?"
                " ORDER BY c.name COLLATE NOCASE",
                (scope,),
            ).fetchall()
        return [dict(row) for row in rows]

    def collection(self, collection_id: int, chat_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
        with self.connect() as conn:
            row = conn.execute(
                "SELECT * FROM collections WHERE id = ? AND chat_id = ?",
                (int(collection_id), int(chat_id or 0)),
            ).fetchone()
        return dict(row) if row else None

    def create_collection(
        self, name: str, chat_id: Optional[int] = None
    ) -> Dict[str, Any]:
        value = str(name or "").strip()[:80]
        if not value:
            raise ValueError("Give the collection a name.")
        scope = int(chat_id or 0)
        with self.connect() as conn:
            try:
                cur = conn.execute(
                    "INSERT INTO collections (chat_id, name) VALUES (?, ?)",
                    (scope, value),
                )
            except sqlite3.IntegrityError:
                raise ValueError("A collection with that name already exists.")
            row = conn.execute(
                "SELECT * FROM collections WHERE id = ?", (int(cur.lastrowid),)
            ).fetchone()
        result = dict(row)
        result.update({"n": 0, "size": 0, "cover": None})
        return result

    def rename_collection(
        self, collection_id: int, name: str, chat_id: Optional[int] = None
    ) -> Dict[str, Any]:
        value = str(name or "").strip()[:80]
        if not value:
            raise ValueError("Give the collection a name.")
        with self.connect() as conn:
            try:
                cur = conn.execute(
                    "UPDATE collections SET name = ? WHERE id = ? AND chat_id = ?",
                    (value, int(collection_id), int(chat_id or 0)),
                )
            except sqlite3.IntegrityError:
                raise ValueError("A collection with that name already exists.")
            if cur.rowcount == 0:
                raise ValueError("Collection not found.")
        return {"id": int(collection_id), "name": value}

    def delete_collection(self, collection_id: int, chat_id: Optional[int] = None) -> bool:
        with self.connect() as conn:
            row = conn.execute(
                "SELECT id FROM collections WHERE id = ? AND chat_id = ?",
                (int(collection_id), int(chat_id or 0)),
            ).fetchone()
            if row is None:
                return False
            conn.execute(
                "DELETE FROM collection_items WHERE collection_id = ?",
                (int(collection_id),),
            )
            conn.execute("DELETE FROM collections WHERE id = ?", (int(collection_id),))
        return True

    def collection_add(
        self,
        collection_id: int,
        item_ids: List[int],
        chat_id: Optional[int] = None,
        remove: bool = False,
    ) -> int:
        scope = int(chat_id or 0)
        ids = sorted({int(value) for value in item_ids})
        if not ids:
            return 0
        with self.connect() as conn:
            owner = conn.execute(
                "SELECT id FROM collections WHERE id = ? AND chat_id = ?",
                (int(collection_id), scope),
            ).fetchone()
            if owner is None:
                raise ValueError("Collection not found.")
            marks = ",".join("?" * len(ids))
            owned = conn.execute(
                f"SELECT COUNT(*) AS n FROM items WHERE chat_id = ? AND id IN ({marks})",
                (scope, *ids),
            ).fetchone()
            if int(owned["n"]) != len(ids):
                raise ValueError("Some files are not in this vault.")
            if remove:
                conn.executemany(
                    "DELETE FROM collection_items WHERE collection_id = ? AND item_id = ?",
                    [(int(collection_id), item_id) for item_id in ids],
                )
                return len(ids)
            conn.executemany(
                "INSERT OR IGNORE INTO collection_items (collection_id, item_id)"
                " VALUES (?, ?)",
                [(int(collection_id), item_id) for item_id in ids],
            )
            return len(ids)

    def item_collections(
        self, item_id: int, chat_id: Optional[int] = None
    ) -> List[int]:
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT ci.collection_id FROM collection_items ci"
                " JOIN collections c ON c.id = ci.collection_id"
                " WHERE ci.item_id = ? AND c.chat_id = ?",
                (int(item_id), int(chat_id or 0)),
            ).fetchall()
        return [int(row["collection_id"]) for row in rows]

    # -------------------------------------------------------------- saved views
    def views(self, chat_id: Optional[int] = None) -> List[Dict[str, Any]]:
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT id, name, data, created_at FROM saved_views"
                " WHERE chat_id = ? ORDER BY name COLLATE NOCASE",
                (int(chat_id or 0),),
            ).fetchall()
        entries = []
        for row in rows:
            try:
                data = json.loads(row["data"] or "{}")
            except ValueError:
                data = {}
            entries.append(
                {"id": row["id"], "name": row["name"], "data": data,
                 "created_at": row["created_at"]}
            )
        return entries

    def create_view(
        self, name: str, data: Dict[str, Any], chat_id: Optional[int] = None
    ) -> Dict[str, Any]:
        value = str(name or "").strip()[:80]
        if not value:
            raise ValueError("Name the view.")
        with self.connect() as conn:
            try:
                cur = conn.execute(
                    "INSERT INTO saved_views (chat_id, name, data) VALUES (?, ?, ?)",
                    (int(chat_id or 0), value, json.dumps(data or {})),
                )
            except sqlite3.IntegrityError:
                raise ValueError("A view with that name already exists.")
            row = conn.execute(
                "SELECT id, name, data, created_at FROM saved_views WHERE id = ?",
                (int(cur.lastrowid),),
            ).fetchone()
        return {"id": row["id"], "name": row["name"],
                "data": json.loads(row["data"]), "created_at": row["created_at"]}

    def delete_view(self, view_id: int, chat_id: Optional[int] = None) -> bool:
        with self.connect() as conn:
            cur = conn.execute(
                "DELETE FROM saved_views WHERE id = ? AND chat_id = ?",
                (int(view_id), int(chat_id or 0)),
            )
            return cur.rowcount > 0

    # ------------------------------------------------------- reports and extras
    def revisions(
        self, item: Dict[str, Any], chat_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        name = str(item.get("name") or "")
        stem, ext = os.path.splitext(name)
        if not ext:
            return []
        base = revision_stem(stem)
        if not base:
            return []
        scope = int(item.get("chat_id", chat_id or 0))
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT * FROM items WHERE chat_id = ? AND hidden = 0"
                " AND lower(name) LIKE ? ESCAPE '\\' AND id != ?"
                " ORDER BY name COLLATE NOCASE LIMIT 200",
                (scope, f"%{_like(ext.lower())}", int(item["id"])),
            ).fetchall()
        matches = [
            row for row in rows
            if revision_stem(os.path.splitext(row["name"])[0]).lower() == base.lower()
        ]
        return [row_to_dict(row) for row in matches[:20]]

    def duplicates(self, chat_id: Optional[int] = None, limit: int = 100) -> Dict[str, Any]:
        clause = "WHERE hidden = 0 AND size > 0"
        params: List[Any] = []
        if chat_id is not None:
            clause += " AND chat_id = ?"
            params.append(int(chat_id))
        with self.connect() as conn:
            groups = conn.execute(
                f"SELECT lower(name) AS key, size, COUNT(*) AS n,"
                f" SUM(size) AS total FROM items {clause}"
                f" GROUP BY lower(name), size HAVING COUNT(*) > 1"
                f" ORDER BY COUNT(*) * size DESC LIMIT ?",
                (*params, max(1, min(int(limit), 500))),
            ).fetchall()
            output = []
            wasted = 0
            for group in groups:
                rows = conn.execute(
                    f"SELECT * FROM items WHERE lower(name) = ? AND size = ?"
                    f" AND hidden = 0"
                    + (" AND chat_id = ?" if chat_id is not None else "")
                    + " ORDER BY COALESCE(tg_date, added_at) DESC",
                    (group["key"], group["size"],
                     *((int(chat_id),) if chat_id is not None else ())),
                ).fetchall()
                items = [row_to_dict(row) for row in rows]
                wasted += int(group["size"]) * max(0, len(items) - 1)
                output.append(
                    {
                        "name": items[0]["name"] if items else group["key"],
                        "size": int(group["size"]),
                        "count": len(items),
                        "items": items,
                    }
                )
        return {"groups": output, "wasted": wasted, "group_count": len(output)}

    def library_stats(self, chat_id: Optional[int] = None) -> Dict[str, Any]:
        clause = "WHERE hidden = 0"
        params: List[Any] = []
        if chat_id is not None:
            clause += " AND chat_id = ?"
            params.append(int(chat_id))
        with self.connect() as conn:
            breakdown = conn.execute(
                f"SELECT kind, COUNT(*) AS n, COALESCE(SUM(size), 0) AS size"
                f" FROM items {clause} GROUP BY kind ORDER BY size DESC",
                params,
            ).fetchall()
            largest = conn.execute(
                f"SELECT * FROM items {clause} ORDER BY size DESC LIMIT 12",
                params,
            ).fetchall()
            collections = conn.execute(
                "SELECT COUNT(*) AS n FROM collections WHERE chat_id = ?",
                (int(chat_id or 0),),
            ).fetchone()
            views = conn.execute(
                "SELECT COUNT(*) AS n FROM saved_views WHERE chat_id = ?",
                (int(chat_id or 0),),
            ).fetchone()
        return {
            "kinds": [
                {"kind": row["kind"], "label": KIND_LABELS.get(row["kind"], "File"),
                 "count": int(row["n"]), "size": int(row["size"])}
                for row in breakdown
            ],
            "largest": [row_to_dict(row) for row in largest],
            "collections": int(collections["n"]),
            "views": int(views["n"]),
        }

    STAR_SELECT = """
        SELECT p.*,
          (SELECT COUNT(*) FROM item_performers ip
           JOIN items i ON i.id = ip.item_id
           WHERE ip.performer_id = p.id AND i.hidden = 0) AS n,
          (SELECT COUNT(*) FROM item_performers ip
           JOIN items i ON i.id = ip.item_id
           WHERE ip.performer_id = p.id AND i.hidden = 0
             AND i.kind = 'video') AS videos,
          (SELECT COUNT(*) FROM item_performers ip
           JOIN items i ON i.id = ip.item_id
           WHERE ip.performer_id = p.id AND i.hidden = 0
             AND i.kind = 'image') AS images,
          (SELECT COALESCE(SUM(i.size), 0) FROM item_performers ip
           JOIN items i ON i.id = ip.item_id
           WHERE ip.performer_id = p.id AND i.hidden = 0) AS total_size
        FROM performers p
    """

    @staticmethod
    def _star_dict(row: sqlite3.Row) -> Dict[str, Any]:
        data = dict(row)
        data["favorite"] = bool(data.get("favorite"))
        return data

    @staticmethod
    def _star_values(fields: Dict[str, Any]) -> Dict[str, Any]:
        cleaned: Dict[str, Any] = {}
        for key in STAR_FIELDS:
            if key not in fields:
                continue
            value = fields[key]
            if key == "name":
                name = clean_name(str(value or ""), "")
                if not name:
                    raise ValueError("A star needs a name.")
                cleaned["name"] = name[:80]
            elif key == "note":
                cleaned["note"] = str(value or "").strip()[:4000]
            else:
                cleaned[key] = re.sub(
                    r"[\r\n\t]+", " ", str(value or "")
                ).strip()[:160]
        return cleaned

    def performers(
        self, chat_id: Optional[int], q: str = "", limit: int = 500
    ) -> List[Dict[str, Any]]:
        clause = "p.chat_id = ?"
        params: List[Any] = [int(chat_id or 0)]
        text = str(q or "").strip()
        if text:
            like = f"%{_like(text)}%"
            clause += (
                " AND (p.name LIKE ? ESCAPE '\\' OR p.aliases LIKE ? ESCAPE '\\')"
            )
            params += [like, like]
        with self.connect() as conn:
            rows = conn.execute(
                self.STAR_SELECT
                + f" WHERE {clause} ORDER BY p.name COLLATE NOCASE LIMIT ?",
                (*params, max(1, min(int(limit or 500), 2000))),
            ).fetchall()
        return [self._star_dict(row) for row in rows]

    def performer(
        self, star_id: int, chat_id: Optional[int]
    ) -> Optional[Dict[str, Any]]:
        with self.connect() as conn:
            row = conn.execute(
                self.STAR_SELECT + " WHERE p.id = ? AND p.chat_id = ?",
                (int(star_id), int(chat_id or 0)),
            ).fetchone()
        return self._star_dict(row) if row else None

    def performer_by_name(
        self, chat_id: Optional[int], name: str
    ) -> Optional[Dict[str, Any]]:
        with self.connect() as conn:
            row = conn.execute(
                self.STAR_SELECT + " WHERE p.chat_id = ? AND p.name = ? COLLATE NOCASE",
                (int(chat_id or 0), str(name or "").strip()),
            ).fetchone()
        return self._star_dict(row) if row else None

    def performer_count(self, chat_id: Optional[int]) -> int:
        with self.connect() as conn:
            row = conn.execute(
                "SELECT COUNT(*) AS n FROM performers WHERE chat_id = ?",
                (int(chat_id or 0),),
            ).fetchone()
        return int(row["n"]) if row else 0

    def create_performer(
        self, chat_id: Optional[int], **fields: Any
    ) -> Dict[str, Any]:
        values = self._star_values(fields)
        if "name" not in values:
            raise ValueError("A star needs a name.")
        columns = ", ".join(["chat_id", *values])
        marks = ", ".join("?" * (len(values) + 1))
        with self.connect() as conn:
            try:
                cur = conn.execute(
                    f"INSERT INTO performers ({columns}) VALUES ({marks})",
                    (int(chat_id or 0), *values.values()),
                )
            except sqlite3.IntegrityError:
                raise ValueError("A star with that name already exists.")
            star_id = int(cur.lastrowid)
        return self.performer(star_id, chat_id) or {}

    def update_performer(
        self, star_id: int, chat_id: Optional[int], **fields: Any
    ) -> Optional[Dict[str, Any]]:
        values = self._star_values(fields)
        if fields.get("favorite") is not None:
            values["favorite"] = 1 if fields["favorite"] else 0
        if not values:
            return self.performer(star_id, chat_id)
        assignments = ", ".join(f"{key} = ?" for key in values)
        with self.connect() as conn:
            exists = conn.execute(
                "SELECT 1 FROM performers WHERE id = ? AND chat_id = ?",
                (int(star_id), int(chat_id or 0)),
            ).fetchone()
            if exists is None:
                return None
            try:
                conn.execute(
                    f"UPDATE performers SET {assignments}"
                    " WHERE id = ? AND chat_id = ?",
                    (*values.values(), int(star_id), int(chat_id or 0)),
                )
            except sqlite3.IntegrityError:
                raise ValueError("A star with that name already exists.")
        return self.performer(star_id, chat_id)

    def set_performer_image(
        self, star_id: int, chat_id: Optional[int], version: int
    ) -> None:
        with self.connect() as conn:
            conn.execute(
                "UPDATE performers SET image_version = ?"
                " WHERE id = ? AND chat_id = ?",
                (int(version), int(star_id), int(chat_id or 0)),
            )

    def delete_performer(
        self, star_id: int, chat_id: Optional[int]
    ) -> bool:
        with self.connect() as conn:
            row = conn.execute(
                "SELECT id FROM performers WHERE id = ? AND chat_id = ?",
                (int(star_id), int(chat_id or 0)),
            ).fetchone()
            if row is None:
                return False
            conn.execute(
                "DELETE FROM item_performers WHERE performer_id = ?",
                (int(star_id),),
            )
            conn.execute(
                "DELETE FROM performers WHERE id = ? AND chat_id = ?",
                (int(star_id), int(chat_id or 0)),
            )
        return True

    def item_performers(self, item_id: int) -> List[Dict[str, Any]]:
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT p.id, p.name FROM item_performers ip"
                " JOIN performers p ON p.id = ip.performer_id"
                " WHERE ip.item_id = ? ORDER BY p.name COLLATE NOCASE",
                (int(item_id),),
            ).fetchall()
        return [{"id": int(row["id"]), "name": str(row["name"])} for row in rows]

    def performers_for_items(
        self, item_ids: List[int]
    ) -> Dict[int, List[Dict[str, Any]]]:
        found: Dict[int, List[Dict[str, Any]]] = {}
        wanted = sorted({int(value) for value in item_ids})
        if not wanted:
            return found
        with self.connect() as conn:
            for start in range(0, len(wanted), 400):
                chunk = wanted[start:start + 400]
                marks = ",".join("?" * len(chunk))
                rows = conn.execute(
                    f"SELECT ip.item_id, p.id, p.name FROM item_performers ip"
                    f" JOIN performers p ON p.id = ip.performer_id"
                    f" WHERE ip.item_id IN ({marks})"
                    " ORDER BY p.name COLLATE NOCASE",
                    chunk,
                ).fetchall()
                for row in rows:
                    found.setdefault(int(row["item_id"]), []).append(
                        {"id": int(row["id"]), "name": str(row["name"])}
                    )
        return found

    def set_item_performers(
        self, item_id: int, star_ids: List[int], chat_id: Optional[int]
    ) -> List[Dict[str, Any]]:
        wanted = sorted({int(value) for value in star_ids})
        with self.connect() as conn:
            item = conn.execute(
                "SELECT chat_id FROM items WHERE id = ?", (int(item_id),)
            ).fetchone()
            if item is None:
                raise ValueError("File not found.")
            if chat_id is not None and int(item["chat_id"]) != int(chat_id):
                raise ValueError("File not found in this vault.")
            if wanted:
                marks = ",".join("?" * len(wanted))
                valid = conn.execute(
                    f"SELECT id FROM performers WHERE chat_id = ?"
                    f" AND id IN ({marks})",
                    (int(chat_id or 0), *wanted),
                ).fetchall()
                if len(valid) != len(wanted):
                    raise ValueError("Star not found in this vault.")
            conn.execute(
                "DELETE FROM item_performers WHERE item_id = ?", (int(item_id),)
            )
            conn.executemany(
                "INSERT OR IGNORE INTO item_performers (item_id, performer_id)"
                " VALUES (?, ?)",
                [(int(item_id), star_id) for star_id in wanted],
            )
        return self.item_performers(item_id)

    def add_item_performers(
        self, item_ids: List[int], star_ids: List[int], chat_id: Optional[int]
    ) -> int:
        items = sorted({int(value) for value in item_ids})
        stars = sorted({int(value) for value in star_ids})
        if not items or not stars:
            return 0
        with self.connect() as conn:
            imarks = ",".join("?" * len(items))
            smarks = ",".join("?" * len(stars))
            owned = conn.execute(
                f"SELECT COUNT(*) AS n FROM items WHERE chat_id = ?"
                f" AND id IN ({imarks})",
                (int(chat_id or 0), *items),
            ).fetchone()
            if int(owned["n"]) != len(items):
                raise ValueError("Some files are not in this vault.")
            valid = conn.execute(
                f"SELECT COUNT(*) AS n FROM performers WHERE chat_id = ?"
                f" AND id IN ({smarks})",
                (int(chat_id or 0), *stars),
            ).fetchone()
            if int(valid["n"]) != len(stars):
                raise ValueError("Star not found in this vault.")
            conn.executemany(
                "INSERT OR IGNORE INTO item_performers (item_id, performer_id)"
                " VALUES (?, ?)",
                [(item_id, star_id) for item_id in items for star_id in stars],
            )
        return len(items) * len(stars)

    def update(self, item_id: int, **fields: Any) -> Optional[Dict[str, Any]]:
        allowed = {
            "name", "folder", "tags", "favorite", "hidden", "caption", "note",
            "name_source", "folder_source", "tags_source", "fav_source",
            "has_thumb", "thumb_version", "play_pos", "played_at",
            "imdb_id", "imdb_json", "imdb_poster_version", "meta_json",
        }
        updates = {key: value for key, value in fields.items() if key in allowed}
        if not updates:
            return self.get(item_id)
        assignments = ", ".join(f"{key} = ?" for key in updates)
        with self.connect() as conn:
            conn.execute(
                f"UPDATE items SET {assignments} WHERE id = ?",
                (*updates.values(), item_id),
            )
        return self.get(item_id)

    def rename(self, item_id: int, name: str) -> Optional[Dict[str, Any]]:
        return self.update(
            item_id, name=clean_name(name), name_source="user"
        )

    def move(self, item_id: int, folder: str) -> Optional[Dict[str, Any]]:
        folder = clean_folder_path(folder, "Other")
        item = self.get(item_id)
        if item is not None:
            self.create_folder(folder, item.get("chat_id"))
        return self.update(item_id, folder=folder, folder_source="user")

    def set_note(self, item_id: int, note: str) -> Optional[Dict[str, Any]]:
        return self.update(item_id, note=str(note or "").strip()[:4000])

    def set_tags(self, item_id: int, tags: str) -> Optional[Dict[str, Any]]:
        return self.update(
            item_id, tags=normalize_tags(tags), tags_source="user"
        )

    def set_favorite(self, item_id: int, favorite: bool) -> Optional[Dict[str, Any]]:
        return self.update(
            item_id, favorite=1 if favorite else 0, fav_source="user"
        )

    def hide(self, item_id: int) -> bool:
        with self.connect() as conn:
            cur = conn.execute("UPDATE items SET hidden = 1 WHERE id = ?", (item_id,))
            return cur.rowcount > 0

    def ensure_has_thumb(self, item_ids: List[int]) -> int:
        """Items with a stored custom thumbnail must stay visible after re-syncs."""
        wanted = [int(item_id) for item_id in item_ids]
        changed = 0
        if not wanted:
            return 0
        with self.connect() as conn:
            for start in range(0, len(wanted), 400):
                chunk = wanted[start:start + 400]
                marks = ",".join("?" * len(chunk))
                cur = conn.execute(
                    f"UPDATE items SET has_thumb = 1"
                    f" WHERE has_thumb = 0 AND id IN ({marks})",
                    chunk,
                )
                changed += cur.rowcount
        return changed

    def prune_snapshots(self, chat_id: Optional[int], keep: int) -> int:
        """Drop library rows for vault-data snapshots beyond the newest ones."""
        if chat_id is None:
            return 0
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT id FROM items WHERE chat_id = ?"
                " AND name LIKE 'tfe-data-%.zip' ORDER BY name DESC",
                (int(chat_id),),
            ).fetchall()
            stale = [int(row["id"]) for row in rows[max(0, int(keep)):]]
            if stale:
                conn.executemany(
                    "DELETE FROM item_performers WHERE item_id = ?",
                    [(item_id,) for item_id in stale],
                )
                conn.executemany(
                    "DELETE FROM items WHERE id = ?", [(item_id,) for item_id in stale]
                )
            return len(stale)

    def delete(self, item_id: int) -> bool:
        with self.connect() as conn:
            conn.execute(
                "DELETE FROM item_performers WHERE item_id = ?", (item_id,)
            )
            cur = conn.execute("DELETE FROM items WHERE id = ?", (item_id,))
            return cur.rowcount > 0

    def message_ids(self, chat_id: int) -> set:
        with self.connect() as conn:
            rows = conn.execute(
                "SELECT message_id FROM items WHERE chat_id = ?", (chat_id,)
            ).fetchall()
        return {int(row["message_id"]) for row in rows}

    def sync_cursor(self, chat_id: int) -> Dict[str, Any]:
        """Last channel message already indexed, plus the last full scan time."""
        with self.connect() as conn:
            row = conn.execute(
                "SELECT last_message_id, last_full_at FROM sync_state"
                " WHERE chat_id = ?",
                (int(chat_id),),
            ).fetchone()
        if row is None:
            return {"last_message_id": 0, "last_full_at": ""}
        return {
            "last_message_id": int(row["last_message_id"] or 0),
            "last_full_at": row["last_full_at"] or "",
        }

    def set_sync_cursor(
        self, chat_id: int, last_message_id: int, full: bool = False
    ) -> None:
        stamp = datetime.now(timezone.utc).isoformat(timespec="seconds") if full else ""
        with self.connect() as conn:
            conn.execute(
                "INSERT INTO sync_state (chat_id, last_message_id, last_full_at)"
                " VALUES (?, ?, ?)"
                " ON CONFLICT(chat_id) DO UPDATE SET"
                " last_message_id = excluded.last_message_id,"
                " last_full_at = CASE WHEN excluded.last_full_at != ''"
                " THEN excluded.last_full_at ELSE sync_state.last_full_at END",
                (int(chat_id), int(last_message_id), stamp),
            )

    def hide_missing(self, chat_id: int, seen: set) -> int:
        """Hide catalog rows whose channel messages no longer exist."""
        ids = [(int(message_id),) for message_id in seen]
        with self.connect() as conn:
            conn.execute(
                "CREATE TEMP TABLE IF NOT EXISTS scan_seen"
                " (message_id INTEGER PRIMARY KEY)"
            )
            conn.execute("DELETE FROM scan_seen")
            conn.executemany(
                "INSERT OR IGNORE INTO scan_seen (message_id) VALUES (?)", ids
            )
            cur = conn.execute(
                "UPDATE items SET hidden = 1 WHERE chat_id = ? AND hidden = 0"
                " AND message_id NOT IN (SELECT message_id FROM scan_seen)",
                (int(chat_id),),
            )
            removed = cur.rowcount
            conn.execute("DELETE FROM scan_seen")
        return max(0, removed)

    def import_from_bot(self, bot_db: Path, chat_id: int) -> int:
        """Adopt names, categories, tags and favorites from the bot's index."""
        path = Path(bot_db)
        if not path.exists():
            return 0
        try:
            src = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True, timeout=5)
            src.row_factory = sqlite3.Row
            rows = src.execute(
                "SELECT file_name, category, tags, favorite, caption, file_type,"
                " vault_message_id FROM files WHERE vault_message_id IS NOT NULL"
            ).fetchall()
            src.close()
        except sqlite3.Error:
            return 0

        changed = 0
        with self.connect() as conn:
            for row in rows:
                folder = clean_name(row["category"] or "", "")
                if not folder:
                    folder = default_folder(row["file_type"] or "other")
                cur = conn.execute(
                    """
                    UPDATE items SET
                      name = CASE WHEN name_source != 'user'
                                  THEN COALESCE(NULLIF(?, ''), name) ELSE name END,
                      name_source = CASE WHEN name_source != 'user' THEN 'bot'
                                         ELSE name_source END,
                      folder = CASE WHEN folder_source = 'default' THEN ? ELSE folder END,
                      folder_source = CASE WHEN folder_source = 'default' THEN 'bot'
                                           ELSE folder_source END,
                      tags = CASE WHEN tags_source = 'default' THEN ? ELSE tags END,
                      tags_source = CASE WHEN tags_source = 'default' THEN 'bot'
                                         ELSE tags_source END,
                      favorite = CASE WHEN fav_source = 'default' THEN ? ELSE favorite END,
                      fav_source = CASE WHEN fav_source = 'default' THEN 'bot'
                                        ELSE fav_source END,
                      caption = COALESCE(?, caption)
                    WHERE chat_id = ? AND message_id = ?
                    """,
                    (
                        clean_name(row["file_name"] or ""),
                        folder,
                        normalize_tags(row["tags"] or ""),
                        1 if row["favorite"] else 0,
                        row["caption"],
                        chat_id,
                        int(row["vault_message_id"]),
                    ),
                )
                changed += cur.rowcount
        return changed

    @staticmethod
    def clear_bot_vault(bot_db: Path, message_id: int) -> None:
        path = Path(bot_db)
        if not path.exists():
            return
        try:
            conn = sqlite3.connect(path, timeout=5)
            conn.execute("PRAGMA busy_timeout=5000")
            conn.execute(
                "UPDATE files SET vault_file_id = NULL, vault_message_id = NULL"
                " WHERE vault_message_id = ?",
                (message_id,),
            )
            conn.commit()
            conn.close()
        except sqlite3.Error:
            pass

    def sync_folder_to_bot(
        self, bot_db: Path, chat_id: int, folder: str, new_folder: str
    ) -> None:
        """Best-effort mirror of a folder rename into the bot's categories."""
        path = Path(bot_db)
        if not path.exists():
            return
        conn = None
        try:
            conn = sqlite3.connect(path, timeout=5)
            conn.execute("PRAGMA busy_timeout=5000")
            conn.execute("ATTACH DATABASE ? AS lib", (str(self.path),))
            conn.execute(
                "UPDATE files SET category = ? WHERE vault_message_id IN"
                " (SELECT message_id FROM lib.items WHERE chat_id = ?"
                " AND folder = ? COLLATE NOCASE)",
                (new_folder.lower(), int(chat_id), folder),
            )
            conn.commit()
            conn.execute("DETACH DATABASE lib")
        except sqlite3.Error:
            pass
        finally:
            if conn is not None:
                try:
                    conn.close()
                except sqlite3.Error:
                    pass

    @staticmethod
    def sync_to_bot(bot_db: Path, message_id: int, **fields: Any) -> None:
        """Best-effort mirror of explorer edits into the bot's own index."""
        path = Path(bot_db)
        if not path.exists():
            return
        allowed = {"name", "category", "tags", "favorite"}
        updates = {key: value for key, value in fields.items() if key in allowed}
        if not updates:
            return
        try:
            conn = sqlite3.connect(path, timeout=5)
            conn.execute("PRAGMA busy_timeout=5000")
            assignments = ", ".join(f"{key} = ?" for key in updates)
            conn.execute(
                f"UPDATE files SET {assignments} WHERE vault_message_id = ?",
                (*updates.values(), message_id),
            )
            conn.commit()
            conn.close()
        except sqlite3.Error:
            pass
