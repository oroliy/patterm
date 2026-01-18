# Patterm One-Click Test Script for Windows
# ==========================================
# This script provides a simplified test environment for Patterm on Windows.
# Since Windows doesn't have native virtual serial port support like Linux's socat,
# this script uses com0com or provides alternative testing methods.

param(
    [switch]$Help,
    [switch]$CleanOnly,
    [switch]$Keep,
    [string]$Port = "COM10"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $ProjectRoot

# Colors
$Colors = @{
    Red    = "Red"
    Green  = "Green"
    Yellow = "Yellow"
    Blue   = "Cyan"
}

function Write-ColorLine {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Show-Help {
    Write-ColorLine "Patterm One-Click Test Script for Windows" $Colors.Blue
    Write-Host ""
    Write-Host "Usage: .\test.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "    -Help           Show this help message"
    Write-Host "    -Port COM10     Specify COM port (default: COM10)"
    Write-Host "    -Keep           Keep running after Patterm closes"
    Write-Host "    -CleanOnly      Only show cleanup instructions"
    Write-Host ""
    Write-ColorLine "Prerequisites:" $Colors.Yellow
    Write-Host "    Option 1: Install com0com (Virtual Serial Port Driver)"
    Write-Host "              https://sourceforge.net/projects/com0com/"
    Write-Host ""
    Write-Host "    Option 2: Use a real serial device or USB-to-Serial adapter"
    Write-Host ""
    Write-Host "    Option 3: Use the TCP-based virtual serial (see below)"
    Write-Host ""
    Write-ColorLine "Testing Workflow (with com0com):" $Colors.Yellow
    Write-Host "    1. Install com0com and create pair: COM10 <-> COM11"
    Write-Host "    2. Run this script: .\test.ps1 -Port COM10"
    Write-Host "    3. In Patterm, connect to COM10"
    Write-Host "    4. Use another terminal app to send to COM11"
    Write-Host ""
    Write-ColorLine "Alternative: TCP-based Testing:" $Colors.Yellow
    Write-Host "    1. Run: python scripts/virtual-serial-tcp.py"
    Write-Host "    2. In Patterm, use /tmp/ttyV0 (WSL) or com0com COM port"
    Write-Host ""
}

function Test-Com0Com {
    $com0comPath = "C:\Program Files (x86)\com0com"
    if (Test-Path $com0comPath) {
        return $true
    }
    $com0comPath = "C:\Program Files\com0com"
    if (Test-Path $com0comPath) {
        return $true
    }
    return $false
}

function Get-AvailablePorts {
    Write-ColorLine "=== Available Serial Ports ===" $Colors.Blue
    $ports = [System.IO.Ports.SerialPort]::GetPortNames()
    if ($ports.Count -eq 0) {
        Write-Host "No COM ports found."
        Write-Host ""
        Write-ColorLine "To create virtual ports, install com0com:" $Colors.Yellow
        Write-Host "  https://sourceforge.net/projects/com0com/"
        Write-Host ""
    } else {
        foreach ($port in $ports) {
            Write-Host "  - $port"
        }
    }
    Write-Host ""
}

function Start-Patterm {
    param([switch]$Background)
    
    Write-ColorLine "=== Starting Patterm ===" $Colors.Blue
    
    if ($Background) {
        $process = Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory $ProjectRoot -PassThru -WindowStyle Normal
        Write-Host "[OK] Patterm started (PID: $($process.Id))" -ForegroundColor Green
        return $process
    } else {
        npm start
    }
}

function Show-TestInstructions {
    param([string]$PortName)
    
    Write-Host ""
    Write-ColorLine "=== Patterm is Running ===" $Colors.Blue
    Write-Host ""
    Write-ColorLine "In Patterm:" $Colors.Yellow
    Write-Host "  1. Click 'New Connection' (or press Ctrl+N)"
    Write-Host "  2. Enter port: $PortName" -ForegroundColor Green
    Write-Host "  3. Configure baud rate (default: 115200)"
    Write-Host "  4. Click 'Connect'"
    Write-Host ""
    Write-ColorLine "Send Test Data (with com0com pair COM10<->COM11):" $Colors.Yellow
    Write-Host "  Open another PowerShell and run:"
    Write-Host "    `$port = New-Object System.IO.Ports.SerialPort COM11,115200"
    Write-Host "    `$port.Open()"
    Write-Host "    `$port.WriteLine('Hello Patterm!')"
    Write-Host "    `$port.Close()"
    Write-Host ""
    Write-ColorLine "Or use PuTTY/Tera Term connected to the paired port." $Colors.Yellow
    Write-Host ""
    Write-ColorLine "Stop Testing:" $Colors.Yellow
    Write-Host "  Press Ctrl+C here, or close Patterm window"
    Write-Host ""
}

function Show-SetupInstructions {
    Write-Host ""
    Write-ColorLine "=== Virtual Serial Port Setup for Windows ===" $Colors.Blue
    Write-Host ""
    Write-ColorLine "Option 1: com0com (Recommended)" $Colors.Yellow
    Write-Host "  1. Download from: https://sourceforge.net/projects/com0com/"
    Write-Host "  2. Install and run 'Setup Command Prompt' as Administrator"
    Write-Host "  3. Create port pair: install PortName=COM10 PortName=COM11"
    Write-Host "  4. Patterm connects to COM10, test tool sends to COM11"
    Write-Host ""
    Write-ColorLine "Option 2: WSL (Windows Subsystem for Linux)" $Colors.Yellow
    Write-Host "  1. Install WSL: wsl --install"
    Write-Host "  2. In WSL, run: bash scripts/test.sh"
    Write-Host "  3. Access /tmp/ttyV0 from WSL environment"
    Write-Host ""
    Write-ColorLine "Option 3: Real Hardware" $Colors.Yellow
    Write-Host "  Use a USB-to-Serial adapter and connect TX to RX for loopback"
    Write-Host ""
}

# Main execution
if ($Help) {
    Show-Help
    exit 0
}

if ($CleanOnly) {
    Write-ColorLine "=== Cleanup Instructions ===" $Colors.Blue
    Write-Host "To remove com0com virtual ports:"
    Write-Host "  1. Run 'Setup Command Prompt' as Administrator"
    Write-Host "  2. Type: remove 0"
    Write-Host "  3. Repeat for each port pair"
    Write-Host ""
    exit 0
}

Write-ColorLine "============================================" $Colors.Blue
Write-ColorLine "   Patterm One-Click Test (Windows)        " $Colors.Blue
Write-ColorLine "============================================" $Colors.Blue
Write-Host ""

# Check for com0com
$hasCom0Com = Test-Com0Com
if (-not $hasCom0Com) {
    Write-ColorLine "[!] com0com not detected" $Colors.Yellow
    Show-SetupInstructions
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 0
    }
}

# Show available ports
Get-AvailablePorts

# Show test instructions
Show-TestInstructions -PortName $Port

# Start Patterm
if ($Keep) {
    $process = Start-Patterm -Background
    Write-ColorLine "[!] Patterm running in background. Press any key to show port status..." $Colors.Yellow
    Read-Host
    Get-AvailablePorts
} else {
    try {
        Start-Patterm
    } catch {
        Write-ColorLine "Patterm exited or was closed." $Colors.Yellow
    }
}

Write-Host ""
Write-ColorLine "=== Test Complete ===" $Colors.Blue
Write-Host "Goodbye!"
