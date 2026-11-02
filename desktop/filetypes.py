"""File families shared by the scanner, catalog and UI.

Model and CAD formats arrive as Telegram documents; they get their own kinds
so the explorer can filter them and offer the right preview action.
"""

from __future__ import annotations

import os
from typing import Optional

MODEL_EXT = {
    ".stl", ".obj", ".3mf", ".amf", ".ply",
    ".glb", ".gltf", ".fbx", ".3ds", ".dae", ".x3d", ".blend",
}

CAD_EXT = {
    ".step", ".stp", ".iges", ".igs",
    ".par", ".psm", ".asm", ".dft",
    ".sldprt", ".sldasm", ".slddrw",
    ".ipt", ".iam", ".idw",
    ".catpart", ".catproduct", ".f3d", ".skp", ".3dm", ".dwg", ".dxf",
    ".scad",
}

# Extensions the in-browser viewer can load directly.
VIEWER_EXT = {".stl", ".3mf", ".obj", ".ply"}

ARCHIVE_EXT = {".zip", ".7z", ".rar", ".tar", ".gz", ".tgz", ".bz2", ".xz"}

# Formats the in-app reader can open, keyed by the reader that handles them.
READER_EXT = {
    ".pdf": "pdf",
    ".epub": "epub",
    ".fb2": "fb2",
    ".fbz": "fb2",
    ".docx": "docx",
    ".doc": "doc",
    ".txt": "txt",
    ".text": "txt",
    ".md": "md",
    ".markdown": "md",
    ".html": "html",
    ".htm": "html",
    ".xhtml": "html",
    ".xml": "xml",
}

READER_MIME = {
    "application/pdf": "pdf",
    "application/epub+zip": "epub",
    "application/x-fictionbook+xml": "fb2",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "doc",
    "text/markdown": "md",
    "text/html": "html",
    "application/xhtml+xml": "html",
    "text/xml": "xml",
    "application/xml": "xml",
}


def extension(name: str) -> str:
    return os.path.splitext(name or "")[1].lower()


def reader_format(name: str, mime: str = "") -> Optional[str]:
    """Pick the reader for a stored file, or None when it isn't readable.

    The extension wins because Telegram sometimes stores documents with a
    generic type; text/* then falls back to the plain-text reader.
    """
    lowered = (name or "").lower()
    if lowered.endswith(".fb2.zip"):
        return "fb2"
    fmt = READER_EXT.get(extension(name))
    if fmt:
        return fmt
    kind = (mime or "").lower()
    if kind in READER_MIME:
        return READER_MIME[kind]
    if kind.startswith("text/"):
        return "txt"
    return None


def classify(name: str, kind: str = "document") -> str:
    """Return the best kind for a stored file based on its name.

    Only converts generic documents; photos, videos and audio keep their
    content-detected kind.
    """
    if kind not in ("", "document", "other"):
        return kind
    ext = extension(name)
    if ext in MODEL_EXT:
        return "model"
    if ext in CAD_EXT:
        return "cad"
    return kind or "document"


def is_model(name: str) -> bool:
    return extension(name) in MODEL_EXT


def is_cad(name: str) -> bool:
    return extension(name) in CAD_EXT


def viewer_format(name: str) -> Optional[str]:
    ext = extension(name)
    return ext[1:] if ext in VIEWER_EXT else None


def family_extensions(kind: str) -> set:
    if kind == "model":
        return MODEL_EXT
    if kind == "cad":
        return CAD_EXT
    return set()
