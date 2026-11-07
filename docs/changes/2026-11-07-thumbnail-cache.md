# 2026-11-07 — Thumbnails are cached on disk for every open

## What changed
- A background warmer fills `thumbs/{id}.thumb` for the newest items after unlock, after a sync, and after a vault change, so later opens draw artwork from disk instead of waiting on Telegram.
- The warmer skips files that are already cached, gives way to whatever the user is looking at, pauses when the app is locked, and reports progress in `/api/status` as `thumb_cache`.
- On the phone the warmer stops after 300 downloads per session, so a fresh install does not burn mobile data.
- Thumbnail writes now go through a unique temp file and `os.replace`, so the warmer and a live card request cannot interleave into the same cache file.

## Why
Only about half of the thumb-bearing items were on disk, and vault snapshots deliberately leave ordinary thumbnails out (they keep only picked covers and star portraits). A per-device cache fills that gap, so the library paints immediately on open.

## Files
- `desktop/catalog.py` — `thumb_candidates` and `thumb_candidate_count` paging queries.
- `desktop/server.py` — warmer, cache writes, status reporting, version 2.6.12.
- `installer/setup.py` — installer version 2.6.12.
- `android/app/build.gradle` — APK 3.13.10 (code 40) rebuilt with the shared backend.

## Verified
- Desktop: first open warmed 1,799 of 1,799 items with 0 failures in about 3 minutes; the cache grew to 2,222 files / 58.5 MB. The next open had every thumbnail on disk and the warm finished in seconds. Locking set the warmer idle; unlocking started it again.
- Installed EXE (2.6.12): PIN unlock, `thumb_cache` reported `done` with 1,799 cached, and the library showed artwork on every visible tile.
- Phone (3.13.10): warm ran with `mobile: true` and stopped at the 300-download cap — 480 checked, 480 cached (300 fetched, the rest already on disk), 0 failed; phone thumbs grew to 1,195 files / 53 MB.
