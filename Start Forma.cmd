@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24 or newer, then run this file again.
  pause
  exit /b 1
)
if not defined PORT set PORT=3003
if not exist node_modules call npm install --no-fund --no-audit
if errorlevel 1 exit /b 1
echo Opening Forma at http://127.0.0.1:%PORT%
start "" "http://127.0.0.1:%PORT%"
node server.mjs
pause
