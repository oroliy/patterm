# Patterm Testing Scripts

This directory contains scripts for creating virtual serial ports to test Patterm.

## Quick Start

### Option 1: Create Virtual Port (Recommended)

```bash
# Create a virtual port at /tmp/ttyV0
bash scripts/create-virtual-port.sh /tmp/ttyV0
```

Then in Patterm:
1. Click "New Connection"
2. Refresh ports list
3. Select `/tmp/ttyV0`
4. Configure and Connect

### Option 2: Python Virtual Serial Port

```bash
# Install pty process (if needed)
sudo apt install python3-ptyprocess

# Run the virtual serial port generator
python3 scripts/virtual-serial.py
```

The script will display the created port path (e.g., `/dev/pts/0`).

Connect to this port in Patterm and use commands:
- `1` - Send test message 1
- `2` - Send test message 2
- `q` - Quit
- Type anything else to send it directly

### Option 3: Quick Python Script

```bash
bash scripts/quick-virtual-serial.sh
```

Simple echo server that creates a virtual port and echoes back received data.

## Testing Commands

### Sending Data from Terminal

After connecting Patterm to the virtual port:

```bash
# Using telnet (socat method)
telnet localhost 12345

# Using netcat
echo "Hello from terminal!" | nc localhost 12345

# Interactive mode
nc localhost 12345
# Then type messages and they'll appear in Patterm
```

### Monitoring Data

Always keep the Debug Console open (`Ctrl+Shift+D`) when testing to see:
- Tab creation events
- Serial connection status
- Data send/receive operations
- Error messages

## Troubleshooting

### Port Not Listed in Patterm

```bash
# Check created ports
ls -la /tmp/ttyV*
ls -la /dev/pts/

# Refresh ports list in Patterm connection dialog
```

### Permission Denied

```bash
# Fix permissions
sudo chmod 666 /tmp/ttyV0

# Or check ownership
ls -la /tmp/ttyV0
```

### Port Already in Use

```bash
# Kill existing socat processes
killall socat

# Or find and kill specific port
fuser -k /tmp/ttyV0
```

### Clean Up

```bash
# Stop all socat processes
killall socat

# Remove virtual port files
rm -f /tmp/ttyV*

# Kill Python scripts
pkill -f virtual-serial.py
```

## Debug Tips

1. **Always use Debug Console** (`Ctrl+Shift+D`) to see detailed logs
2. **Check serial permissions** if connection fails
3. **Verify port exists** before connecting
4. **Test with real hardware** after virtual port testing succeeds
5. **Monitor system logs** for additional error information:
   ```bash
   dmesg | tail -50
   journalctl -xe
   ```

## Common Issues and Solutions

### Issue: "Failed to connect to bus" errors
**Solution**: Ignore these - they're from Electron trying to use system D-Bus and don't affect functionality

### Issue: Connection failed but tab was created
**Solution**: This was fixed in the latest commit. Tab creation now only happens after successful connection

### Issue: Tab not visible after connection
**Solution**:
1. Check debug console for tab:created events
2. Verify port is correct
3. Try refreshing the port list and reconnecting

## Advanced Testing

### Random Log Generator

Continuously sends random log messages with different log levels to test terminal display:

```bash
# Default: port 12345, interval 0.5-2.0s
bash scripts/random-logger.sh

# Custom settings
bash scripts/random-logger.sh 12345 localhost 0.3 1.0

# Fast logging for stress testing
bash scripts/random-logger.sh 12345 localhost 0.1 0.3

# Slow logging for readability
bash scripts/random-logger.sh 12345 localhost 1.0 3.0
```

**Log Levels**: INFO (green), WARN (yellow), ERROR (red), DEBUG (cyan)

**Stop**: Press Ctrl+C

### Automated Test Script

```bash
# Create virtual port and send test messages
bash scripts/create-virtual-port.sh /tmp/ttyTest &

# Wait for port to be ready
sleep 2

# Send test data
echo "Test message 1" | nc localhost 12345
sleep 1
echo "Test message 2" | nc localhost 12345
sleep 1
echo "Test message 3" | nc localhost 12345
```

### Multiple Virtual Ports

```bash
# Terminal 1
bash scripts/create-virtual-port.sh /tmp/ttyV1 &

# Terminal 2
bash scripts/create-virtual-port.sh /tmp/ttyV2 &

# Terminal 3
bash scripts/create-virtual-port.sh /tmp/ttyV3 &

# Then create 3 tabs in Patterm and connect to each port
```
