# Vault switch no longer blocked by finished transfers (2.6.29 / 3.13.34)

The vault menu could show "Wait for the current uploads and downloads to finish"
with nothing running, and every other vault row stayed disabled.

Cause: a transfer record keeps `busy = true` until its worker finishes, while its
state is already `done`. The desktop page polls transfers only while something is
active, so if the last poll caught that short window the stale `busy` flag stayed
in `S.transfers` forever. Both the page and the backend treated `busy` as a
blocker even on finished transfers.

- `desktop/tg.py` — `_switch_blocker` now blocks only on active transfer states.
- `desktop/server.py` — `_transfers_busy` (cache clear) now uses the same active
  state list; finished and ready transfers no longer count.
- `desktop/ui/app.js` — `vaultBusyReason` uses transfer state only, and opening
  the vault menu refreshes the transfer list before rendering.
- Version bumped to desktop 2.6.29 and APK 3.13.34 (versionCode 64); index.html
  serves `app.js?v=56`.

Verified on the installed desktop app (2.6.29):

- Guard unit checks: `done` + `busy` → allowed, `uploading` → blocked,
  `paused` → allowed; cache guard allowed `done`/`ready` and blocked `merging`.
- Opened the vault menu on the real vault: no warning note, Main Storage 2 and
  Private Storage 1 enabled.
- Switched to Main Storage 2 (PIN prompt) and back to Main Storage 1; the library
  reloaded both times and the menu stayed unblocked.
- APK 3.13.34 rebuilt; its `assets/ui/app.js` has the fixed guard and
  `app.imy` carries `desktop/server.pyc` with version 2.6.29.
