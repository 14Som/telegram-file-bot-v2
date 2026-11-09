# Delete folders with their contents (2.6.28 / 3.13.33)

A folder can now be deleted in one step even when it has files and subfolders
inside, and the files are removed from Telegram too.

- `DELETE /api/folders?name=...` deletes the folder, every subfolder below it
  and all of their files from the Telegram vault, then drops the catalog rows.
  There is no Keep/Hide choice anymore.
- Telegram messages are deleted in batches of 100 per call; split-upload parts
  are expanded so every volume goes too.
- The confirmation dialog shows how many files and subfolders will be deleted
  and warns that it cannot be undone, with compact Cancel/Delete buttons on
  both the desktop dialog and the mobile sheet.
- Version bumped to desktop 2.6.28 and APK 3.13.33 (versionCode 63).

Verified:

- Scratch catalog tests: subtree-only delete, sibling-name safety
  (`Test_1` kept when deleting `TestA1`), missing folder returns 404.
- Desktop app on the real vault: created `ZZ Purge Test/Sub`, uploaded a test
  file, confirmed the new dialog copy, clicked Delete; the tree was removed,
  `/api/items?q=zz-purge` stayed empty and an incremental sync imported 0
  (the test message no longer exists in Telegram).
- APK 3.13.33 on the Android 15 emulator: same flow with
  `ZZ Mobile Purge/Sub`; sheet had no radios, only Delete/Cancel, delete
  removed the tree, `/api/nav` had no ZZ folders and sync imported 0.
