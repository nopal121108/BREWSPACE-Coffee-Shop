@echo off
setlocal
title BREWSPACE - Coffee Shop Management
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"

echo ========================================================
echo   BREWSPACE - Coffee Shop Management System
echo ========================================================
echo   PILIH CARA MENJALANKAN SERVER:
echo ========================================================
echo   [1] Next.js Mode (React + App Router + Tailwind)
echo   [2] Instant Mode (Langsung Nyala Tanpa Download npm)
echo ========================================================
set /p mode="Ketik pilihan (1 atau 2, default 1 lalu tekan Enter): "
if "%mode%"=="2" goto INSTANT

:NEXTJS
if not exist "node_modules\next" (
  echo.
  echo [1/2] Menginstal paket Next.js...
  echo       (Pastikan komputer Anda terhubung ke internet)
  call npm install
  if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [PERHATIAN] Gagal mengunduh paket via npm.
    echo Anda bisa menjalankan [2] Instant Mode jika ingin langsung jalan.
    pause
    exit /b %ERRORLEVEL%
  )
)
echo.
echo [2/2] Menjalankan Next.js di http://localhost:3000 ...
call npm run dev
goto END

:INSTANT
echo.
echo Menjalankan server mandiri di http://localhost:3000 ...
node server/server.js
goto END

:END
pause
