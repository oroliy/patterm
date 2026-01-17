#!/usr/bin/env node
/**
 * Virtual Serial Port Pair for Testing
 * 
 * This script creates a virtual serial port pair for testing the Patterm application.
 * It simulates a simple echo server that receives data and sends it back.
 * 
 * Usage:
 *   node test-virtual-serial.js
 * 
 * On Windows, this requires:
 *   npm install @serialport/binding-mock
 * 
 * Or use a real tool like com0com from: https://sourceforge.net/projects/com0com/
 */

const { SerialPortMock } = require('@serialport/binding-mock');
const { SerialPort } = require('serialport');

// For Windows testing, you can use com0com to create COM port pairs
// Download from: https://sourceforge.net/projects/com0com/
// 
// After installation, use the setup utility to create a pair like:
// COM1 <-> COM2

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         Virtual Serial Port Test Setup for Patterm           ║
╚═══════════════════════════════════════════════════════════════╝

OPTION 1: Use com0com (Recommended for Windows)
────────────────────────────────────────────────────────────────
1. Download: https://sourceforge.net/projects/com0com/
2. Install and run Setup Command Prompt
3. Create a port pair:
   > install PortName=COM10 PortName=COM11
   
4. Test with Patterm:
   - Connect to COM10 in Patterm
   - Run this test script with COM11 to echo data

OPTION 2: Mock Testing (Development Only)
────────────────────────────────────────────────────────────────
For development/testing without hardware, use serialport mock.
This won't show up in Patterm but can be used for unit testing.

════════════════════════════════════════════════════════════════
`);

// Simple echo server example (replace COM11 with your actual port)
const TEST_PORT = process.argv[2] || 'COM11';

console.log(`Attempting to open ${TEST_PORT} as echo server...`);
console.log(`(Make sure this port exists via com0com first)\n`);

try {
    const port = new SerialPort({
        path: TEST_PORT,
        baudRate: 9600,
        autoOpen: true
    });

    port.on('open', () => {
        console.log(`✓ ${TEST_PORT} opened successfully!`);
        console.log(`  Waiting for data to echo back...\n`);
    });

    port.on('data', (data) => {
        const received = data.toString();
        console.log(`← Received: "${received}"`);

        // Echo back with a prefix
        const response = `ECHO: ${received}`;
        port.write(response, (err) => {
            if (err) {
                console.error(`✗ Error writing: ${err.message}`);
            } else {
                console.log(`→ Sent: "${response}"\n`);
            }
        });
    });

    port.on('error', (err) => {
        console.error(`\n✗ Serial port error: ${err.message}`);
        console.log(`\nTroubleshooting:`);
        console.log(`  1. Make sure ${TEST_PORT} exists (check Device Manager)`);
        console.log(`  2. Ensure com0com is properly installed`);
        console.log(`  3. Check that no other program is using ${TEST_PORT}`);
        process.exit(1);
    });

    port.on('close', () => {
        console.log(`\n${TEST_PORT} closed.`);
    });

    console.log(`Press Ctrl+C to stop the echo server.`);

} catch (err) {
    console.error(`\n✗ Failed to create serial port: ${err.message}`);
    console.log(`\nMake sure to install com0com first!`);
    process.exit(1);
}
