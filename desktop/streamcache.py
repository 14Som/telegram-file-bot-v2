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
# Streams, PDFs and book pages all land here; a large disk budget means a
# second open of the same file comes from the phone instead of Telegram.
MAX_BYTES = 24 * 1024 ** 3

# A player only drains its socket while it has picture to show, so the serve
# loop spends most of a slow link idle. The builder keeps pulling blocks past
# the current window on its own task, which is what gives playback its runway.
PREFETCH_AHEAD = 768 * 1024 * 1024
PREFETCH_RUN = 32  # blocks per pass, so seeks are picked up within ~64 MiB
PRUNE_INTERVAL = 120.0

DIR = appconfig.HOME / "cache" / "stream"

_locks: Dict[str, asyncio.Lock] = {}
_builders: Dict[str, Dict[str, Any]] = {}
_active_key: "str | None" = None
_fills = 0
_prune_task: "asyncio.Task[None] | None" = None
_last_prune = 0.0


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


async def _stream_run(
    service: Any,
    message: Any,
    key: str,
    first: int,
    last: int,
    size: int | None,
    start: int,
    end: int,
) -> AsyncIterator[bytes]:
    """Stream blocks first..last (inclusive), handing bytes on as they arrive.

    Players starve when a read only ends after a whole 2 MiB block has been
    downloaded: on a slow phone link that is several seconds of silence between
    bursts. Every chunk is passed through immediately instead, while complete
    blocks are still written to disk for later seeks and replays.
    """
    base = first * BLOCK
    directory = _dir_for(key)
    directory.mkdir(parents=True, exist_ok=True)
    if size is None:
        run_end = (last + 1) * BLOCK
    else:
        run_end = min((last + 1) * BLOCK, size)
    # Pull from the requested byte, not the block boundary. Waiting for a whole
    # block's worth of lead-in is what starved players on slow links.
    initial = max(start, base)
    length = run_end - initial
    if length <= 0:
        return
    buffer = bytearray()
    buffer_start = initial
    index = first + 1 if initial > base else first
    position = initial
    try:
        async for chunk in service.stream_chunks(message, initial, length):
            chunk_start = position
            position += len(chunk)
            buffer.extend(chunk)
            while index <= last:
                need = _block_len(index, size)
                offset = index * BLOCK - buffer_start
                if offset + need > len(buffer):
                    break
                _write(directory, index, bytes(buffer[offset : offset + need]))
                index += 1
            trim = min(index * BLOCK - buffer_start, len(buffer)) if index <= last else len(buffer)
            if trim > 0:
                del buffer[:trim]
                buffer_start += trim
            low = max(start, chunk_start)
            high = min(end, position)
            if low < high:
                yield chunk[low - chunk_start : high - chunk_start]
            if position >= end:
                return
        # Only a complete block (or the exact tail of the file) may be cached,
        # otherwise a short read would poison every later request for this block.
        if buffer and index <= last and len(buffer) == _block_len(index, size):
            _write(directory, index, bytes(buffer))
    except asyncio.CancelledError:
        raise
    except OSError:
        raise
    except Exception as exc:
        raise OSError("stream cache could not fetch blocks") from exc


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
    global _prune_task, _last_prune
    if _prune_task is not None and not _prune_task.done():
        return
    if not DIR.exists():
        return
    now = time.time()
    if now - _last_prune < PRUNE_INTERVAL:
        return
    _last_prune = now
    _prune_task = asyncio.create_task(asyncio.to_thread(_prune_sync))


def warm(
    service: Any,
    message: Any,
    key: str,
    start: int,
    length: int,
    size: int | None = None,
) -> None:
    """Keep filling blocks onto disk past the window just served.

    Called for every real playback range request: the block builder runs on
    its own task, so the download continues while the player is still chewing
    through the bytes it has. A seek moves the anchor and the builder
    re-targets. Only one item may build at a time; a new playback target stops
    the previous builder so browsing cannot fan out into a Telegram flood.
    """
    global _active_key
    if not size or size <= 0:
        return
    end = min(start + length, size)
    state = _builders.get(key)
    if state is None:
        state = {"end": end, "size": size, "task": None}
        _builders[key] = state
    else:
        state["end"] = end
        state["size"] = size
    if _active_key != key:
        previous = _builders.get(_active_key or "")
        task = previous.get("task") if previous else None
        if task is not None and not task.done():
            task.cancel()
        _active_key = key
    task = state.get("task")
    if task is None or task.done():
        state["task"] = asyncio.create_task(_build(service, message, key))


async def _build(service: Any, message: Any, key: str) -> None:
    state = _builders.get(key)
    try:
        while state is not None and _builders.get(key) is state:
            anchor = state["end"]
            size = state["size"]
            if anchor >= size:
                return
            index = anchor // BLOCK
            last = (min(size, anchor + PREFETCH_AHEAD) - 1) // BLOCK
            while index <= last and _path(key, index).exists():
                index += 1
            if index > last:
                return
            pass_last = min(last, index + PREFETCH_RUN - 1)
            run_end = min(size, (pass_last + 1) * BLOCK)
            async for _chunk in _stream_run(
                service, message, key, index, pass_last, size,
                index * BLOCK, run_end,
            ):
                if _builders.get(key) is not state:
                    return
                # The player jumped somewhere else; drop this pass quickly.
                if abs(state["end"] - anchor) > 2 * BLOCK:
                    break
            await _maybe_prune()
            await asyncio.sleep(0)
    except asyncio.CancelledError:
        raise
    except Exception:
        # The next range request starts a fresh builder.
        return
    finally:
        if state is not None and state.get("task") is asyncio.current_task():
            state["task"] = None


async def shutdown() -> None:
    """Stop every builder and keep the complete blocks on disk.

    Blocks are written atomically, so whatever was finished can serve the next
    launch; only partial files are dropped. The size cap prunes the oldest
    blocks on its own.
    """
    global _active_key
    _active_key = None
    tasks = []
    for state in _builders.values():
        task = state.get("task")
        if task is not None and not task.done():
            task.cancel()
            tasks.append(task)
    _builders.clear()
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)
    await asyncio.to_thread(_drop_partials)


def _drop_partials() -> None:
    if not DIR.exists():
        return
    for path in DIR.rglob("*.part"):
        try:
            path.unlink()
        except OSError:
            pass


async def purge() -> None:
    """Drop half-written blocks left behind by a previous run.

    Android can kill the app from the recents screen before the lifespan
    shutdown runs, which can leave *.part files behind. Complete blocks are
    kept so the next launch starts with a warm cache.
    """
    global _active_key
    _active_key = None
    _builders.clear()
    await asyncio.to_thread(_drop_partials)


async def read(
    service: Any,
    message: Any,
    key: str,
    start: int,
    length: int,
    size: int | None = None,
) -> AsyncIterator[bytes]:
    """Yield length bytes from start, caching blocks as the data streams past.

    The per-file lock is only taken when it is free. A player that walked away
    from a range read can sit on its connection for minutes, and waiting on its
    lock would freeze every later seek; contended reads stream straight through
    without caching instead.
    """
    global _fills
    if length <= 0:
        return
    end = start + length
    index = start // BLOCK
    last = (end - 1) // BLOCK
    sent = 0
    while index <= last:
        path = _path(key, index)
        if path.exists():
            _touch(path)
            offset = max(0, start - index * BLOCK)
            remaining = min(BLOCK - offset, end - index * BLOCK - offset)
            if remaining > 0:
                try:
                    with open(path, "rb") as handle:
                        handle.seek(offset)
                        while remaining > 0:
                            data = handle.read(min(262144, remaining))
                            if not data:
                                break
                            remaining -= len(data)
                            sent += len(data)
                            yield data
                except OSError:
                    raise OSError("stream cache block unreadable")
            index += 1
            continue

        lock = _locks.setdefault(key, asyncio.Lock())
        if lock.locked():
            remaining = length - sent
            if remaining > 0:
                async for chunk in service.stream_chunks(
                    message, start + sent, remaining
                ):
                    sent += len(chunk)
                    yield chunk
            break

        await lock.acquire()
        try:
            # A concurrent request may have filled the leading blocks meanwhile.
            if _path(key, index).exists():
                continue
            run_last = index
            while run_last < last and not _path(key, run_last + 1).exists():
                run_last += 1
            async for chunk in _stream_run(
                service, message, key, index, run_last, size, start, end
            ):
                sent += len(chunk)
                yield chunk
            index = run_last + 1
        finally:
            lock.release()
    if sent < length:
        raise OSError("stream cache ended early")
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
