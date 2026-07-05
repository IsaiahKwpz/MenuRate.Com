@echo off
title The Local Plate - dev server
cd /d "%~dp0"

rem Refresh PATH in case Node was installed after this shell/Explorer
rem session started - see CLAUDE.md's "Node/PATH quirk" note. Delegates to
rem PowerShell since it reliably reads the machine+user PATH from the
rem registry without needing a fresh login.
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "[System.Environment]::GetEnvironmentVariable('PATH','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('PATH','User')"`) do set "PATH=%%P"

where npm >nul 2>nul
if errorlevel 1 (
  echo Could not find npm even after refreshing PATH.
  echo Try closing this window, opening a brand new terminal, and running "npm run dev" directly.
  pause
  exit /b 1
)

echo Starting The Local Plate on http://localhost:3000 ...
echo (Leave this window open while you're using the site. Close it, or press Ctrl+C, to stop the server.)
echo.

start "" /min cmd /c "timeout /t 3 >nul && start http://localhost:3000"

call npm run dev
