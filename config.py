"""Configuration loaded from environment / .env file."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.environ.get("BOT_TOKEN", "").strip()

_owner = os.environ.get("OWNER_ID", "").strip()
try:
    OWNER_ID = int(_owner) if _owner else None
except ValueError:
    raise SystemExit("OWNER_ID must be numeric — get yours from @userinfobot.")

_vault = os.environ.get("VAULT_CHAT_ID", "").strip()
try:
    VAULT_CHAT_ID = int(_vault) if _vault else None
except ValueError:
    raise SystemExit("VAULT_CHAT_ID must be numeric, e.g. -1001234567890.")

DATA_DIR = Path(os.environ.get("DATA_DIR", "data")).resolve()
DB_PATH = DATA_DIR / "files.db"

DATA_DIR.mkdir(parents=True, exist_ok=True)
