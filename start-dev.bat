@echo off
setlocal

if "%~1"=="" (
  set "PORT=8081"
) else (
  set "PORT=%~1"
)

echo Starting sudoku server on port %PORT% ...
start "sudoku-server" cmd /k "set PORT=%PORT%&& npm run server"

timeout /t 2 /nobreak >nul

echo Starting vite dev client ...
start "sudoku-client" cmd /k "npm run dev"

echo.
echo Both started in separate windows. Close those windows to stop.
echo Client URL: http://localhost:5173
echo Server: ws://0.0.0.0:%PORT%
endlocal
