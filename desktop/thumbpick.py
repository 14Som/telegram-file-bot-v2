"""Thumbnail picker: grab a few frames with ffmpeg and keep the chosen one.

Frame placement follows thumbup.py (MIT, bl4ck5un/thumbup.py): a fixed number
of snapshots spaced evenly across the runtime, taken in parallel and kept as
separate images. The picker UI (Thumby-style: show frames, tap one) sends the
winning index back here; that frame becomes the item's thumbnail.

Candidates live in the cache folder so vault backups only carry the chosen
frame, which is stored next to the regular thumbnails as ``<id>.custom.jpg``.
"""

from __future__ import annotations

import json
import logging
import os
import random
import shutil
import subprocess
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from . import appconfig, mediatools, storyboard

log = logging.getLogger("tfe.thumbpick")

COUNT = 5
SIZE = 640
MAX_BUILD_SECONDS = 5 * 60
RETRY_AFTER = 10 * 60
CAND_DIR = appconfig.CACHE_DIR / "thumbpicks"

_NO_WINDOW = subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
_lock = threading.Lock()
_jobs: Dict[str, threading.Thread] = {}
_errors: Dict[str, Tuple[str, float]] = {}


def _key(item: Dict[str, Any]) -> str:
    safe = f"{item.get('chat_id')}-{item['message_id']}-{item.get('size') or 0}"
    return "".join(ch for ch in safe if ch.isalnum() or ch in "-_")


def candidate_dir(item: Dict[str, Any]) -> Path:
    return CAND_DIR / _key(item)


def custom_path(item_id: int) -> Path:
    return appconfig.THUMB_DIR / f"{item_id}.custom.jpg"


def frame_path(item: Dict[str, Any], index: int) -> Path:
    return candidate_dir(item) / f"frame-{index}.jpg"


def _headers(cookie: str) -> str:
    return f"Cookie: tfe_session={cookie}\r\n"


def _times(duration: float) -> List[float]:
    return [min(duration - 0.3, duration * (index + 0.5) / COUNT) for index in range(COUNT)]


def _random_times(duration: float, previous: Optional[List[float]] = None) -> List[float]:
    """Shuffle: one random point inside each fifth of the runtime.

    A random point per slice keeps the new set spread across the video instead
    of clustering, and each point is re-rolled a few times to stay clear of the
    frames the user just rejected.
    """
    margin = min(0.5, max(0.1, duration * 0.005))
    low, high = margin, max(margin, duration - margin)
    span = max(0.0, high - low)
    old = previous or []
    gap = min(1.0, max(0.3, duration * 0.05))
    times: List[float] = []
    for index in range(COUNT):
        start = low + span * index / COUNT
        end = low + span * (index + 1) / COUNT
        pick = (start + end) / 2
        for _ in range(20):
            pick = random.uniform(start, end)
            if not old or min(abs(pick - value) for value in old) >= gap:
                break
        times.append(pick)
    return times


def _grab(
    ffmpeg: Path, url: str, cookie: str, index: int, second: float, work: Path
) -> Optional[Path]:
    target = work / f"frame-{index + 1}.jpg"
    try:
        result = subprocess.run(
            [
                str(ffmpeg),
                "-hide_banner", "-loglevel", "error",
                "-headers", _headers(cookie),
                "-ss", f"{second:.3f}",
                "-i", url,
                "-frames:v", "1",
                "-vf", f"scale={SIZE}:{SIZE}:force_original_aspect_ratio=decrease",
                "-q:v", "2",
                "-y", str(target),
            ],
            capture_output=True,
            timeout=120,
            creationflags=_NO_WINDOW,
        )
        if result.returncode == 0 and target.is_file() and target.stat().st_size > 0:
            return target
        target.unlink(missing_ok=True)
        return None
    except (OSError, subprocess.SubprocessError):
        return None


def _build(
    item: Dict[str, Any],
    key: str,
    url: str,
    cookie: str,
    randomize: bool = False,
    previous: Optional[List[float]] = None,
) -> None:
    work = CAND_DIR / f"{key}.work"
    target_dir = CAND_DIR / key
    ffmpeg = mediatools.tool_path("ffmpeg")
    if ffmpeg is None:
        raise RuntimeError("ffmpeg is not installed.")
    if work.exists():
        shutil.rmtree(work, ignore_errors=True)
    work.mkdir(parents=True, exist_ok=True)
    try:
        duration = float(item.get("duration") or 0)
        if duration <= 0:
            duration = storyboard.probe_duration(ffmpeg, url, cookie)
        if duration <= 0:
            raise RuntimeError("Could not read the video length.")
        times = _random_times(duration, previous) if randomize else _times(duration)
        frames: List[Optional[Path]] = [None] * COUNT
        deadline = time.time() + MAX_BUILD_SECONDS
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = {
                pool.submit(_grab, ffmpeg, url, cookie, index, second, work): index
                for index, second in enumerate(times)
            }
            for future, index in futures.items():
                if time.time() > deadline:
                    raise RuntimeError("Building thumbnails took too long.")
                try:
                    frames[index] = future.result()
                except Exception:
                    frames[index] = None
        if all(path is None for path in frames):
            raise RuntimeError("Telegram did not return any frames.")
        for index, path in enumerate(frames):
            if path is not None:
                continue
            fallback = next(
                (frames[j] for j in range(index - 1, -1, -1) if frames[j]),
                next((frames[j] for j in range(index + 1, COUNT) if frames[j]), None),
            )
            target = work / f"frame-{index + 1}.jpg"
            shutil.copyfile(fallback, target)
            frames[index] = target
        payload = {
            "state": "ready",
            "item_id": item.get("id"),
            "count": COUNT,
            "times": [round(value, 2) for value in times],
            "duration": round(duration, 2),
            "version": int(time.time()),
        }
        (work / "meta.json").write_text(json.dumps(payload), encoding="utf-8")
        CAND_DIR.mkdir(parents=True, exist_ok=True)
        if target_dir.exists():
            shutil.rmtree(target_dir, ignore_errors=True)
        work.rename(target_dir)
        with _lock:
            _errors.pop(key, None)
        log.info("Thumbnail candidates ready for item %s", item.get("id"))
    finally:
        if work.exists():
            shutil.rmtree(work, ignore_errors=True)


def _read_meta(key: str) -> Optional[Dict[str, Any]]:
    folder = CAND_DIR / key
    meta = folder / "meta.json"
    if not meta.is_file():
        return None
    try:
        data = json.loads(meta.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if not isinstance(data, dict) or data.get("state") != "ready":
        return None
    if any(not (folder / f"frame-{index + 1}.jpg").is_file() for index in range(COUNT)):
        return None
    return data


def describe(
    item: Dict[str, Any], url: str, cookie: str, shuffle: bool = False
) -> Dict[str, Any]:
    """Report or start candidate generation for one item; never blocks for long.

    ``shuffle`` throws the current set away and rebuilds it from random points,
    keeping the frame times it replaces so the new set does not repeat them.
    """
    kind = (item.get("kind") or "").lower()
    if kind != "video":
        return {"state": "unavailable", "reason": "Thumbnails can only be picked for videos."}
    key = _key(item)
    previous: List[float] = []
    if shuffle:
        previous = list((_read_meta(key) or {}).get("times") or [])
        reset(item)
        meta = None
    else:
        meta = _read_meta(key)
    if meta is not None:
        meta["custom"] = custom_path(int(item["id"])).is_file()
        return meta
    if mediatools.tool_path("ffmpeg") is None:
        return {
            "state": "missing-tool",
            "tool": "ffmpeg",
            "reason": "Choosing a thumbnail needs ffmpeg, which is not installed yet.",
        }
    with _lock:
        error, stamp = _errors.get(key, (0.0, ""))
        job = _jobs.get(key)
        running = job is not None and job.is_alive()
        if not running and not (error and time.time() - stamp < RETRY_AFTER):
            error = ""
            job = threading.Thread(
                target=_run,
                args=(item, key, url, cookie, shuffle, previous),
                name="tfe-thumbpick",
                daemon=True,
            )
            _jobs[key] = job
            job.start()
    if error:
        return {"state": "error", "reason": error}
    return {"state": "pending"}


def _run(
    item: Dict[str, Any],
    key: str,
    url: str,
    cookie: str,
    randomize: bool = False,
    previous: Optional[List[float]] = None,
) -> None:
    try:
        _build(item, key, url, cookie, randomize, previous)
    except Exception as exc:
        log.warning("Thumbnail candidates for item %s failed: %s", item.get("id"), exc)
        with _lock:
            _errors[key] = (str(exc) or "Could not build thumbnails.", time.time())


def reset(item: Dict[str, Any]) -> None:
    """Drop generated candidates and past errors so the picker can try again."""
    key = _key(item)
    with _lock:
        _errors.pop(key, None)
        _jobs.pop(key, None)
    shutil.rmtree(CAND_DIR / key, ignore_errors=True)


def select(item: Dict[str, Any], index: int) -> Path:
    """Copy a generated frame into place as the item's thumbnail."""
    if index < 1 or index > COUNT:
        raise ValueError("Choose one of the generated frames.")
    source = frame_path(item, index)
    if not source.is_file():
        raise FileNotFoundError("Generate the frames first.")
    target = custom_path(int(item["id"]))
    appconfig.THUMB_DIR.mkdir(parents=True, exist_ok=True)
    temp = target.with_suffix(".tmp")
    shutil.copyfile(source, temp)
    os.replace(temp, target)
    return target
