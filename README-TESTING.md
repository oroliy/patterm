# Testing Patterm with Virtual Serial Ports

## Windows: Using com0com

### 1. Install com0com
Download and install from: https://sourceforge.net/projects/com0com/

### 2. Create Virtual Port Pair
Run the setup utility (usually `C:\Program Files (x86)\com0com\setupc.exe`):

```bash
# Open command prompt as Administrator
cd "C:\Program Files (x86)\com0com"

# Create a pair of virtual ports
.\setupc.exe install PortName=COM10 PortName=COM11

# List installed pairs
.\setupc.exe list
```

### 3. Test the Connection

**Terminal 1:** Run the echo server
```bash
node test-virtual-serial.js COM11
```

**Terminal 2:** Open Patterm
```bash
npm start
```

In Patterm:
1. Click "+ New Connection"
2. Select **COM10** from the port dropdown
3. Set Baud Rate to **9600**
4. Click "Connect"
5. Type messages and press Send - you should see them echoed back!

## Cleanup

To remove the virtual ports:
```bash
cd "C:\Program Files (x86)\com0com"
.\setupc.exe remove 0  # Remove first pair
```

## Alternative: Hardware Loopback

If you have a serial cable, you can create a hardware loopback:
- Connect TX (pin 2) to RX (pin 3)
- Connect RTS (pin 7) to CTS (pin 8)
- Connect DTR (pin 4) to DSR (pin 6) and CD (pin 1)

This will echo everything you send back to yourself.
