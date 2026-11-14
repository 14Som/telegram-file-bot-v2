# Mobile: the retry request now really races (2.6.41 / 3.13.45)

The phone page starts a second request on a fresh socket when a GET takes more
than 6 seconds, so a dead keep-alive socket can no longer leave a screen
waiting. That retry was built but never awaited: the race was set up over the
first request only, so the second socket answered into nothing and the screen
still waited for the old one (up to the 60 s timeout). Every slow request now
joins the race, and the first answer wins.

- `api()` in `desktop/ui/mobile.js` collects attempts as they start and settles
  as soon as one succeeds; failures are only reported when every attempt has
  failed.
- `mobile.html` loads `mobile.js?v=35`.
- Main Storage 2 verified against the desktop EXE for the same vault: 5 folders,
  same parents and rolled-up counts (4, 86 → 86 of which 63 direct → 8, 15),
  90 items, 185,084,946 bytes,
  8 hidden, 83 images and 7 documents. The two `/api/nav` responses matched
  entry by entry.

Verified:

- EXE and Setup EXE rebuilt (2.6.41). The Setup EXE embeds the built app EXE:
  payload SHA-256 equals the app EXE's
  (`4accdec93118ad3f30fa44c4c96b08fdd380c2ed845513d87d133659eddd9e42`).
- APK 3.13.45 (versionCode 75), 76,668,898 B, installed over Wi-Fi adb. Its
  `assets/ui/mobile.js` carries the new race and `mobile.html` asks for
  `mobile.js?v=35`; `app.imy` reports server 2.6.41.
- EXE md5 `c9f4ff108224d8de1213b7e7748687f9`, Setup md5
  `fcc9d91b0e2d25ca9e3d8fbb07c7f189`, APK md5
  `10c42d55f8faffdcc2ad313a591cec18`.
