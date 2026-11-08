# 2026-11-08 — Full-screen phone layout (APK 3.13.21)

## What changed
- The app draws edge to edge: the top bar paints behind the status bar and the tab bar paints behind the navigation bar, so no band of background shows at either edge.
- The Android shell no longer pads the WebView. System-bar and cutout insets are forwarded to the page as `--safe-top` / `--safe-bottom` values in CSS pixels, and only the controls that must stay clear of the bars use them.
- Status and navigation bar icons follow the page theme: light icons in dark mode, dark icons in light mode.
- The upload button, image-viewer toolbar, bottom sheet and toast all sit above the navigation bar.
- `layoutInDisplayCutoutMode=SHORT_EDGES` plus transparent bar colours, so the layout uses the full display on notched devices.

## Why
On Android 15+ the system forces edge-to-edge, but the app was still padding its root view and the page also added `env(safe-area-inset-*)`. The result was a duplicated gap at the top and bottom, and light system bars over a dark page.

## Files
- `android/app/src/main/java/com/telegramfileexplorer/mobile/MainActivity.java` — edge-to-edge window setup, inset listener that forwards CSS pixels, `setDarkMode` bridge for bar icons.
- `desktop/ui/mobile.css` — removed the root top padding; top bar, tab bar, upload button, viewer toolbar, sheet and toast use the safe-area variables.
- `desktop/ui/mobile.js` — `applyTheme()` tells the Android shell which bar icons to use.
- `desktop/ui/mobile.html` — bumped asset versions.
- `android/app/build.gradle` — 3.13.21 (code 51).

## Verified
- Installed over 3.13.20 with `adb install -r`; login, PIN, vault and annotations survived.
- Layout bounds: top bar 0–273 px, content 273–2070, tab buttons 2085–2232, navigation bar 2244–2376. Nothing is double-padded.
- Dark theme: status bar shows light icons over the top bar; light theme: whole page turns light with dark icons, then back to dark.
- Search with the keyboard open: tabs hidden, list ends exactly at the keyboard, no clipping.
- Sort sheet is anchored above the navigation bar; image viewer toolbar and thumbnails clear the bars; the PIN keypad ends above the navigation bar.
- Cold start after force-stop still fills the display and loads the full library.
- One observation that is unrelated to this change: after using More → Lock now and unlocking in place, the Files tab stayed on its spinner while Folders loaded normally; a cold restart cleared it. The page scripts are unchanged from 3.13.20.
