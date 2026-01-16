#!/bin/bash

echo "Starting Virtual Serial Port for Patterm Testing"
echo "================================================="
echo ""

if [ -z "$1" ]; then
    echo "Usage: $0 <port-path>"
    echo "Example: $0 /tmp/ttyV0"
    exit 1
fi

PORT_PATH="$1"

echo "Creating virtual serial port at: $PORT_PATH"
echo ""

socat -d -d -p 12345 pty,link=$PORT_PATH,raw,echo=0,waitslave &
SOCAT_PID=$!

sleep 2

echo "✓ Virtual serial port created: $PORT_PATH"
echo "✓ TCP listener on port 12345"
echo "✓ Socat PID: $SOCAT_PID"
echo ""
echo "=== IN PATTERM ==="
echo "1. Click 'New Connection'"
echo "2. Select port: $PORT_PATH"
echo "3. Configure settings (baud rate, etc.)"
echo "4. Click Connect"
echo ""
echo "=== TO SEND DATA ==="
echo "Open another terminal and run:"
echo "  telnet localhost 12345"
echo "  or"
echo "  echo 'Hello Patterm!' | nc localhost 12345"
echo ""
echo "Press Ctrl+C to stop the virtual port"
echo ""

trap "echo ''; echo 'Stopping...'; kill $SOCAT_PID; exit" SIGINT SIGTERM

wait $SOCAT_PID
