@echo off
setlocal
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"
echo Menjalankan server instan (tanpa build)...
node server/server.js
pause

