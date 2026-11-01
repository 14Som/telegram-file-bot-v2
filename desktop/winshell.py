"""Windows Explorer thumbnails for formats the browser cannot decode.

Solid Edge, SolidWorks and similar CAD installs register thumbnail handlers
with the shell. Asking the shell for the same image Explorer shows gives the
library a real preview without shipping a CAD kernel.
"""

from __future__ import annotations

import ctypes
import threading
import uuid
from ctypes import wintypes
from pathlib import Path
from typing import Optional

IID_IShellItemImageFactory = uuid.UUID("{bcc18b79-ba16-442f-80c4-8a59c30c463b}")
SIIGBF_BIGGERSIZEOK = 0x1
SIIGBF_THUMBNAILONLY = 0x8
SIIGBF_SCALEUP = 0x100

_ole32 = ctypes.windll.ole32
_shell32 = ctypes.windll.shell32
_gdi32 = ctypes.windll.gdi32
_user32 = ctypes.windll.user32

_initialized = False
_init_lock = threading.Lock()


class GUID(ctypes.Structure):
    _fields_ = [
        ("Data1", wintypes.DWORD),
        ("Data2", wintypes.WORD),
        ("Data3", wintypes.WORD),
        ("Data4", ctypes.c_ubyte * 8),
    ]


class SIZE(ctypes.Structure):
    _fields_ = [("cx", ctypes.c_long), ("cy", ctypes.c_long)]


class BITMAP(ctypes.Structure):
    _fields_ = [
        ("bmType", ctypes.c_long),
        ("bmWidth", ctypes.c_long),
        ("bmHeight", ctypes.c_long),
        ("bmWidthBytes", ctypes.c_long),
        ("bmPlanes", wintypes.WORD),
        ("bmBitsPixel", wintypes.WORD),
        ("bmBits", ctypes.c_void_p),
    ]


class BITMAPINFOHEADER(ctypes.Structure):
    _fields_ = [
        ("biSize", wintypes.DWORD),
        ("biWidth", ctypes.c_long),
        ("biHeight", ctypes.c_long),
        ("biPlanes", wintypes.WORD),
        ("biBitCount", wintypes.WORD),
        ("biCompression", wintypes.DWORD),
        ("biSizeImage", wintypes.DWORD),
        ("biXPelsPerMeter", ctypes.c_long),
        ("biYPelsPerMeter", ctypes.c_long),
        ("biClrUsed", wintypes.DWORD),
        ("biClrImportant", wintypes.DWORD),
    ]


def _guid_bytes() -> GUID:
    result = GUID()
    ctypes.memmove(ctypes.byref(result), IID_IShellItemImageFactory.bytes_le, 16)
    return result


def _ensure_com() -> None:
    global _initialized
    with _init_lock:
        if _initialized:
            return
        try:
            _ole32.CoInitializeEx(None, 0x2)  # STA
        except Exception:
            pass
        _initialized = True


def _method(pointer: ctypes.c_void_p, index: int, restype, *argtypes):
    slot = ctypes.cast(pointer, ctypes.POINTER(ctypes.c_void_p))[0]
    table = ctypes.cast(slot, ctypes.POINTER(ctypes.c_void_p))
    address = table[index]
    return ctypes.WINFUNCTYPE(restype, ctypes.c_void_p, *argtypes)(address)


def _get_image(pointer: ctypes.c_void_p):
    return _method(
        pointer,
        3,
        ctypes.c_long,
        SIZE,
        ctypes.c_int,
        ctypes.POINTER(wintypes.HBITMAP),
    )


def _release(pointer: ctypes.c_void_p) -> None:
    try:
        release = _method(pointer, 2, ctypes.c_ulong)
        release(pointer)
    except Exception:
        pass


def _bitmap_to_image(handle: wintypes.HBITMAP):
    from PIL import Image

    bitmap = BITMAP()
    if not _gdi32.GetObjectW(handle, ctypes.sizeof(BITMAP), ctypes.byref(bitmap)):
        return None
    width, height = int(bitmap.bmWidth), int(bitmap.bmHeight)
    if width <= 0 or height <= 0:
        return None
    header = BITMAPINFOHEADER()
    header.biSize = ctypes.sizeof(BITMAPINFOHEADER)
    header.biWidth = width
    header.biHeight = -height  # top-down rows
    header.biPlanes = 1
    header.biBitCount = 32
    header.biCompression = 0  # BI_RGB
    stride = width * 4
    buffer = ctypes.create_string_buffer(stride * height)
    dc = _user32.GetDC(None)
    try:
        copied = _gdi32.GetDIBits(
            dc, handle, 0, height, buffer, ctypes.byref(header), 0
        )
    finally:
        _user32.ReleaseDC(None, dc)
    if not copied:
        return None
    return Image.frombuffer(
        "RGBA", (width, height), buffer, "raw", "BGRA", 0, 1
    ).convert("RGB")


def thumbnail(path: Path, size: int = 640) -> Optional[bytes]:
    """Return a PNG for the file, using the same handler Explorer uses."""
    _ensure_com()
    path = Path(path)
    if not path.is_file():
        return None
    path = path.resolve()
    item = ctypes.c_void_p()
    iid = _guid_bytes()
    _shell32.SHCreateItemFromParsingName.restype = ctypes.c_long
    _shell32.SHCreateItemFromParsingName.argtypes = [
        wintypes.LPCWSTR,
        ctypes.c_void_p,
        ctypes.POINTER(GUID),
        ctypes.POINTER(ctypes.c_void_p),
    ]
    result = _shell32.SHCreateItemFromParsingName(
        str(path), None, ctypes.byref(iid), ctypes.byref(item)
    )
    if result < 0 or not item.value:
        return None
    handle = wintypes.HBITMAP()
    image = None
    try:
        get_image = _get_image(item)
        for flags in (SIIGBF_BIGGERSIZEOK | SIIGBF_SCALEUP, SIIGBF_BIGGERSIZEOK, 0):
            handle = wintypes.HBITMAP()
            hresult = get_image(
                item, SIZE(size, size), flags, ctypes.byref(handle)
            )
            if hresult >= 0 and handle.value:
                image = _bitmap_to_image(handle)
                if image is not None:
                    break
            if handle.value:
                _gdi32.DeleteObject(handle)
                handle = wintypes.HBITMAP()
        if image is None:
            return None
        import io

        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        return buffer.getvalue()
    finally:
        if handle.value:
            _gdi32.DeleteObject(handle)
        _release(item)
