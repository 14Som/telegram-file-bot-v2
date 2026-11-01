@echo off
title Build Telegram File Explorer Setup
cd /d "%~dp0"
if not exist "TelegramFileExplorer.exe" goto missing
if not exist ".venv\Scripts\python.exe" (
    echo The virtual environment is missing. Run "Build Explorer EXE.bat" first.
    exit /b 1
)
".venv\Scripts\python.exe" -c "import PyInstaller" >nul 2>&1
if errorlevel 1 (
    echo Installing PyInstaller...
    ".venv\Scripts\python.exe" -m pip install pyinstaller
    if errorlevel 1 exit /b 1
)
echo Building TelegramFileExplorerSetup.exe...
rem The venv cannot find the base install's Tcl data on its own, so PyInstaller
rem would silently drop tkinter. Point it at the base install.
".venv\Scripts\python.exe" -c "import sys;print(sys.base_prefix)" > "%TEMP%\tfe-base.txt"
set /p BASEPY=<"%TEMP%\tfe-base.txt"
del "%TEMP%\tfe-base.txt" >nul 2>&1
if not exist "%BASEPY%\tcl\tcl8.6" (
    echo Tcl/Tk was not found under "%BASEPY%".
    pause
    exit /b 1
)
set "TCL_LIBRARY=%BASEPY%\tcl\tcl8.6"
set "TK_LIBRARY=%BASEPY%\tcl\tk8.6"
".venv\Scripts\python.exe" -m PyInstaller --clean --noconfirm ^
    --onefile --windowed ^
    --name TelegramFileExplorerSetup ^
    --icon "%CD%\desktop\ui\app.ico" ^
    --add-data "%CD%\TelegramFileExplorer.exe;payload" ^
    --add-data "%CD%\desktop\ui\app.ico;." ^
    --distpath "%CD%\build\setup" --workpath "%CD%\build\setup-work" --specpath "%CD%\build" ^
    installer\setup.py
if errorlevel 1 (
    echo.
    echo The build failed. See the messages above.
    pause
    exit /b 1
)
copy /y "build\setup\TelegramFileExplorerSetup.exe" "TelegramFileExplorerSetup.exe" >nul
echo.
echo Built TelegramFileExplorerSetup.exe in this folder.
pause
exit /b 0

:missing
echo TelegramFileExplorer.exe must exist in this folder.
echo Run "Build Explorer EXE.bat" first.
pause
exit /b 1
