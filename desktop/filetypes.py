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

# A split upload always arrives as archive documents, so the kind is recovered
# from the original file name inside the volume name ("Movie.mkv.7z.001").
VIDEO_EXT = {
    ".mp4", ".mkv", ".avi", ".mov", ".wmv", ".webm", ".m4v", ".mpg",
    ".mpeg", ".ts", ".m2ts", ".flv", ".3gp", ".ogv",
}
AUDIO_EXT = {".mp3", ".m4a", ".flac", ".wav", ".ogg", ".opus", ".aac", ".wma", ".m4b"}
IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".heic", ".tiff", ".tif", ".avif"}

# Telegram keeps the original upload name, and some movies end in the release
# year ("Movie (2026)") instead of a real extension. The MIME type says which
# container it really is, so the player can stream it instead of downloading it
# whole and remuxing something that was already MP4.
VIDEO_MIME_EXT = {
    "video/mp4": ".mp4",
    "video/x-m4v": ".m4v",
    "video/webm": ".webm",
    "video/3gpp": ".3gp",
    "video/quicktime": ".mov",
    "video/x-matroska": ".mkv",
    "video/x-msvideo": ".avi",
    "video/x-ms-wmv": ".wmv",
    "video/mpeg": ".mpg",
    "video/mp2t": ".ts",
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


def media_extension(name: str, mime: str = "") -> str:
    """Container extension of a stored video, audio or image file.

    The MIME type is used when the name does not end in a known media
    extension, which happens with releases named after their year.
    """
    ext = extension(name)
    if ext in VIDEO_EXT or ext in AUDIO_EXT or ext in IMAGE_EXT:
        return ext
    return VIDEO_MIME_EXT.get((mime or "").lower(), ext)


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
    content-detected kind. Generic documents are retyped from the extension so
    archive volumes show the kind of the file they hold.
    """
    if kind not in ("", "document", "other"):
        return kind
    ext = extension(name)
    if ext in MODEL_EXT:
        return "model"
    if ext in CAD_EXT:
        return "cad"
    if ext in VIDEO_EXT:
        return "video"
    if ext in AUDIO_EXT:
        return "audio"
    if ext == ".gif":
        return "gif"
    if ext in IMAGE_EXT:
        return "image"
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
