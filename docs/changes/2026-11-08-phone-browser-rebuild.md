# 2026-11-08 — Phone file browser rebuild (APK 3.13.20)

## What changed
- Files tab has a Folders panel that collapses and expands, and a grid/list toggle that is remembered.
- Folders tab uses a collapsible tree.
- Dark theme (system, light, dark, black) in the More menu, remembered, with no flash on open.
- Keyboard-aware layout: tabs and the upload button hide while typing and sheets stay above the keyboard.
- Details sheet for any file: rename, move folder, edit tags and note. Save writes through to the index.
- Image viewer uses Viewer.js with the thumbnail strip along the top, zoom, 1:1, rotate, flip, reset, prev/next and a 4-second slideshow.
- Player has −10 s / +10 s buttons and double-tap left/right; double-tap centre is play/pause.
- Requests give up after 60 seconds with a clear message instead of spinning forever, and a reset list no longer reuses the previous page cursor.

## Why
The phone UI had only one flat list, no dark mode, and a keyboard that covered the list. Testing on the phone also found three defects: the image viewer's thumbnail strip covered the toolbar, the details sheet clipped its body so Save could not be reached, and a stalled request left the spinner running indefinitely.

## Files
- `desktop/ui/mobile.html`, `desktop/ui/mobile.css`, `desktop/ui/mobile.js` — UI, sheet scrolling, viewer toolbar, request timeout, cache key.
- `android/app/build.gradle` — 3.13.20 (code 50).
- APK copies `assets/ui`; the version code makes the app refresh only those files.

## Verified
- Installed over 3.13.18 with `adb install -r` on the physical phone; the PIN screen and vault stayed, and unlocking showed the full library.
- Folders panel collapses and expands; grid/list toggle survives reopening the app; dark theme applied from More → Appearance.
- Typing hides the tabs and upload button and keeps the list and sheet above the keyboard.
- Details sheet: changed the tag to `testtag`, Save showed "Saved.", the row updated; reopening and clearing it saved `touchmywife` again.
- Image viewer: strip on top, every toolbar button visible, rotate turned the photo sideways, slideshow advanced every 4 seconds and stopped with "Slideshow stopped."
- Player: buffering → playing, +10 s / −10 s jumps, left double-tap went back 10 seconds.
- Docs filter: the library holds ZIPs only, so the PDF and DOCX readers were not exercised on the phone this round.
- In-place installs kept the login, PIN and vault each time.
