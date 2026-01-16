#!/usr/bin/env python3
"""
Virtual Serial Port Generator for Patterm Testing
Creates virtual serial ports that echo received data back
"""

import os
import sys
import time
import select
import threading
from datetime import datetime

try:
    import pty
    import termios
    PTY_AVAILABLE = True
except ImportError:
    PTY_AVAILABLE = False
    pty = None
    termios = None
    print("Warning: pty module not available, using fallback method")


class VirtualSerialPort:
    def __init__(self, name, port_number):
        self.name = name
        self.port_number = port_number
        self.master_fd = None
        self.slave_name = None
        self.running = False

    def create(self):
        if not PTY_AVAILABLE:
            print("✗ PTY module not available")
            return False

        master_fd = None
        slave_name = None

        try:
            master_fd, slave_name = pty.openpty()
            os.chmod(slave_name, 0o666)
            self.master_fd = master_fd
            self.slave_name = slave_name
            print(f"✓ Created virtual serial port: {slave_name}")
            return True
        except Exception as e:
            print(f"✗ Failed to create virtual port: {e}")
            return False

    def start_echo(self):
        self.running = True
        echo_thread = threading.Thread(target=self._echo_loop, daemon=True)
        echo_thread.start()

    def _echo_loop(self):
        while self.running:
            try:
                if self.master_fd is None:
                    break

                r, _, _ = select.select([self.master_fd], [], [], 0.1)
                if r:
                    data = os.read(self.master_fd, 1024)
                    if data:
                        timestamp = datetime.now().strftime("%H:%M:%S")
                        echo_msg = f"[{timestamp}] Echo: {data.decode('utf-8', errors='ignore')}"
                        os.write(self.master_fd, echo_msg.encode('utf-8'))
            except Exception as e:
                if self.running:
                    print(f"Echo loop error: {e}")
                break

    def stop(self):
        self.running = False
        if self.master_fd:
            try:
                os.close(self.master_fd)
                print(f"✓ Closed {self.name}")
            except:
                pass

    def send_test_message(self, message):
        if self.master_fd:
            try:
                os.write(self.master_fd, message.encode('utf-8'))
                print(f"Sent to {self.name}: {message}")
            except Exception as e:
                print(f"Failed to send: {e}")


def main():
    print("=" * 60)
    print("Patterm Virtual Serial Port Generator")
    print("=" * 60)
    print()

    if not PTY_AVAILABLE:
        print("Error: pty module not available. Please install python3-pty process")
        print("  Ubuntu/Debian: sudo apt install python3-ptyprocess")
        sys.exit(1)

    print("Creating virtual serial ports...")
    print()

    port1 = VirtualSerialPort("Port1", 1)
    port2 = VirtualSerialPort("Port2", 2)

    if not port1.create():
        sys.exit(1)

    port_path = port1.slave_name
    print()
    print("Usage in Patterm:")
    print(f"  Connect to: {port_path}")
    print()
    print("Starting echo mode (will echo back received data)...")
    print()

    port1.start_echo()

    try:
        print("Virtual serial port is running. Press Ctrl+C to stop.")
        print()
        print("Test commands:")
        print("  1  - Send test message 1")
        print("  2  - Send test message 2")
        print("  q  - Quit")
        print()

        while True:
            cmd = input("Command > ").strip().lower()

            if cmd == 'q':
                break
            elif cmd == '1':
                port1.send_test_message("Hello from virtual port 1!")
            elif cmd == '2':
                port1.send_test_message("Test message 2 from virtual port")
            elif cmd:
                port1.send_test_message(cmd)

    except KeyboardInterrupt:
        print()
    finally:
        print("Stopping virtual serial ports...")
        port1.stop()
        print()
        print("Goodbye!")


if __name__ == "__main__":
    main()
