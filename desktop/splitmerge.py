"""Split large files into archive volumes and merge volumes back.

Uses the bundled 7-Zip command line tool (desktop/bin/7z.exe + 7z.dll,
LGPL + unRAR license) so parts are real, interoperable archive volumes:
"Movie.mkv" becomes "Movie.mkv.7z.001", ".002", ... at or below Telegram's
per-file size cap, and merging extracts the exact original file back out.
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# "Movie.mkv.7z.001", "Backup.zip.003", "Film.part12.rar"
PART_RE = re.compile(
    r"^(?P<base>.+?)\.(?P<ext>7z|zip)\.(?P<num>\d{1,5})$",
    re.IGNORECASE,
)
RAR_PART_RE = re.compile(
    r"^(?P<base>.+?)\.part(?P<num>\d{1,5})\.rar$",
    re.IGNORECASE,
)

_SPLIT_TIMEOUT = 6 * 3600
_MERGE_TIMEOUT = 6 * 3600


def seven_zip() -> Path:
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    exe = base / "bin" / "7z.exe"
    if not exe.exists():
        exe = Path(__file__).resolve().parent / "bin" / "7z.exe"
    if not exe.exists():
        raise RuntimeError("The bundled archive tool is missing from this install.")
    return exe


def parse_part_name(name: str) -> Optional[Dict[str, object]]:
    """Return {"base", "ext", "num"} when a name looks like an archive volume."""
    match = PART_RE.match(name or "")
    if match:
        return {
            "base": match.group("base"),
            "ext": match.group("ext").lower(),
            "num": int(match.group("num")),
        }
    match = RAR_PART_RE.match(name or "")
    if match:
        return {
            "base": match.group("base"),
            "ext": "rar",
            "num": int(match.group("num")),
        }
    return None


def split_file(
    path: Path, workdir: Path, part_size: int
) -> List[Path]:
    """Split one file into store-mode 7z volumes of at most part_size bytes.

    Returns the volume paths in order. The archive is stored uncompressed so
    splitting runs at disk speed and extraction is a byte-for-byte restore.
    """
    exe = seven_zip()
    path = Path(path)
    workdir = Path(workdir)
    workdir.mkdir(parents=True, exist_ok=True)
    stem = path.name + ".7z"
    # Running with the source file's folder as cwd keeps the stored entry
    # name a bare file name, so extraction restores "Movie.mkv" directly.
    command = [
        str(exe), "a", "-y", "-mx=0", f"-v{int(part_size)}b", "--",
        str(workdir / stem), path.name,
    ]
    result = subprocess.run(
        command,
        cwd=str(path.parent),
        capture_output=True,
        text=True,
        timeout=_SPLIT_TIMEOUT,
    )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip().splitlines()
        raise RuntimeError(
            "Could not split the file into parts"
            + (f": {detail[-1][:200]}" if detail else ".")
        )
    prefix = stem + "."
    volumes: List[Tuple[int, Path]] = []
    for entry in workdir.iterdir():
        if not entry.name.startswith(prefix):
            continue
        suffix = entry.name[len(prefix):]
        if not suffix.isdigit():
            continue
        volumes.append((int(suffix), entry))
    volumes.sort(key=lambda pair: pair[0])
    if not volumes:
        raise RuntimeError("The archive tool produced no parts.")
    # A source at or below part_size yields a single volume that would wrap
    # the file in an archive; callers only split files above part_size, so
    # treat a single-volume result as the failure it is.
    if len(volumes) == 1:
        raise RuntimeError("The file did not need to be split into parts.")
    return [entry for _, entry in volumes]


def _run_extract(exe: Path, first_volume: Path, out_dir: Path) -> None:
    command = [
        str(exe), "x", "-y", f"-o{out_dir}", "--", str(first_volume),
    ]
    result = subprocess.run(
        command,
        cwd=str(first_volume.parent),
        capture_output=True,
        text=True,
        timeout=_MERGE_TIMEOUT,
    )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip().splitlines()
        raise RuntimeError(
            "The parts could not be joined back into the original file"
            + (f": {detail[-1][:200]}" if detail else ".")
        )


def _single_extracted(out_dir: Path) -> Path:
    files: List[Path] = []
    for root, _dirs, names in os.walk(out_dir):
        for name in names:
            files.append(Path(root) / name)
    if len(files) != 1:
        raise RuntimeError(
            "The parts do not contain exactly one file, so they cannot be "
            "joined into a single download."
        )
    return files[0]


def merge_parts(volumes: List[Path], workdir: Path) -> Tuple[Path, str]:
    """Join archive volumes and extract the original single file.

    Returns (path_to_original_file, original_file_name).
    """
    exe = seven_zip()
    if not volumes:
        raise RuntimeError("No parts were given.")
    # The caller passes volumes in part order; 7-Zip itself locates the
    # remaining volumes by name, only the first one matters here.
    out_dir = Path(workdir) / "out"
    if out_dir.exists():
        shutil.rmtree(out_dir, ignore_errors=True)
    out_dir.mkdir(parents=True, exist_ok=True)
    _run_extract(exe, volumes[0], out_dir)
    extracted = _single_extracted(out_dir)
    return extracted, extracted.name
