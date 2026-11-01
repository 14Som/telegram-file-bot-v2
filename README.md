# Telegram File Bot v2

Turn a private Telegram channel into a personal file library: files and folders live
in **Telegram's cloud**, the Explorer on Windows browses, previews, uploads and streams
them, and an always-on **storage bot** answers from Telegram anywhere.

This is the version 2 line. Version 1 carried the bot inside the Windows app;
version 2 splits the two for good:

- **Explorer** — a native Windows window (WebView2) over a local FastAPI server, with
  its own MTProto login. It never starts, stops or ships the bot.
- **Storage bot** — one long-lived poller on a free Oracle Cloud VM. It indexes what
  you send it and serves the same archive through chat commands.
- **Server chip** — the title bar shows **Server online**, read from the bot's own
  heartbeat, so you can see at a glance that the server side is alive.

Open the app and use it. There is nothing to start, no bot process on any PC, and one
setup works the same on every computer.

## What version 2 changes

| v1 | v2 |
|---|---|
| Bot chip in the title bar, Start/Stop actions | Removed — the bot lives on the server |
| `TelegramFileBot.exe` built and shipped with the app | Not built or installed; the installer deletes stale copies |
| App supervised the bot and fought `409 Conflict` if two copies ran | Single poller on the VM, protected by systemd + `flock` |
| Installer asked for a bot token and wrote `.env` | Installer only installs the Explorer |
| No visibility into the server | **Server online / delayed / offline** chip with details |
| `?v=` assets 21 | 22 |

## Architecture

```
                    ┌──────────────────────────────────┐
                    │          Telegram cloud          │
                    │  files · vault channel · bot chat │
                    │        (pinned #tfeheartbeat)     │
                    └───────┬──────────────────┬───────┘
                 MTProto    │                  │   Bot API (long polling)
          ┌─────────────────┘                  └────────────────┐
          │                                                     │
┌─────────▼──────────────┐                        ┌──────────────▼─────────────┐
│ Windows · Explorer     │                        │ Oracle VM · Ubuntu 24.04   │
│ FastAPI on 127.0.0.1   │   reads the pinned     │ telegram-file-bot (systemd)│
│ WebView2 window        │◄──status over your─────│ SQLite index + backups     │
│ local SQLite index     │   own Telegram session │ daily db backup            │
│ vault snapshot upload  │                        │ no inbound ports needed    │
└────────────────────────┘                        └────────────────────────────┘
```

- **Files** are Telegram messages in a private channel; the Explorer streams them over
  MTProto, so playback starts without a full download.
- **The index** (names, folders, tags, notes, favorites, artwork) is SQLite on each PC,
  and is packed into `tfe-data-*.zip` snapshots in the vault channel on every close so a
  new PC restores itself after a QR sign-in.
- **The bot** keeps its own SQLite index of what was sent to it and answers `/search`,
  `/get`, `/stats` and the rest. It runs only on the VM.
- **The heartbeat** is one pinned message in the owner's private chat with the bot,
  edited once a minute with `{"version","ts","files","uptime"}`. The Explorer reads it
  with the owner's own session — no HTTP port on the server, no bot token on the PC.

## Quick start (Windows)

1. Download `TelegramFileExplorerSetup.exe` from
   [Releases](https://github.com/14Som/telegram-file-bot-v2/releases/latest). It installs
   for your user, no admin rights needed. The build is unsigned, so SmartScreen shows an
   unknown-publisher warning: *More info → Run anyway*. The standalone
   `TelegramFileExplorer.exe` works without the installer too.
2. Open **Telegram File Explorer** and sign in with the **QR code**: Telegram on your
   phone → Settings → Devices → *Link Desktop Device*. The *Phone code* tab works too.
3. Choose the private channel that holds your files — or create a new storage vault in
   the app. New vaults are created in Telegram for you, with the storage bot invited as
   an admin.
4. Set a 4-digit PIN when asked. It locks the app on every launch; **Forgot PIN?** on the
   lock screen sends a 6-digit code to Saved Messages in your Telegram account so you can
   set a new one.
5. Done. The title bar shows **Connected** (this PC ↔ Telegram) and **Server online**
   (the bot on the VM).

Needs Windows 10/11. The local server binds to `127.0.0.1` only and uses a per-run
session cookie; nothing on the PC listens to the network.

## Two or more PCs

Each PC signs in with the same Telegram account and sees the same vaults and files.
Nothing about the bot is installed or started on a PC:

1. Run `TelegramFileExplorerSetup.exe` on the second PC.
2. Sign in, choose the vault.
3. Close and open the app once — the library snapshot is restored on the next launch.

Avoid closing two PCs at the same moment: each close uploads a snapshot and the newest
one wins.

## Always-on bot on a free Oracle VM

The bot only answers while its host runs. Oracle Cloud's Always Free tier keeps it
online without leaving a PC on.

1. Create an Oracle Cloud account with home region **Mumbai** or **Hyderabad** (Always
   Free resources cannot change region later; signup asks for phone and card
   verification, but the micro shape and its storage stay free).
2. Create a VM: **Ubuntu 24.04**, shape **VM.Standard.E2.1.Micro**, and paste the public
   key from `build/oracle-vm-key.pub` (create one with
   `ssh-keygen -t ed25519 -f build/oracle-vm-key`).
3. Reserve a public IPv4 (Networking → Reserved public IPs) and assign it to the
   instance's primary private IP so the address survives stop/start.
4. Create `.env` from `.env.example` with your `BOT_TOKEN` and `OWNER_ID`. Send `/start`
   to the bot once so it is allowed to message you.
5. Run **Setup Cloud VM.bat** and paste the public IP (or call
   `deploy\push.ps1 -VmHost <public-ip>`). The script copies the code and `.env` over
   SSH, installs `telegram-file-bot.service`, enables it at boot and restarts it.
6. Send `/stats`. The Explorer's **Server online** chip turns green within a minute.

The bot needs no inbound ports; SSH (22) is used only for deployment. Logs:

```bash
ssh -i build/oracle-vm-key ubuntu@<public-ip> "sudo journalctl -u telegram-file-bot -f"
```

If Oracle stops an idle VM, start it from the console; the index survives on the boot
volume. Only one bot may poll a token — the service holds `flock`, and the Explorer kills
a leftover v1 `TelegramFileBot.exe` at launch.

## The server chip

| Chip | Meaning |
|---|---|
| **Server online** (green) | heartbeat younger than 3 minutes |
| **Server delayed** (amber) | 3–15 minutes old — restarting or network hiccup |
| **Server offline** (red) | older than 15 minutes |
| **Server silent** | the bot has never checked in |
| **Server unknown** | the Explorer could not read the heartbeat (sign-in or network) |

Click the chip (or *Settings → Server details…*) for the last heartbeat, bot version,
number of files the bot indexes and its uptime. The Explorer keeps working whatever the
chip says: files and vaults are Telegram's, not the server's.

## The bot

Runs once, on the VM. Commands work only in the private chat with you (`OWNER_ID`);
group messages are ignored. Inline search works in any chat with `@YourBot <query>`.

| Command | What it does |
|---|---|
| `/menu` | tappable menu for everything below |
| `/search <text>` | find files by name, caption, tag or category |
| `/get <id>` | send a stored file back to you |
| `/recent` `/favorites` `/cat <name>` `/tag <name>` | browse lists, paged and sortable |
| `/rename` `/move` `/retag` `/delete` | edit one file — or tap ⚙️ next to it instead |
| `/saveas <name>` | choose the name for your next upload before sending it |
| `/stats` `/backup` `/export [csv\|json]` | overview (with version and uptime), snapshot now, download the index |
| `/source` | zip of the whole project — never the token |
| `/vault [sync]` | vault status; `sync` copies older files into the channel |

Send files, photos, videos, audio, voice notes or stickers and they are indexed
automatically. To run the bot on a PC temporarily (never alongside the VM):

```bat
py -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python bot.py
```

Two pollers on one token make Telegram answer `409 Conflict`.

## Vault channel

A private channel that keeps a second copy of uploads and holds the Explorer's library
snapshots:

1. Create a **private channel**.
2. Add the bot as an **administrator** with *Post messages* rights — it DMs you a
   ready-to-paste `VAULT_CHAT_ID=-100...` line.
3. Put that line in `.env` and restart the service (`sudo systemctl restart
   telegram-file-bot`).

The Explorer can use several **storage vaults**. Click the vault name in the title bar
to switch, scan for others, or create one: the app makes the private channel, picks the
icon and invites the storage bot as admin. Each vault has its own files, folders, tags
and library backup. The bot itself stays on the single channel in `.env`.

## Explorer features

- Browse *All files*, *Recent*, *Favorites*, *Hidden*; endless scrolling on big libraries
- Nested folders with emoji icons, notes, a collapsible tree and collage covers
- Search with filters (tag, type, size, date, notes), seven sort orders
- Stars catalogue with portraits, aliases and IAFD lookup; IMDb details for movie files
  with rating badges and one-click cast import
- Video in Video.js with resume, seek-preview thumbnails, speed control and mpv fallback;
  images in Viewer.js with zoom, pan, slideshow; PDF and text inline
- Hover previews on tiles, thumbnail picker, folder ZIP download
- STL / 3MF / OBJ / PLY in a built-in 3D viewer; STEP, IGES and Solid Edge open in their
  Windows app; type-aware file details (EXIF, video specs, model dimensions, CAD metadata)
- Collections, saved views, coloured tags, duplicates and storage reports
- Drag & drop uploads with per-file progress and cancel; automatic split/merge up to
  64 GB; parallel transfers for speed
- Bulk actions up to 300 files; keyboard shortcuts throughout
- Themes: System, Light, Dark, Mica, Acrylic; cache clearing; 4-digit PIN with
  Telegram-code recovery
- Automatic vault snapshots of the index, settings and hand-picked artwork

## Where your data lives

| Location | Contents |
|---|---|
| `%LOCALAPPDATA%\Programs\TelegramFileExplorer\` | installed app |
| `%APPDATA%\TelegramFileExplorer\` | login session, `library.db`, settings, thumbnails, log |
| Telegram private channel(s) | the files themselves and `tfe-data-*.zip` snapshots |
| VM `~/telegram-file-bot/data/files.db` | the bot's index, plus `data/backups/` (latest 14) |
| VM `~/telegram-file-bot/.env` | bot token — never share or commit it |

The Explorer never reads `BOT_TOKEN`; the bot token never leaves the server. The MTProto
session is never uploaded — a new PC signs in with a QR code in seconds.

## Build from source

```bat
pip install -r desktop\requirements.txt
"Build Explorer EXE.bat"      :: writes TelegramFileExplorer.exe
"Build Installer.bat"         :: wraps it into TelegramFileExplorerSetup.exe
```

`Build Explorer EXE.bat` installs PyInstaller into `.venv` first if needed. The bot is
not built as an EXE in v2 — deploy it with **Setup Cloud VM.bat**.

## Project layout

```
bot.py                 storage bot (polling, commands, heartbeat)
config.py              .env loader (token, owner, vault, data dir)
database.py            bot index: schema, search, stats, backups
deploy/install.sh      systemd unit, venv, service install
deploy/push.ps1        upload code + .env over SSH, run install.sh
desktop/               Explorer: FastAPI server, MTProto service, catalog
  server.py            API routes, session cookie, lock/mutation guard
  serverstatus.py      reads the pinned heartbeat for the server chip
  tg.py                Telethon client, vaults, uploads, downloads
  catalog.py           local library database
  vaultstore.py        library snapshots in the vault channel
  ui/                  WebView2 front end (no build step)
installer/setup.py     per-user installer, uninstaller
TelegramFileExplorer.spec  PyInstaller recipe
```

## Limits & safety

- Telegram allows 2 GB per file (4 GB with Premium); larger files are split and rejoined
  (up to 64 GB)
- `/delete` removes the index entry; the Telegram message is the actual copy
- A restored bot index works only with the same bot token — Telegram file IDs are
  bot-specific
- The bot only serves its owner, and the Explorer mutating routes require the per-run
  cookie plus `X-TFE: 1`
- If a token leaks, revoke it in @BotFather and update `.env` on the server
- Lookups (IMDb, IAFD, Wikipedia) run one request per user action; nothing else phones
  home

## Version history

- **2.0** — bot moved to the server; Explorer never starts/stops it; installer simplified;
  **Server online** indicator via the bot heartbeat; assets `?v=22`
- **1.x** — earlier single-package app with the bot inside the Explorer window

## Licence

The application code is provided as-is for personal use. Bundled open-source components
keep their own licences (`desktop/bin/License.txt`, `desktop/ui/vendor/*/LICENSE`).
