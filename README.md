# Telegram File Explorer

Turn a Telegram channel into a personal file library on Windows. Files live in
**Telegram's cloud**; the app keeps them organized. A local SQLite index holds names,
folders, tags and notes, and a native Windows app lets you browse, preview, upload and
download everything without a browser and without Bot API size limits.

Two parts, and either one is optional:

- **Telegram File Explorer** — the Windows desktop app (the main way to use this)
- **Storage bot** — a chat bot for the same archive (`/search`, `/get`, …), running on
  an always-on server

**Version 2:** the Explorer no longer starts or stops the bot. Open the app and use it;
the bot runs on the cloud server by itself. That is the same on every PC. The title bar
shows **Server online** while the server's bot is checking in (it updates every minute);
click the chip for the last heartbeat, bot version and the file count it indexes.

## Quick start (Windows)

1. Download `TelegramFileExplorerSetup.exe` from
   [Releases](https://github.com/14Som/telegram-file-bot-v2/releases/latest) — it
   installs the app for your user, no admin rights needed. The build is
   unsigned, so SmartScreen shows an unknown-publisher warning: *More info → Run
   anyway*. Already have `TelegramFileExplorer.exe`? Run that instead; it works on
   its own.
2. Double-click **Telegram File Explorer** and sign in with the **QR code**: Telegram
   on your phone → Settings → Devices → *Link Desktop Device*. The *Phone code* tab
   works too.
3. Choose the private channel that holds your files — or create a new storage vault
   right in the app.
4. Set a 4-digit PIN when asked — it locks the app on every launch. If you forget
   it, **Forgot PIN?** on the lock screen sends a 6-digit code to Saved Messages in
   your Telegram account; enter it to set a new PIN.
5. To open a different storage vault, use **Storage vault** on the lock screen
   before entering. The dropdown in the title bar still switches vaults later.

That's all. Needs Windows 10/11 (WebView2 is built into Windows 11). The app's server
listens on `127.0.0.1` only and never leaves your PC.

If your library was saved to the vault channel before, it comes back automatically on
launch — folders, names, tags, notes, favorites, thumbnails and settings.

## Two PCs, one account

The same Telegram account works on as many PCs as you like. Each PC signs in on its
own, then sees the same vaults and files. Nothing about the bot is installed or
started on a PC — it lives on the server, so setup is identical everywhere.

1. On the second PC run `TelegramFileExplorerSetup.exe`.
2. Open the app and sign in with the same account, then choose your vault.
3. Close and open the app once more — the library is restored from the vault at
   startup, so the first launch only signs in.

Avoid syncing from both PCs at the same moment: each close writes a backup of the
library and the newest one wins.

Telegram allows only one running bot. If an old copy of the app (version 1) left a
`TelegramFileBot.exe` running, the Explorer stops it at launch so the server's bot
keeps working.

## 24/7 on a free Oracle VM

The bot only answers while its host runs. Oracle Cloud's Always Free tier keeps it
online without leaving a PC on — it hosts the bot only; the Explorer stays local and
needs no bot setup at all.

1. Create an Oracle Cloud account with home region **Mumbai** or **Hyderabad**
   (Always Free resources cannot change region later; signup asks for phone and
   card verification, but the micro shape and its storage stay free).
2. Create a VM: **Ubuntu 24.04**, shape **VM.Standard.E2.1.Micro**, and paste the
   public key from `build/oracle-vm-key.pub` (create one with
   `ssh-keygen -t ed25519 -f build/oracle-vm-key`).
3. Reserve a public IPv4 (Networking > Reserved public IPs) and assign it to the
   instance's primary private IP, so the address survives stop/start.
4. In this folder run **Setup Cloud VM.bat** and paste that public IP
   (or call `deploy\push.ps1 -VmHost <public-ip>` directly).
5. Send `/stats` to the bot in Telegram. The Explorer's **Server online** chip turns
   green within a couple of minutes and keeps showing the bot's heartbeat.

The script copies `.env` straight over SSH (never through chat or git), uploads
`data\files.db`, installs `telegram-file-bot` as a systemd service, and restarts it
on boot. Logs:
`ssh -i build/oracle-vm-key ubuntu@<public-ip> "sudo journalctl -u telegram-file-bot -f"`.
The bot itself needs no inbound ports; SSH (22) is only used for deployment. If
Oracle stops the VM for being idle, start it again from the console; the index
survives on the boot volume.

## What the app does

- **Browse** All files, Recent, Favorites and Hidden; restore files you removed
- **Folders** — nested, with emoji icons, notes, and a collapsible sidebar tree;
  folder cards show a collage of up to four images from inside the folder, and
  Move opens the same hierarchy as a searchable tree to pick the destination
- **Search & filters** — text, tag, type, size, date, notes-only; seven sort orders,
  including by star
- **Stars** — a Stash-style index of the performers in your library. Give each star a
  portrait, details and aliases, then assign files from a file's **Stars** menu or
  select several and use **Stars** in the bulk bar. The Stars page lists every file
  they appear in; search matches names and aliases. *Look up online* fills the details
  and portrait from IAFD (Wikipedia when IAFD has nothing)
- **IMDb details** — select a movie file and use **IMDb** (or its **⋯** menu) to look
  it up by name. The app fills title, year, rating and votes, genres, runtime,
  director, writers, cast, plot, country, language and poster, and shows them in the
  preview pane with a rating badge on the tile. *Add the cast to Stars* links the
  actors to your star catalogue and gives new stars an IMDb portrait. **Remove** clears
  the details; the poster is kept across syncs and vault restores. Details come from
  IMDb, one lookup per click
- **Previews** — video plays in a Video.js player that resumes where you stopped,
  steps to the next/previous video, shows seek-preview thumbnails on the progress
  bar and adjusts playback speed. Images open in Viewer.js with zoom, pan,
  rotate, flip, one-to-one size, slideshow and a thumbnail strip for stepping
  through the folder. Videos with a poor Telegram cover can get a new one from
  *Thumbnail*: five frames are pulled from the stream and you keep the one you
  like, or shuffle for five more taken from random points; the pick is kept
  across syncs, sign-outs and vault restores. MKV, HEVC and other formats
  the built-in player can't decode can be opened in **mpv** instead. PDF and text
  preview inline; downloads keep the original filename
- **Read documents** — EPUB/EPUB3, FB2, PDF, DOC/DOCX, HTML/HTM/XML, Markdown and
  TXT open in a built-in reader. Books get a contents panel and page turning; PDFs
  get page and zoom controls. Reading position and text size are remembered per
  file. Legacy `.doc` files are converted with Microsoft Word the first time and
  cached on the PC
- **Hover previews** — in tiles view, rest the mouse on a video tile to play a short
  muted loop from the middle of the clip; image tiles zoom. Leaving the tile stops it
- **3D & CAD files** — STL, 3MF (including Bambu Studio projects), OBJ and PLY open
  in a built-in 3D viewer: drag to orbit, wheel to zoom, right-drag to pan, and save
  the current view as the file's thumbnail. A thumbnail is rendered automatically the
  first time a model is shown; right-click a model and choose *Generate 3D thumbnail*
  to render it again. STEP, IGES, Solid Edge (`.par`, `.psm`, `.asm`) and other CAD
  documents open in their Windows app in one click; models and CAD files can also use
  the Windows shell thumbnail
- **File details** — *File details* on a file shows type-aware metadata: triangle
  counts and bounding-box dimensions for models, 3MF title, designer and slicer,
  image EXIF, video specs, and CAD title, author and revision
- **Collections, saved views & tags** — group files into collections that cut across
  folders, save the current search and filters as a view in the sidebar, give tags a
  colour, and let **Continue** pick up the files you were watching
- **Large libraries** — long lists scroll endlessly, search matches per-word
  prefixes, and *Rename* renames a batch with `{name}`, `{ext}`, `{folder}`,
  `{date}` and `{nn}` templates; revisions of the same CAD file are grouped together
- **Library reports** — *Duplicate files* finds identical copies to clean up, and
  *Storage report* shows what takes space by type, collection and file
- **Shortcuts** — press `?` for a keyboard cheat-sheet
- **Uploads** — drag & drop files or whole folder trees with per-file progress;
  cancel a running upload from the Uploads panel. Video, audio and image files are
  recognized from their content (even without a file extension) so they preview and
  stream. Anything above Telegram's
  2 GB limit (4 GB with Premium) is split into parts automatically and rejoined
  with one click, up to 64 GB
- **Faster transfers** — downloads pull several 512 KB ranges at once, and uploads
  send up to three files (or split volumes) in parallel, so large files don't wait
  on round-trip time
- **Fix old uploads** — right-click a file that was stored as a plain document and
  pick *Fix video streaming…* to download it and send it again as playable media
- **Bulk actions** — Ctrl-click, Shift-click or Ctrl+A, then Download ZIP, Favorite,
  Move, Copy links or Delete (up to 300 files at once)
- **Themes** — System, Light, Dark, Mica, Acrylic
- **Clear cache** — the bin button next to the lock deletes the local stream cache,
  auto thumbnails, storyboards and poster images (your picked covers and star
  portraits stay). Files you open again are re-fetched from Telegram as needed.
- **Keyboard** — arrows move, Enter opens, F2 renames, Delete removes, Ctrl+F
  searches, Alt+←/→ goes back/forward. In the viewer: Space/K play-pause, ←/→ 5 s,
  J/L 10 s, M mute, F fullscreen, N/P next or previous file. In the reader:
  ←/→ or N/P page or turn the page, +/- text size (PDF zoom), Esc closes
- **Automatic backup** — on close and after every sync, the index, settings and your
  picked covers/star portraits are zipped into the vault channel (newest 10 kept,
  older copies deleted automatically, hidden from the file list). Thumbnails and
  posters are rebuilt on demand instead of being uploaded.
- **Multiple vaults** — keep different content in separate private channels. Click the
  vault name in the title bar to switch, scan for vaults, or create a new one: enter a
  name and the app makes the private channel in Telegram for you. The storage bot is
  invited and promoted to admin automatically. Each vault has its own files, folders
  and library backup. Use the pencil next to a vault to rename it — the Telegram channel
  title changes too — or to pick an icon that tells the vaults apart.

## The bot (runs on the server)

The bot answers Telegram commands for the same archive. It runs once, on the Oracle
VM from *24/7 on a free Oracle VM* above; the Explorer does not carry it, start it or
stop it. Quitting the app leaves the bot online.

While it runs, the bot keeps one pinned message in your private chat with it, marked
`#tfeheartbeat` and refreshed every minute. The Explorer reads that message over your
own Telegram session — no port on the VM, no token on the PC — and shows **Server
online** in the title bar. If the heartbeat stops, the chip turns amber (*Server
delayed*), then red (*Server offline*); the app itself keeps working because files and
vaults live in Telegram.

To run it on a PC instead (for example while setting it up, never alongside the
server):

1. [@BotFather](https://t.me/BotFather) → `/newbot` → copy the token
2. [@userinfobot](https://t.me/userinfobot) → copy your numeric ID
3. Copy `.env.example` to `.env` and fill in `BOT_TOKEN` and `OWNER_ID`
4. `py -m venv .venv`, then `pip install -r requirements.txt`, then
   `.venv\Scripts\python bot.py`

Two copies polling at once make Telegram answer `409 Conflict`, so stop one first.

| Command | What it does |
|---|---|
| `/menu` | tappable menu for everything below |
| `/search <text>` | find files by name, caption, tag or category |
| `/get <id>` | send a stored file back to you |
| `/recent` `/favorites` `/cat <name>` `/tag <name>` | browse lists, paged and sortable |
| `/rename` `/move` `/retag` `/delete` | edit one file — or tap ⚙️ next to it instead |
| `/saveas <name>` | choose the name for your next upload before sending it |
| `/stats` `/backup` `/export [csv\|json]` | overview, snapshot now, download the index |
| `/source` | zip of the whole project (code, launchers, deploy scripts, index) — never the token |
| `/vault [sync]` | vault status; `sync` copies older files into the channel |

The bot works **only in a private chat** and only for `OWNER_ID`; group messages are
ignored. In any chat, typing `@YourBot <query>` searches your archive inline.

## Vault channel (second copy + library backup)

1. Create a **private channel** in Telegram
2. Add the bot as an **administrator** with *Post messages* rights — it DMs you a
   ready-to-paste `VAULT_CHAT_ID=-100...` line
3. Add that line to `.env` and restart the bot

New uploads are copied automatically; `/vault sync` copies the older ones. The Explorer
uses the same channel to store its library archive, which is what makes a fresh PC a
one-QR-scan restore.

The Explorer can use several storage vaults (see *Multiple vaults* above). Creating a
vault there needs no bot and no BotFather step — the signed-in Telegram account makes
a private channel directly. The storage bot is found in your existing vaults' admin
lists and added as an admin of each new vault automatically; **Add storage bot** in the
vault menu repairs older vaults. The bot itself stays on the single channel in `.env`.

## Optional media tools

Two optional helpers are downloaded only when you use them, straight from their
official GitHub releases and verified by checksum before use:

| Tool | Used for | Where it goes |
|---|---|---|
| ffmpeg | seek-preview thumbnail sheets | `%APPDATA%\TelegramFileExplorer\tools\ffmpeg` |
| mpv | playing MKV, HEVC and other formats the built-in player can't decode | `%APPDATA%\TelegramFileExplorer\tools\mpv` |

Nothing is uploaded; the tools run on your PC against the same local stream the app
uses. You can skip both — the app plays video and images without them.

## Where your data lives

| Location | Contents |
|---|---|
| `%LOCALAPPDATA%\Programs\TelegramFileExplorer\` | installed app |
| `%APPDATA%\TelegramFileExplorer\` | login session, `library.db`, settings, thumbnails, log |
| VM `~/telegram-file-bot/data/files.db` | the bot's index, plus `data\backups\` (latest 14, written daily) |
| VM `~/telegram-file-bot/.env` | your bot token — never share it, never commit it |

The Explorer never reads `BOT_TOKEN`, and your login session is never uploaded anywhere.

## Build from source

Run `Build Explorer EXE.bat` — it installs PyInstaller into `.venv` and writes
`TelegramFileExplorer.exe` to the project folder. Then `Build Installer.bat` wraps it
into `TelegramFileExplorerSetup.exe`. Desktop dependencies:
`pip install -r desktop\requirements.txt`. The bot is deployed from source with
**Setup Cloud VM.bat**, not built as a Windows EXE.

## Limits & safety

- Telegram allows 2 GB per file (4 GB with Premium); the app splits anything larger
- Legacy `.doc` reading needs Microsoft Word installed; `.docx` does not
- `/delete` removes the index entry only — the message in your chat is the actual copy
- A restored index works only with the **same bot token**, because Telegram file IDs
  are bot-specific. With a new bot, re-send the files to rebuild it
- If your token ever leaks, revoke it in @BotFather and put the new one in `.env`
