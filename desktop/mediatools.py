"""Optional external media tools: mpv for playback and ffmpeg for previews.

Both archives are large, so they are downloaded on demand into the app data
folder, checked against a pinned SHA-256 and unpacked with the bundled 7-Zip.
Nothing is fetched without an explicit install request from the UI.
"""

from __future__ import annotations

import hashlib
import logging
import os
import shutil
import subprocess
import threading
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional

from . import appconfig
from .splitmerge import seven_zip

log = logging.getLogger("tfe.mediatools")

TOOLS_DIR = appconfig.HOME / "tools"
USER_AGENT = "TelegramFileExplorer/1.0 (+local media tools)"

TOOLS: Dict[str, Dict[str, Any]] = {
    "mpv": {
        "label": "mpv player",
        "exe": "mpv.exe",
        "size": 34025957,
        "note": "External player for MKV, HEVC and other formats the built-in player can't decode",
        "url": (
            "https://github.com/shinchiro/mpv-winbuild-cmake/releases/download/"
            "20261021/mpv-x86_64-20261021-git-e471496c56.7z"
        ),
        "sha256": "4a355f3e89c83fabc730d33fb4e759dfec747806ed2287b61a90d1681b83e8d3",
    },
    "ffmpeg": {
        "label": "ffmpeg previews",
        "exe": "ffmpeg.exe",
        "size": 27422861,
        "note": "Builds seek preview thumbnails for videos",
        "url": (
            "https://github.com/shinchiro/mpv-winbuild-cmake/releases/download/"
            "20261021/ffmpeg-x86_64-git-9a861e968.7z"
        ),
        "sha256": "fc9c135b799b410ffc78517f428904c299bc64cd8144f21f63f84fcd8c35ea19",
    },
}

_lock = threading.Lock()
_jobs: Dict[str, threading.Thread] = {}
_states: Dict[str, Dict[str, Any]] = {}
_found: Dict[str, Optional[Path]] = {}

_NO_WINDOW = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0


def _find_exe(name: str, base: Path) -> Optional[Path]:
    exe = TOOLS[name]["exe"]
    direct = base / exe
    if direct.is_file():
        return direct
    try:
        for path in base.rglob(exe):
            if path.is_file():
                return path
    except OSError:
        pass
    return None


def tool_path(name: str) -> Optional[Path]:
    name = (name or "").lower()
    spec = TOOLS.get(name)
    if spec is None:
        return None
    if name in _found:
        return _found[name]
    exe = spec["exe"]
    found = _find_exe(name, TOOLS_DIR / name)
    if found is None:
        bundled = Path(__file__).resolve().parent / "bin" / name
        found = _find_exe(name, bundled)
    if found is None:
        which = shutil.which(exe)
        found = Path(which) if which else None
    _found[name] = found
    return found


def _set(name: str, state: str, progress: float = 0.0, error: str = "") -> None:
    _states[name] = {"state": state, "progress": round(progress, 3), "error": error}


def status() -> Dict[str, Any]:
    result: Dict[str, Any] = {}
    for name, spec in TOOLS.items():
        state = _states.get(name) or {}
        job = _jobs.get(name)
        running = bool(job and job.is_alive())
        result[name] = {
            "name": name,
            "label": spec["label"],
            "note": spec["note"],
            "size": spec["size"],
            "installed": tool_path(name) is not None,
            "state": state.get("state") or ("installed" if tool_path(name) else "idle"),
            "progress": state.get("progress") or 0.0,
            "error": state.get("error") or "",
            "busy": running,
        }
    return result


def _download(url: str, target: Path, expected: str, name: str) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    digest = hashlib.sha256()
    done = 0
    with urllib.request.urlopen(request, timeout=60) as response, open(target, "wb") as out:
        total = int(response.headers.get("Content-Length") or 0)
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
            digest.update(chunk)
            done += len(chunk)
            _set(name, "downloading", done / total if total else 0.0)
    if digest.hexdigest() != expected:
        target.unlink(missing_ok=True)
        raise RuntimeError("The download did not match its checksum. Try again later.")


def _install(name: str, spec: Dict[str, Any]) -> None:
    destination = TOOLS_DIR / name
    archive = TOOLS_DIR / f"{name}.7z.download"
    try:
        _download(spec["url"], archive, spec["sha256"], name)
        _set(name, "extracting", 1.0)
        if destination.exists():
            shutil.rmtree(destination, ignore_errors=True)
        destination.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            [str(seven_zip()), "x", "-y", f"-o{destination}", str(archive)],
            check=True,
            capture_output=True,
            timeout=600,
            creationflags=_NO_WINDOW,
        )
        archive.unlink(missing_ok=True)
        _found.pop(name, None)
        if _find_exe(name, destination) is None:
            raise RuntimeError("The archive did not contain " + spec["exe"])
        _set(name, "installed", 1.0)
        log.info("Installed %s into %s", name, destination)
    except Exception as exc:
        log.exception("Installing %s failed", name)
        try:
            archive.unlink(missing_ok=True)
        except OSError:
            pass
        _found.pop(name, None)
        _set(name, "error", 0.0, str(exc) or "Download failed")


def install(name: str) -> Dict[str, Any]:
    name = (name or "").lower()
    spec = TOOLS.get(name)
    if spec is None:
        raise KeyError(name)
    if tool_path(name) is not None:
        return status()[name]
    with _lock:
        job = _jobs.get(name)
        if job is not None and job.is_alive():
            return status()[name]
        TOOLS_DIR.mkdir(parents=True, exist_ok=True)
        _set(name, "downloading", 0.0)
        job = threading.Thread(
            target=_install, args=(name, spec), name=f"tfe-tool-{name}", daemon=True
        )
        _jobs[name] = job
        job.start()
    return status()[name]


def mpv_command(url: str, title: str, position: float, cookie: str) -> List[str]:
    exe = tool_path("mpv")
    if exe is None:
        raise RuntimeError("mpv is not installed yet.")
    command = [
        str(exe),
        "--force-window=yes",
        "--no-terminal",
        "--hwdec=auto-safe",
        f"--title={title or 'Telegram File Explorer'}",
        f"--http-header-fields=Cookie: tfe_session={cookie}",
        f"--user-agent={USER_AGENT}",
    ]
    if position and position > 3:
        command.append(f"--start={position:.1f}")
    command.append(url)
    return command


def launch_mpv(url: str, title: str, position: float, cookie: str) -> None:
    command = mpv_command(url, title, position, cookie)
    flags = 0
    if os.name == "nt":
        flags = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
    subprocess.Popen(
        command,
        close_fds=True,
        creationflags=flags,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
