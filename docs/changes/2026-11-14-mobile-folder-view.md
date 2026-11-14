# Mobile folder view: counts, empty folders, fast loading (2.6.40 / 3.13.44)

Opening Main Storage in the APK could show a spinner that never went away, folder
cards undercounted their contents, and the Folders tab reported "60 shown"
instead of a folder count. The folder tree now loads and draws exactly what the
desktop EXE shows.

- Folder cards use the rolled-up count from the folder tree, so `Books` reads
  "857 files" like the desktop instead of its 5 direct files. This applies to
  the panel above the file list and to the tree.
- While a folder's file list is still fetching, the crumb, the type chips and
  the subfolder panel draw at once from the nav snapshot, with a spinner and
  "Loading files…" underneath. The structure is on screen even on a slow load.
- Slow GETs (8 s or more) start a second request on a fresh socket; whichever
  answer arrives first is used. Dead keep-alive sockets after the phone sleeps
  were the cause of a spinner sitting there for a minute with the folder list
  never painting, while the backend answered instantly.
- Re-entering a folder whose cached page was older than 45 s fetches the page
  again and draws it even when the result matches the cache. The stale-cache
  path no longer leaves the content area empty.
- The Folders tab subtitle uses the folder list length, so it reads
  "161 folders". Inside a folder the subtitle takes the rolled-up file count
  and size from the folder tree, so Backup reads "1,195 files · 563 MB".
- Empty folders explain themselves: "No files in this folder" with a sync hint
  instead of "Library is empty".
- `mobile.html` loads `mobile.js?v=34`; the EXE and APK share the same UI file.

Verified:

- Phone payload and desktop payload are identical: 161 folder entries, 8 roots,
  same parents, rolled-up counts and sizes (8 roots: 1195, 857, 39, 11, 4, 4,
  2, 1 files). A folder-by-folder comparison of the two `/api/nav` responses
  matched with no differences.
- On the realme GT 6T with APK 3.13.44 (versionCode 74) installed over Wi-Fi
  adb: the Files tab shows all 8 root folders with desktop counts (Backup 1195,
  Books 857, Series 2). Backup opens at once with its one subfolder
  "Adani Internship · 1195 files" and the empty-folder message; Adani Internship
  lists week 1–4 (301/354/333/207); week 1 lists Day2–Day5 (40/57/139/60) and
  the five internship PDFs; Series → Fallout S2 opens instantly with its two
  files; Books → ncert books lists 10th–12th and 6th–9th (73/170/233/72/63/80/66)
  plus its direct files. The Folders tab reads "161 folders" and Expand all
  shows the same nested tree as the desktop.
- Rebuilt `TelegramFileExplorer.exe` (md5 `d2328090d48011302d6677e50b917c9e`),
  Setup EXE (md5 `13263177c97db87f69e917397352d2ec`, payload SHA-256 matches the
  app EXE, setup label 2.6.40) and APK 3.13.44 (76,668,706 bytes, md5
  `dcb78a2dd1cf7fec25830839efc90d0a`).
