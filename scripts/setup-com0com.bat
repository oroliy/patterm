@echo off
REM com0com Virtual Serial Port Configuration Script
REM ================================================
REM This script helps set up com0com virtual serial port pairs for Patterm testing.
REM
REM Prerequisites:
REM   1. Download com0com from: https://sourceforge.net/projects/com0com/
REM   2. Install com0com (signed driver recommended for Windows 10/11)
REM   3. Run this script as Administrator
REM
REM The script will create a port pair: COM10 <-> COM11
REM   - Patterm connects to COM10
REM   - Test tools send data to COM11

setlocal EnableDelayedExpansion

echo ============================================
echo   com0com Virtual Port Configuration
echo ============================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] This script requires Administrator privileges.
    echo         Right-click and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

REM Find com0com installation
set COM0COM_PATH=
if exist "C:\Program Files (x86)\com0com\setupc.exe" (
    set "COM0COM_PATH=C:\Program Files (x86)\com0com"
) else if exist "C:\Program Files\com0com\setupc.exe" (
    set "COM0COM_PATH=C:\Program Files\com0com"
)

if "%COM0COM_PATH%"=="" (
    echo [ERROR] com0com is not installed.
    echo.
    echo Please download and install com0com from:
    echo   https://sourceforge.net/projects/com0com/
    echo.
    echo For Windows 10/11, use the signed driver version.
    echo.
    pause
    exit /b 1
)

echo [OK] Found com0com at: %COM0COM_PATH%
echo.

REM Show current ports
echo === Current Virtual Port Pairs ===
"%COM0COM_PATH%\setupc.exe" list
echo.

echo === Configuration Options ===
echo   1. Create port pair COM10 ^<-^> COM11
echo   2. Create port pair COM20 ^<-^> COM21
echo   3. Create custom port pair
echo   4. Remove all virtual ports
echo   5. List current ports
echo   6. Exit
echo.

set /p CHOICE="Select option (1-6): "

if "%CHOICE%"=="1" (
    echo.
    echo Creating COM10 ^<-^> COM11 pair...
    "%COM0COM_PATH%\setupc.exe" --silent install PortName=COM10 PortName=COM11
    if !errorLevel! equ 0 (
        echo [OK] Successfully created COM10 ^<-^> COM11
        echo.
        echo Usage:
        echo   - Patterm: Connect to COM10
        echo   - Test data: Send to COM11
    ) else (
        echo [ERROR] Failed to create port pair.
        echo         The ports may already exist or be in use.
    )
    goto :done
)

if "%CHOICE%"=="2" (
    echo.
    echo Creating COM20 ^<-^> COM21 pair...
    "%COM0COM_PATH%\setupc.exe" --silent install PortName=COM20 PortName=COM21
    if !errorLevel! equ 0 (
        echo [OK] Successfully created COM20 ^<-^> COM21
    ) else (
        echo [ERROR] Failed to create port pair.
    )
    goto :done
)

if "%CHOICE%"=="3" (
    echo.
    set /p PORT_A="Enter first port name (e.g., COM10): "
    set /p PORT_B="Enter second port name (e.g., COM11): "
    echo.
    echo Creating !PORT_A! ^<-^> !PORT_B! pair...
    "%COM0COM_PATH%\setupc.exe" --silent install PortName=!PORT_A! PortName=!PORT_B!
    if !errorLevel! equ 0 (
        echo [OK] Successfully created !PORT_A! ^<-^> !PORT_B!
    ) else (
        echo [ERROR] Failed to create port pair.
    )
    goto :done
)

if "%CHOICE%"=="4" (
    echo.
    echo [WARNING] This will remove ALL virtual port pairs.
    set /p CONFIRM="Are you sure? (y/n): "
    if /i "!CONFIRM!"=="y" (
        REM Remove ports 0-9
        for /L %%i in (0,1,9) do (
            "%COM0COM_PATH%\setupc.exe" --silent remove %%i 2>nul
        )
        echo [OK] All virtual ports removed.
    ) else (
        echo Cancelled.
    )
    goto :done
)

if "%CHOICE%"=="5" (
    echo.
    echo === Current Virtual Port Pairs ===
    "%COM0COM_PATH%\setupc.exe" list
    goto :done
)

if "%CHOICE%"=="6" (
    goto :exit
)

echo Invalid option.

:done
echo.
echo === Updated Port List ===
"%COM0COM_PATH%\setupc.exe" list
echo.

:exit
echo.
pause
