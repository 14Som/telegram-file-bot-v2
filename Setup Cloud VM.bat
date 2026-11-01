@echo off
title Telegram File Bot - Cloud VM Setup
cd /d "%~dp0"

if not exist "deploy\push.ps1" goto missing
if not exist "build\oracle-vm-key" (
    echo The SSH key is missing. Create it first:
    echo     ssh-keygen -t ed25519 -f build\oracle-vm-key
    pause
    exit /b 1
)
if not exist ".env" (
    echo .env is missing from this folder.
    pause
    exit /b 1
)

echo.
echo 1. In Oracle Cloud, create an Ubuntu 24.04 VM with shape
echo    VM.Standard.E2.1.Micro and paste this public key:
echo.
type "build\oracle-vm-key.pub"
echo.
echo 2. Wait for the instance to show Running, then copy its Public IP.
echo.
set /p VMIP=Public IP of the VM: 
if "%VMIP%"=="" exit /b 1
for /f "tokens=*" %%a in ("%VMIP%") do set VMIP=%%a

powershell -NoProfile -ExecutionPolicy Bypass -File "deploy\push.ps1" -VmHost "%VMIP%"
echo.
pause
exit /b 0

:missing
echo deploy\push.ps1 is missing. Run this from the project folder.
pause
exit /b 1
