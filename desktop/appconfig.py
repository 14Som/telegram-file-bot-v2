"""Paths, settings and defaults for the desktop explorer."""

from __future__ import annotations

import hashlib
import json
import os
import random
import sys
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

APP_NAME = "TelegramFileExplorer"
APP_TITLE = "Telegram File Explorer"
PROJECT_DIR = (
    Path(sys.executable).resolve().parent
    if getattr(sys, "frozen", False)
    else Path(__file__).resolve().parent.parent
)

HOME = Path(os.environ.get("TFE_HOME") or (Path(os.environ.get("APPDATA") or Path.home()) / APP_NAME))
SETTINGS_PATH = HOME / "settings.json"
LIBRARY_PATH = HOME / "library.db"
SESSION_DIR = HOME / "session"
SESSION_PATH = SESSION_DIR / "telegram"
THUMB_DIR = HOME / "thumbs"
CACHE_DIR = HOME / "cache"
LOG_PATH = HOME / "explorer.log"

DEFAULTS: Dict[str, Any] = {
    "api_id": "",
    "api_hash": "",
    "vault": "",
    "vault_title": "",
    "default_vault": "",
    "vaults": "[]",
    "helper_bot": "",
    "run_bot": "",
    "pin_salt": "",
    "pin_hash": "",
    "pin_skipped": "",
}

VAULT_LIMIT = 50

# Icons that tell storage vaults apart in the switcher. They live inside the
# vault registry, so they travel with the library snapshot like the names do.
VAULT_ICONS = (
    "🗄️", "📦", "🗃️", "💾", "🎞️",
    "📚", "🔐", "🚀", "🌙", "🔥",
    "💎", "🧊", "🌊", "🍀", "⚡",
    "🎬", "🖼️", "📀", "🧰", "🧿",
)

_sizes = ("B", "KB", "MB", "GB", "TB")


def ensure_dirs() -> None:
    for path in (HOME, SESSION_DIR, THUMB_DIR, CACHE_DIR):
        path.mkdir(parents=True, exist_ok=True)


def _read_env_vault() -> str:
    """Only ever read VAULT_CHAT_ID from the bot's .env — no other keys."""
    env_path = PROJECT_DIR / ".env"
    if not env_path.exists():
        return ""
    try:
        for line in env_path.read_text(encoding="utf-8", errors="ignore").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            if key.strip() == "VAULT_CHAT_ID":
                return value.strip().strip('"').strip("'")
    except OSError:
        pass
    return ""


def default_vault() -> str:
    return (os.environ.get("TFE_VAULT") or _read_env_vault()).strip()


def load_settings() -> Dict[str, Any]:
    ensure_dirs()
    data = dict(DEFAULTS)
    try:
        raw = json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
        if isinstance(raw, dict):
            for key in DEFAULTS:
                if raw.get(key) not in (None, ""):
                    data[key] = raw[key]
    except (OSError, ValueError):
        pass
    if not data["vault"]:
        data["vault"] = default_vault()
    return data


def save_settings(values: Dict[str, Any]) -> Dict[str, Any]:
    data = load_settings()
    for key in DEFAULTS:
        if key in values and values[key] is not None:
            data[key] = str(values[key]).strip()
    ensure_dirs()
    tmp = SETTINGS_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=2), encoding="utf-8")
    os.replace(tmp, SETTINGS_PATH)
    return data


def clear_session_files() -> None:
    for suffix in ("", "-journal", "-wal", "-shm"):
        try:
            Path(str(SESSION_PATH) + suffix).unlink(missing_ok=True)
        except OSError:
            pass


def _fallback_icon(vault_id: str) -> str:
    digest = hashlib.sha1(vault_id.encode("utf-8")).hexdigest()
    return VAULT_ICONS[int(digest, 16) % len(VAULT_ICONS)]


def pick_vault_icon(taken: Iterable[str] = ()) -> str:
    """A random icon that no other vault currently uses, when possible."""
    used = {str(icon) for icon in taken}
    options = [icon for icon in VAULT_ICONS if icon not in used] or list(VAULT_ICONS)
    return random.choice(options)


def _clean_vault(entry: Dict[str, Any]) -> Optional[Dict[str, str]]:
    try:
        vault_id = str(int(entry.get("id")))
    except (TypeError, ValueError, AttributeError):
        return None
    title = str(entry.get("title") or vault_id).strip()[:128] or vault_id
    username = str(entry.get("username") or "").strip()[:64]
    icon = str(entry.get("icon") or "").strip()
    if icon not in VAULT_ICONS:
        icon = _fallback_icon(vault_id)
    return {"id": vault_id, "title": title, "username": username, "icon": icon}


def load_vaults() -> List[Dict[str, str]]:
    raw = load_settings().get("vaults")
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except ValueError:
            return []
    if not isinstance(raw, list):
        return []
    found: List[Dict[str, str]] = []
    seen = set()
    for item in raw:
        if not isinstance(item, dict):
            continue
        entry = _clean_vault(item)
        if entry is not None and entry["id"] not in seen:
            seen.add(entry["id"])
            found.append(entry)
    return found[:VAULT_LIMIT]


def remember_vault(vault: Dict[str, Any]) -> List[Dict[str, str]]:
    entry = _clean_vault(vault)
    if entry is None:
        return load_vaults()
    entries = [item for item in load_vaults() if item["id"] != entry["id"]]
    entries.insert(0, entry)
    save_settings({"vaults": json.dumps(entries[:VAULT_LIMIT])})
    return entries[:VAULT_LIMIT]


def update_vault(vault: Dict[str, Any]) -> List[Dict[str, str]]:
    """Change a known vault, keeping its place in the list."""
    entry = _clean_vault(vault)
    if entry is None:
        return load_vaults()
    entries = load_vaults()
    for index, item in enumerate(entries):
        if item["id"] == entry["id"]:
            entries[index] = entry
            break
    else:
        entries.insert(0, entry)
    save_settings({"vaults": json.dumps(entries[:VAULT_LIMIT])})
    return entries[:VAULT_LIMIT]


def human_size(size: Optional[int]) -> str:
    if not size:
        return "—"
    value = float(size)
    for unit in _sizes:
        if value < 1024 or unit == _sizes[-1]:
            return f"{value:.0f} {unit}" if unit == "B" else f"{value:.1f} {unit}"
        value /= 1024
    return f"{size} B"
