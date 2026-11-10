# Uploads slow down under Telegram rate limits instead of stalling (2.6.30 / 3.13.35)

Large batches used to sit still for minutes. Telegram was answering some part
saves with a FloodWait, and every four parallel uploads triggered more of them.
Now the app notices those answers, drops how many files it sends at once, and
sends a stalled file once more before giving up.

- New upload gate replaces the fixed four-slot semaphore. It starts at four
  streams, halves to two and then one when Telegram reports a FloodWait, and
  climbs back to four after 180 quiet seconds.
- A `telethon` log handler watches for FloodWait lines and tells the gate, so
  the back-off happens without failing anything already in flight.
- The 90 s no-progress watchdog now pauses 20 s and re-sends the same file with
  the source kept on disk. Only a second stall cancels it, with a clearer
  message.
- A flood wait counts as activity, so a long Telegram sleep never looks like a
  dead connection and never restarts the file.
- `tg.py` no longer deletes the temp copy when `upload_one` returns, so a retry
  can read it again. Cleanup still happens in the upload runner.
- Version bumped to desktop 2.6.30 and APK 3.13.35 (versionCode 65).

Verified:

- `build/upload-gate-test.py`: gate halves to 1 and floors there, grows back to
  4, the flood handler fires from a Telethon log line, a stalled action is
  re-sent and succeeds, a second stall raises the "twice" error, and a cancel
  during the pause raises TransferCancelled.
- Rebuilt `TelegramFileExplorer.exe` (md5 `62eae2039691d8676ee020ee8a640f55`),
  Setup EXE (payload SHA matches the app EXE, tkinter present) and APK 3.13.35
  (76,654,542 bytes, new symbols inside `app.imy`).
- Installed the EXE after the batch finished; `/api/status` reports 2.6.30.
  A real upload through `/api/upload` finished in 1 s and the test folder was
  deleted again (0 items left).
