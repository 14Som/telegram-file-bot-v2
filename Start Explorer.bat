@echo off
title Telegram File Explorer
cd /d "%~dp0"
if not exist "TelegramFileExplorer.exe" (
    echo TelegramFileExplorer.exe was not found.
    echo Run "Build Explorer EXE.bat" once to create it.
    pause
    exit /b 1
)
start "" "TelegramFileExplorer.exe"
exit /b 0
