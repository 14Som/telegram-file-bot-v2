# 2026-11-07 — App window opens while the vault snapshot restores

## What changed
- The window now opens immediately with a "Opening Telegram File Explorer…" screen and loads the library when the local server is ready, instead of failing after a 30-second wait.
- The loading screen switches to "Restoring your library…" after about 15 seconds, waits up to ten minutes for the restore, and shows an in-window error if the server cannot start.
- Starting the EXE again while the first copy is still restoring brings the existing window forward instead of showing "The app is already starting".
- Snapshot uploads are serialized, so the save after a sync and the save on close no longer upload two 23.7 MB archives at the same time.
- Closing during the loading screen skips the snapshot save: nothing local has changed yet.

## Why
The phone now uploads its library at every close. On the next desktop start the app has to download and unpack that ~23.7 MB snapshot before the server answers. The launcher only waited 30 seconds, decided the server was dead, and exited — so the EXE looked like it was not opening at all.

## Files
- `desktop/native.py` — splash window, startup wait, focus an already-starting window.
- `desktop/vaultstore.py` — one snapshot upload at a time.
- `desktop/server.py` — version 2.6.10.
- `installer/setup.py` — installer version 2.6.10.
- `android/app/build.gradle` — APK 3.13.8 (code 38) rebuilt with the shared backend change.

## Verified
- Source run: window visible right away, vault restore took 39.2 s, library loaded afterwards; close uploaded the snapshot and exited cleanly.
- Second launch focused the open window and exited 0.
- Rebuilt EXE and Setup EXE, installed silently over the copy the desktop shortcut uses (hashes match), `/api/ping` reports 2.6.10, library window open.
