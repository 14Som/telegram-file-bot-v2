# 2026-11-08 — The APK no longer says "The local server did not start."

## What changed
- `android/.../python/main.py`: when the previous uvicorn thread is still running, `start()` now waits for it for up to 10 minutes instead of reporting failure after 60 seconds. It logs "Still waiting for the previous local server to stop" every 20 seconds.
- `desktop/server.py`: the vault restore on startup is wrapped in a 540-second deadline (`VAULT_RESTORE_TIMEOUT`). A stalled Telegram download falls back to the local library instead of keeping the server from ever listening.
- `MainActivity.java`: the 12-second overlay message is now "Syncing the library… this can take a few minutes." instead of "Connecting to Telegram…".
- Versions: APK 3.13.25 (code 55), Explorer EXE and Setup EXE 2.6.23.

## Why
Closing the APK on the PIN screen still triggers the vault save in the shutdown path. That save takes about 75 seconds over Wi-Fi (longer on mobile data). Reopening the app during that window made `main.py` join the old server thread for 60 seconds, then return False, so the overlay showed "The local server did not start." The save finished 11 seconds after the old build gave up. The retry button hit the same 60-second wall until the upload ended.

The restore timeout covers the other way the same message appeared: a stalled snapshot download ran inside uvicorn startup, which never returns and never lets the port open.

## Verified
- Reproduced on the physical phone (3.13.24): close from the PIN screen, reopen 8 seconds later → error overlay at 60 seconds, save landed at 72 seconds.
- Installed 3.13.25, repeated the same close/reopen: overlay showed "Syncing the library… this can take a few minutes.", log showed "Still waiting…" at 20/40/60 seconds, the save landed, and the PIN screen appeared at 72 seconds with no error.
- `main.pyc` and `desktop/server.pyc` inside `assets/chaquopy/app.imy` contain the new strings.
- Desktop EXE 2.6.23 restored the newer phone snapshot on startup and saved a fresh copy on quit; the phone then restored it and opened to the PIN screen.
