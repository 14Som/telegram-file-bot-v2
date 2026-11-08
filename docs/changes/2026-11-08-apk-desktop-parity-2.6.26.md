# 2026-11-08 — APK catches up with the desktop (2.6.26 / 3.13.30)

## What changed
- **Bigger caches.** The stream cache cap goes 2 GiB → 24 GiB, the read-ahead window 192 MiB → 768 MiB (32 MiB blocks), and the thumbnail warmer covers up to 4000 tiles on the phone. Prune runs every 120 s. Playback and previews are served from Telegram through the cache; once a file is watched it replays from disk.
- **Batch rename on the phone.** Select files → More → Rename files. Template field with `{name} {ext} {folder} {date} {nn}` chips and a live server preview; the preview is a dry run, nothing is renamed until "Rename N files".
- **Bulk star assignment on the phone.** Select files → More → Assign stars. Searchable performer list, tick several, create a new performer inline, then Save stars.
- **Tag colours and groups on the phone.** More → Tags → Tag colours and groups. Pick from ten swatches per tag and give it an optional group; the sidebar grouping and colours follow.
- **Thumbnail picker is quicker.** While a pick is being saved the picker stops grabbing the remaining frames, so the "Saving the thumbnail…" state appears immediately instead of after the last frame.
- **Collections refresh from the More tab**, the folders sheet reads `/api/nav`, and folder notes persist.

## Why
The user asked for the whole desktop feature set on the phone, and for caches big enough that browsing, previews and playback always come straight from Telegram without waiting. The endpoint audit found three desktop features missing from the mobile UI (batch rename, bulk stars, tag metadata); the rest were verified as already present or desktop-only (quit, updater, server tooling).

## Files
- `desktop/streamcache.py` — 24 GiB cap, 768 MiB ahead, 32-block passes, 120 s prune gate.
- `desktop/server.py` — `THUMB_WARM_MOBILE_LIMIT = 4000`, version 2.6.26.
- `desktop/ui/mobile.js` — batch rename, bulk stars, tag manager, thumbnail-picker pick guard, collection/nav fixes.
- `desktop/ui/mobile.css` — template chips, batch rows, swatches.
- `desktop/ui/mobile.html` — `mobile.css?v=17`, `mobile.js?v=26`.
- `android/app/build.gradle` — APK 3.13.30 (code 60).
- `TelegramFileExplorer.exe` / `TelegramFileExplorerSetup.exe` — rebuilt at 2.6.26 so the desktop gets the same caches and the shared mobile page; setup payload SHA-256 MATCH.

## Verified on the phone (APK 3.13.30)
- Lock screen lists the vaults with **Main Storage 1** selected; PIN unlocks into All files (2,108 items).
- Videos filter loads; select mode selects rows; More sheet shows Rename files and Assign stars.
- Rename sheet renders the template chips and a live preview (`65.PNG → 65Test 01 65.PNG`); cancelled without renaming anything.
- Assign stars sheet lists performers, searches, and shows the "New performer name / Create" row.
- Thumbnail picker read seven frames with timestamps from `Scary.Movie` (1.8 GB); tapping 19:08 closed the sheet within ~4 s and the row thumbnail switched to that frame.
- Closing the app ran "Saving the library to Telegram…" to completion (~4 min on this network), then exited to the launcher.

## Verified on the desktop (EXE 2.6.26)
- Bundle checks: setup payload SHA-256 MATCH; the app EXE carries `mobile.js?v=26` / `mobile.css?v=17` with batch rename, bulk stars, tag manager and the pick guard; `desktop.streamcache` in the PYZ holds 24 GiB, 768 MiB, 32 and the 120 s prune gate.
- Launched the EXE: it restored the phone's newer snapshot ("Restoring your library…") and opened All files with 2,108 items, Connected / Server online, Main Storage 1. Closed with WM_CLOSE and the process exited after the close save.

## Not changed
No data was renamed or restarred during testing. The tag manager stays hidden while the vault has no tags.
