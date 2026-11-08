# 2026-11-08 — Stars sheet with portraits (APK 3.13.22)

## What changed
- More → Stars no longer shows a plain list of generic user icons. Each performer is a row with their portrait, name and library summary (`16 files · 15 images`), plus a gold star when favourited.
- Rows are grouped under collapsible A–Z letter headers with a performer count, styled like the folder tree.
- `Expand all` / `Collapse all` buttons; the open letters are remembered in `tfe_star_open`, so the sheet reopens the way it was left.
- The search box still filters the list; while searching, the letter headers are replaced by a flat result list.
- Tapping a performer opens the file list filtered to that star, as before.

## Why
The old sheet was an undifferentiated list, so performers were hard to scan and their portraits (already stored by the desktop catalogue) were not used at all.

## Files
- `desktop/ui/mobile.js` — `openStarsSheet()` rewritten; added `starInitials`, `starLetter`, `starLetters`, `starMeta`, `starAvatar`, `starRow`.
- `desktop/ui/mobile.css` — `.star-search`, `.star-group`, `.star-letter`, `.star-avatar`, `.star-row`, `.star-results`, `.star-fav`.
- `desktop/ui/mobile.html` — asset versions `mobile.css?v=14`, `mobile.js?v=20`.
- `android/app/build.gradle` — 3.13.22 (code 52).

## Verified
- Installed over 3.13.21 with `adb install -r`; PIN, vault and stars survived.
- More → Stars shows portraits and names; 108 performers in 21 letter groups (A–W).
- Collapse all shows the compact letter index; expanding A lists its 12 performers; the state survives closing and reopening the sheet.
- Typing `chloe` shows three flat results (Chloe Amour, Chloe Lapiedra, Chloe Surreal) with portraits.
- Tapping Alexa Payne closed the sheet and opened `Star: Alexa Payne` with 16 files (15 images), matching her row summary.
