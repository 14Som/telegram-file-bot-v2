# -*- mode: python ; coding: utf-8 -*-
from pathlib import Path

from PyInstaller.utils.hooks import collect_dynamic_libs, collect_submodules

root = Path(SPECPATH)

hiddenimports = [
    "clr",
    "clr_loader",
    "pythonnet",
    "webview.platforms.edgechromium",
    "webview.platforms.winforms",
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.http.h11_impl",
    "uvicorn.protocols.http.httptools_impl",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.protocols.websockets.websockets_impl",
    "uvicorn.protocols.websockets.wsproto_impl",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    "multipart",
    "segno",
    "bottle",
    "cryptg",
]
hiddenimports += collect_submodules("telethon")
hiddenimports += collect_submodules("segno")

datas = [
    (str(root / "desktop" / "ui"), "desktop/ui"),
    (str(root / "desktop" / "bin" / "7z.exe"), "desktop/bin"),
    (str(root / "desktop" / "bin" / "7z.dll"), "desktop/bin"),
]
binaries = collect_dynamic_libs("webview") + collect_dynamic_libs("pythonnet")

a = Analysis(
    ["desktop/native.py"],
    pathex=[str(root)],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter", "PySide6", "PyQt5", "PyQt6", "matplotlib", "numpy"],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="TelegramFileExplorer",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=str(root / "desktop" / "ui" / "app.ico"),
)
