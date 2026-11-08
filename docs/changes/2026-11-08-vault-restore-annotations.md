# 2026-11-08 — Vault restore no longer wipes stars, tags and notes

## What changed
- A restore now checks the incoming library before using it. If the snapshot has no annotations at all while this device has them, the local stars, star links, tags, notes, favourites, IMDb data and folder names/icons/notes are merged into the restored library. Star links follow `(chat, message)` because two libraries number their rows differently.
- The phone now always restores the vault's snapshot when it has no "applied" marker, instead of trusting its own file times.
- The phone now refuses to save a snapshot when the vault already holds one it has not applied — including when its marker is missing.
- The phone now scans snapshots in every storage vault, not just the vault it reopened on. A snapshot that was skipped because it carried no annotations no longer hides a newer annotated copy in another channel.
- Both apps now switch to the channel that holds the stars, tags and notes. The phone does it after restoring, so a fresh install finds them; the desktop does it before choosing a snapshot, because its local library already knows where the annotations live.
- Taps on the Stars row in the phone's More menu opened the search with `[object PointerEvent]` and listed nothing; the row now opens the star sheet normally.
- Phone logs from all `tfe.*` modules (not just the Android wrapper) now go to logcat.

## Why
Opening the phone app (which keeps its own index) and closing it uploaded an index-only snapshot. The desktop restored that copy on the next launch: the library fell from 2,871 to 2,843 files and every star (109), star link (731), tagged file (88), note (60) and custom folder setting (205) disappeared, although the star portraits were still on disk. The vault kept the pre-incident copy, so the data came back.

The phone kept reopening on its default vault (Main Storage 1), whose newest snapshot was the annotation-free copy already marked as skipped, so restore returned before it reached Private Storage 1 where the stars live. The desktop had the same problem: its default vault is Main, so it opened on the slice with no stars even though the library was intact.

## Files
- `desktop/vaultstore.py` — `_keep_annotations`, `_all_snapshots`, `_follow_annotated_vault`, restore/save branches.
- `desktop/ui/mobile.js` — Stars row handler.
- `desktop/server.py`, `installer/setup.py` — version 2.6.20.
- `android/app/build.gradle` — APK 3.13.18 (code 48), which also refreshes the copied UI files on the phone.
- `build/test_vault_guard.py` — offline restore/save checks.

## Verified
- `build/test_vault_guard.py`: 41 checks pass, including the desktop following the annotated channel before restoring, cross-vault snapshot selection, the skipped-copy guard and the save refusals.
- Emulator, fresh 3.13.18 install over existing data: restored 09:15:03 from Private Storage 1 in about two minutes, switched vaults, marker updated, All files showed 735 items, Folders showed the custom names, More showed Tags 43 and Stars 108, and the star sheet listed all performers.
- Closing the phone app saved `tfe-data-20261108-093316.zip` (808 thumbs) and set the marker to 09:33:16; relaunching downloaded nothing and still switched to Private Storage 1.
- Desktop 2.6.20: booted on Main, logged the switch to Private Storage 1, restored the phone's 09:33:16 snapshot, and after the PIN showed Stars 108, the folder tree with custom names/icons, the tag list and 735 files.
- `desktop/vaultstore.pyc` inside the APK contains the new follow/restore ordering and the "Either app can reopen" docstring.
- Physical phone: 3.13.18 installed over the existing app with `adb install -r`; it opened on the PIN screen, unlocked to the full library, and kept the login, PIN, vault and annotations. The later in-place 3.13.20 install kept them again.
