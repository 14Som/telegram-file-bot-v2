"""Update the packaged Explorer from GitHub Releases.

The download is verified (size, SHA-256 digest when GitHub provides one, and a
Windows PE header) before a small PowerShell helper waits for this process to
exit, swaps the EXE and starts it again.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, Optional

from desktop import appconfig

REPO = "14Som/telegram-file-bot-v2"
ASSET_NAME = "TelegramFileExplorer.exe"
RELEASES_URL = f"https://api.github.com/repos/{REPO}/releases/latest"
USER_AGENT = "TelegramFileExplorer-updater"
TIMEOUT = 30
CHUNK = 1024 * 1024
UPDATE_DIR = appconfig.HOME / "update"
CREATE_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)


class UpdateError(Exception):
    pass


def _version_parts(text: Any) -> tuple:
    numbers = [int(value) for value in re.findall(r"\d+", str(text or ""))][:3]
    while len(numbers) < 3:
        numbers.append(0)
    return tuple(numbers)


def _fetch_json(url: str) -> Dict[str, Any]:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            raise UpdateError("No release has been published yet.") from None
        raise UpdateError(
            f"GitHub would not answer (HTTP {exc.code}). Try again later."
        ) from None
    except (urllib.error.URLError, TimeoutError, OSError, ValueError):
        raise UpdateError(
            "Could not reach GitHub. Check the internet connection."
        ) from None


def check(current: str) -> Dict[str, Any]:
    release = _fetch_json(RELEASES_URL)
    tag = str(release.get("tag_name") or "")
    latest = tag[1:] if tag[:1].lower() == "v" else tag
    asset = next(
        (
            item
            for item in release.get("assets") or []
            if str(item.get("name")) == ASSET_NAME
        ),
        None,
    )
    available = bool(asset) and _version_parts(latest) > _version_parts(current)
    return {
        "current": current,
        "latest": latest or tag,
        "available": available,
        "asset_url": str(asset.get("browser_download_url") or "") if asset else "",
        "size": int(asset.get("size") or 0) if asset else 0,
        "digest": str(asset.get("digest") or "") if asset else "",
        "notes": str(release.get("body") or ""),
        "published_at": str(release.get("published_at") or ""),
    }


def _allowed(url: str) -> bool:
    parsed = urllib.parse.urlparse(url)
    host = (parsed.hostname or "").lower()
    return parsed.scheme == "https" and (
        host == "github.com" or host.endswith(".githubusercontent.com")
    )


def download(asset_url: str, size: int, digest: str) -> Path:
    if not _allowed(asset_url):
        raise UpdateError("The release download address was not a GitHub address.")
    UPDATE_DIR.mkdir(parents=True, exist_ok=True)
    target = UPDATE_DIR / ASSET_NAME
    tmp = target.with_suffix(".part")
    request = urllib.request.Request(
        asset_url,
        headers={"User-Agent": USER_AGENT, "Accept": "application/octet-stream"},
    )
    hasher = hashlib.sha256()
    written = 0
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response, tmp.open("wb") as out:
            while True:
                block = response.read(CHUNK)
                if not block:
                    break
                written += len(block)
                if size and written > size:
                    raise UpdateError("The download was larger than the release says.")
                hasher.update(block)
                out.write(block)
    except UpdateError:
        tmp.unlink(missing_ok=True)
        raise
    except urllib.error.HTTPError as exc:
        tmp.unlink(missing_ok=True)
        raise UpdateError(f"The download failed (HTTP {exc.code}).") from None
    except (urllib.error.URLError, TimeoutError, OSError):
        tmp.unlink(missing_ok=True)
        raise UpdateError(
            "The download stopped. Check the connection and try again."
        ) from None
    if size and written != size:
        tmp.unlink(missing_ok=True)
        raise UpdateError("The download size did not match the release. Try again.")
    if digest.lower().startswith("sha256:"):
        expected = digest.split(":", 1)[1].strip().lower()
        if hasher.hexdigest() != expected:
            tmp.unlink(missing_ok=True)
            raise UpdateError("The download did not match the release checksum.")
    with tmp.open("rb") as handle:
        if handle.read(2) != b"MZ":
            tmp.unlink(missing_ok=True)
            raise UpdateError("The downloaded file is not a Windows app.")
    os.replace(tmp, target)
    return target


def _script(source: Path, target: Path, pid: int, size: int, digest: str) -> str:
    def quoted(path: Path) -> str:
        return "'" + str(path).replace("'", "''") + "'"

    check = (
        "((Test-Path -LiteralPath {0}) -and "
        "((Get-Item -LiteralPath {0}).Length -eq " + str(size) + ") -and "
        "((Get-FileHash -LiteralPath {0} -Algorithm SHA256).Hash -eq '" + digest + "'))"
    )
    return (
        "$ErrorActionPreference = 'SilentlyContinue'\n"
        f"Wait-Process -Id {pid} -Timeout 180\n"
        f"Wait-Process -Name {quoted(target.stem)} -Timeout 60\n"
        f"$source = {quoted(source)}\n"
        f"$target = {quoted(target)}\n"
        "$installed = $false\n"
        "for ($i = 0; $i -lt 240; $i++) {\n"
        "  Copy-Item -LiteralPath $source -Destination ($target + '.new') -Force\n"
        "  if (" + check.format("($target + '.new')") + ") {\n"
        "    Move-Item -LiteralPath ($target + '.new') -Destination $target -Force\n"
        "    if (" + check.format("$target") + ") { $installed = $true; break }\n"
        "  }\n"
        "  Start-Sleep -Milliseconds 500\n"
        "}\n"
        "if ($installed) {\n"
        "  Start-Sleep -Seconds 2\n"
        "  Start-Process -FilePath $target -WorkingDirectory (Split-Path -LiteralPath $target)\n"
        "  Remove-Item -LiteralPath $source -Force\n"
        "}\n"
    )


def schedule_install(source: Path, target: Optional[Path] = None) -> Dict[str, Any]:
    if not getattr(sys, "frozen", False) or os.name != "nt":
        raise UpdateError("Updates can only be installed from the packaged Windows app.")
    dest = Path(target or sys.executable)
    if dest.suffix.lower() != ".exe" or not dest.exists():
        raise UpdateError("Could not find the running app file to replace.")
    if not source.exists():
        raise UpdateError("The downloaded update is missing.")
    UPDATE_DIR.mkdir(parents=True, exist_ok=True)
    hasher = hashlib.sha256()
    with source.open("rb") as handle:
        for block in iter(lambda: handle.read(CHUNK), b""):
            hasher.update(block)
    script_path = UPDATE_DIR / "apply-update.ps1"
    script_path.write_text(
        _script(
            source,
            dest,
            os.getpid(),
            source.stat().st_size,
            hasher.hexdigest().upper(),
        ),
        encoding="utf-8",
    )
    clean_env = {
        key: value
        for key, value in os.environ.items()
        if not key.upper().startswith("_PYI_") and key.upper() != "_MEIPASS2"
    }
    subprocess.Popen(
        [
            "powershell.exe",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-WindowStyle",
            "Hidden",
            "-File",
            str(script_path),
        ],
        creationflags=CREATE_NO_WINDOW,
        close_fds=True,
        env=clean_env,
    )
    return {"scheduled": True, "size": source.stat().st_size}
