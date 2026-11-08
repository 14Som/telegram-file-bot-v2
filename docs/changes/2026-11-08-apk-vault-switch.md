# 2026-11-08 — The phone can switch vaults again

## What changed
- Opening **More → Storage vault** on the phone listed nothing and ended with
  "The app took too long to answer." The sheet asked the server for a full
  Telegram rescan every time; on a phone connection that scan can sit on one
  stalled request for minutes, and it held the vault list lock meanwhile.
- The phone now shows the vaults already known to the app at once (the list
  travels inside the library snapshot). A **Refresh list** row runs the
  Telegram scan only when asked, and the scan is capped at 45 seconds so a
  stalled request can no longer keep the vault list blocked.
- Switching a vault now allows up to three minutes for a slow connection
  instead of failing at one.
- Desktop: the same server change applies; its vault menu already listed the
  known vaults and its refresh button is now bounded too.

## Files
- `desktop/tg.py` — `list_vaults` returns the registry without scanning,
  `_publish_vaults` helper, `VAULT_SCAN_TIMEOUT = 45`, version 2.6.24.
- `desktop/ui/mobile.js`, `desktop/ui/mobile.html` — cached list plus a
  "Refresh list" row, 3-minute switch timeout, script `?v=21`.
- `installer/setup.py` — installer version 2.6.24.
- `android/app/build.gradle` — APK 3.13.26 (code 56).

## Verified
- Phone (APK 3.13.26, code 56): More → Storage vault opens at once with
  Private Storage 1, Main Storage 1 and Main Storage 2. Tapping Main Storage 2
  opens the Switch storage PIN sheet; PIN 3614 switches the vault, the header
  and library reload, and the same steps switch back to Private Storage 1.
  The phone's secure keyboard blanks screenshots while typing the PIN; the
  sheet itself is fine.
- Refresh list finishes in a few seconds and returns the same three vaults.
- Desktop 2.6.24 (EXE and Setup rebuilt; the Setup payload matches the EXE
  byte for byte): the vault list answers in 17 ms on the first call and 2 ms
  cached, after a snapshot restore took 147 s on this connection.
