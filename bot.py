"""Telegram file storage bot — files live in Telegram's cloud, indexed in SQLite."""

import asyncio
import csv
import io
import json
import logging
import os
import re
import signal
import tempfile
import threading
import time
import zipfile
from datetime import datetime
from functools import wraps
from pathlib import Path
from typing import Optional

from telegram import (
    ForceReply,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    InlineQueryResultCachedAudio,
    InlineQueryResultCachedDocument,
    InlineQueryResultCachedPhoto,
    InlineQueryResultCachedSticker,
    InlineQueryResultCachedVideo,
    InlineQueryResultCachedVoice,
    InlineQueryResultsButton,
    InputFile,
    Update,
)
from telegram.error import BadRequest, NetworkError, TelegramError
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    ChatMemberHandler,
    CommandHandler,
    ContextTypes,
    InlineQueryHandler,
    MessageHandler,
    filters,
)

import database
from config import BOT_TOKEN, DATA_DIR, OWNER_ID, VAULT_CHAT_ID

logging.basicConfig(
    format="%(asctime)s %(levelname)s %(name)s: %(message)s", level=logging.INFO
)
logging.getLogger("httpx").setLevel(logging.WARNING)
log = logging.getLogger("filebot")

BOT_VERSION = "2.0"
_STARTED_AT = time.time()

# The Explorer reads this pinned message over MTProto to show whether the
# server bot is alive; it carries no secrets, just a timestamp and counts.
HEARTBEAT_MARKER = "#tfeheartbeat"
HEARTBEAT_EVERY = 60
HEARTBEAT_PATH = DATA_DIR / "heartbeat.json"

ICONS = {
    "document": "📄",
    "photo": "🖼️",
    "video": "🎬",
    "audio": "🎵",
    "voice": "🎙️",
    "video_note": "📹",
    "animation": "🎞️",
    "sticker": "✨",
}

DEFAULT_EXT = {
    "photo": ".jpg",
    "audio": ".mp3",
    "voice": ".ogg",
    "video": ".mp4",
    "video_note": ".mp4",
    "animation": ".mp4",
    "sticker": ".webp",
}

EXT_CATEGORY = {}
for _exts, _cat in (
    ((".stl", ".3mf", ".obj", ".step", ".stp", ".iges", ".igs", ".gcode"), "3D Models"),
    ((".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz"), "Archives"),
    ((".exe", ".msi", ".apk", ".iso", ".dmg", ".deb", ".rpm"), "Software"),
    ((".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv",
      ".rtf", ".odt", ".md"), "Documents"),
    ((".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff", ".heic", ".svg"), "Images"),
    ((".mp4", ".mkv", ".avi", ".mov", ".webm", ".m4v", ".flv"), "Videos"),
    ((".mp3", ".wav", ".flac", ".m4a", ".aac", ".wma", ".ogg", ".opus"), "Audio"),
    ((".epub", ".mobi", ".azw3"), "Ebooks"),
):
    for _ext in _exts:
        EXT_CATEGORY[_ext] = _cat

TYPE_CATEGORY = {
    "photo": "Images",
    "video": "Videos",
    "animation": "Animations",
    "audio": "Audio",
    "voice": "Audio",
    "video_note": "Videos",
    "sticker": "Stickers",
}


def default_category(ftype: str, name) -> str:
    ext = Path(name).suffix.lower() if name else ""
    if ext in EXT_CATEGORY:
        return EXT_CATEGORY[ext]
    return TYPE_CATEGORY.get(ftype, "Files")

HELP_TEXT = (
    "🗂 File Storage Bot — Telegram cloud storage + local index\n\n"
    "Send me any file (up to 2 GB): it's stored in Telegram's cloud and "
    "indexed locally with name, size, type, category and tags.\n\n"
    "Caption syntax when sending a file:\n"
    "@category — put it in a category (default: auto-detected from the file)\n"
    "#tag1 #tag2 — add tags\n\n"
    "Commands:\n"
    "/menu — tappable buttons for everything below\n"
    "/search <text> — find files by name, caption, tag or category\n"
    "/favorites — starred files\n"
    "/tag <name> — list files with a tag\n"
    "/tags — list all tags\n"
    "/cat <name> — list files in a category\n"
    "/cats — list categories\n"
    "/recent — most recent files\n"
    "/get <id> — send a stored file back\n"
    "/rename <id> <new name> — rename a file\n"
    "/saveas <name> — save your next upload under a custom name\n"
    "/cancelname — cancel a pending /saveas name\n"
    "/move <id> <category> — change a file's category\n"
    "/retag <id> #tag1 #tag2 — replace a file's tags\n"
    "/delete <id> — remove a file from the index\n"
    "/stats — library overview\n"
    "/backup — snapshot the local index now\n"
    "/export [csv|json] — send the index as a file\n"
    "/source — send a zip of the bot code + index snapshot\n"
    "/vault [sync] — channel backup status / copy older files\n"
    "/cancel — cancel a pending rename, move, retag or custom name\n\n"
    "Tip: tap ⚙️ next to any file in a list for rename, move, tags, "
    "delete and favorite.\n\n"
    "Inline mode: type @this_bot <query> in any chat to search and "
    "send files there."
)

MENU_INTRO = (
    "🎛 Command menu\n\n"
    "📚 Browse — recent, favorites, categories, tags, stats, search\n"
    "🛠 Organize — rename, move, retag, delete\n"
    "☁️ Upload — custom name, cancel pending name\n"
    "💾 Data — export, backups, vault channel, source archive\n"
    "❓ Help — every command with typed usage\n\n"
    "Every command also works when typed."
)

HINT_TEXTS = {
    "search": (
        "🔎 Search\n\n"
        "Send: /search <text>\n\n"
        "Examples:\n"
        "/search invoice\n"
        "/search #tax\n"
        "/search Documents\n\n"
        "In any chat, type @{bot} <text> to search inline and send a file there."
    ),
    "rename": (
        "✏️ Rename\n\n"
        "Send: /rename <id> <new name>\n"
        "Example: /rename 12 holiday_photo.jpg\n\n"
        "File IDs are shown in 📄 Recent."
    ),
    "move": (
        "📁 Move to category\n\n"
        "Send: /move <id> <category>\n"
        "Example: /move 12 documents\n\n"
        "Open 🗂 Categories to see your current category names."
    ),
    "retag": (
        "🏷 Retag\n\n"
        "Send: /retag <id> #tag1 #tag2\n"
        "Example: /retag 12 #tax #2026\n\n"
        "This replaces all tags on the file."
    ),
    "delete": (
        "🗑 Delete from index\n\n"
        "Send: /delete <id>\n"
        "Example: /delete 12\n\n"
        "Only the index entry is removed — the original message in this chat stays."
    ),
    "saveas": (
        "✍️ Custom upload name\n\n"
        "Send: /saveas <name>\n"
        "Example: /saveas Ferrari_body.stl\n\n"
        "Then send the file. /cancelname undoes it."
    ),
}


def menu_button() -> InlineKeyboardButton:
    return InlineKeyboardButton("🎛 Menu", callback_data="menu:root")


PAGE_SIZE = 10
SORT_LABELS = {"new": "Newest", "old": "Oldest", "big": "Largest", "small": "Smallest"}
PAGES: dict[str, dict] = {}
_page_seq = 0

EXPORT_FIELDS = (
    "id", "file_name", "file_type", "size", "category", "tags",
    "favorite", "vaulted", "created_at", "caption",
)

SOURCE_ARCHIVE_FILES = (
    "bot.py",
    "config.py",
    "database.py",
    "requirements.txt",
    "README.md",
    ".env.example",
    "Start Explorer.bat",
    "Build Explorer EXE.bat",
    "Setup Cloud VM.bat",
    "TelegramFileExplorer.spec",
    "deploy/install.sh",
    "deploy/push.ps1",
    "desktop/__init__.py",
    "desktop/appconfig.py",
    "desktop/applock.py",
    "desktop/catalog.py",
    "desktop/native.py",
    "desktop/server.py",
    "desktop/splitmerge.py",
    "desktop/tg.py",
    "desktop/requirements.txt",
    "desktop/ui/index.html",
    "desktop/ui/app.js",
    "desktop/ui/styles.css",
    "desktop/ui/favicon.svg",
    "desktop/ui/app.ico",
    "desktop/bin/7z.exe",
    "desktop/bin/7z.dll",
    "desktop/bin/License.txt",
)

RESTORE_TEXT = """Telegram File Bot — restore this archive
=========================================

1. Extract the whole zip into a folder.
2. Copy .env.example to .env and fill in:

   BOT_TOKEN — from @BotFather
   OWNER_ID  — your numeric ID from @userinfobot

   Use the SAME bot token if you want the included index snapshot to keep
   working: Telegram file references belong to the bot that received them.
   If you create a new bot, its file IDs will not match this index.
   Optional: VAULT_CHAT_ID for a private backup channel.

3. Linux server (the usual host):
   bash deploy/install.sh
   See README.md and "Setup Cloud VM.bat". The bot must run on one host only;
   a second copy makes Telegram answer 409 Conflict.

4. Windows Explorer (optional, on any PC):
   Start Explorer.bat, or install TelegramFileExplorerSetup.exe. Sign in with
   a QR code or a phone code (no API setup needed), then pick your storage
   channel. Personal API credentials from my.telegram.org are optional and can
   be added from "Use my own" on the sign-in screen. Its session and local
   index live in %APPDATA%\\TelegramFileExplorer.

   The Explorer never starts or stops the bot; it just opens the library.
   The built app (TelegramFileExplorer.exe) is included. Rebuild it from
   source with "Build Explorer EXE.bat" (needs PyInstaller).

   To run the bot on this PC instead of the server, use
   .venv\\Scripts\\python bot.py — never at the same time as the server.

Full setup and vault instructions are in README.md.

This archive contains a snapshot of data/files.db. It does NOT contain .env,
your bot token, the virtual environment, logs or backup snapshots. It also
includes the optional desktop Explorer (desktop/ and Start Explorer.bat), but
not its session, settings, library, thumbnails or cache — those are kept in
%APPDATA%\\TelegramFileExplorer and never leave this PC.
"""


def valid_filename(name: str) -> bool:
    return (
        bool(name)
        and len(name) <= 180
        and not any(ch in name for ch in r'\/:*?"<>|')
    )


def root_menu() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("📚 Browse", callback_data="menu:browse"),
            InlineKeyboardButton("🛠 Organize", callback_data="menu:manage"),
        ],
        [
            InlineKeyboardButton("☁️ Upload", callback_data="menu:upload"),
            InlineKeyboardButton("💾 Data", callback_data="menu:data"),
        ],
        [InlineKeyboardButton("❓ Help", callback_data="menu:help")],
    ])


def browse_menu() -> tuple[str, InlineKeyboardMarkup]:
    text = (
        "📚 Browse\n\n"
        "📄 Recent — newest first; tap a file to resend it\n"
        "⭐ Favorites — your starred files\n"
        "🗂 Categories — browse by category\n"
        "🏷 Tags — browse by tag\n"
        "📊 Stats — counts and total size\n"
        "🔎 Search — by name, caption, tag or category"
    )
    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("📄 Recent", callback_data="menu:recent"),
            InlineKeyboardButton("⭐ Favorites", callback_data="menu:favs"),
        ],
        [
            InlineKeyboardButton("🗂 Categories", callback_data="menu:cats"),
            InlineKeyboardButton("🏷 Tags", callback_data="menu:tags"),
        ],
        [
            InlineKeyboardButton("📊 Stats", callback_data="menu:stats"),
            InlineKeyboardButton("🔎 Search", callback_data="menu:hint:search:browse"),
        ],
        [InlineKeyboardButton("⬅️ Back", callback_data="menu:root")],
    ])
    return text, keyboard


def manage_menu() -> tuple[str, InlineKeyboardMarkup]:
    text = (
        "🛠 Organize\n\n"
        "Tap a command to see how to use it.\n"
        "File IDs are shown in 📄 Recent."
    )
    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("✏️ Rename", callback_data="menu:hint:rename:manage"),
            InlineKeyboardButton("📁 Move", callback_data="menu:hint:move:manage"),
        ],
        [
            InlineKeyboardButton("🏷 Retag", callback_data="menu:hint:retag:manage"),
            InlineKeyboardButton("🗑 Delete", callback_data="menu:hint:delete:manage"),
        ],
        [InlineKeyboardButton("📄 Recent files", callback_data="menu:recent")],
        [InlineKeyboardButton("⬅️ Back", callback_data="menu:root")],
    ])
    return text, keyboard


def upload_menu() -> tuple[str, InlineKeyboardMarkup]:
    text = (
        "☁️ Upload options\n\n"
        "✍️ Custom name — your next upload is saved under a name you choose\n"
        "❌ Cancel pending name — clear a name set with /saveas"
    )
    keyboard = InlineKeyboardMarkup([
        [InlineKeyboardButton("✍️ Custom name", callback_data="menu:hint:saveas:upload")],
        [InlineKeyboardButton("❌ Cancel pending name", callback_data="menu:cancelname")],
        [InlineKeyboardButton("⬅️ Back", callback_data="menu:root")],
    ])
    return text, keyboard


def data_menu() -> tuple[str, InlineKeyboardMarkup]:
    text = (
        "💾 Data\n\n"
        "📤 Export CSV — spreadsheet of everything in the index\n"
        "📤 Export JSON — structured copy of the index\n"
        "💾 Backup now — snapshot of the local database\n"
        "📦 Source archive — zip of the bot code + index snapshot\n"
        "🛡 Vault — channel backup status and sync"
    )
    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("📤 Export CSV", callback_data="menu:export:csv"),
            InlineKeyboardButton("📤 Export JSON", callback_data="menu:export:json"),
        ],
        [InlineKeyboardButton("💾 Backup now", callback_data="menu:backup")],
        [InlineKeyboardButton("📦 Source archive", callback_data="menu:source")],
        [InlineKeyboardButton("🛡 Vault status", callback_data="menu:vault")],
        [InlineKeyboardButton("⬅️ Back", callback_data="menu:root")],
    ])
    return text, keyboard


def stats_text() -> str:
    counts = database.stats()
    if not counts:
        return "Library is empty — send me a file!"
    total = sum(row["n"] for row in counts)
    lines = [f"📊 {total} file(s) in Telegram storage", ""]
    lines += [
        f"{ICONS.get(row['file_type'], '📄')} {row['file_type']}: {row['n']}"
        for row in counts
    ]
    lines += ["", f"☁️ Total size: {human_size(database.total_size())}"]
    cats = database.categories()
    if cats:
        shown = cats[:40]
        line = " · ".join(f"{row['category'][:40]} ({row['n']})" for row in shown)
        if len(cats) > len(shown):
            line += f" · …and {len(cats) - len(shown)} more"
        lines += ["", "📁 " + line]
    lines += [
        "",
        f"🤖 Storage bot v{BOT_VERSION} · up {_human_uptime(time.time() - _STARTED_AT)}",
    ]
    return "\n".join(lines)


def vault_text() -> str:
    if VAULT_CHAT_ID is None:
        return (
            "🛡 Vault channel: not configured\n\n"
            "The vault keeps a second copy of every upload in a private channel, "
            "so your archive survives even if this chat is deleted.\n\n"
            "Setup:\n"
            "1. Create a private channel.\n"
            "2. Add this bot as an administrator with post-message rights. "
            "The bot will DM you the channel ID automatically.\n"
            "3. Add that VAULT_CHAT_ID=-100... line to .env.\n"
            "4. Restart the bot.\n\n"
            "Manual fallback: copy a post's link (t.me/c/<id>/<post>) and use "
            "-100<id> as the channel ID.\n\n"
            "Then new uploads are copied automatically, and /vault sync copies "
            "older files."
        )
    return (
        "🛡 Vault channel: configured\n\n"
        f"Chat ID: {VAULT_CHAT_ID}\n"
        f"Backed up: {database.vaulted_count()} of {database.file_count()} file(s)\n\n"
        "Run /vault sync (or tap Sync) to copy files saved before the vault "
        "was set up."
    )


def backup_text(path) -> str:
    backups = len(list(database.BACKUP_DIR.glob("files-*.db")))
    return (
        f"💾 Backup created: {path.name} ({human_size(path.stat().st_size)})\n"
        f"Folder: {path.parent}\nKeeping the latest 14 snapshots ({backups} stored)."
    )


def export_payload(kind: str) -> tuple[bytes, str]:
    rows = database.all_files()
    stamp = datetime.now().strftime("%Y%m%d-%H%M")
    if kind == "json":
        data = [
            {
                "id": row["id"],
                "file_name": row["file_name"],
                "file_type": row["file_type"],
                "size": row["size"],
                "category": row["category"],
                "tags": row["tags"].split(),
                "favorite": bool(row["favorite"]),
                "vaulted": bool(row["vault_file_id"]),
                "created_at": row["created_at"],
                "caption": row["caption"],
            }
            for row in rows
        ]
        payload = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        return payload, f"files-export-{stamp}.json"
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(EXPORT_FIELDS)
    for row in rows:
        writer.writerow([
            row["id"],
            row["file_name"],
            row["file_type"],
            row["size"],
            row["category"],
            " ".join("#" + tag for tag in row["tags"].split()),
            "yes" if row["favorite"] else "no",
            "yes" if row["vault_file_id"] else "no",
            row["created_at"],
            row["caption"],
        ])
    payload = buffer.getvalue().encode("utf-8-sig")
    return payload, f"files-export-{stamp}.csv"


async def send_export(context: ContextTypes.DEFAULT_TYPE, chat_id: int, kind: str) -> None:
    payload, filename = export_payload(kind)
    await context.bot.send_document(
        chat_id=chat_id,
        document=InputFile(io.BytesIO(payload), filename=filename),
        caption=f"📤 Index export · {database.file_count()} file(s)",
    )


def build_source_zip() -> tuple[bytes, str]:
    root = Path(__file__).resolve().parent
    stamp = datetime.now().strftime("%Y%m%d-%H%M")
    filename = f"telegram-file-bot-{stamp}.zip"
    with tempfile.TemporaryDirectory(prefix="filebot-archive-") as temp_dir:
        db_snapshot = Path(temp_dir) / "files.db"
        database.snapshot_to(db_snapshot)
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
            for name in SOURCE_ARCHIVE_FILES:
                path = root / name
                if path.is_file():
                    archive.write(path, name)
            archive.write(db_snapshot, "data/files.db")
            archive.writestr("RESTORE.txt", RESTORE_TEXT)
        return buffer.getvalue(), filename


async def send_source_backup(context: ContextTypes.DEFAULT_TYPE, chat_id: int) -> None:
    try:
        payload, filename = build_source_zip()
    except Exception:
        log.exception("Could not build source archive")
        await context.bot.send_message(
            chat_id, "❌ Could not build the source archive — check the logs."
        )
        return

    caption = (
        f"📦 Bot source + index snapshot · {database.file_count()} file(s)\n"
        "No .env or token included — see RESTORE.txt inside."
    )
    vault_note = ""
    if VAULT_CHAT_ID is not None and VAULT_CHAT_ID != chat_id:
        try:
            await context.bot.send_document(
                chat_id=VAULT_CHAT_ID,
                document=InputFile(io.BytesIO(payload), filename=filename),
                caption=f"📦 Bot source archive · {filename}",
            )
            vault_note = "\n🛡 Also saved to your vault channel."
        except TelegramError as exc:
            log.warning("Vault source archive failed: %s", exc)
            vault_note = "\n⚠️ Vault copy failed — check the vault settings."

    try:
        await context.bot.send_document(
            chat_id=chat_id,
            document=InputFile(io.BytesIO(payload), filename=filename),
            caption=caption + vault_note,
        )
    except TelegramError:
        log.exception("Could not send source archive")
        await context.bot.send_message(
            chat_id, "❌ Could not send the source archive — check the logs."
        )


async def vault_copy(context: ContextTypes.DEFAULT_TYPE, msg, db_id: int) -> str:
    if VAULT_CHAT_ID is None or msg.chat_id == VAULT_CHAT_ID:
        return ""
    row = database.get_file(db_id)
    if row is None:
        return ""
    try:
        copied = await _send_file_refs(context, VAULT_CHAT_ID, row)
    except TelegramError as exc:
        log.warning("Vault copy failed for #%s: %s", db_id, exc)
        return "\n⚠️ Vault backup failed — check VAULT_CHAT_ID and bot admin rights."
    payload = extract_payload(copied)
    if payload:
        database.set_vault(db_id, payload[0], copied.message_id)
        return "\n🛡 Copied to your vault channel."
    log.warning("Vault copy for #%s returned no media", db_id)
    return "\n⚠️ Vault backup failed — the vault message had no file data."


async def vault_sync(context: ContextTypes.DEFAULT_TYPE) -> tuple[int, int]:
    if VAULT_CHAT_ID is None:
        return 0, 0
    rows = database.unvaulted_files(limit=25)
    copied_ok = failed = 0
    for row in rows:
        try:
            copied = await _send_file_refs(context, VAULT_CHAT_ID, row)
            payload = extract_payload(copied)
            if payload:
                database.set_vault(row["id"], payload[0], copied.message_id)
                copied_ok += 1
            else:
                failed += 1
        except TelegramError as exc:
            log.warning("Vault sync failed for #%s: %s", row["id"], exc)
            failed += 1
        await asyncio.sleep(0.2)
    return copied_ok, failed


def _new_page(kind: str, value: str = "", sort: str = "new", offset: int = 0) -> str:
    global _page_seq
    _page_seq += 1
    token = str(_page_seq)
    if len(PAGES) >= 100:
        PAGES.pop(next(iter(PAGES)))
    PAGES[token] = {
        "kind": kind,
        "value": value,
        "sort": sort,
        "offset": offset,
    }
    return token


def _page_title(state: dict, total: int) -> str:
    kind = state["kind"]
    value = state["value"]
    short = value[:60] + ("…" if len(value) > 60 else "")
    if kind == "search":
        return f'🔎 Found {total} file(s) for "{short}"'
    if kind == "tag":
        return f"🏷 Files tagged #{short} ({total})"
    if kind == "category":
        return f"📁 {short} ({total})"
    if kind == "favorites":
        return f"⭐ Favorites ({total})"
    return f"📄 Most recent files ({total})"


def _page_content(state: dict, token: str, rows, total: int):
    offset = state["offset"]
    lines = [_page_title(state, total)]
    buttons = []
    if rows:
        if total > PAGE_SIZE:
            lines.append(
                f"Page {offset // PAGE_SIZE + 1} · showing "
                f"{offset + 1}–{offset + len(rows)} of {total}"
            )
        lines.append("")
        for row in rows:
            icon = ICONS.get(row["file_type"], "📄")
            mark = "⭐ " if row["favorite"] else ""
            name = (row["file_name"] or "Unnamed")[:60]
            category = (row["category"] or "")[:40]
            line = (
                f"{mark}{icon} #{row['id']} · {name} · {human_size(row['size'])}"
                f" · 📁 {category} · {row['created_at'][:10]}"
            )
            tags = format_tags(row)
            if tags:
                line += f" · {tags[:80]}"
            lines.append(line)
            buttons.append([
                InlineKeyboardButton(
                    f"{mark}{icon} #{row['id']} {name[:24]}",
                    callback_data=f"get:{row['id']}",
                ),
                InlineKeyboardButton("⚙️", callback_data=f"act:{row['id']}"),
            ])
        if total > 1:
            sort_row = []
            for key, label in SORT_LABELS.items():
                active = state["sort"] == key
                sort_row.append(
                    InlineKeyboardButton(
                        ("• " if active else "") + label,
                        callback_data=f"sort:{token}:{key}",
                    )
                )
            buttons.append(sort_row)
        if offset + len(rows) < total:
            buttons.append([
                InlineKeyboardButton("⬇️ Show more", callback_data=f"page:{token}")
            ])
    else:
        lines.append("")
        lines.append("No more files." if total else "Nothing here yet.")
    buttons.append([menu_button()])
    return "\n".join(lines), InlineKeyboardMarkup(buttons)


async def send_page(message, kind: str, value: str = "") -> None:
    token = _new_page(kind, value)
    state = PAGES[token]
    rows = database.browse_files(
        kind, value, state["sort"], PAGE_SIZE, state["offset"]
    )
    total = database.count_files(kind, value)
    text, keyboard = _page_content(state, token, rows, total)
    await message.reply_text(text, reply_markup=keyboard)


def action_panel(row) -> tuple[str, InlineKeyboardMarkup]:
    name = (row["file_name"] or "Unnamed")[:80]
    tags = (format_tags(row) or "no tags")[:200]
    category = (row["category"] or "—")[:40]
    text = (
        f"{ICONS.get(row['file_type'], '📄')} #{row['id']} · {name}\n"
        f"{human_size(row['size'])} · {row['file_type']} · 📁 {category}\n"
        f"🏷 {tags}\n📅 {row['created_at'][:10]}"
    )
    if row["favorite"]:
        text += "\n⭐ Favorite"
    if row["vault_file_id"]:
        text += "\n🛡 Vaulted"
    star = "☆ Unfavorite" if row["favorite"] else "⭐ Favorite"
    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("📤 Send", callback_data=f"act:send:{row['id']}"),
            InlineKeyboardButton(star, callback_data=f"act:star:{row['id']}"),
        ],
        [
            InlineKeyboardButton("✏️ Rename", callback_data=f"act:rename:{row['id']}"),
            InlineKeyboardButton("📁 Move", callback_data=f"act:move:{row['id']}"),
        ],
        [
            InlineKeyboardButton("🏷 Retag", callback_data=f"act:retag:{row['id']}"),
            InlineKeyboardButton("🗑 Delete", callback_data=f"act:del:{row['id']}"),
        ],
        [InlineKeyboardButton("✖ Close", callback_data="act:close")],
    ])
    return text, keyboard


def move_panel(row) -> tuple[str, InlineKeyboardMarkup]:
    cats = database.categories()
    buttons = []
    for i, cat in enumerate(cats[:30]):
        mark = "• " if cat["category"] == row["category"] else ""
        buttons.append([
            InlineKeyboardButton(
                f"{mark}📁 {cat['category'][:35]} ({cat['n']})",
                callback_data=f"act:setcat:{row['id']}:{i}",
            )
        ])
    buttons.append([
        InlineKeyboardButton(
            "✍️ Type a new category", callback_data=f"act:movecustom:{row['id']}"
        )
    ])
    buttons.append([
        InlineKeyboardButton("⬅️ Back", callback_data=f"act:back:{row['id']}"),
        InlineKeyboardButton("✖ Close", callback_data="act:close"),
    ])
    text = f"📁 Move #{row['id']} — {row['file_name'][:80]}\n\nChoose a category:"
    return text, InlineKeyboardMarkup(buttons)


async def edit_or_reply(query, text: str, keyboard: InlineKeyboardMarkup) -> None:
    try:
        await query.edit_message_text(text, reply_markup=keyboard)
    except TelegramError as exc:
        if "not modified" in str(exc).lower():
            return
        await query.message.reply_text(text, reply_markup=keyboard)


async def render_action(query, row) -> None:
    text, keyboard = action_panel(row)
    await edit_or_reply(query, text, keyboard)


async def apply_pending_edit(update, context, pending: dict) -> None:
    file_db_id = pending["id"]
    row = database.get_file(file_db_id)
    if row is None:
        await update.message.reply_text("That file is gone.")
        return
    action = pending["action"]
    text = (update.message.text or "").strip()

    if action == "rename":
        if not valid_filename(text):
            context.user_data["pending_edit"] = pending
            await update.message.reply_text(
                "Use a valid name (max 180 characters, no \\ / : * ? \" < > |). "
                "Send it again, or /cancel."
            )
            return
        database.rename_file(file_db_id, text)
        await update.message.reply_text(
            f"✏️ Renamed #{file_db_id}: {row['file_name']} → {text}"
        )
    elif action == "move":
        category = text.lstrip("@").lower()
        if not category:
            context.user_data["pending_edit"] = pending
            await update.message.reply_text(
                "Category name can't be empty. Send it again, or /cancel."
            )
            return
        database.update_category(file_db_id, category)
        await update.message.reply_text(f"📁 Moved #{file_db_id} to {category}")
    elif action == "retag":
        if text.lower() in {"-", "clear", "none"}:
            tags = []
        else:
            tags = sorted(
                {tag.lower() for tag in re.findall(r"[A-Za-z0-9_-]+", text)}
            )
            if not tags:
                context.user_data["pending_edit"] = pending
                await update.message.reply_text(
                    "No valid tags found. Send tags like #tax #2026, "
                    "or '-' to clear all tags, or /cancel."
                )
                return
        tag_str = f" {' '.join(tags)} " if tags else ""
        database.update_tags(file_db_id, tag_str)
        display = " ".join("#" + tag for tag in tags) if tags else "(none)"
        await update.message.reply_text(f"🏷 Tags for #{file_db_id}: {display}")


async def render_menu(query, text: str, keyboard: InlineKeyboardMarkup) -> None:
    try:
        await query.edit_message_text(text, reply_markup=keyboard)
    except BadRequest as exc:
        if "not modified" in str(exc).lower():
            return
        await query.message.reply_text(text, reply_markup=keyboard)


def owner_only(func):
    @wraps(func)
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE):
        chat = update.effective_chat
        if chat is not None and chat.type != "private":
            if update.callback_query:
                await update.callback_query.answer(
                    "🔒 This bot works only in a private chat.", show_alert=True
                )
            return
        user = update.effective_user
        if OWNER_ID is None or user is None or user.id != OWNER_ID:
            if update.callback_query:
                await update.callback_query.answer(
                    "⛔ Not authorized.", show_alert=True
                )
            elif chat is not None:
                await context.bot.send_message(chat.id, "⛔ This is a private bot.")
            return
        return await func(update, context)

    return wrapper


def human_size(num) -> str:
    num = float(num or 0)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if num < 1024 or unit == "TB":
            return f"{int(num)} {unit}" if unit == "B" else f"{num:.1f} {unit}"
        num /= 1024


def _human_uptime(seconds: float) -> str:
    days, rest = divmod(int(max(seconds, 0)), 86400)
    hours, rest = divmod(rest, 3600)
    minutes = rest // 60
    if days:
        return f"{days}d {hours}h"
    if hours:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"


def format_tags(row) -> str:
    tags = row["tags"].strip()
    return " ".join("#" + t for t in tags.split()) if tags else ""


def extract_payload(msg):
    if msg.document:
        d = msg.document
        return d.file_id, d.file_unique_id, d.file_name, "document", d.file_size
    if msg.photo:
        p = msg.photo[-1]
        return p.file_id, p.file_unique_id, None, "photo", p.file_size
    if msg.video:
        v = msg.video
        return v.file_id, v.file_unique_id, v.file_name, "video", v.file_size
    if msg.audio:
        a = msg.audio
        return a.file_id, a.file_unique_id, a.file_name, "audio", a.file_size
    if msg.voice:
        vc = msg.voice
        return vc.file_id, vc.file_unique_id, None, "voice", vc.file_size
    if msg.video_note:
        vn = msg.video_note
        return vn.file_id, vn.file_unique_id, None, "video_note", vn.file_size
    if msg.animation:
        an = msg.animation
        return an.file_id, an.file_unique_id, an.file_name, "animation", an.file_size
    if msg.sticker:
        s = msg.sticker
        return s.file_id, s.file_unique_id, None, "sticker", s.file_size
    return None


def file_ref(row) -> str:
    return row["vault_file_id"] or row["file_id"]


async def _send_ref(
    context: ContextTypes.DEFAULT_TYPE, chat_id: int, row, file_id: str
):
    ftype = row["file_type"]
    name = row["file_name"] or "Unnamed file"
    caption = None if ftype in {"video_note", "sticker"} else name
    if ftype == "photo":
        return await context.bot.send_photo(chat_id, file_id, caption=caption)
    if ftype == "video":
        return await context.bot.send_video(chat_id, file_id, caption=caption)
    if ftype == "audio":
        return await context.bot.send_audio(chat_id, file_id, caption=caption)
    if ftype == "voice":
        return await context.bot.send_voice(chat_id, file_id, caption=caption)
    if ftype == "animation":
        return await context.bot.send_animation(chat_id, file_id, caption=caption)
    if ftype in {"video_note", "sticker"}:
        if ftype == "video_note":
            sent = await context.bot.send_video_note(chat_id, file_id)
        else:
            sent = await context.bot.send_sticker(chat_id, file_id)
        try:
            await context.bot.send_message(chat_id, name)
        except TelegramError as exc:
            log.warning("Name label failed for #%s: %s", row["id"], exc)
        return sent
    return await context.bot.send_document(
        chat_id, file_id, filename=name, caption=caption
    )


async def _send_file_refs(context: ContextTypes.DEFAULT_TYPE, chat_id: int, row):
    refs = []
    for ref in (row["vault_file_id"], row["file_id"]):
        if ref and ref not in refs:
            refs.append(ref)
    last_error = None
    for ref in refs:
        try:
            return await _send_ref(context, chat_id, row, ref)
        except TelegramError as exc:
            last_error = exc
            log.warning(
                "File reference failed for #%s, trying fallback: %s", row["id"], exc
            )
    if last_error is not None:
        raise last_error
    raise TelegramError(f"No file reference stored for #{row['id']}")


async def send_file(context: ContextTypes.DEFAULT_TYPE, chat_id: int, row) -> None:
    await _send_file_refs(context, chat_id, row)


def build_inline_results(rows) -> list:
    results = []
    for row in rows[:20]:
        rid = str(row["id"])
        fid = file_ref(row)
        ftype = row["file_type"]
        name = row["file_name"] or "Unnamed file"
        desc = f"{human_size(row['size'])} · {row['category']}"
        if ftype == "photo":
            results.append(
                InlineQueryResultCachedPhoto(
                    id=rid, photo_file_id=fid, title=name, description=desc,
                    caption=name,
                )
            )
        elif ftype == "video":
            results.append(
                InlineQueryResultCachedVideo(
                    id=rid, video_file_id=fid, title=name, description=desc,
                    caption=name,
                )
            )
        elif ftype == "audio":
            results.append(
                InlineQueryResultCachedAudio(id=rid, audio_file_id=fid, caption=name)
            )
        elif ftype == "voice":
            results.append(
                InlineQueryResultCachedVoice(
                    id=rid, voice_file_id=fid, title=name, caption=name
                )
            )
        elif ftype == "sticker":
            results.append(InlineQueryResultCachedSticker(id=rid, sticker_file_id=fid))
        else:
            results.append(
                InlineQueryResultCachedDocument(
                    id=rid, title=name, document_file_id=fid, description=desc
                )
            )
    return results


@owner_only
async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "🗂 File Storage Bot\n\n"
        "Send me any file and it goes into your searchable archive — stored in "
        "Telegram's cloud and indexed locally with name, category and tags.\n\n"
        "Use the buttons below to browse and manage files, or type /help for "
        f"the full command list.\n\nYour Telegram ID: {update.effective_user.id}",
        reply_markup=root_menu(),
    )


@owner_only
async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        HELP_TEXT, reply_markup=InlineKeyboardMarkup([[menu_button()]])
    )


@owner_only
async def cmd_menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(MENU_INTRO, reply_markup=root_menu())


@owner_only
async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    pending = context.user_data.pop("pending_edit", None)
    if pending:
        await apply_pending_edit(update, context, pending)
        return
    await update.message.reply_text(
        "Send me a file to store it, or tap /menu for buttons. "
        "Tap ⚙️ next to any file for rename, move, tags, delete and favorite."
    )


@owner_only
async def handle_file(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    msg = update.message
    payload = extract_payload(msg)
    if payload is None:
        return
    file_id, file_unique_id, name, ftype, size = payload

    existing = database.find_by_unique_id(file_unique_id)
    if existing:
        await msg.reply_text(
            f"♻️ Already saved as #{existing['id']} — {existing['file_name']}"
        )
        return

    context.user_data.pop("pending_edit", None)
    pending = context.user_data.pop("next_filename", None)
    if pending:
        name = pending
    ts = (msg.date or datetime.now()).strftime("%Y%m%d_%H%M%S")
    if not name:
        name = f"{ftype}_{ts}{DEFAULT_EXT.get(ftype, '.bin')}"

    caption = msg.caption or ""
    ats = re.findall(r"@([\w-]+)", caption)
    category = ats[0].lower() if ats else default_category(ftype, name)
    tags = sorted({t.lower() for t in re.findall(r"#([A-Za-z0-9_-]+)", caption)})
    tag_str = f" {' '.join(tags)} " if tags else ""

    db_id = database.add_file(
        file_id, file_unique_id, name, ftype, size, category, caption, tag_str,
        msg.message_id,
    )

    vault_note = await vault_copy(context, msg, db_id)

    reply = (
        f"☁️ Saved as #{db_id}\n"
        f"{ICONS.get(ftype, '📄')} {name}\n"
        f"{human_size(size)} · {ftype} · 📁 {category}"
    )
    if tags:
        reply += "\n" + " ".join("#" + t for t in tags)
    reply += vault_note
    await msg.reply_text(reply + f"\n↩ Retrieve with /get {db_id}")


@owner_only
async def cmd_search(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = " ".join(context.args or []).strip()
    if not query:
        await update.message.reply_text("Usage: /search <text or #tag>")
        return
    await send_page(update.message, "search", query)


@owner_only
async def cmd_tag(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.message.reply_text("Usage: /tag <name>")
        return
    tag = context.args[0].lstrip("#").lower()
    await send_page(update.message, "tag", tag)


@owner_only
async def cmd_tags(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    tag_counts = database.all_tags()
    if not tag_counts:
        await update.message.reply_text("No tags yet — add #hashtags to file captions.")
        return
    lines = ["🏷 Your tags:", ""]
    shown = tag_counts[:100]
    lines += [f"#{tag[:60]} ({count})" for tag, count in shown]
    if len(tag_counts) > len(shown):
        lines += ["", f"…and {len(tag_counts) - len(shown)} more. Use /tag <name> to open one."]
    await update.message.reply_text("\n".join(lines))


@owner_only
async def cmd_cat(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        await update.message.reply_text("Usage: /cat <name>")
        return
    category = " ".join(context.args).lower()
    await send_page(update.message, "category", category)


@owner_only
async def cmd_cats(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    rows = database.categories()
    if not rows:
        await update.message.reply_text("No categories yet — send a file.")
        return
    lines = ["🗂 Categories:", ""]
    shown = rows[:80]
    lines += [f"📁 {row['category'][:60]} ({row['n']})" for row in shown]
    if len(rows) > len(shown):
        lines += ["", f"…and {len(rows) - len(shown)} more. Use /cat <name> to open one."]
    await update.message.reply_text("\n".join(lines))


@owner_only
async def cmd_recent(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await send_page(update.message, "recent")


@owner_only
async def cmd_favorites(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await send_page(update.message, "favorites")


@owner_only
async def cmd_get(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args or not context.args[0].isdigit():
        await update.message.reply_text(
            "Usage: /get <id>  (find ids with /search or /recent)"
        )
        return
    row = database.get_file(int(context.args[0]))
    if row is None:
        await update.message.reply_text("No file with that id.")
        return
    await send_file(context, update.message.chat_id, row)


@owner_only
async def cmd_rename(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    args = context.args or []
    if len(args) < 2 or not args[0].isdigit():
        await update.message.reply_text("Usage: /rename <id> <new name>")
        return
    file_db_id = int(args[0])
    new_name = " ".join(args[1:]).strip()
    row = database.get_file(file_db_id)
    if row is None:
        await update.message.reply_text("No file with that id.")
        return
    if not valid_filename(new_name):
        await update.message.reply_text(
            "Use a valid name (max 180 characters, no \\ / : * ? \" < > |)."
        )
        return
    database.rename_file(file_db_id, new_name)
    await update.message.reply_text(
        f"✏️ Renamed #{file_db_id}: {row['file_name']} → {new_name}"
    )


@owner_only
async def cmd_move(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    args = context.args or []
    if len(args) < 2 or not args[0].isdigit():
        await update.message.reply_text("Usage: /move <id> <category>")
        return
    file_db_id = int(args[0])
    category = " ".join(args[1:]).strip().lower()
    row = database.get_file(file_db_id)
    if row is None:
        await update.message.reply_text("No file with that id.")
        return
    database.update_category(file_db_id, category)
    await update.message.reply_text(
        f"📁 Moved #{file_db_id} from {row['category']} to {category}"
    )


@owner_only
async def cmd_retag(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    args = context.args or []
    if len(args) < 2 or not args[0].isdigit():
        await update.message.reply_text("Usage: /retag <id> #tag1 #tag2 ...")
        return
    file_db_id = int(args[0])
    row = database.get_file(file_db_id)
    if row is None:
        await update.message.reply_text("No file with that id.")
        return
    tags = sorted({w.lstrip("#").lower() for w in args[1:] if w.lstrip("#")})
    tag_str = f" {' '.join(tags)} " if tags else ""
    database.update_tags(file_db_id, tag_str)
    display = " ".join("#" + t for t in tags) if tags else "(none)"
    await update.message.reply_text(f"🏷 Tags for #{file_db_id}: {display}")


@owner_only
async def cmd_saveas(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    name = " ".join(context.args or []).strip()
    if not name:
        await update.message.reply_text(
            "Usage: /saveas <filename.ext> — your next upload is saved under this name.\n"
            "Example: /saveas Ferrari_body.stl, then send the file. /cancelname to undo."
        )
        return
    if not valid_filename(name):
        await update.message.reply_text(
            "Use a valid name (max 180 characters, no \\ / : * ? \" < > |)."
        )
        return
    context.user_data["next_filename"] = name
    await update.message.reply_text(
        f"✏️ Next upload will be saved as: {name}\n"
        "Send the file now — /cancelname to cancel."
    )


@owner_only
async def cmd_cancelname(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    context.user_data.pop("next_filename", None)
    await update.message.reply_text("Pending custom name cleared.")


@owner_only
async def cmd_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    pending_edit = context.user_data.pop("pending_edit", None)
    pending_name = context.user_data.pop("next_filename", None)
    if pending_edit or pending_name:
        await update.message.reply_text("Cancelled.")
    else:
        await update.message.reply_text("Nothing pending to cancel.")


@owner_only
async def cmd_delete(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args or not context.args[0].isdigit():
        await update.message.reply_text("Usage: /delete <id>")
        return
    file_db_id = int(context.args[0])
    row = database.get_file(file_db_id)
    if row is None:
        await update.message.reply_text("No file with that id.")
        return
    database.delete_file(file_db_id)
    await update.message.reply_text(
        f"🗑 Removed #{file_db_id} — {row['file_name']} (the message in this chat stays;"
        f" this only drops it from the index)"
    )


@owner_only
async def cmd_stats(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(stats_text())


@owner_only
async def cmd_backup(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    try:
        path = database.backup_db()
    except Exception:
        log.exception("Manual backup failed")
        await update.message.reply_text("❌ Backup failed — check the logs.")
        return
    await update.message.reply_text(backup_text(path))


@owner_only
async def cmd_export(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    kind = (context.args[0].lower() if context.args else "csv")
    if kind not in {"csv", "json"}:
        await update.message.reply_text("Usage: /export [csv|json]")
        return
    await send_export(context, update.message.chat_id, kind)


@owner_only
async def cmd_source(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await send_source_backup(context, update.message.chat_id)


@owner_only
async def cmd_vault(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if context.args and context.args[0].lower() == "sync":
        if VAULT_CHAT_ID is None:
            await update.message.reply_text(vault_text())
            return
        total = database.file_count()
        if database.vaulted_count() >= total:
            await update.message.reply_text(f"🛡 All {total} file(s) are already vaulted.")
            return
        await update.message.reply_text("🔄 Copying older files to the vault…")
        copied_ok, failed = await vault_sync(context)
        text = (
            f"🛡 Vault sync finished: {copied_ok} copied, {failed} failed.\n"
            f"{database.vaulted_count()} of {total} file(s) vaulted."
        )
        if database.vaulted_count() < database.file_count():
            text += "\nRun /vault sync again for the next batch."
        await update.message.reply_text(text)
        return
    await update.message.reply_text(vault_text())


async def inline_search(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.inline_query
    if OWNER_ID is not None and query.from_user.id != OWNER_ID:
        await query.answer([], cache_time=3600)
        return
    text = query.query.strip()
    if text:
        rows = database.search_files(text, limit=20)
        await query.answer(build_inline_results(rows), cache_time=5, is_personal=True)
    else:
        await query.answer(
            build_inline_results(database.recent_files(10)),
            cache_time=5,
            is_personal=True,
            button=InlineQueryResultsButton(
                text="Open bot for commands", start_parameter="start"
            ),
        )


@owner_only
async def on_button(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    db_id = int(query.data.split(":")[1])
    row = database.get_file(db_id)
    if row is None:
        await query.message.reply_text("That file is gone.")
        return
    await send_file(context, query.message.chat_id, row)


async def on_chat_member(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    change = update.my_chat_member
    if change is None or change.chat.type != "channel":
        return
    if change.new_chat_member.status not in {"administrator", "member"}:
        return
    if OWNER_ID is None:
        return
    text = (
        f"📡 Bot added to channel: {change.chat.title}\n\n"
        f"VAULT_CHAT_ID={change.chat.id}\n\n"
        "Add that line to .env, restart the bot, then run /vault sync.\n"
        "If you didn't add the bot to this channel, remove it there."
    )
    try:
        await context.bot.send_message(OWNER_ID, text)
    except TelegramError as exc:
        log.warning("Could not send channel ID to owner: %s", exc)


@owner_only
async def on_menu(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    parts = query.data.split(":")[1:]
    action = parts[0] if parts else "root"

    if action == "root":
        await render_menu(query, MENU_INTRO, root_menu())
    elif action == "browse":
        await render_menu(query, *browse_menu())
    elif action == "manage":
        await render_menu(query, *manage_menu())
    elif action == "upload":
        await render_menu(query, *upload_menu())
    elif action == "data":
        await render_menu(query, *data_menu())
    elif action == "help":
        await render_menu(
            query,
            HELP_TEXT,
            InlineKeyboardMarkup([[InlineKeyboardButton("⬅️ Back", callback_data="menu:root")]]),
        )
    elif action == "hint":
        name = parts[1] if len(parts) > 1 else ""
        parent = parts[2] if len(parts) > 2 else "root"
        text = HINT_TEXTS.get(name)
        if text is None:
            return
        await render_menu(
            query,
            text.replace("{bot}", context.bot.username or "this bot"),
            InlineKeyboardMarkup([[
                InlineKeyboardButton("📄 Recent files", callback_data="menu:recent"),
                InlineKeyboardButton("⬅️ Back", callback_data=f"menu:{parent}"),
            ]]),
        )
    elif action == "recent":
        await send_page(query.message, "recent")
    elif action == "favs":
        await send_page(query.message, "favorites")
    elif action == "cats":
        cats = database.categories()
        if not cats:
            await query.message.reply_text("No categories yet — send me a file.")
            return
        rows = [
            [
                InlineKeyboardButton(
                    f"📁 {row['category'][:40]} ({row['n']})",
                    callback_data=f"menu:cat:{i}",
                )
            ]
            for i, row in enumerate(cats[:60])
        ]
        rows.append([InlineKeyboardButton("⬅️ Back", callback_data="menu:browse")])
        text = "🗂 Categories — tap one to open:"
        if len(cats) > 60:
            text += f"\nShowing 60 of {len(cats)} — use /cat <name> for the rest."
        await render_menu(query, text, InlineKeyboardMarkup(rows))
    elif action == "cat":
        cats = database.categories()
        idx = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else -1
        if 0 <= idx < len(cats):
            category = cats[idx]["category"]
            await send_page(query.message, "category", category)
        else:
            await query.message.reply_text("That category no longer exists.")
    elif action == "tags":
        tag_counts = database.all_tags()
        if not tag_counts:
            await query.message.reply_text("No tags yet — add #hashtags to file captions.")
            return
        buttons = [
            InlineKeyboardButton(
                f"#{tag[:28]} ({count})", callback_data=f"menu:tag:{i}"
            )
            for i, (tag, count) in enumerate(tag_counts[:30])
        ]
        rows = [buttons[i:i + 2] for i in range(0, len(buttons), 2)]
        rows.append([InlineKeyboardButton("⬅️ Back", callback_data="menu:browse")])
        text = "🏷 Tags — tap one to open:"
        if len(tag_counts) > 30:
            text += f"\nShowing 30 of {len(tag_counts)} — use /tags for the full list."
        await render_menu(query, text, InlineKeyboardMarkup(rows))
    elif action == "tag":
        tag_counts = database.all_tags()
        idx = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else -1
        if 0 <= idx < len(tag_counts):
            tag = tag_counts[idx][0]
            await send_page(query.message, "tag", tag)
        else:
            await query.message.reply_text("That tag no longer exists.")
    elif action == "stats":
        await query.message.reply_text(
            stats_text(),
            reply_markup=InlineKeyboardMarkup([[menu_button()]]),
        )
    elif action == "cancelname":
        context.user_data.pop("next_filename", None)
        await query.message.reply_text("Pending custom name cleared.")
    elif action == "export":
        kind = parts[1] if len(parts) > 1 else "csv"
        if kind not in {"csv", "json"}:
            return
        await send_export(context, query.message.chat_id, kind)
    elif action == "backup":
        try:
            path = database.backup_db()
        except Exception:
            log.exception("Menu backup failed")
            await query.message.reply_text("❌ Backup failed — check the logs.")
            return
        await query.message.reply_text(backup_text(path))
    elif action == "source":
        await send_source_backup(context, query.message.chat_id)
    elif action == "vault":
        buttons = []
        if VAULT_CHAT_ID is not None:
            buttons.append([
                InlineKeyboardButton(
                    "🔄 Sync existing files", callback_data="menu:vaultsync"
                )
            ])
        buttons.append([InlineKeyboardButton("⬅️ Back", callback_data="menu:data")])
        await render_menu(query, vault_text(), InlineKeyboardMarkup(buttons))
    elif action == "vaultsync":
        if VAULT_CHAT_ID is None:
            await query.message.reply_text(vault_text())
            return
        total = database.file_count()
        if database.vaulted_count() >= total:
            await query.message.reply_text(f"🛡 All {total} file(s) are already vaulted.")
            return
        await query.message.reply_text("🔄 Copying older files to the vault…")
        copied_ok, failed = await vault_sync(context)
        text = (
            f"🛡 Vault sync finished: {copied_ok} copied, {failed} failed.\n"
            f"{database.vaulted_count()} of {total} file(s) vaulted."
        )
        if database.vaulted_count() < database.file_count():
            text += "\nRun /vault sync again for the next batch."
        await query.message.reply_text(text)


@owner_only
async def on_page(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    parts = query.data.split(":")
    mode = parts[0]
    token = parts[1] if len(parts) > 1 else ""
    state = PAGES.get(token)
    if state is None:
        await query.answer(
            "This list expired — run the search again.", show_alert=True
        )
        return
    if mode == "page":
        state["offset"] += PAGE_SIZE
    elif mode == "sort":
        key = parts[2] if len(parts) > 2 else "new"
        if key in SORT_LABELS:
            state["sort"] = key
            state["offset"] = 0
    await query.answer()

    rows = database.browse_files(
        state["kind"], state["value"], state["sort"], PAGE_SIZE, state["offset"]
    )
    total = database.count_files(state["kind"], state["value"])
    if total and state["offset"] >= total:
        state["offset"] = ((total - 1) // PAGE_SIZE) * PAGE_SIZE
        rows = database.browse_files(
            state["kind"], state["value"], state["sort"], PAGE_SIZE, state["offset"]
        )
    text, keyboard = _page_content(state, token, rows, total)
    try:
        await query.edit_message_text(text, reply_markup=keyboard)
    except TelegramError as exc:
        if "not modified" not in str(exc).lower():
            await query.message.reply_text(text, reply_markup=keyboard)


@owner_only
async def on_file_action(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    parts = query.data.split(":")
    action = parts[1] if len(parts) > 1 else ""

    if action == "close":
        await query.answer()
        try:
            await query.message.delete()
        except TelegramError:
            pass
        return

    if action.isdigit():
        action = "open"
        db_id = int(parts[1])
    else:
        db_id = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 0

    row = database.get_file(db_id) if db_id else None
    if row is None:
        await query.answer("That file is gone.", show_alert=True)
        return

    if action == "open":
        await query.answer()
        text, keyboard = action_panel(row)
        await query.message.reply_text(text, reply_markup=keyboard)
    elif action == "back":
        await query.answer()
        await render_action(query, row)
    elif action == "send":
        await query.answer("Sending…")
        await send_file(context, query.message.chat_id, row)
    elif action == "star":
        new_value = database.toggle_favorite(db_id)
        await query.answer(
            "⭐ Added to favorites" if new_value else "Removed from favorites"
        )
        row = database.get_file(db_id)
        if row is not None:
            await render_action(query, row)
    elif action in {"rename", "retag", "movecustom"}:
        if action == "rename":
            pending = {"action": "rename", "id": db_id}
            hint = f"✏️ Rename #{db_id} — {row['file_name']}\n\nSend the new file name now."
        elif action == "retag":
            pending = {"action": "retag", "id": db_id}
            hint = (
                f"🏷 Retag #{db_id} — {row['file_name']}\n\n"
                "Send tags like #tax #2026, or '-' to clear all tags."
            )
        else:
            pending = {"action": "move", "id": db_id}
            hint = f"📁 Move #{db_id} — {row['file_name']}\n\nSend the new category name now."
        context.user_data["pending_edit"] = pending
        await query.answer()
        await query.message.reply_text(
            hint + "\n/cancel to stop.", reply_markup=ForceReply(selective=True)
        )
    elif action == "move":
        await query.answer()
        text, keyboard = move_panel(row)
        await edit_or_reply(query, text, keyboard)
    elif action == "setcat":
        cats = database.categories()
        idx = int(parts[3]) if len(parts) > 3 and parts[3].isdigit() else -1
        if 0 <= idx < len(cats):
            category = cats[idx]["category"]
            database.update_category(db_id, category)
            await query.answer(f"Moved to {category}")
            row = database.get_file(db_id)
            if row is not None:
                await render_action(query, row)
        else:
            await query.answer("That category no longer exists.", show_alert=True)
    elif action == "del":
        await query.answer()
        text = (
            f"🗑 Delete #{db_id} — {row['file_name']}?\n\n"
            "This removes only the index entry; the original Telegram message stays."
        )
        keyboard = InlineKeyboardMarkup([[
            InlineKeyboardButton("✅ Delete", callback_data=f"act:delok:{db_id}"),
            InlineKeyboardButton("❌ Cancel", callback_data=f"act:back:{db_id}"),
        ]])
        await edit_or_reply(query, text, keyboard)
    elif action == "delok":
        database.delete_file(db_id)
        await query.answer("Deleted from index")
        await edit_or_reply(
            query,
            f"🗑 Removed #{db_id} — {row['file_name']} from the index.\n"
            "The original Telegram message stays.",
            InlineKeyboardMarkup([[
                InlineKeyboardButton("✖ Close", callback_data="act:close")
            ]]),
        )


async def on_error(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    if isinstance(context.error, NetworkError):
        log.warning("Network error while polling: %s", context.error)
        return
    log.error("Unhandled error", exc_info=context.error)
    if isinstance(update, Update) and update.effective_message:
        try:
            await update.effective_message.reply_text(
                "😵 Something went wrong — check the logs."
            )
        except TelegramError:
            pass


def _heartbeat_text() -> str:
    payload = {
        "app": "telegram-file-bot",
        "version": BOT_VERSION,
        "ts": int(time.time()),
        "files": database.file_count(),
        "uptime": int(time.time() - _STARTED_AT),
    }
    return f"{HEARTBEAT_MARKER} {json.dumps(payload, separators=(',', ':'))}"


def _read_heartbeat_id() -> Optional[int]:
    try:
        data = json.loads(HEARTBEAT_PATH.read_text(encoding="utf-8"))
        return int(data.get("message_id") or 0) or None
    except (OSError, ValueError, TypeError, AttributeError):
        return None


def _write_heartbeat_id(message_id: int) -> None:
    try:
        HEARTBEAT_PATH.write_text(
            json.dumps({"message_id": int(message_id)}), encoding="utf-8"
        )
    except OSError:
        log.debug("Could not remember the heartbeat message id")


async def _publish_heartbeat(application: Application) -> None:
    """Keep one pinned status message fresh so the Explorer can show the server state."""
    bot = application.bot
    text = _heartbeat_text()
    message_id = application.bot_data.get("heartbeat_id") or _read_heartbeat_id()
    if message_id:
        try:
            await bot.edit_message_text(
                chat_id=OWNER_ID, message_id=int(message_id), text=text
            )
            application.bot_data["heartbeat_id"] = int(message_id)
            return
        except BadRequest as exc:
            log.info("Replacing the heartbeat message: %s", exc)
        except TelegramError as exc:
            log.warning("Heartbeat edit failed: %s", exc)
            return
    message = await bot.send_message(
        chat_id=OWNER_ID, text=text, disable_notification=True
    )
    application.bot_data["heartbeat_id"] = message.message_id
    _write_heartbeat_id(message.message_id)
    try:
        await bot.pin_chat_message(
            chat_id=OWNER_ID,
            message_id=message.message_id,
            disable_notification=True,
        )
    except TelegramError as exc:
        log.info("Could not pin the heartbeat message: %s", exc)


async def _heartbeat_loop(application: Application) -> None:
    while True:
        try:
            await _publish_heartbeat(application)
        except Exception:
            log.exception("Heartbeat update failed")
        await asyncio.sleep(HEARTBEAT_EVERY)


async def _backup_loop() -> None:
    while True:
        await asyncio.sleep(24 * 60 * 60)
        try:
            path = database.backup_db()
            log.info("Daily index backup: %s", path.name)
        except Exception:
            log.exception("Daily backup failed")


async def _post_init(application: Application) -> None:
    try:
        path = database.backup_db()
        log.info("Startup index backup: %s", path.name)
    except Exception:
        log.exception("Startup backup failed")
    loop = asyncio.get_running_loop()
    application.bot_data["backup_task"] = loop.create_task(_backup_loop())
    application.bot_data["heartbeat_task"] = loop.create_task(
        _heartbeat_loop(application)
    )


async def _post_stop(application: Application) -> None:
    for name in ("heartbeat_task", "backup_task"):
        task = application.bot_data.pop(name, None)
        if task is None:
            continue
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


def _run_bot() -> None:
    if not BOT_TOKEN:
        raise SystemExit(
            "BOT_TOKEN is not set. Copy .env.example to .env and add your token from @BotFather."
        )
    if OWNER_ID is None:
        raise SystemExit(
            "OWNER_ID is not set. Add your numeric Telegram ID to .env (see README.md)."
        )
    database.init_db()
    app = (
        Application.builder()
        .token(BOT_TOKEN)
        .post_init(_post_init)
        .post_stop(_post_stop)
        .build()
    )

    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("menu", cmd_menu))
    app.add_handler(CommandHandler("search", cmd_search))
    app.add_handler(CommandHandler("tag", cmd_tag))
    app.add_handler(CommandHandler("tags", cmd_tags))
    app.add_handler(CommandHandler("cat", cmd_cat))
    app.add_handler(CommandHandler("cats", cmd_cats))
    app.add_handler(CommandHandler("recent", cmd_recent))
    app.add_handler(CommandHandler("favorites", cmd_favorites))
    app.add_handler(CommandHandler("get", cmd_get))
    app.add_handler(CommandHandler("rename", cmd_rename))
    app.add_handler(CommandHandler("saveas", cmd_saveas))
    app.add_handler(CommandHandler("cancelname", cmd_cancelname))
    app.add_handler(CommandHandler("cancel", cmd_cancel))
    app.add_handler(CommandHandler("move", cmd_move))
    app.add_handler(CommandHandler("retag", cmd_retag))
    app.add_handler(CommandHandler("delete", cmd_delete))
    app.add_handler(CommandHandler("stats", cmd_stats))
    app.add_handler(CommandHandler("backup", cmd_backup))
    app.add_handler(CommandHandler("export", cmd_export))
    app.add_handler(CommandHandler("source", cmd_source))
    app.add_handler(CommandHandler("vault", cmd_vault))
    app.add_handler(InlineQueryHandler(inline_search))
    app.add_handler(
        ChatMemberHandler(on_chat_member, ChatMemberHandler.MY_CHAT_MEMBER)
    )
    app.add_handler(CallbackQueryHandler(on_menu, pattern=r"^menu:"))
    app.add_handler(CallbackQueryHandler(on_page, pattern=r"^(page|sort):"))
    app.add_handler(CallbackQueryHandler(on_file_action, pattern=r"^act:"))
    app.add_handler(CallbackQueryHandler(on_button, pattern=r"^get:\d+$"))
    app.add_handler(
        MessageHandler(
            filters.Document.ALL
            | filters.PHOTO
            | filters.VIDEO
            | filters.AUDIO
            | filters.VOICE
            | filters.VIDEO_NOTE
            | filters.ANIMATION
            | filters.Sticker.ALL,
            handle_file,
        )
    )
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    app.add_error_handler(on_error)

    print("Bot is running — press Ctrl+C to stop.")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


_MUTEX_NAME = "Local\\TelegramFileBot"
_mutex_handle = None


def _acquire_single_instance() -> bool:
    """Hold a Windows mutex so only one poller can ever run."""
    global _mutex_handle
    if os.name != "nt":
        return True
    try:
        import ctypes

        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel32.CreateMutexW.argtypes = [
            ctypes.c_void_p,
            ctypes.c_bool,
            ctypes.c_wchar_p,
        ]
        kernel32.CreateMutexW.restype = ctypes.c_void_p
        kernel32.CloseHandle.argtypes = [ctypes.c_void_p]
        kernel32.CloseHandle.restype = ctypes.c_int
        handle = kernel32.CreateMutexW(None, False, _MUTEX_NAME)
        if not handle:
            return True
        if ctypes.get_last_error() == 183:  # ERROR_ALREADY_EXISTS
            kernel32.CloseHandle(handle)
            return False
        _mutex_handle = int(handle)
        return True
    except Exception:
        log.exception("Could not create the single-instance mutex")
        return True


def _release_single_instance() -> None:
    if not _mutex_handle or os.name != "nt":
        return
    try:
        import ctypes

        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel32.CloseHandle.argtypes = [ctypes.c_void_p]
        kernel32.CloseHandle.restype = ctypes.c_int
        kernel32.CloseHandle(ctypes.c_void_p(_mutex_handle))
    except Exception:
        pass


def _watch_stop_file() -> None:
    """Exit gracefully when the Explorer writes data/bot.stop with our pid."""
    stop_path = DATA_DIR / "bot.stop"
    while True:
        try:
            if (
                stop_path.exists()
                and stop_path.read_text(encoding="utf-8", errors="ignore").strip()
                == str(os.getpid())
            ):
                stop_path.unlink(missing_ok=True)
                signal.raise_signal(signal.SIGINT)
                return
        except OSError:
            pass
        time.sleep(1.0)


def main() -> None:
    if not _acquire_single_instance():
        print("Bot is already running — this copy will exit.")
        return
    pid_path = DATA_DIR / "bot.pid"
    try:
        pid_path.write_text(str(os.getpid()), encoding="utf-8")
    except OSError:
        pass
    threading.Thread(target=_watch_stop_file, name="filebot-stop", daemon=True).start()
    try:
        _run_bot()
    finally:
        try:
            pid_path.unlink(missing_ok=True)
        except OSError:
            pass
        _release_single_instance()


if __name__ == "__main__":
    main()
