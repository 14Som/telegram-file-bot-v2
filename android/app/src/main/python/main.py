"""Android entry point: runs the same FastAPI backend on 127.0.0.1."""

from __future__ import annotations

import logging
import os
import socket
import threading
import time

log = logging.getLogger("tfe.android")
if not log.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(levelname)s %(name)s: %(message)s"))
    log.addHandler(_handler)
    log.setLevel(logging.INFO)

_server = None
_thread = None
_port = 0
_lock = threading.Lock()


def _listening(port: int) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", int(port)), timeout=0.5):
            return True
    except OSError:
        return False


def _run_server(server) -> None:
    """Run uvicorn and always clear the globals so a retry starts clean."""
    global _server, _thread
    try:
        server.run()
    except BaseException:
        log.exception("The local server stopped with an error")
    finally:
        with _lock:
            if _server is server:
                _server = None
                _thread = None


def start(home: str, ui_dir: str, port: int) -> bool:
    """Start uvicorn once; called from MainActivity on a worker thread."""
    global _server, _thread, _port
    port = int(port)
    os.environ["TFE_HOME"] = str(home)
    os.environ["TFE_PROJECT_DIR"] = str(home)
    os.environ["TFE_UI_DIR"] = str(ui_dir)
    os.environ["TFE_MOBILE"] = "1"
    os.environ["TFE_DEVICE"] = "Android"
    os.makedirs(str(home), exist_ok=True)
    previous, previous_thread = _server, _thread
    if previous_thread is not None:
        alive = previous_thread.is_alive()
        shutting_down = (
            alive
            and previous is not None
            and getattr(previous, "should_exit", False)
        )
        stalled = alive and not shutting_down and not _listening(port)
        if shutting_down or stalled:
            if stalled and previous is not None:
                # A half-started server would take the port back from the
                # replacement once it finally binds.
                log.info("Replacing a stalled local server")
                previous.should_exit = True
            else:
                # Let the old lifespan finish (it saves the vault snapshot)
                # before opening the Telegram session again in this
                # interpreter.
                log.info("Waiting for the previous local server to stop")
            previous_thread.join(timeout=60)
            if previous_thread.is_alive():
                log.error("The previous local server is still shutting down")
                return False
    with _lock:
        if _listening(port):
            log.info("Reusing the running local server on port %s", port)
            return True
        _server = None
        _thread = None
        try:
            import uvicorn

            from desktop.server import app
        except Exception:
            log.exception("Backend import failed")
            return False
        if not any(isinstance(h, logging.StreamHandler)
                   for h in logging.getLogger("uvicorn").handlers):
            handler = logging.StreamHandler()
            handler.setFormatter(
                logging.Formatter("%(levelname)s %(name)s: %(message)s")
            )
            logging.getLogger("uvicorn").addHandler(handler)
        config = uvicorn.Config(
            app,
            host="127.0.0.1",
            port=port,
            log_level="warning",
            access_log=False,
            loop="asyncio",
            lifespan="on",
        )
        _server = uvicorn.Server(config)
        _port = port
        _thread = threading.Thread(
            target=_run_server, args=(_server,), name="tfe-uvicorn", daemon=True
        )
        _thread.start()
        thread = _thread
    # Telegram may need a while to reconnect after a close/reopen cycle.
    deadline = time.time() + 180
    while time.time() < deadline:
        if _listening(port):
            log.info("Local server is listening on port %s", port)
            return True
        if not thread.is_alive():
            log.error("The local server stopped before it started listening")
            return False
        time.sleep(0.25)
    log.error("The local server did not start in time")
    return False


def stop() -> None:
    """Ask uvicorn to shut down so its lifespan can save the vault snapshot."""
    global _server, _thread
    server, thread = _server, _thread
    if server is None:
        return
    server.should_exit = True
    if thread is not None and thread is not threading.current_thread():
        thread.join(timeout=30)
    deadline = time.time() + 10
    while time.time() < deadline and _listening(_port):
        time.sleep(0.2)
    with _lock:
        if _server is server and (thread is None or not thread.is_alive()):
            _server = None
            _thread = None
