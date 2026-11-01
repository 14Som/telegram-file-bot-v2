"""Standalone app window: local server plus an embedded WebView2 control.

This is the launcher used by the packaged TelegramFileExplorer.exe. The UI runs
inside the app's own window; no browser is started.
"""

from __future__ import annotations

import json
import logging
import logging.handlers
import os
import socket
import subprocess
import sys
import threading
import time
import urllib.request
from pathlib import Path
from typing import Optional

PROJECT_DIR = (
    Path(sys.executable).resolve().parent
    if getattr(sys, "frozen", False)
    else Path(__file__).resolve().parent.parent
)
if str(PROJECT_DIR) not in sys.path:
    sys.path.insert(0, str(PROJECT_DIR))

try:
    import uvicorn
    import webview

    from desktop import appconfig, server
except Exception as exc:  # missing packages or a broken build
    try:
        import ctypes

        ctypes.windll.user32.MessageBoxW(
            None,
            "Telegram File Explorer could not start:\n\n"
            f"{exc}\n\nSee explorer.log in:\n{appconfig.HOME}",
            "Telegram File Explorer",
            0x10,
        )
    except Exception:
        pass
    raise SystemExit(1)

CREATE_NO_WINDOW = 0x08000000
SERVER_FILE = appconfig.HOME / "server.json"
WEBVIEW_DIR = appconfig.HOME / "webview"
MUTEX_NAME = "Local\\TelegramFileExplorer"
WINDOW_SIZE = (1380, 880)
WINDOW_MIN_SIZE = (980, 640)
WINDOW_BG = "#1f2024"

log = logging.getLogger("tfe.native")


def setup_logging() -> None:
    appconfig.ensure_dirs()
    root = logging.getLogger()
    if root.handlers:
        return
    root.setLevel(logging.INFO)
    handler = logging.handlers.RotatingFileHandler(
        appconfig.LOG_PATH, maxBytes=1_500_000, backupCount=3, encoding="utf-8"
    )
    handler.setFormatter(
        logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
    )
    root.addHandler(handler)


def message(text: str, error: bool = True) -> None:
    (log.error if error else log.info)("%s", text)
    try:
        import ctypes

        ctypes.windll.user32.MessageBoxW(
            None, text, appconfig.APP_TITLE, 0x10 if error else 0x40
        )
    except Exception:
        pass


def hold_mutex() -> Optional[int]:
    """Return a handle while this process is the only instance."""
    if os.name != "nt":
        return 1
    try:
        import ctypes

        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel32.CreateMutexW.argtypes = [
            ctypes.c_void_p,
            ctypes.c_bool,
            ctypes.c_wchar_p,
        ]
        kernel32.CreateMutexW.restype = ctypes.c_void_p
        kernel32.CloseHandle.argtypes = [ctypes.c_void_p]
        kernel32.CloseHandle.restype = ctypes.c_int
        handle = kernel32.CreateMutexW(None, False, MUTEX_NAME)
        if not handle:
            return 1
        if ctypes.get_last_error() == 183:  # ERROR_ALREADY_EXISTS
            kernel32.CloseHandle(handle)
            return None
        return int(handle)
    except Exception:
        log.exception("Could not create the single-instance mutex")
        return 1


def release_mutex(handle: Optional[int]) -> None:
    if not handle or handle == 1 or os.name != "nt":
        return
    try:
        import ctypes

        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel32.CloseHandle.argtypes = [ctypes.c_void_p]
        kernel32.CloseHandle.restype = ctypes.c_int
        kernel32.CloseHandle(handle)
    except Exception:
        pass


def read_server_file() -> Optional[dict]:
    try:
        data = json.loads(SERVER_FILE.read_text(encoding="utf-8"))
        if isinstance(data, dict) and data.get("url"):
            return data
    except (OSError, ValueError):
        pass
    return None


def ping(url: str, timeout: float = 0.8) -> bool:
    try:
        with urllib.request.urlopen(f"{url}/api/ping", timeout=timeout) as response:
            data = json.loads(response.read().decode("utf-8", "ignore"))
        return data.get("app") == "telegram-file-explorer"
    except Exception:
        return False


def find_running_server() -> Optional[str]:
    data = read_server_file()
    if data and ping(str(data["url"])):
        return str(data["url"])
    return None


def free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def write_server_file(url: str, port: int) -> None:
    payload = {"url": url, "port": port, "pid": os.getpid()}
    tmp = SERVER_FILE.with_suffix(".tmp")
    try:
        tmp.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        os.replace(tmp, SERVER_FILE)
    except OSError:
        log.exception("Could not write %s", SERVER_FILE)


def clear_server_file() -> None:
    data = read_server_file()
    if data and data.get("pid") != os.getpid():
        return
    try:
        SERVER_FILE.unlink(missing_ok=True)
    except OSError:
        pass


def focus_existing_window() -> bool:
    """Bring an already-open Explorer window to the front."""
    if os.name != "nt":
        return False
    try:
        import ctypes
        from ctypes import wintypes

        user32 = ctypes.WinDLL("user32", use_last_error=True)
        callback_type = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)
        found = []

        def visit(hwnd, _):
            if not user32.IsWindowVisible(hwnd):
                return True
            length = user32.GetWindowTextLengthW(hwnd)
            if length <= 0:
                return True
            buffer = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buffer, length + 1)
            if buffer.value.endswith(appconfig.APP_TITLE):
                found.append(hwnd)
                return False
            return True

        user32.EnumWindows(callback_type(visit), 0)
        if not found:
            return False
        hwnd = found[0]
        user32.ShowWindow(hwnd, 9)  # SW_RESTORE
        user32.BringWindowToTop(hwnd)
        user32.SetForegroundWindow(hwnd)
        return True
    except Exception:
        log.exception("Could not focus the existing window")
        return False


def wait_for_server(url: str, thread: threading.Thread, seconds: float = 30.0) -> bool:
    deadline = time.time() + seconds
    while time.time() < deadline:
        if ping(url):
            return True
        if not thread.is_alive():
            return False
        time.sleep(0.25)
    return False


def start_server() -> tuple[Optional[uvicorn.Server], Optional[threading.Thread], Optional[str]]:
    port = free_port()
    url = f"http://127.0.0.1:{port}"
    config = uvicorn.Config(
        server.app,
        host="127.0.0.1",
        port=port,
        log_config=None,
        log_level="info",
        access_log=False,
        lifespan="on",
        timeout_graceful_shutdown=5,
    )
    uv = uvicorn.Server(config)

    def serve() -> None:
        try:
            uv.run()
        except Exception:
            log.exception("The local server stopped unexpectedly")
        finally:
            server.QUIT.set()

    thread = threading.Thread(target=serve, name="tfe-server", daemon=True)
    thread.start()
    if not wait_for_server(url, thread):
        uv.should_exit = True
        thread.join(timeout=5)
        return None, None, None
    write_server_file(url, port)
    log.info("Serving %s", url)
    return uv, thread, url


def open_window(url: str):
    # Explicit coordinates avoid a WebView2 host being left at the WinForms
    # default position (~32767), which renders the whole window blank.
    try:
        import ctypes

        user32 = ctypes.windll.user32
        screen_w = int(user32.GetSystemMetrics(0))
        screen_h = int(user32.GetSystemMetrics(1))
    except Exception:
        screen_w, screen_h = WINDOW_SIZE
    x = max(20, (screen_w - WINDOW_SIZE[0]) // 2)
    y = max(20, (screen_h - WINDOW_SIZE[1]) // 2)
    return webview.create_window(
        appconfig.APP_TITLE,
        url,
        width=WINDOW_SIZE[0],
        height=WINDOW_SIZE[1],
        x=x,
        y=y,
        min_size=WINDOW_MIN_SIZE,
        background_color=WINDOW_BG,
        text_select=True,
    )


def fit_webview_bounds() -> None:
    """Keep the WebView2 host control inside the app window.

    pywebview can leave the WebView2 control at the WinForms default location
    (tens of thousands of pixels off-screen), which makes a healthy app look
    blank. Re-align the host whenever it drifts, including after a resize.
    """
    import ctypes
    from ctypes import wintypes

    user32 = ctypes.windll.user32
    enum_proc = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    swp_flags = 0x0004 | 0x0010 | 0x0040  # NOZORDER | NOACTIVATE | SHOWWINDOW

    class RECT(ctypes.Structure):
        _fields_ = [
            ("left", wintypes.LONG),
            ("top", wintypes.LONG),
            ("right", wintypes.LONG),
            ("bottom", wintypes.LONG),
        ]

    class POINT(ctypes.Structure):
        _fields_ = [("x", wintypes.LONG), ("y", wintypes.LONG)]

    def find_window() -> Optional[int]:
        found = []

        def callback(hwnd, _):
            pid = wintypes.DWORD()
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            if pid.value != os.getpid() or not user32.IsWindowVisible(hwnd):
                return True
            length = user32.GetWindowTextLengthW(hwnd)
            buffer = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buffer, length + 1)
            if buffer.value == appconfig.APP_TITLE:
                found.append(hwnd)
                return False
            return True

        user32.EnumWindows(enum_proc(callback), 0)
        return found[0] if found else None

    last_warning = 0.0
    while not server.QUIT.is_set():
        top = find_window()
        if not top:
            time.sleep(0.5)
            continue
        client = RECT()
        user32.GetClientRect(top, ctypes.byref(client))
        width = client.right - client.left
        height = client.bottom - client.top
        if width < 200 or height < 200 or user32.IsIconic(top):
            time.sleep(0.5)
            continue
        origin = POINT(0, 0)
        user32.ClientToScreen(top, ctypes.byref(origin))
        hosts = []

        def child_callback(hwnd, _):
            name = ctypes.create_unicode_buffer(128)
            user32.GetClassNameW(hwnd, name, 128)
            if name.value.startswith("WindowsForms10.Window"):
                hosts.append(hwnd)
            return True

        user32.EnumChildWindows(top, enum_proc(child_callback), 0)
        for host in hosts:
            rect = RECT()
            user32.GetWindowRect(host, ctypes.byref(rect))
            inside = (
                abs(rect.left - origin.x) <= 2
                and abs(rect.top - origin.y) <= 2
                and abs((rect.right - rect.left) - width) <= 2
                and abs((rect.bottom - rect.top) - height) <= 2
            )
            if inside:
                continue
            user32.SetWindowPos(host, 0, 0, 0, width, height, swp_flags)
            if time.time() - last_warning > 10:
                log.warning("WebView was outside the window; snapped it into place")
                last_warning = time.time()
        time.sleep(0.8)


def watch_window(window, thread: threading.Thread) -> None:
    while True:
        if server.QUIT.is_set() or not thread.is_alive():
            try:
                window.destroy()
            except Exception:
                pass
            return
        time.sleep(0.4)


def run_window(url: str, uv: Optional[uvicorn.Server], thread: Optional[threading.Thread]) -> None:
    window = open_window(url)
    threading.Thread(target=fit_webview_bounds, name="tfe-webview-fit", daemon=True).start()
    if uv is not None and thread is not None:
        threading.Thread(
            target=watch_window, args=(window, thread), name="tfe-window-watch", daemon=True
        ).start()
    webview.settings["ALLOW_DOWNLOADS"] = True
    webview.settings["OPEN_EXTERNAL_LINKS_IN_BROWSER"] = True
    storage = WEBVIEW_DIR if uv is not None else appconfig.HOME / "webview-recovery"
    try:
        webview.start(
            gui="edgechromium",
            private_mode=False,
            storage_path=str(storage),
        )
    except Exception as exc:
        log.exception("The app window could not open")
        message(
            "The embedded app window could not open. If Windows is missing the "
            "WebView2 runtime, install it from Microsoft and try again.\n\n"
            f"Details: {exc}"
        )
    finally:
        if uv is not None:
            server.QUIT.set()
            uv.should_exit = True
            if thread is not None:
                # The vault save runs on the way out.
                thread.join(timeout=20)
                if thread.is_alive():
                    # Open media streams can delay uvicorn's graceful stop.
                    log.warning("Server is still shutting down; forcing it closed")
                    uv.force_exit = True
                    thread.join(timeout=5)
                if thread.is_alive():
                    log.warning("Server did not stop; exiting the process")
                    clear_server_file()
                    os._exit(0)
            clear_server_file()


def stop_local_bot() -> None:
    """Only the cloud server may poll Telegram; a local leftover makes it 409."""
    try:
        result = subprocess.run(
            ["taskkill", "/f", "/im", "TelegramFileBot.exe"],
            capture_output=True,
            creationflags=CREATE_NO_WINDOW,
        )
    except OSError:
        return
    if result.returncode == 0:
        log.info("Stopped a leftover local storage bot")


def run() -> int:
    setup_logging()
    log.info("Starting Telegram File Explorer (native window)")
    stop_local_bot()
    try:
        import cryptg  # noqa: F401

        log.info("cryptg loaded (native AES)")
    except Exception:
        log.warning("cryptg is missing; large media can stall the server")

    existing = find_running_server()
    if existing:
        log.info("Already running at %s", existing)
        if focus_existing_window():
            log.info("Focused the existing window")
        else:
            log.info("No window found; opening a new window for the running server")
            run_window(existing, None, None)
        return 0

    mutex = hold_mutex()
    if mutex is None:
        deadline = time.time() + 20
        while time.time() < deadline:
            existing = find_running_server()
            if existing:
                if not focus_existing_window():
                    run_window(existing, None, None)
                return 0
            time.sleep(0.4)
        message("The app is already starting. Give it a few seconds, then try again.")
        return 1

    try:
        uv, thread, url = start_server()
        if not url:
            message(
                "The local server did not respond. See explorer.log in:\n"
                f"{appconfig.HOME}"
            )
            return 1
        run_window(url, uv, thread)
        log.info("Telegram File Explorer stopped")
        return 0
    finally:
        release_mutex(mutex)


def main() -> None:
    try:
        code = run()
    except Exception as exc:
        log.exception("Fatal launcher error")
        message(f"{exc}\n\nSee explorer.log in:\n{appconfig.HOME}")
        code = 1
    raise SystemExit(code)


if __name__ == "__main__":
    main()
