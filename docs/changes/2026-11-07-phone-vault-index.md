# 2026-11-07 — Phone restores the index on open and uploads it on close

## What changed
- The phone app downloads the latest `tfe-data-*.zip` snapshot from the vault when it opens, unpacks it, then overwrites the archive with zeros and deletes it.
- On close (Back), the phone shows "Saving the library to Telegram…", uploads a fresh snapshot to the vault, shreds the staged copy and then exits.
- Snapshots are staged in the app's private storage (`files/home/cache/vault`), never in `Download/Telegram Files`.
- Leftover archives and unpack folders from an interrupted run are shredded on the next launch.
- The phone skips the upload when the vault already has a snapshot newer than the one it applied, so it cannot roll the desktop library back.
- Desktop close now waits for the snapshot upload to finish before the window exits.

## Why
The downloaded index archive lingered in temp storage, and the phone never saved its library back to the vault, so phone changes were lost. The archive should live only as long as the upload/restore needs it.

## Files
- `desktop/vaultstore.py` — private staging, `_shred`, `purge_local_cache`, mobile close-save guard.
- `desktop/server.py` — `/api/vault/save`, close-before-quit save, boot cleanup, version 2.6.9.
- `desktop/native.py` — window `closing` hook that runs the save before exit.
- `desktop/ui/app.js`, `desktop/ui/index.html` — quit screen and close hook.
- `desktop/ui/mobile.js`, `desktop/ui/mobile.html` — close flow and toast.
- `android/app/src/main/java/com/telegramfileexplorer/mobile/MainActivity.java` — `finishApp()` bridge.
- `android/app/build.gradle` — version 3.13.7 (code 37).
- `README.md` — Android index handling.

## Verified
- Emulator: stage folder empty after launch and after close, marker updated to the upload time, `Download/Telegram Files` empty, library and thumbnails intact after reopening.
- Vault read directly: newest snapshot matches the phone upload (23,708,673 bytes).
- Desktop: close completed the 23.7 MB upload and exited cleanly.
