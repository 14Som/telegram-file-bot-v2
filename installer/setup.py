"""Per-user Windows installer for Telegram File Explorer.

The Explorer only talks to Telegram as your account; the storage bot runs on
the always-on server, so this installer carries no bot and never asks for a
token. Installing again upgrades the app but keeps an existing .env and the
user's library data untouched.
"""

from __future__ import annotations

import ctypes
import os
import shutil
import subprocess
import sys
import threading
import time
import winreg
from pathlib import Path
from typing import Any, Dict

import tkinter as tk
from tkinter import filedialog, messagebox, ttk

APP_NAME = "Telegram File Explorer"
APP_ID = "TelegramFileExplorer"
APP_VERSION = "2.0"
PAYLOAD_FILES = ("TelegramFileExplorer.exe",)
UNINSTALL_KEY = rf"Software\Microsoft\Windows\CurrentVersion\Uninstall\{APP_ID}"
CREATE_NO_WINDOW = 0x08000000

UNINSTALL_SCRIPT = r"""@echo off
set "APPDIR=%~dp0"
if "%APPDIR:~-1%"=="\" set "APPDIR=%APPDIR:~0,-1%"
taskkill /f /im TelegramFileExplorer.exe >nul 2>&1
taskkill /f /im TelegramFileBot.exe >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\TelegramFileExplorer" /f >nul 2>&1
del "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Telegram File Explorer.lnk" >nul 2>&1
for %%D in ("%USERPROFILE%\Desktop" "%USERPROFILE%\OneDrive\Desktop") do (
  del "%%~D\Telegram File Explorer.lnk" >nul 2>&1
)
echo Telegram File Explorer has been removed.
echo Your library, sign-in and settings in %APPDATA%\TelegramFileExplorer were kept.
start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Remove-Item -LiteralPath '%APPDIR%' -Recurse -Force -ErrorAction SilentlyContinue"
"""


def _stop_running() -> None:
    for image in ("TelegramFileExplorer.exe", "TelegramFileBot.exe"):
        subprocess.run(
            ["taskkill", "/f", "/im", image],
            capture_output=True,
            creationflags=CREATE_NO_WINDOW,
        )


def _image_running(image: str) -> bool:
    try:
        out = subprocess.run(
            ["tasklist", "/fi", f"imagename eq {image}", "/nh"],
            capture_output=True,
            text=True,
            creationflags=CREATE_NO_WINDOW,
        )
    except OSError:
        return False
    return image.lower() in (out.stdout or "").lower()


def app_running() -> bool:
    return _image_running("TelegramFileExplorer.exe")


def close_running() -> None:
    """Close the Explorer the polite way first so it saves its library snapshot."""
    if _image_running("TelegramFileExplorer.exe"):
        subprocess.run(
            ["taskkill", "/im", "TelegramFileExplorer.exe"],
            capture_output=True,
            creationflags=CREATE_NO_WINDOW,
        )
        deadline = time.time() + 25.0
        while time.time() < deadline and _image_running("TelegramFileExplorer.exe"):
            time.sleep(0.5)
    _stop_running()
    time.sleep(1.0)


def payload_dir() -> Path:
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return base / "payload"


def default_install_dir() -> Path:
    root = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
    return Path(root) / "Programs" / APP_ID


def shell_folder(name: str, fallback: Path) -> Path:
    try:
        with winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders",
        ) as key:
            value, _ = winreg.QueryValueEx(key, name)
        expanded = os.path.expandvars(str(value))
        return Path(expanded) if expanded else fallback
    except OSError:
        return fallback


def _ps(value: Path | str) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def make_shortcut(link: Path, exe: Path, workdir: Path) -> None:
    link.parent.mkdir(parents=True, exist_ok=True)
    script = (
        "$s=(New-Object -ComObject WScript.Shell).CreateShortcut(%s);"
        "$s.TargetPath=%s;$s.WorkingDirectory=%s;$s.IconLocation=%s;"
        "$s.Description='Telegram File Explorer';$s.Save()"
    ) % (_ps(link), _ps(exe), _ps(workdir), _ps(f"{exe},0"))
    subprocess.run(
        ["powershell", "-NoProfile", "-NonInteractive", "-Command", script],
        check=True,
        capture_output=True,
        creationflags=CREATE_NO_WINDOW,
    )


def register_uninstall(target: Path) -> None:
    explorer = target / "TelegramFileExplorer.exe"
    uninstall = target / "Uninstall.cmd"
    size = sum(
        (target / name).stat().st_size for name in PAYLOAD_FILES if (target / name).is_file()
    )
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, UNINSTALL_KEY) as key:
        for name, value in (
            ("DisplayName", APP_NAME),
            ("DisplayVersion", APP_VERSION),
            ("Publisher", "Telegram File Explorer"),
            ("DisplayIcon", f"{explorer},0"),
            ("InstallLocation", str(target)),
            ("UninstallString", f'cmd.exe /c ""{uninstall}""'),
        ):
            winreg.SetValueEx(key, name, 0, winreg.REG_SZ, value)
        winreg.SetValueEx(key, "NoModify", 0, winreg.REG_DWORD, 1)
        winreg.SetValueEx(key, "NoRepair", 0, winreg.REG_DWORD, 1)
        winreg.SetValueEx(key, "EstimatedSize", 0, winreg.REG_DWORD, max(1, size // 1024))


def install(
    target: Path,
    *,
    desktop_shortcut: bool,
    close_existing: bool = False,
) -> Dict[str, Any]:
    source = payload_dir()
    missing = [name for name in PAYLOAD_FILES if not (source / name).is_file()]
    if missing:
        raise RuntimeError("The installer is incomplete: " + ", ".join(missing))
    target.mkdir(parents=True, exist_ok=True)
    if close_existing and app_running():
        close_running()
    try:
        for name in PAYLOAD_FILES:
            shutil.copy2(source / name, target / name)
    except PermissionError:
        raise RuntimeError(
            "Telegram File Explorer is running. Close it and run setup again."
        ) from None
    # Version 1 shipped a local bot; it would fight the server bot (Telegram 409).
    try:
        (target / "TelegramFileBot.exe").unlink(missing_ok=True)
    except OSError:
        pass
    (target / "Uninstall.cmd").write_text(UNINSTALL_SCRIPT, encoding="utf-8")
    make_shortcut(
        shell_folder(
            "Programs",
            Path(os.environ.get("APPDATA", "")) / "Microsoft" / "Windows" / "Start Menu" / "Programs",
        )
        / "Telegram File Explorer.lnk",
        target / "TelegramFileExplorer.exe",
        target,
    )
    if desktop_shortcut:
        make_shortcut(
            shell_folder("Desktop", Path(os.environ.get("USERPROFILE", ".")) / "Desktop")
            / "Telegram File Explorer.lnk",
            target / "TelegramFileExplorer.exe",
            target,
        )
    register_uninstall(target)
    return {"dir": str(target)}


def _say(message: str) -> None:
    """Silent mode runs windowed, so mirror the output into a log file."""
    print(message)
    try:
        log_path = Path(os.environ.get("TEMP", ".")) / "TelegramFileExplorerSetup.log"
        with open(log_path, "a", encoding="utf-8") as log_file:
            log_file.write(message + "\n")
    except OSError:
        pass


def _silent(argv: list[str]) -> int:
    if "--uninstall" in argv:
        return _silent_uninstall(argv)

    def value(flag: str) -> str:
        try:
            return argv[argv.index(flag) + 1]
        except (ValueError, IndexError):
            return ""

    target = Path(value("--dir") or default_install_dir()).expanduser()
    try:
        result = install(
            target,
            desktop_shortcut="--no-desktop" not in argv,
            close_existing="--force" in argv,
        )
    except Exception as exc:  # surfaced for scripted installs
        _say(f"Install failed: {exc}")
        return 1
    _say(f"Installed to {result['dir']}")
    if "--no-launch" not in argv:
        subprocess.Popen([str(target / "TelegramFileExplorer.exe")], cwd=str(target))
    return 0


def _silent_uninstall(argv: list[str]) -> int:
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, UNINSTALL_KEY) as key:
            target, _ = winreg.QueryValueEx(key, "InstallLocation")
    except OSError:
        _say("Telegram File Explorer is not installed for this user")
        return 0
    script = Path(target) / "Uninstall.cmd"
    if not script.is_file():
        _say("Uninstall.cmd is missing")
        return 1
    subprocess.run(["cmd.exe", "/c", str(script)], creationflags=CREATE_NO_WINDOW)
    _say("Uninstalled")
    return 0


class SetupWindow:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.busy = False
        root.title(f"{APP_NAME} Setup")
        root.resizable(False, False)
        icon = payload_dir().parent / "app.ico"
        if icon.is_file():
            try:
                root.iconbitmap(default=str(icon))
            except tk.TclError:
                pass

        frame = ttk.Frame(root, padding=20)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame, text=APP_NAME, font=("Segoe UI", 16, "bold")).pack(anchor="w")
        ttk.Label(
            frame,
            text=(
                f"Version {APP_VERSION} — installs the Explorer. The storage bot "
                "stays on your server, so there is nothing to start here. "
                "No admin rights needed."
            ),
            wraplength=560,
        ).pack(anchor="w", pady=(2, 14))

        ttk.Label(frame, text="Install location").pack(anchor="w")
        row = ttk.Frame(frame)
        row.pack(fill="x", pady=(3, 12))
        self.dir_var = tk.StringVar(value=str(default_install_dir()))
        self.dir_entry = ttk.Entry(row, textvariable=self.dir_var)
        self.dir_entry.pack(side="left", fill="x", expand=True)
        self.browse_btn = ttk.Button(row, text="Browse…", command=self.browse)
        self.browse_btn.pack(side="left", padx=(6, 0))

        self.desktop_var = tk.BooleanVar(value=True)
        self.launch_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(frame, text="Create a desktop shortcut", variable=self.desktop_var).pack(anchor="w")
        ttk.Checkbutton(frame, text="Start Telegram File Explorer when setup finishes", variable=self.launch_var).pack(anchor="w", pady=(0, 14))

        ttk.Label(
            frame,
            text=(
                "Sign in with your Telegram account on this PC. The library is "
                "restored from your vault, and the bot answers in Telegram without "
                "anything being started here."
            ),
            wraplength=520,
            foreground="#555555",
        ).pack(anchor="w", pady=(0, 10))

        self.status = ttk.Label(frame, text="", foreground="#555555")
        self.status.pack(anchor="w", pady=(14, 6))
        buttons = ttk.Frame(frame)
        buttons.pack(fill="x")
        self.install_btn = ttk.Button(buttons, text="Install", command=self.start)
        self.install_btn.pack(side="right")
        self.close_btn = ttk.Button(buttons, text="Close", command=root.destroy)
        self.close_btn.pack(side="right", padx=(0, 8))

        root.update_idletasks()
        width = max(600, root.winfo_reqwidth())
        height = root.winfo_reqheight()
        x = (root.winfo_screenwidth() - width) // 2
        y = (root.winfo_screenheight() - height) // 3
        root.geometry(f"{width}x{height}+{x}+{y}")

    def browse(self) -> None:
        chosen = filedialog.askdirectory(initialdir=self.dir_var.get(), title="Choose an install folder")
        if chosen:
            self.dir_var.set(chosen)

    def set_busy(self, busy: bool) -> None:
        self.busy = busy
        state = "disabled" if busy else "normal"
        for widget in (self.dir_entry, self.browse_btn, self.install_btn, self.close_btn):
            widget.configure(state=state)

    def start(self) -> None:
        if self.busy:
            return
        target = Path(self.dir_var.get().strip() or default_install_dir()).expanduser()
        if app_running() and not messagebox.askokcancel(
            "Telegram File Explorer is running",
            "Setup will close the running app so it can replace its files. Continue?",
        ):
            return
        self.set_busy(True)
        self.status.configure(text="Installing…")
        desktop = self.desktop_var.get()
        launch = self.launch_var.get()

        def work() -> None:
            try:
                result = install(
                    target, desktop_shortcut=desktop, close_existing=True
                )
            except Exception as exc:
                self.root.after(0, lambda: self.failed(exc))
                return
            self.root.after(0, lambda: self.finished(result, launch))

        threading.Thread(target=work, daemon=True).start()

    def failed(self, exc: Exception) -> None:
        self.set_busy(False)
        self.status.configure(text="")
        messagebox.showerror("Setup failed", str(exc))

    def finished(self, result: Dict[str, Any], launch: bool) -> None:
        self.set_busy(False)
        messagebox.showinfo(
            "Setup complete",
            f"{APP_NAME} was installed to:\n{result['dir']}\n\n"
            "Sign in with the same Telegram account on this PC. If your library was "
            "already saved to the vault, it is restored after the first restart.",
        )
        if launch:
            subprocess.Popen(
                [str(Path(result["dir"]) / "TelegramFileExplorer.exe")],
                cwd=result["dir"],
            )
        self.root.destroy()


def main() -> int:
    if "--silent" in sys.argv:
        return _silent(sys.argv)
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(1)
    except (AttributeError, OSError):
        pass
    root = tk.Tk()
    SetupWindow(root)
    root.mainloop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
