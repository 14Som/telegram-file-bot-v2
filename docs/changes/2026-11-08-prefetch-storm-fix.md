# 2026-11-08 — Browsing no longer starves uploads

## What changed
- Hover previews and the details pane ask for `?preview=1`. Those requests only fetch the bytes on screen; they never start the 192 MiB prefetch.
- Storyboards and thumbnail-picker frame grabs also pass `preview=1`, so building tile sprites no longer downloads the film.
- Only one prefetch builder runs at a time. Starting playback on another file cancels the previous builder.
- The 2 GB stream-cache prune now runs every 60 seconds instead of waiting for 256 window fills, so a long browsing session cannot grow the cache past the cap.

## Why
Large uploads were dying at 45–50 MB. The log showed 60 `WinError 121` connection stalls and repeated `GetFileRequest` flood waits: seven prefetch builders were running at once (hover previews, details pane, storyboards), and the cache had reached 6.0 GB while the 2 GB prune never fired. The shared MTProto connection stalled for ~20 seconds at a time, so `saveFilePart` froze long enough for the 90-second watchdog to cancel the upload.

## Files
- `desktop/streamcache.py` — single builder, 60-second prune gate.
- `desktop/server.py` — `preview=1` on `/api/stream` and HEAD; storyboard and thumbnail-picker frame grabs use it; version 2.6.15.
- `desktop/ui/app.js`, `desktop/ui/index.html` — preview URLs for hover, details pane and inline previews (`app.js?v=53`); the player keeps the plain URL.
- `installer/setup.py` — installer version 2.6.15.
- `android/app/build.gradle` — APK 3.13.13 (code 43).

## Verified
- Installed EXE 2.6.15: hovered a video tile for 9 seconds — the cache keys created by the hover held 0 bytes, and the total cache did not move.
- Same build over HTTP: `Range` request with `preview=1` on an uncached item wrote no blocks; the identical request without `preview` started a builder and filled blocks.
- Uploaded a 125,829,120-byte test file while the cache was idle: transfer finished `done` at full size with no stall or error. The test item was then deleted from both the library and Telegram.
- Closing the app wiped `cache/stream`, as before.
- APK 3.13.13 rebuilt; `preview=1` is present in `desktop/server.pyc` inside `app.imy`.
