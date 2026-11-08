# 2026-11-08 — Closing the phone no longer loses its changes

## What changed
- The phone's close save now waits up to 620 seconds for `/api/vault/save` (the shared helper aborted every call at 60 seconds). The save itself has always had 600 seconds on the server; only the browser-side wait was too short.
- A save that takes 1–3 minutes now finishes before the app closes, so the snapshot reaches the vault instead of being retried by the slower shutdown path.
- Version 2.6.22 / APK 3.13.24 (code 54).

## Why
On this connection a snapshot upload takes about 100 seconds. The phone's close request aborted at 60 seconds, showed "The app took too long to answer", and finished the activity; the newer snapshot never appeared in the vault, and the desktop kept restoring the previous one. That is how changes made on the phone could disappear.

## Files
- `desktop/ui/mobile.js` — `closeApp()` passes `timeout: 620000` to the save call.
- `desktop/server.py` — version 2.6.22 (save timeout was already `VAULT_SAVE_TIMEOUT = 600`).
- `installer/setup.py` — installer version 2.6.22.
- `android/app/build.gradle` — APK 3.13.24 (code 54).

## Verified on both devices
- Phone: added tag `phonecheck1255` to an item, pressed Back. The "Saving the library to Telegram…" overlay stayed up for 96 seconds, then the app closed; the vault close-guard on the desktop confirmed a newer copy arrived.
- Desktop: reopened and restored snapshot `2026-11-08T12:53:19`; the item showed `touchmywife phonecheck1255`.
- Desktop: removed the test tag, closed (saved `12:58:25`), reopened the phone. The phone restored that snapshot in 144 seconds and showed only `touchmywife`.
- The tag edit was reverted and the test folder/item from the earlier run were removed from the library and Telegram.
- Reopening the phone right after a close now starts normally (9 seconds to `/api/ping` when nothing changed; 144 seconds when a 45 MB restore is needed).
