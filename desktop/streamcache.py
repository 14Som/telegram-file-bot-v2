"""Disk cache for media streams.

Telegram has no public file URL, so every player seek goes back through the
local server. Caching fixed-size blocks on disk makes replays, scrubbing and
seeking instant after the first read, and keeps Telegram requests down.
"""

from __future__ import annotations

import asyncio
import os
import time
from pathlib import Path
from typing import Any, AsyncIterator, Dict

from . import appconfig

BLOCK = 2 * 1024 * 1024
PREFETCH = 2
MAX_BYTES = 2 * 1024 ** 3

DIR = appconfig.HOME / "cache" / "stream"

_locks: Dict[str, asyncio.Lock] = {}
_fills = 0
_prune_task: "asyncio.Task[None] | None" = None


def _dir_for(key: str) -> Path:
    safe = "".join(ch for ch in key if ch.isalnum() or ch in "-_")
    return DIR / safe


def _path(key: str, index: int) -> Path:
    return _dir_for(key) / f"{index:06d}.blk"


def _block_len(index: int, size: int | None) -> int:
    """Bytes a block holds; the final block of a file can be short."""
    if size is None:
        return BLOCK
    return max(0, min(BLOCK, size - index * BLOCK))


async def _fill_run(
    service: Any, message: Any, key: str, first: int, last: int, size: int | None = None
) -> None:
    """Download whole blocks first..last (inclusive) into the cache."""
    start = first * BLOCK
    length = (last - first + 1) * BLOCK
    if size is not None:
        length = max(0, min(length, size - start))
    if length <= 0:
        return
    buffer = bytearray()
    directory = _dir_for(key)
    directory.mkdir(parents=True, exist_ok=True)
    index = first
    async for chunk in service.stream_chunks(message, start, length):
        buffer.extend(chunk)
        while index <= last:
            need = _block_len(index, size)
            if len(buffer) < need:
                break
            _write(directory, index, bytes(buffer[:need]))
            del buffer[:need]
            index += 1
    # Only a complete block (or the exact tail of the file) may be cached,
    # otherwise a short read would poison every later request for this block.
    if buffer and index <= last and len(buffer) == _block_len(index, size):
        _write(directory, index, bytes(buffer))


def _write(directory: Path, index: int, data: bytes) -> None:
    target = directory / f"{index:06d}.blk"
    temp = target.with_suffix(".part")
    try:
        temp.write_bytes(data)
        os.replace(temp, target)
    except OSError:
        try:
            temp.unlink()
        except OSError:
            pass


def _touch(path: Path) -> None:
    try:
        os.utime(path, None)
    except OSError:
        pass


async def _ensure(
    service: Any, message: Any, key: str, first: int, last: int, size: int | None
) -> None:
    """Make blocks first..last exist on disk, downloading the missing run."""
    index = first
    while index <= last:
        if _path(key, index).exists():
            index += 1
            continue
        run_last = index
        while run_last < last and not _path(key, run_last + 1).exists():
            run_last += 1
        lock = _locks.setdefault(key, asyncio.Lock())
        async with lock:
            # Another reader may have filled part of the run meanwhile.
            while run_last >= index and _path(key, run_last).exists():
                run_last -= 1
            if run_last >= index:
                try:
                    await _fill_run(service, message, key, index, run_last, size)
                except Exception as exc:
                    raise OSError("stream cache could not fetch blocks") from exc
            if not _path(key, index).exists():
                raise OSError("stream cache could not fetch a block")
        index = run_last + 1


def _prune_sync() -> None:
    if not DIR.exists():
        return
    total = 0
    entries = []
    for file in DIR.rglob("*.blk"):
        try:
            stat = file.stat()
        except OSError:
            continue
        total += stat.st_size
        entries.append((stat.st_mtime, stat.st_size, file))
    if total <= MAX_BYTES:
        return
    entries.sort()
    for _, size, file in entries:
        if total <= MAX_BYTES:
            break
        try:
            file.unlink()
            total -= size
        except OSError:
            continue
    for folder in DIR.iterdir():
        try:
            if folder.is_dir() and not any(folder.iterdir()):
                folder.rmdir()
        except OSError:
            pass


async def _maybe_prune() -> None:
    global _prune_task
    if _prune_task is not None and not _prune_task.done():
        return
    if not DIR.exists():
        return
    _prune_task = asyncio.create_task(asyncio.to_thread(_prune_sync))


async def read(
    service: Any,
    message: Any,
    key: str,
    start: int,
    length: int,
    size: int | None = None,
) -> AsyncIterator[bytes]:
    """Yield length bytes from start, filling missing blocks from Telegram."""
    global _fills
    if length <= 0:
        return
    end = start + length - 1
    first = start // BLOCK
    last = end // BLOCK
    for index in range(first, last + 1):
        # The first block is fetched alone so playback starts quickly, then
        # pairs are fetched ahead so a sequential read costs half the calls.
        lookahead = 1 if index == first else PREFETCH
        await _ensure(service, message, key, index, min(last, index + lookahead - 1), size)
        path = _path(key, index)
        _touch(path)
        offset = max(0, start - index * BLOCK)
        remaining = min(BLOCK - offset, start + length - (index * BLOCK + offset))
        if remaining <= 0:
            continue
        try:
            with open(path, "rb") as handle:
                handle.seek(offset)
                while remaining > 0:
                    data = handle.read(min(262144, remaining))
                    if not data:
                        break
                    remaining -= len(data)
                    yield data
        except OSError:
            raise OSError("stream cache block unreadable")
    _fills += 1
    if _fills % 256 == 0:
        await _maybe_prune()


def stats() -> Dict[str, Any]:
    total = 0
    count = 0
    if DIR.exists():
        for file in DIR.rglob("*.blk"):
            try:
                total += file.stat().st_size
                count += 1
            except OSError:
                continue
    return {"blocks": count, "bytes": total, "limit": MAX_BYTES}
