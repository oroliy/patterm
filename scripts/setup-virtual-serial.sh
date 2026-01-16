#!/bin/bash

echo "=== Patterm Virtual Serial Port Setup ==="
echo ""

echo "Checking available serial ports..."
ls -la /dev/tty* 2>/dev/null || echo "No /dev/tty* ports found"
ls -la /dev/ttyUSB* 2>/dev/null || echo "No /dev/ttyUSB* ports found"
echo ""

echo "=== Method 1: Using socat (Recommended for testing) ==="
echo "Creating virtual serial port pair: /tmp/ttyV0 <-> /tmp/ttyV1"
echo ""

killall socat 2>/dev/null

socat -d -d -p 12345 pty,link=/tmp/ttyV0,raw,echo=0,waitslave &
SOCAT_PID=$!

sleep 1

echo "✓ Virtual serial port created: /tmp/ttyV0"
echo "✓ Listening on TCP port 12345 (can connect via: telnet localhost 12345)"
echo "✓ Process ID: $SOCAT_PID"
echo ""

echo "=== Usage ==="
echo "1. In Patterm, connect to: /tmp/ttyV0"
echo "2. Open another terminal and connect via: telnet localhost 12345"
echo "   Or: nc localhost 12345"
echo ""

echo "=== Stopping the virtual port ==="
echo "Press Ctrl+C or run: kill $SOCAT_PID"
echo ""

wait $SOCAT_PID
