# Patterm Virtual Serial Port Testing Guide

This guide helps you create virtual serial ports for testing Patterm.

## Method 1: Using socat (Quick and Easy)

### Installation
```bash
sudo apt install socat
```

### Usage
```bash
# In one terminal, run:
bash scripts/setup-virtual-serial.sh

# This will create /tmp/ttyV0 and listen on TCP port 12345
```

### In Patterm
1. Click "New Connection"
2. Refresh ports
3. Select `/tmp/ttyV0`
4. Configure baud rate, etc.
5. Click Connect

### To Send Test Data
```bash
# In another terminal:
telnet localhost 12345

# Or using netcat:
echo "Hello from virtual serial" | nc localhost 12345

# Then type anything, it will be sent to Patterm and echoed back
```

## Method 2: Using Python3 (More Features)

### Installation
```bash
sudo apt install python3-ptyprocess
```

### Usage
```bash
python3 scripts/virtual-serial.py
```

This creates a virtual serial port that echoes back received data with timestamps.

### In Patterm
1. Look at the terminal output for the created port path (e.g., `/dev/pts/0`)
2. Click "New Connection" in Patterm
3. Select the displayed port
4. Connect and start sending data

### Test Commands
After running the Python script:
- Type `1` to send "Hello from virtual port 1!"
- Type `2` to send another test message
- Type `q` to quit
- Type any other text to send it as-is

## Method 3: Simple Python Echo Server

```bash
python3 - << 'EOF'
import pty
import os
import select

master, slave = pty.openpty()
os.chmod(slave, 0o666)

print(f"Virtual port created: {slave}")
print("Connect to this port in Patterm")
print("Press Ctrl+C to stop")

try:
    while True:
        r, _, _ = select.select([master], [], [], 0.1)
        if r:
            data = os.read(master, 1024)
            os.write(master, data)  # Echo back
except KeyboardInterrupt:
    print("\nStopping...")
finally:
    os.close(master)
EOF
```

## Troubleshooting

### Permission Denied
```bash
# Fix permissions:
sudo chmod 666 /tmp/ttyV0

# Or add user to tty group:
sudo usermod -a -G tty $USER
```

### Port Not Listed
```bash
# Check created ports:
ls -la /tmp/ttyV*

# Or check /dev/pts:
ls -la /dev/pts/
```

### Clean Up
```bash
# Kill all socat processes:
killall socat

# Remove virtual port files (if using socat):
rm -f /tmp/ttyV*
```

## Debug Mode

When testing, always keep the Debug Console open (`Ctrl+Shift+D`) to see:
- Tab creation events
- Serial connection status
- Data send/receive operations
- Error messages

This helps identify if issues are in UI, IPC communication, or serial port handling.
