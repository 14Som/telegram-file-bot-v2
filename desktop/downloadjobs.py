"""Resumable downloads from Telegram into the user's Downloads folder.

Telegram serves file contents by byte offset, so a paused job keeps its
``.part`` file and continues at that exact byte when it is resumed. ZIP jobs
hold their stream open while paused, which halts the network reads without
losing the archive state.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, Optional

from . import appconfig
from .catalog import clean_name
from .tg import TGError, TransferCancelled, friendly_error

log = logging.getLogger("tfe.downloads")

PART_SUFFIX = ".part"


def _unique_target(folder: Path, name: str) -> Path:
    candidate = folder / name
    stem, suffix = os.path.splitext(name)
    index = 2
    while candidate.exists() or Path(str(candidate) + PART_SUFFIX).exists():
        candidate = folder / f"{stem} ({index}){suffix}"
        index += 1
    return candidate


class DownloadJobs:
    def __init__(self, state: Any) -> None:
        self.state = state
        self.jobs: Dict[str, Dict[str, Any]] = {}
        self.state_path = appconfig.HOME / "downloads.json"

    # ------------------------------------------------------------------ setup
    def _new_transfer(self, name: str, size: int, **extra: Any) -> Dict[str, Any]:
        transfer_id = self.state.service.new_transfer(name, size)
        transfer = self.state.service.transfers[transfer_id]
        transfer.update(
            kind="download",
            state="queued",
            busy=True,
            resumable=True,
            **extra,
        )
        return transfer

    def _spawn(self, coro: Any) -> asyncio.Task:
        task = asyncio.create_task(coro)
        self.state.tasks.add(task)
        task.add_done_callback(self.state.tasks.discard)
        return task

    def start_file(self, item: Dict[str, Any]) -> Dict[str, Any]:
        name = clean_name(item.get("name") or "file", "file")
        size = int(item.get("size") or 0)
        target = _unique_target(appconfig.downloads_dir(), name)
        transfer = self._new_transfer(name, size, item_id=item.get("id"))
        job = {
            "id": transfer["id"],
            "kind": "file",
            "item": item,
            "name": name,
            "target": str(target),
            "part": str(target) + PART_SUFFIX,
            "paused": False,
            "resume": asyncio.Event(),
            "transfer": transfer,
        }
        self.jobs[transfer["id"]] = job
        job["task"] = self._spawn(self._run_file(job))
        self._save()
        return transfer

    def start_zip(
        self,
        name: str,
        size: int,
        factory: Callable[[], Any],
        parts: int = 0,
    ) -> Dict[str, Any]:
        target = _unique_target(appconfig.downloads_dir(), name)
        transfer = self._new_transfer(name, size, parts=parts, zipped=True)
        job = {
            "id": transfer["id"],
            "kind": "zip",
            "name": name,
            "target": str(target),
            "part": str(target) + PART_SUFFIX,
            "factory": factory,
            "paused": False,
            "resume": asyncio.Event(),
            "transfer": transfer,
        }
        self.jobs[transfer["id"]] = job
        job["task"] = self._spawn(self._run_zip(job))
        return transfer

    # ----------------------------------------------------------- pause/resume
    def pause(self, transfer_id: str) -> bool:
        job = self.jobs.get(transfer_id)
        if job is None:
            return False
        transfer = job["transfer"]
        if transfer.get("state") not in {"queued", "downloading"}:
            return False
        job["paused"] = True
        transfer.update(state="paused", busy=False, error=None)
        self._save()
        return True

    def resume(self, transfer_id: str) -> bool:
        job = self.jobs.get(transfer_id)
        if job is None:
            return False
        transfer = job["transfer"]
        if transfer.get("state") not in {"queued", "paused", "error"}:
            return False
        job["paused"] = False
        transfer.update(state="queued", busy=True, error=None)
        job["resume"].set()
        task = job.get("task")
        if task is None or task.done():
            runner = self._run_zip if job["kind"] == "zip" else self._run_file
            job["task"] = self._spawn(runner(job))
        self._save()
        return True

    def cancel(self, transfer_id: str) -> bool:
        job = self.jobs.get(transfer_id)
        if job is None:
            return self.state.service.cancel_transfer(transfer_id)
        transfer = job["transfer"]
        if transfer.get("state") in {"done", "cancelled"}:
            return False
        transfer.update(cancel=True, state="cancelled", busy=False, error=None)
        job["paused"] = False
        job["resume"].set()
        task = job.get("task")
        if task is None or task.done():
            self._discard(Path(job["part"]))
            self.jobs.pop(transfer_id, None)
            self._save()
        return True

    # ----------------------------------------------------------------- runners
    async def _run_file(self, job: Dict[str, Any]) -> None:
        state = self.state
        transfer = job["transfer"]
        part = Path(job["part"])
        target = Path(job["target"])
        try:
            message, size, _mime = await state.service.media_info(job["item"])
            transfer["size"] = size
            while True:
                if transfer.get("cancel"):
                    raise TransferCancelled()
                if job["paused"]:
                    transfer.update(state="paused", busy=False)
                    await job["resume"].wait()
                    job["resume"].clear()
                    transfer["busy"] = True
                    continue
                written = part.stat().st_size if part.is_file() else 0
                if written >= size:
                    break
                transfer.update(state="downloading", sent=written)
                before = written
                with part.open("ab" if written else "wb") as handle:
                    async for chunk in state.service.stream_chunks(
                        message, written, size - written
                    ):
                        if transfer.get("cancel") or job["paused"]:
                            break
                        handle.write(chunk)
                        written += len(chunk)
                        transfer["sent"] = written
                if transfer.get("cancel") or job["paused"]:
                    continue
                if written <= before:
                    raise TGError("The download stopped before the file was complete.")
            if transfer.get("cancel"):
                raise TransferCancelled()
            os.replace(part, target)
            transfer.update(
                state="done",
                sent=size,
                size=size,
                path=str(target),
                dir=str(target.parent),
                busy=False,
                error=None,
            )
            log.info("Saved %s to %s", job["name"], target)
        except TransferCancelled:
            transfer.update(state="cancelled", busy=False, error=None)
            self._discard(part)
        except Exception as exc:
            transfer.update(state="error", error=friendly_error(exc), busy=False)
            log.warning("Download failed for %s: %s", job["name"], exc)
        finally:
            if transfer.get("state") in {"done", "cancelled"}:
                self.jobs.pop(job["id"], None)
            self._save()

    async def _run_zip(self, job: Dict[str, Any]) -> None:
        transfer = job["transfer"]
        part = Path(job["part"])
        target = Path(job["target"])
        handle: Optional[Any] = None
        written = 0
        try:
            handle = part.open("wb")
            stream = job["factory"]()
            async for chunk in stream:
                while job["paused"]:
                    transfer.update(state="paused", busy=False)
                    await job["resume"].wait()
                    job["resume"].clear()
                    transfer["busy"] = True
                if transfer.get("cancel"):
                    raise TransferCancelled()
                handle.write(chunk)
                written += len(chunk)
                transfer["sent"] = written
            handle.close()
            handle = None
            if transfer.get("cancel"):
                raise TransferCancelled()
            os.replace(part, target)
            transfer.update(
                state="done",
                sent=written,
                size=written,
                path=str(target),
                dir=str(target.parent),
                busy=False,
                error=None,
            )
        except TransferCancelled:
            transfer.update(state="cancelled", busy=False, error=None)
            self._discard(part)
        except Exception as exc:
            transfer.update(state="error", error=friendly_error(exc), busy=False)
            log.warning("ZIP download failed for %s: %s", job["name"], exc)
        finally:
            if handle is not None:
                handle.close()
            self.jobs.pop(job["id"], None)

    # ------------------------------------------------------------- persistence
    def _save(self) -> None:
        """Unfinished single-file downloads come back paused after a restart."""
        rows = []
        for job in self.jobs.values():
            transfer = job["transfer"]
            if job["kind"] != "file" or transfer.get("state") in {"done", "cancelled"}:
                continue
            part = Path(job["part"])
            if not part.is_file():
                continue
            rows.append(
                {
                    "id": job["id"],
                    "name": job["name"],
                    "size": int(transfer.get("size") or 0),
                    "item_id": job["item"].get("id"),
                    "target": job["target"],
                    "part": job["part"],
                    "started": transfer.get("started"),
                }
            )
        try:
            self.state_path.parent.mkdir(parents=True, exist_ok=True)
            tmp = self.state_path.with_suffix(".tmp")
            tmp.write_text(json.dumps(rows), encoding="utf-8")
            os.replace(tmp, self.state_path)
        except OSError:
            log.warning("Could not write the download list", exc_info=True)

    def restore(self) -> int:
        try:
            rows = json.loads(self.state_path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return 0
        if not isinstance(rows, list):
            return 0
        restored = 0
        for entry in rows:
            try:
                part = Path(entry["part"])
                target = Path(entry["target"])
                item_id = int(entry["item_id"])
                transfer_id = str(entry["id"])
                name = clean_name(entry.get("name") or "file", "file")
            except (KeyError, TypeError, ValueError):
                continue
            if not transfer_id or not part.is_file():
                continue
            item = self.state.catalog.get(item_id)
            if item is None:
                continue
            transfer = {
                "id": transfer_id,
                "name": name,
                "size": int(entry.get("size") or item.get("size") or 0),
                "sent": part.stat().st_size,
                "state": "paused",
                "error": None,
                "item_id": item_id,
                "item_ids": [],
                "client": "",
                "cancel": False,
                "busy": False,
                "kind": "download",
                "resumable": True,
                "dir": str(target.parent),
                "started": entry.get("started") or datetime.now().isoformat(timespec="seconds"),
            }
            self.state.service.transfers[transfer_id] = transfer
            self.jobs[transfer_id] = {
                "id": transfer_id,
                "kind": "file",
                "item": item,
                "name": name,
                "target": str(target),
                "part": str(part),
                "paused": True,
                "resume": asyncio.Event(),
                "transfer": transfer,
                "task": None,
            }
            restored += 1
        return restored

    # ------------------------------------------------------------------ misc
    def reveal(self, transfer_id: str) -> Optional[Path]:
        transfer = self.state.service.transfers.get(transfer_id)
        if not transfer or not transfer.get("path"):
            return None
        target = Path(transfer["path"])
        return target if target.is_file() else None

    def _discard(self, part: Path) -> None:
        try:
            part.unlink(missing_ok=True)
        except OSError:
            pass
