@echo off
title Build Telegram File Explorer
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo The virtual environment is missing. Run:
    echo     py -m venv .venv
    echo     .venv\Scripts\python -m pip install -r desktop\requirements.txt
    exit /b 1
)
".venv\Scripts\python.exe" -c "import PyInstaller" >nul 2>&1
if errorlevel 1 (
    echo Installing PyInstaller...
    ".venv\Scripts\python.exe" -m pip install pyinstaller
    if errorlevel 1 exit /b 1
)
echo Checking app dependencies...
".venv\Scripts\python.exe" -m pip install -q -r desktop\requirements.txt
if errorlevel 1 exit /b 1
".venv\Scripts\python.exe" -m PyInstaller --clean --noconfirm --distpath . --workpath build TelegramFileExplorer.spec
if errorlevel 1 (
    echo.
    echo The build failed. See the messages above.
    pause
    exit /b 1
)
echo.
echo Built TelegramFileExplorer.exe in this folder.
echo The storage bot runs on the cloud server; there is no bot EXE to build.
pause
