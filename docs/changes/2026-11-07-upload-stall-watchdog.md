# 2026-11-07 — Uploads stop when Telegram goes silent

## What changed
- Every upload now runs under a watchdog. If the byte counter stays still for 90 seconds while a file is in the `uploading` state, the upload is cancelled and the transfer shows an error instead of hanging.
- The watchdog waits while a file is queued behind other uploads or still being split, so those states never count as a stall.
- The limit is 90 seconds (`UPLOAD_STALL_SECONDS`), checked every 3 seconds.

## Why
Telethon sends each save-part request and waits for the reply with no timeout. When the connection died mid-upload (WinError 121, then a second drop) the task waited forever: the bar froze, no error was logged, the file never reached the vault, and the close-time vault snapshot timed out behind it. The 383 MB upload that exposed this had been sitting at the same point for about 15 minutes.

## Files
- `desktop/server.py` — `_watch_transfer`, used by both the single and split upload paths; version 2.6.13.
- `installer/setup.py` — installer version 2.6.13.
- `android/app/build.gradle` — APK 3.13.11 (code 41) with the same backend.

## Verified
- `build/test_watch.py`: a stalled transfer is cancelled with the retry message, a progressing one runs to completion, and a queued one is not cancelled. All three pass.
- Installed EXE (2.6.13), real clicks: re-sent the file that had been stuck. Transfer `t179…-0` finished `done` at 383,716,070 / 383,716,070 bytes with no error.
- Catalog now holds the file in Private Storage 1 / `Private Videos` (message 966), and the app shows it as a 366 MB video tile.
- APK 3.13.11 rebuilt; `desktop/server.pyc` inside the release APK contains the watchdog code.
- Phone (3.13.11, emulator): the app installed, the PIN screen opened, and after unlocking the library loaded with Main Storage 1 and its artwork. Cold start took about 38 seconds; the first two attempts stalled while both devices were talking to Telegram, and the retry after a two-minute pause came up normally.
