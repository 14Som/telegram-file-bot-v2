"""On-demand file inspection for the details panel.

Every inspection runs against a local copy of the file; results are cached in
the catalog as JSON so the panel opens instantly next time.
"""

from __future__ import annotations

import os
import re
import struct
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional

from . import filetypes

MAX_SCAN = 96 * 1024 * 1024  # geometry bounds stop after this many bytes


def _fmt_int(value: int) -> str:
    return f"{int(value):,}"


def _fmt_mm(value: float) -> str:
    if value >= 100:
        return f"{value:,.1f} mm"
    if value >= 10:
        return f"{value:,.2f} mm"
    return f"{value:,.3f} mm"


def _fields(pairs: List[tuple]) -> List[List[str]]:
    out = []
    for label, value in pairs:
        if value is None:
            continue
        text = str(value).strip()
        if text:
            out.append([str(label), text])
    return out


def _stl_info(path: Path) -> Dict[str, Any]:
    size = path.stat().st_size
    with path.open("rb") as handle:
        head = handle.read(84)
    triangles = 0
    binary = False
    bounds: Optional[List[List[float]]] = None
    if len(head) == 84:
        count = struct.unpack("<I", head[80:84])[0]
        if 84 + count * 50 == size:
            binary = True
            triangles = count
            bounds = _stl_bounds(path, count)
    if not binary:
        text = head[:512].lstrip().lower()
        if text.startswith(b"solid") and b"facet" in text:
            triangles, bounds = _stl_ascii(path)
    pairs = [
        ("Triangles", _fmt_int(triangles) if triangles else "0"),
        ("Encoding", "Binary" if binary else "ASCII"),
    ]
    if bounds:
        ranges = [b - a for a, b in zip(bounds[0], bounds[1])]
        pairs.append(("Bounds", " × ".join(_fmt_mm(value) for value in ranges)))
    return {"type": "stl", "fields": _fields(pairs)}


def _stl_bounds(path: Path, count: int) -> Optional[List[List[float]]]:
    low = [float("inf")] * 3
    high = [float("-inf")] * 3
    remaining = min(count, MAX_SCAN // 50)
    with path.open("rb") as handle:
        handle.seek(84)
        carry = b""
        while remaining > 0:
            chunk = handle.read(4 * 1024 * 1024)
            if not chunk:
                break
            data = carry + chunk
            usable = len(data) - (len(data) % 50)
            carry = data[usable:]
            for record in struct.iter_unpack("<12fH", data[:usable]):
                for base in (3, 6, 9):
                    x, y, z = record[base], record[base + 1], record[base + 2]
                    if x < low[0]:
                        low[0] = x
                    if y < low[1]:
                        low[1] = y
                    if z < low[2]:
                        low[2] = z
                    if x > high[0]:
                        high[0] = x
                    if y > high[1]:
                        high[1] = y
                    if z > high[2]:
                        high[2] = z
                remaining -= 1
                if remaining <= 0:
                    break
    if high[0] == float("-inf"):
        return None
    return [low, high]


def _stl_ascii(path: Path) -> tuple:
    triangles = 0
    low = [float("inf")] * 3
    high = [float("-inf")] * 3
    scanned = 0
    with path.open("rb") as handle:
        for line in handle:
            scanned += len(line)
            if line.lstrip().startswith(b"facet"):
                triangles += 1
            elif line.lstrip().startswith(b"vertex"):
                parts = line.split()
                if len(parts) >= 4:
                    try:
                        x, y, z = (float(parts[1]), float(parts[2]), float(parts[3]))
                    except ValueError:
                        continue
                    for index, value in enumerate((x, y, z)):
                        if value < low[index]:
                            low[index] = value
                        if value > high[index]:
                            high[index] = value
            if scanned > MAX_SCAN:
                break
    if high[0] == float("-inf"):
        return triangles, None
    return triangles, [low, high]


_3MF_META_LABELS = {
    "Title": "Title",
    "Designer": "Designer",
    "Description": "Description",
    "Application": "Application",
    "Copyright": "Copyright",
    "License": "License",
    "CreationDate": "Created",
    "ModificationDate": "Modified",
}


def _3mf_info(path: Path) -> Dict[str, Any]:
    pairs: List[tuple] = []
    triangles = 0
    try:
        with zipfile.ZipFile(path) as archive:
            models = [
                name for name in archive.namelist()
                if name.lower().endswith(".model")
            ]
            models.sort(key=lambda name: (0 if name.lower() == "3d/3dmodel.model" else 1, name))
            for index, name in enumerate(models[:8]):
                try:
                    raw = archive.read(name)
                except (KeyError, RuntimeError, zipfile.BadZipFile):
                    continue
                text = raw.decode("utf-8", "replace")
                triangles += len(re.findall(r"<triangle\b", text, re.I))
                if index == 0:
                    unit = re.search(r'unit="([^"]+)"', text[:2000], re.I)
                    if unit:
                        pairs.append(("Units", unit.group(1)))
                    for match in re.finditer(
                        r'<metadata\s+name="([^"]+)"\s*>([^<]*)</metadata>',
                        text,
                        re.I,
                    ):
                        key = match.group(1).strip()
                        value = match.group(2).strip()
                        label = _3MF_META_LABELS.get(key)
                        if not label and len(key) <= 40 and value:
                            label = key.replace("_", " ").replace(":", " ")
                        if label:
                            pairs.append((label, value[:200]))
                if len(pairs) > 14:
                    break
    except (zipfile.BadZipFile, OSError):
        return {"type": "3mf", "fields": [], "note": "This 3MF archive could not be read."}
    pairs.insert(0, ("Triangles", _fmt_int(triangles) if triangles else "0"))
    pairs.insert(1, ("Meshes", _fmt_int(len(models)) if models else "1"))
    return {"type": "3mf", "fields": _fields(pairs)}


def _image_info(path: Path) -> Dict[str, Any]:
    pairs: List[tuple] = []
    try:
        from PIL import ExifTags, Image
    except Exception:
        return {"type": "image", "fields": [], "note": "Image details need Pillow."}
    try:
        with Image.open(path) as image:
            pairs.append(("Dimensions", f"{image.width} × {image.height}"))
            exif = image.getexif()
            if exif:
                try:
                    deep = exif.get_ifd(ExifTags.IFD.Exif)
                except Exception:
                    deep = {}
                merged = {ExifTags.TAGS.get(key, str(key)): value for key, value in exif.items()}
                merged.update({ExifTags.TAGS.get(key, str(key)): value for key, value in deep.items()})
                make = str(merged.get("Make") or "").strip()
                model = str(merged.get("Model") or "").strip()
                if make or model:
                    pairs.append(("Camera", f"{make} {model}".strip()))
                lens = merged.get("LensModel") or merged.get("LensMake")
                if lens:
                    pairs.append(("Lens", str(lens).strip()))
                taken = merged.get("DateTimeOriginal") or merged.get("DateTime")
                if taken:
                    pairs.append(("Taken", str(taken).strip()))
                aperture = merged.get("FNumber")
                if aperture:
                    try:
                        pairs.append(("Aperture", f"f/{float(aperture):g}"))
                    except (TypeError, ValueError):
                        pass
                exposure = merged.get("ExposureTime")
                if exposure is not None:
                    try:
                        seconds = float(exposure)
                        pairs.append((
                            "Shutter",
                            f"1/{round(1 / seconds)} s" if 0 < seconds < 1 else f"{seconds:g} s",
                        ))
                    except (TypeError, ValueError, ZeroDivisionError):
                        pass
                iso = merged.get("ISOSpeedRatings") or merged.get("PhotographicSensitivity")
                if iso:
                    pairs.append(("ISO", str(iso)))
    except Exception:
        return {"type": "image", "fields": pairs}
    return {"type": "image", "fields": _fields(pairs)}


def _cad_info(path: Path) -> Dict[str, Any]:
    pairs: List[tuple] = []
    try:
        import olefile
    except Exception:
        olefile = None
    if olefile is not None:
        try:
            with olefile.OleFileIO(str(path)) as ole:
                meta = ole.get_metadata()
                mapping = [
                    ("Title", getattr(meta, "title", None)),
                    ("Subject", getattr(meta, "subject", None)),
                    ("Author", getattr(meta, "author", None)),
                    ("Company", getattr(meta, "company", None)),
                    ("Revision", getattr(meta, "revision_number", None)),
                    ("Application", getattr(meta, "creating_application", None)),
                    ("Last saved by", getattr(meta, "last_saved_by", None)),
                    ("Created", _stamp(getattr(meta, "create_time", None))),
                    ("Modified", _stamp(getattr(meta, "last_saved_time", None))),
                ]
                pairs.extend(mapping)
        except Exception:
            pairs = []
    return {
        "type": "cad",
        "fields": _fields(pairs),
        "note": "" if pairs else "Windows does not expose document properties for this file.",
    }


def _stamp(value: Any) -> Optional[str]:
    if not value:
        return None
    try:
        return value.strftime("%Y-%m-%d %H:%M")
    except AttributeError:
        return str(value)


def inspect_file(path: Path, name: str) -> Dict[str, Any]:
    ext = filetypes.extension(name)
    size = path.stat().st_size if path.exists() else 0
    if ext == ".stl":
        result = _stl_info(path)
    elif ext == ".3mf":
        result = _3mf_info(path)
    elif ext in (".obj", ".ply", ".amf"):
        result = {"type": "model", "fields": []}
    elif ext in filetypes.CAD_EXT:
        result = _cad_info(path)
    elif ext in {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".heic"}:
        result = _image_info(path)
    else:
        result = {"type": "file", "fields": []}
    result["size"] = int(size)
    return result
