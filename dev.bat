@echo off
setlocal
title BREWSPACE - Next.js Development Server
cd /d "%~dp0"

set "PATH=C:\Program Files\nodejs;%PATH%"

if not exist "node_modules\next" (
  echo Menginstal dependensi Next.js...
  call npm install
)

call npm run dev
pause
