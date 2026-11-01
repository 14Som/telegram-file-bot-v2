"""SQLite metadata index for files stored in Telegram's cloud."""

import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple

from config import DATA_DIR, DB_PATH

BACKUP_DIR = DATA_DIR / "backups"

SCHEMA = """
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id TEXT NOT NULL,
    file_unique_id TEXT,
    file_name TEXT,
    file_type TEXT NOT NULL,
    size INTEGER,
    category TEXT NOT NULL DEFAULT '',
    caption TEXT,
    tags TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    telegram_message_id INTEGER,
    favorite INTEGER NOT NULL DEFAULT 0,
    vault_file_id TEXT,
    vault_message_id INTEGER
);
CREATE INDEX IF NOT EXISTS idx_files_file_unique_id ON files(file_unique_id);
CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);
"""

SORT_ORDERS = {
    "new": "id DESC",
    "old": "id ASC",
    "big": "COALESCE(size, 0) DESC, id DESC",
    "small": "COALESCE(size, 0) ASC, id DESC",
}


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(SCHEMA)
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(files)")}
        if "favorite" not in columns:
            conn.execute(
                "ALTER TABLE files ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0"
            )
        if "vault_file_id" not in columns:
            conn.execute("ALTER TABLE files ADD COLUMN vault_file_id TEXT")
        if "vault_message_id" not in columns:
            conn.execute("ALTER TABLE files ADD COLUMN vault_message_id INTEGER")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_files_favorite ON files(favorite)")


def add_file(
    file_id: str,
    file_unique_id: str,
    file_name: str,
    file_type: str,
    size: Optional[int],
    category: str,
    caption: str,
    tags: str,
    telegram_message_id: Optional[int],
) -> int:
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO files (file_id, file_unique_id, file_name, file_type, size,"
            " category, caption, tags, telegram_message_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (file_id, file_unique_id, file_name, file_type, size, category, caption,
             tags, telegram_message_id),
        )
        return int(cur.lastrowid)


def get_file(file_db_id: int) -> Optional[sqlite3.Row]:
    with get_conn() as conn:
        return conn.execute("SELECT * FROM files WHERE id = ?", (file_db_id,)).fetchone()


def find_by_unique_id(file_unique_id: str) -> Optional[sqlite3.Row]:
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM files WHERE file_unique_id = ?", (file_unique_id,)
        ).fetchone()


def all_files() -> List[sqlite3.Row]:
    with get_conn() as conn:
        return conn.execute("SELECT * FROM files ORDER BY id").fetchall()


def _like(term: str) -> str:
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _search_where(query: str) -> Tuple[Optional[str], list]:
    terms = [t.lstrip("#@").lower() for t in query.split()]
    terms = [t for t in terms if t]
    if not terms:
        return None, []
    clause = " AND ".join(
        "(file_name LIKE ? ESCAPE '\\' OR caption LIKE ? ESCAPE '\\' OR tags LIKE ?"
        " ESCAPE '\\' OR category LIKE ? ESCAPE '\\')"
        for _ in terms
    )
    params: list = []
    for term in terms:
        like = f"%{_like(term)}%"
        params += [like, like, like, like]
    return clause, params


def _browse_where(kind: str, value: str = "") -> Tuple[Optional[str], list]:
    if kind == "search":
        return _search_where(value)
    if kind == "tag":
        return "tags LIKE ? ESCAPE '\\'", [f"% {_like(value.lower())} %"]
    if kind == "category":
        return "category = ?", [value.lower()]
    if kind == "favorites":
        return "favorite = 1", []
    if kind == "recent":
        return "1 = 1", []
    return None, []


def _order(sort: str) -> str:
    return SORT_ORDERS.get(sort, SORT_ORDERS["new"])


def search_files(
    query: str, limit: int = 20, offset: int = 0, sort: str = "new"
) -> List[sqlite3.Row]:
    clause, params = _search_where(query)
    if clause is None:
        return []
    sql = f"SELECT * FROM files WHERE {clause} ORDER BY {_order(sort)} LIMIT ? OFFSET ?"
    with get_conn() as conn:
        return conn.execute(sql, (*params, limit, offset)).fetchall()


def browse_files(
    kind: str,
    value: str = "",
    sort: str = "new",
    limit: int = 20,
    offset: int = 0,
) -> List[sqlite3.Row]:
    clause, params = _browse_where(kind, value)
    if clause is None:
        return []
    sql = f"SELECT * FROM files WHERE {clause} ORDER BY {_order(sort)} LIMIT ? OFFSET ?"
    with get_conn() as conn:
        return conn.execute(sql, (*params, limit, offset)).fetchall()


def count_files(kind: str, value: str = "") -> int:
    clause, params = _browse_where(kind, value)
    if clause is None:
        return 0
    with get_conn() as conn:
        row = conn.execute(
            f"SELECT COUNT(*) AS n FROM files WHERE {clause}", params
        ).fetchone()
        return int(row["n"])


def files_with_tag(
    tag: str, limit: int = 50, offset: int = 0, sort: str = "new"
) -> List[sqlite3.Row]:
    return browse_files("tag", tag, sort, limit, offset)


def files_in_category(
    category: str, limit: int = 50, offset: int = 0, sort: str = "new"
) -> List[sqlite3.Row]:
    return browse_files("category", category, sort, limit, offset)


def recent_files(limit: int = 10, offset: int = 0, sort: str = "new") -> List[sqlite3.Row]:
    return browse_files("recent", "", sort, limit, offset)


def favorite_files(
    limit: int = 50, offset: int = 0, sort: str = "new"
) -> List[sqlite3.Row]:
    return browse_files("favorites", "", sort, limit, offset)


def toggle_favorite(file_db_id: int) -> Optional[int]:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT favorite FROM files WHERE id = ?", (file_db_id,)
        ).fetchone()
        if row is None:
            return None
        new_value = 0 if row["favorite"] else 1
        conn.execute(
            "UPDATE files SET favorite = ? WHERE id = ?", (new_value, file_db_id)
        )
        return new_value


def rename_file(file_db_id: int, new_name: str) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "UPDATE files SET file_name = ? WHERE id = ?", (new_name, file_db_id)
        )
        return cur.rowcount > 0


def update_category(file_db_id: int, category: str) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "UPDATE files SET category = ? WHERE id = ?", (category.lower(), file_db_id)
        )
        return cur.rowcount > 0


def update_tags(file_db_id: int, tags: str) -> bool:
    with get_conn() as conn:
        cur = conn.execute("UPDATE files SET tags = ? WHERE id = ?", (tags, file_db_id))
        return cur.rowcount > 0


def set_vault(
    file_db_id: int, vault_file_id: str, vault_message_id: Optional[int]
) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "UPDATE files SET vault_file_id = ?, vault_message_id = ? WHERE id = ?",
            (vault_file_id, vault_message_id, file_db_id),
        )
        return cur.rowcount > 0


def unvaulted_files(limit: int = 50) -> List[sqlite3.Row]:
    with get_conn() as conn:
        return conn.execute(
            "SELECT * FROM files WHERE vault_file_id IS NULL ORDER BY id LIMIT ?",
            (limit,),
        ).fetchall()


def vaulted_count() -> int:
    with get_conn() as conn:
        return int(
            conn.execute(
                "SELECT COUNT(*) AS n FROM files WHERE vault_file_id IS NOT NULL"
            ).fetchone()["n"]
        )


def file_count() -> int:
    with get_conn() as conn:
        return int(conn.execute("SELECT COUNT(*) AS n FROM files").fetchone()["n"])


def delete_file(file_db_id: int) -> bool:
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM files WHERE id = ?", (file_db_id,))
        return cur.rowcount > 0


def stats() -> List[sqlite3.Row]:
    with get_conn() as conn:
        return conn.execute(
            "SELECT file_type, COUNT(*) AS n FROM files GROUP BY file_type ORDER BY n DESC"
        ).fetchall()


def categories() -> List[sqlite3.Row]:
    with get_conn() as conn:
        return conn.execute(
            "SELECT category, COUNT(*) AS n FROM files GROUP BY category ORDER BY n DESC"
        ).fetchall()


def total_size() -> int:
    with get_conn() as conn:
        row = conn.execute("SELECT COALESCE(SUM(size), 0) AS total FROM files").fetchone()
        return int(row["total"])


def all_tags() -> List[Tuple[str, int]]:
    with get_conn() as conn:
        rows = conn.execute("SELECT tags FROM files WHERE tags != ''").fetchall()
    counts: dict = {}
    for row in rows:
        for tag in row["tags"].split():
            counts[tag] = counts.get(tag, 0) + 1
    return sorted(counts.items(), key=lambda item: (-item[1], item[0]))


def snapshot_to(dest) -> None:
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True)
    src = sqlite3.connect(DB_PATH)
    dst = sqlite3.connect(dest)
    try:
        src.backup(dst)
    finally:
        dst.close()
        src.close()


def backup_db(keep: int = 14) -> Path:
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    dest = BACKUP_DIR / f"files-{stamp}.db"
    snapshot_to(dest)
    for old in sorted(BACKUP_DIR.glob("files-*.db"))[:-keep]:
        old.unlink(missing_ok=True)
    return dest
