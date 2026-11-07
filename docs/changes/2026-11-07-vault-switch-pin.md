# 2026-11-07 — Switching vaults now asks for the PIN

## What changed
- Choosing another storage vault now asks for the 4-digit PIN, on both the desktop app and the phone.
- Desktop: the vault menu opens "Switch to <vault>?" with a PIN field. An empty field shows "Enter the 4-digit PIN." and a wrong PIN shows "Wrong PIN." without switching.
- Phone: the Storage vault list opens a "Switch storage" sheet with a numeric PIN field. Empty and wrong PINs show an inline message and keep the sheet open.
- The server checks the PIN itself: `POST /api/vaults/switch` returns "Enter your PIN to switch storage." or "Wrong PIN." (after a short delay) and does not switch the vault.
- The vault picker on the lock screen passes the PIN that was just entered, so unlocking and switching in one step still works.
- Apps with no PIN set switch vaults exactly as before.

## Files
- `desktop/server.py` — switch endpoint requires and verifies the PIN; version 2.6.11.
- `desktop/ui/app.js`, `desktop/ui/index.html` — switch PIN dialog and in-session prompt.
- `desktop/ui/mobile.js`, `desktop/ui/mobile.html` — switch PIN sheet.
- `installer/setup.py` — installer version 2.6.11.
- `android/app/build.gradle` — APK 3.13.9 (code 39).

## Verified
- Desktop EXE, real clicks: dialog appears; empty PIN blocked inline; wrong PIN shows "Wrong PIN." and the vault stays; correct PIN switches Main Storage 1 ↔ Private Storage 1 and the library reloads.
- Direct API call without a PIN returns the "Enter your PIN to switch storage." error and does not switch.
- Phone emulator: More → Storage vault → Main Storage 2 shows the "Switch storage" sheet; empty PIN shows "Enter the 4-digit PIN."; wrong PIN shows "Wrong PIN."; correct PIN switches to Main Storage 2 and back to Main Storage 1.
- Phone close after the test uploaded the library snapshot and exited to the launcher; the leftover staging copy was removed.
