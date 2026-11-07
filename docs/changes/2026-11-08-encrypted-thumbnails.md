# 2026-11-08 — Preview images are encrypted on disk

## What changed
- Every cached preview image is now written as a `TFEC1` envelope: auto thumbnails, picked covers, star portraits, movie posters, storyboard sheets and picker frames. Renaming a file to `.jpg` no longer shows anything.
- The master key is a random 64-byte value in `thumbs/.thumbkey`. With a PIN set it is stored wrapped (`TFEK1`, PBKDF2-SHA256, 210,000 rounds); without a PIN it is stored bare (`TFEK0`) so the app still opens.
- Unlocking with the PIN unwraps the key into memory; locking drops it. The API serves decrypted JPEGs, so the UI looks the same.
- Covers and star portraits are re-wrapped, not re-encrypted, when the PIN changes or is recovered. A key that does not match the PIN is treated as a fresh start: unreadable artwork is deleted and a new key is made.
- The first unlock migrates the existing cache in place. Anything with an image suffix under `thumbs/` and `cache/thumbpicks/` is sealed and the plaintext is replaced.
- Vault snapshots now carry `thumbs/.thumbkey`, so a second device that has the same PIN can decrypt the restored covers and portraits.
- Snapshot uploads use 512 KiB parts instead of Telethon's 128 KiB default. Close-time saves were timing out at 120 s on a 40 MB snapshot while a video stream shared the link.

## Why
The cache held viewable JPEGs (`.custom.jpg`, posters, portraits) and readable JPEG data behind `.thumb`. Anyone with the PC or the phone could browse the artwork without the PIN. Encryption with the PIN makes the files useless at rest while keeping the picker and thumbnails working after unlock.

## Files
- `desktop/thumbcrypt.py` — new module: envelope cipher, wrapped key file, migration, wipe on key mismatch.
- `desktop/server.py` — key setup on boot, unlock/lock/PIN endpoints drive the key, all preview reads decrypt, all preview writes encrypt; version 2.6.14.
- `desktop/thumbpick.py`, `desktop/storyboard.py` — picker frames and sprite sheets sealed.
- `desktop/vaultstore.py` — seal covers before packing, include the wrapped key, 512 KiB snapshot uploads.
- `installer/setup.py` — installer version 2.6.14.
- `android/app/build.gradle` — APK 3.13.12 (code 42).

## Verified
- Crypto test: round trip, wrong PIN wipes unreadable files, PIN removal leaves a bare key, legacy plaintext migration, restart with a bare key, and 53 bytes of overhead on a 3 MB payload.
- Installed EXE 2.6.14 (hash matches the build): PIN screen, unlocked with 3614, library tiles render from the encrypted cache. Disk audit: 2,581 preview files sealed, zero plain JPEGs, key file `TFEK1`. Lock via API returned 423 for a thumbnail; unlock returned the image.
- Close-time save: `tfe-data-20261108-010024.zip`, 693 files (692 covers/portraits plus the key), uploaded in 77 × 512 KiB chunks in about 30 s and the process exited cleanly.
- APK 3.13.12 on the emulator: unlocked with 3614, library renders, disk audit 1,286 images all `TFEC1`, key file `TFEK1` restored from the desktop snapshot.
