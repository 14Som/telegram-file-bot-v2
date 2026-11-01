"""Seek-preview storyboards: a tiled sprite sheet made with ffmpeg.

One small JPEG holds 30 frames spread across the video; the player shows the
right tile while the user scrubs. Frames are grabbed with a fast keyframe seek
per tile, so building a sheet reads far less from Telegram than a full scan.
"""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import subprocess
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from . import appconfig, mediatools

log = logging.getLogger("tfe.storyboard")

SPRITE_DIR = appconfig.THUMB_DIR / "storyboards"
COLUMNS = 5
ROWS = 6
COUNT = COLUMNS * ROWS
WIDTH = 160
HEIGHT = 90
MAX_BUILD_SECONDS = 15 * 60

_NO_WINDOW = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
DURATION = re.compile(r"Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)")
RETRY_AFTER = 10 * 60
_lock = threading.Lock()
_jobs: Dict[str, threading.Thread] = {}
_errors: Dict[str, Tuple[str, float]] = {}


def _key(item: Dict[str, Any]) -> str:
    safe = f"{item.get('chat_id')}-{item['message_id']}-{item.get('size') or 0}"
    return "".join(ch for ch in safe if ch.isalnum() or ch in "-_")


def _paths(key: str) -> Tuple[Path, Path]:
    return SPRITE_DIR / f"{key}.jpg", SPRITE_DIR / f"{key}.json"


def sprite_path(item: Dict[str, Any]) -> Path:
    return _paths(_key(item))[0]


def _read_meta(key: str) -> Optional[Dict[str, Any]]:
    sprite, meta = _paths(key)
    if not sprite.is_file() or not meta.is_file():
        return None
    try:
        data = json.loads(meta.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if not isinstance(data, dict) or data.get("state") != "ready":
        return None
    data["url"] = f"/api/storyboard/{data.get('item_id')}/sprite.jpg?v={int(data.get('version') or 0)}"
    return data


def _runs(seconds: float) -> float:
    return time.time() + seconds


def _headers(cookie: str) -> str:
    return f"Cookie: tfe_session={cookie}\r\n"


def probe_duration(ffmpeg: Path, url: str, cookie: str) -> float:
    """Read the length from ffmpeg's own input probe (this build has no ffprobe)."""
    try:
        result = subprocess.run(
            [str(ffmpeg), "-hide_banner", "-headers", _headers(cookie), "-i", url],
            capture_output=True,
            text=True,
            timeout=60,
            creationflags=_NO_WINDOW,
        )
        match = DURATION.search(result.stderr or "")
        if not match:
            return 0.0
        hours, minutes, seconds = match.groups()
        return int(hours) * 3600 + int(minutes) * 60 + float(seconds)
    except (OSError, ValueError, subprocess.SubprocessError):
        return 0.0


def _grab_frame(ffmpeg: Path, url: str, cookie: str, second: float, target: Path) -> bool:
    try:
        result = subprocess.run(
            [
                str(ffmpeg),
                "-hide_banner", "-loglevel", "error",
                "-headers", _headers(cookie),
                "-ss", f"{second:.3f}",
                "-i", url,
                "-frames:v", "1",
                "-vf", (
                    f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=decrease,"
                    f"pad={WIDTH}:{HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black"
                ),
                "-q:v", "3",
                "-y", str(target),
            ],
            capture_output=True,
            timeout=120,
            creationflags=_NO_WINDOW,
        )
        return result.returncode == 0 and target.is_file() and target.stat().st_size > 0
    except (OSError, subprocess.SubprocessError):
        return False


def _blank_frame(ffmpeg: Path, target: Path) -> bool:
    try:
        result = subprocess.run(
            [
                str(ffmpeg),
                "-hide_banner", "-loglevel", "error",
                "-f", "lavfi", "-i", f"color=c=black:s={WIDTH}x{HEIGHT}:d=1",
                "-frames:v", "1", "-q:v", "5", "-y", str(target),
            ],
            capture_output=True,
            timeout=60,
            creationflags=_NO_WINDOW,
        )
        return result.returncode == 0 and target.is_file()
    except (OSError, subprocess.SubprocessError):
        return False


def _tile(
    ffmpeg: Path, url: str, cookie: str, index: int, second: float, work: Path
) -> Optional[Path]:
    target = work / f"tile-{index + 1:02d}.jpg"
    if _grab_frame(ffmpeg, url, cookie, second, target):
        return target
    if _grab_frame(ffmpeg, url, cookie, max(0.0, second - 1.0), target):
        return target
    return None


def _build(item: Dict[str, Any], key: str, url: str, cookie: str) -> None:
    work = SPRITE_DIR / f"{key}.work"
    sprite, meta = _paths(key)
    ffmpeg = mediatools.tool_path("ffmpeg")
    if ffmpeg is None:
        raise RuntimeError("ffmpeg is not installed.")
    deadline = _runs(MAX_BUILD_SECONDS)
    if work.exists():
        shutil.rmtree(work, ignore_errors=True)
    work.mkdir(parents=True, exist_ok=True)
    try:
        duration = float(item.get("duration") or 0)
        if duration <= 0:
            duration = probe_duration(ffmpeg, url, cookie)
        if duration <= 0:
            raise RuntimeError("Could not read the video length.")
        interval = duration / COUNT
        seconds = [min(duration - 0.2, interval * (i + 0.5)) for i in range(COUNT)]
        frames: List[Optional[Path]] = [None] * COUNT
        with ThreadPoolExecutor(max_workers=3) as pool:
            futures = {
                pool.submit(_tile, ffmpeg, url, cookie, i, t, work): i
                for i, t in enumerate(seconds)
            }
            for future, index in futures.items():
                if time.time() > deadline:
                    raise RuntimeError("Building previews took too long.")
                try:
                    frames[index] = future.result()
                except Exception:
                    frames[index] = None
        missing = [i for i, path in enumerate(frames) if path is None]
        for index in missing:
            previous = next((frames[j] for j in range(index - 1, -1, -1) if frames[j]), None)
            target = work / f"tile-{index + 1:02d}.jpg"
            if previous is not None and Path(previous).is_file():
                shutil.copyfile(previous, target)
                frames[index] = target
        if all(path is None for path in frames):
            raise RuntimeError("Telegram did not return any preview frames.")
        first = next(Path(path) for path in frames if path is not None)
        for index, path in enumerate(frames):
            if path is None:
                target = work / f"tile-{index + 1:02d}.jpg"
                shutil.copyfile(first, target)
        result = subprocess.run(
            [
                str(ffmpeg),
                "-hide_banner", "-loglevel", "error",
                "-framerate", "1",
                "-start_number", "1",
                "-i", str(work / "tile-%02d.jpg"),
                "-vf", f"tile={COLUMNS}x{ROWS}:padding=0",
                "-frames:v", "1",
                "-q:v", "3",
                "-y", str(work / "sprite.jpg"),
            ],
            capture_output=True,
            timeout=120,
            creationflags=_NO_WINDOW,
        )
        if result.returncode != 0 or not (work / "sprite.jpg").is_file():
            raise RuntimeError("Could not build the preview sheet.")
        SPRITE_DIR.mkdir(parents=True, exist_ok=True)
        os.replace(work / "sprite.jpg", sprite)
        payload = {
            "state": "ready",
            "item_id": item.get("id"),
            "width": WIDTH,
            "height": HEIGHT,
            "columns": COLUMNS,
            "rows": ROWS,
            "count": COUNT,
            "interval": round(interval, 3),
            "duration": round(duration, 2),
            "version": int(time.time()),
        }
        temp = meta.with_suffix(".part")
        temp.write_text(json.dumps(payload), encoding="utf-8")
        os.replace(temp, meta)
        with _lock:
            _errors.pop(key, None)
        log.info("Storyboard ready for item %s (%s frames)", item.get("id"), COUNT)
    finally:
        shutil.rmtree(work, ignore_errors=True)


def describe(item: Dict[str, Any], url: str, cookie: str) -> Dict[str, Any]:
    """Report or start the storyboard for one item; never blocks for long."""
    kind = (item.get("kind") or "").lower()
    mime = (item.get("mime") or "").lower()
    if kind != "video" and not mime.startswith("video/"):
        return {"state": "unavailable", "reason": "Preview frames only exist for videos."}
    key = _key(item)
    version = int(item.get("thumb_version") or 0)
    meta = _read_meta(key)
    if meta is not None and meta.get("version", 0) >= version:
        return meta
    if mediatools.tool_path("ffmpeg") is None:
        return {
            "state": "missing-tool",
            "tool": "ffmpeg",
            "reason": "Seek previews need ffmpeg, which is not installed yet.",
        }
    with _lock:
        error, stamp = _errors.get(key, (0.0, ""))
        job = _jobs.get(key)
        running = job is not None and job.is_alive()
        if not running and not (error and time.time() - stamp < RETRY_AFTER):
            error = ""
            job = threading.Thread(
                target=_run, args=(item, key, url, cookie), name="tfe-storyboard", daemon=True
            )
            _jobs[key] = job
            job.start()
    if error:
        return {"state": "error", "reason": error}
    return {"state": "pending"}


def _run(item: Dict[str, Any], key: str, url: str, cookie: str) -> None:
    try:
        _build(item, key, url, cookie)
    except Exception as exc:
        log.warning("Storyboard for item %s failed: %s", item.get("id"), exc)
        with _lock:
            _errors[key] = (str(exc) or "Preview build failed.", time.time())
