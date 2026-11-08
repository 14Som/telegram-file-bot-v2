# 2026-11-08 — Setup EXE rebuilt from the 2.6.26 app EXE

The committed `TelegramFileExplorerSetup.exe` was built at 17:52, before the final
2.6.26 app EXE, so it embedded an older payload (its `desktop/ui/mobile.js` was
1,258 bytes smaller than the shipped one). A fresh install from it produced an
app that differed from the published EXE.

What changed:

- `TelegramFileExplorerSetup.exe` rebuilt from the current
  `TelegramFileExplorer.exe`; embedded payload sha256 `8d1a2439c3f31b39` now
  matches the app EXE byte for byte, and a silent install writes an installed
  EXE with the same md5 `8bf1182a74831742807c8c5c626914a3`.
- Build note: the setup **must** be built with the system Python
  (`C:/Users/AMD/AppData/Local/Programs/Python/Python313/python.exe`). The
  project venv's PyInstaller 6.22.3 silently drops `tkinter` (Analysis reports
  `missing module named tkinter`), which yields a 24-entry installer that dies
  with `ModuleNotFoundError: No module named 'tkinter'`. With the system
  Python the build collects 953 entries including `_tcl_data` and starts fine.

Verify a build before shipping:

```
python -m PyInstaller --noconfirm --clean --distpath dist --workpath build/pyi-setup build/TelegramFileExplorerSetup.spec
./TelegramFileExplorerSetup.exe --silent --no-launch
```

Then confirm the setup archive holds the payload hash above and the installed
`%LOCALAPPDATA%\Programs\TelegramFileExplorer\TelegramFileExplorer.exe` md5
matches the repo EXE, and `/api/status` on the live app reports `2.6.26`.

Not changed: the app itself is identical to the 2.6.26 build already verified;
only the installer was rebuilt.
