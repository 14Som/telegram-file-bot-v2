# 2026-11-08 — APK opens in seconds, syncs from Telegram in the background (2.6.26 / 3.13.31)

## What changed
- **The phone no longer waits for the vault snapshot before showing the app.** On a phone that already has its PIN and a local library, the server starts first and the snapshot restore runs as a background task. The PIN screen is usable in ~4 s instead of after the whole ~44 MB download.
- **Restore progress is visible.** `/api/status` reports `vault_restore` (`pending` / `running` / `done`). The phone shows "Syncing the library from Telegram…" under the header while it runs, then refreshes the list and toasts "Library updated from Telegram."
- **An unlocked session stays unlocked.** A snapshot carries its own PIN hash and thumbnail key. Before, finishing a restore re-locked the app mid-browse. Now the restored key is re-unwrapped with the PIN this session already proved, so browsing continues; if the vault holds a different PIN, the app locks and that PIN wins.
- **Faster snapshot transfer.** The restore used `client.download_media` (one 128 KiB stream); it now uses the app's own helper, four parallel 512 KiB streams.
- **Less scanning before the download.** The phone checks the active vault's snapshots first and stops at the first snapshot newer than the one it already applied, instead of walking up to 120 messages in every vault channel.
- **Restore and save share one lock**, so a close-save can never archive a half-written library and a restore can never run over an upload.
- **The thumbnail warmer waits its turn.** It starts 20 s after boot on the phone, fetches at most 400 new thumbnails per run (previously 4000), and pauses while a snapshot upload is in flight. Already-cached tiles are still counted without consuming that budget. This supersedes the 4000 cap in the parity note.

## Why
The user reported the APK taking longer to open and asked whether it depends on the desktop. It does not: Chaquopy runs the same FastAPI backend on `127.0.0.1:8737` with its own Telegram session, and nothing points at the desktop. The delay was the vault snapshot: it was downloaded before the port opened, scanned all vault channels, and competed with a 4000-tile thumbnail warmer.

## Files
- `desktop/vaultstore.py` — shared `_sync_lock()` for restore/save; `_snapshots_for_mobile()`; snapshot download through `service.download_to()`.
- `desktop/server.py` — background mobile restore (`_restore_in_background`), `vault_restore` in `/api/status`, `_settle_lock_after_restore()` + `state.session_pin`, warmer delay/cap/save-pause, catalog invalidation after a restore.
- `desktop/catalog.py` — `invalidate()` drops cached counts after the database file is replaced.
- `desktop/ui/mobile.js` — `watchRestore()` / `restoreTick()` banner and refresh.
- `desktop/ui/mobile.html` — `mobile.js?v=27`.
- `android/app/build.gradle` — APK 3.13.31 (code 61).
- `TelegramFileExplorer.exe` / `TelegramFileExplorerSetup.exe` — rebuilt at 2.6.26 with the same backend; setup payload SHA-256 MATCH (`8d1a2439c3f31b39…`).

## Measured on the realme GT 6T (APK 3.13.31)
- Launch to backend answering `/api/ping`: **7 s, 5 s, 4 s, 4 s** across four cold starts. Before this change it was **~117 s** (82 s of polling after a 45 s delay).
- PIN screen usable at the first measurement; PIN 3614 unlocks into All files with 2,108 items.
- "Syncing the library from Telegram…" banner shows while the library stays browsable; a 44 MB snapshot restores in **31–34 s** in the background.
- When the restore lands: banner clears, list refreshes, "Library updated from Telegram." toast, thumbnails render, app stays unlocked.
- A restore that brings the same PIN no longer returns to the lock screen (verified twice in a row against fresh desktop snapshots).
- Close save still works: the phone uploaded a snapshot (vault stamp 18:12:58) that the desktop then restored on its next launch.

## Verified on the desktop (EXE 2.6.26)
- Rebuilt EXE and setup; setup payload is byte-identical to the app EXE.
- Launched: restored the phone's snapshot (`18:12:58`) in 16.3 s and opened the library; quit with `/api/quit` saved a new snapshot (`18:19:19`) in 32 s.

## Not changed
No PIN, names, folders, stars or tags were edited during testing. Swiping the app out of recents still leaves the cached process frozen before its delayed stop can run; closing with Back saves as before.
