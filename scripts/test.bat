@echo off
REM Patterm One-Click Test Script for Windows
REM ==========================================

echo ============================================
echo    Patterm One-Click Test (Windows)
echo ============================================
echo.

REM Change to project root
cd /d "%~dp0.."

echo [INFO] Checking available COM ports...
echo.

REM List COM ports using PowerShell
powershell -Command "[System.IO.Ports.SerialPort]::GetPortNames() | ForEach-Object { Write-Host '  -' $_ }"

echo.
echo ============================================
echo    Virtual Serial Port Setup
echo ============================================
echo.
echo Windows requires additional setup for virtual serial ports.
echo.
echo Option 1: com0com (Recommended)
echo   Download: https://sourceforge.net/projects/com0com/
echo   Create pair: COM10 ^<-^> COM11
echo.
echo Option 2: Use WSL (Windows Subsystem for Linux)
echo   wsl bash scripts/test.sh
echo.
echo Option 3: Use real serial hardware with loopback
echo.
echo ============================================
echo    Testing Instructions
echo ============================================
echo.
echo 1. In Patterm: Click 'New Connection'
echo 2. Enter COM port (e.g., COM10)
echo 3. Click 'Connect'
echo 4. Send test data from paired port (COM11)
echo.
echo ============================================
echo.

set /p START="Start Patterm now? (y/n): "
if /i "%START%"=="y" (
    echo.
    echo [INFO] Starting Patterm...
    npm start
) else (
    echo.
    echo Run 'npm start' manually when ready.
)

echo.
echo [INFO] Test complete. Goodbye!
pause
