#!/usr/bin/env python3
"""
Virtual Serial Port for Windows Testing
========================================
Uses pyserial to create a TCP-to-Serial bridge for testing Patterm.

This script creates a TCP server that bridges to a virtual/real serial port,
allowing you to send test data to Patterm.

Requirements:
    pip install pyserial

Usage:
    1. If you have com0com installed:
       python virtual-serial-win.py --port COM10
       
    2. TCP-only mode (no real serial port needed):
       python virtual-serial-win.py --tcp-only --tcp-port 12345
       
    3. With real serial port:
       python virtual-serial-win.py --port COM3 --baud 115200
"""

import argparse
import socket
import threading
import time
import sys
import os

try:
    import serial
    import serial.tools.list_ports
    PYSERIAL_AVAILABLE = True
except ImportError:
    PYSERIAL_AVAILABLE = False
    print("Warning: pyserial not installed. Install with: pip install pyserial")


class VirtualSerialBridge:
    """TCP to Serial bridge for testing"""
    
    def __init__(self, serial_port=None, baud_rate=115200, tcp_port=12345, tcp_only=False):
        self.serial_port = serial_port
        self.baud_rate = baud_rate
        self.tcp_port = tcp_port
        self.tcp_only = tcp_only
        self.running = False
        self.serial_conn = None
        self.tcp_server = None
        self.clients = []
        self.data_buffer = []
        
    def list_ports(self):
        """List available COM ports"""
        print("\n=== Available Serial Ports ===")
        ports = list(serial.tools.list_ports.comports())
        if not ports:
            print("  No COM ports found.")
            print("  Install com0com to create virtual ports:")
            print("  https://sourceforge.net/projects/com0com/")
        else:
            for port in ports:
                print(f"  {port.device}: {port.description}")
        print()
        return ports
    
    def start(self):
        """Start the bridge"""
        self.running = True
        
        # Start TCP server
        self.tcp_server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.tcp_server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.tcp_server.bind(('127.0.0.1', self.tcp_port))
        self.tcp_server.listen(5)
        self.tcp_server.settimeout(1.0)
        
        print(f"[OK] TCP server listening on 127.0.0.1:{self.tcp_port}")
        
        # Open serial port if not TCP-only mode
        if not self.tcp_only and self.serial_port:
            try:
                self.serial_conn = serial.Serial(
                    port=self.serial_port,
                    baudrate=self.baud_rate,
                    timeout=0.1
                )
                print(f"[OK] Serial port opened: {self.serial_port} @ {self.baud_rate}")
            except serial.SerialException as e:
                print(f"[ERROR] Failed to open serial port: {e}")
                print("  Continuing in TCP-only mode...")
                self.tcp_only = True
        
        # Start threads
        accept_thread = threading.Thread(target=self._accept_clients, daemon=True)
        accept_thread.start()
        
        if self.serial_conn and not self.tcp_only:
            serial_thread = threading.Thread(target=self._serial_to_tcp, daemon=True)
            serial_thread.start()
        
        print()
        print("=== Bridge Running ===")
        print()
        
    def _accept_clients(self):
        """Accept TCP client connections"""
        while self.running:
            try:
                client, addr = self.tcp_server.accept()
                print(f"[INFO] TCP client connected: {addr}")
                self.clients.append(client)
                
                # Start client handler thread
                handler = threading.Thread(
                    target=self._handle_client, 
                    args=(client, addr),
                    daemon=True
                )
                handler.start()
            except socket.timeout:
                continue
            except Exception as e:
                if self.running:
                    print(f"[ERROR] Accept error: {e}")
                    
    def _handle_client(self, client, addr):
        """Handle data from TCP client"""
        try:
            while self.running:
                data = client.recv(1024)
                if not data:
                    break
                    
                decoded = data.decode('utf-8', errors='ignore').strip()
                timestamp = time.strftime("%H:%M:%S")
                print(f"[{timestamp}] TCP -> Serial: {decoded}")
                
                # Send to serial port
                if self.serial_conn and not self.tcp_only:
                    try:
                        self.serial_conn.write(data)
                    except Exception as e:
                        print(f"[ERROR] Serial write failed: {e}")
                else:
                    # Echo mode in TCP-only
                    echo_msg = f"[ECHO] {decoded}\r\n"
                    client.send(echo_msg.encode('utf-8'))
                    
        except Exception as e:
            print(f"[INFO] Client {addr} disconnected: {e}")
        finally:
            if client in self.clients:
                self.clients.remove(client)
            client.close()
            
    def _serial_to_tcp(self):
        """Forward serial data to TCP clients"""
        while self.running and self.serial_conn:
            try:
                if self.serial_conn.in_waiting > 0:
                    data = self.serial_conn.read(self.serial_conn.in_waiting)
                    if data:
                        decoded = data.decode('utf-8', errors='ignore')
                        timestamp = time.strftime("%H:%M:%S")
                        print(f"[{timestamp}] Serial -> TCP: {decoded.strip()}")
                        
                        # Send to all TCP clients
                        for client in self.clients[:]:
                            try:
                                client.send(data)
                            except:
                                self.clients.remove(client)
            except Exception as e:
                if self.running:
                    print(f"[ERROR] Serial read error: {e}")
            time.sleep(0.01)
            
    def stop(self):
        """Stop the bridge"""
        self.running = False
        
        for client in self.clients:
            try:
                client.close()
            except:
                pass
                
        if self.serial_conn:
            try:
                self.serial_conn.close()
                print("[OK] Serial port closed")
            except:
                pass
                
        if self.tcp_server:
            try:
                self.tcp_server.close()
                print("[OK] TCP server stopped")
            except:
                pass
                
    def send_test_data(self, message):
        """Send test data to serial port or echo to clients"""
        if self.serial_conn and not self.tcp_only:
            try:
                self.serial_conn.write(f"{message}\r\n".encode('utf-8'))
                print(f"[SENT] {message}")
            except Exception as e:
                print(f"[ERROR] Send failed: {e}")
        else:
            # Send to all TCP clients
            for client in self.clients[:]:
                try:
                    client.send(f"{message}\r\n".encode('utf-8'))
                    print(f"[SENT] {message}")
                except:
                    pass


def main():
    parser = argparse.ArgumentParser(
        description='Virtual Serial Port Bridge for Patterm Testing',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python virtual-serial-win.py --list
  python virtual-serial-win.py --port COM10 --baud 115200
  python virtual-serial-win.py --tcp-only --tcp-port 12345
  
Testing with Patterm:
  1. Run this script
  2. In Patterm, connect to the specified COM port
  3. Use telnet or netcat to send test data:
     telnet 127.0.0.1 12345
     
  Or in PowerShell:
     $client = New-Object System.Net.Sockets.TcpClient("127.0.0.1", 12345)
     $stream = $client.GetStream()
     $writer = New-Object System.IO.StreamWriter($stream)
     $writer.WriteLine("Hello Patterm!")
     $writer.Flush()
     $client.Close()
"""
    )
    
    parser.add_argument('--port', '-p', help='Serial port (e.g., COM10)')
    parser.add_argument('--baud', '-b', type=int, default=115200, help='Baud rate (default: 115200)')
    parser.add_argument('--tcp-port', '-t', type=int, default=12345, help='TCP port (default: 12345)')
    parser.add_argument('--tcp-only', action='store_true', help='TCP-only mode (no serial port)')
    parser.add_argument('--list', '-l', action='store_true', help='List available COM ports')
    
    args = parser.parse_args()
    
    if not PYSERIAL_AVAILABLE:
        print("Error: pyserial is required. Install with: pip install pyserial")
        sys.exit(1)
    
    print("=" * 60)
    print("  Patterm Virtual Serial Bridge for Windows")
    print("=" * 60)
    print()
    
    bridge = VirtualSerialBridge(
        serial_port=args.port,
        baud_rate=args.baud,
        tcp_port=args.tcp_port,
        tcp_only=args.tcp_only or not args.port
    )
    
    if args.list:
        bridge.list_ports()
        sys.exit(0)
        
    if not args.port and not args.tcp_only:
        print("[INFO] No COM port specified, running in TCP-only mode")
        print("       Use --port COM10 to specify a serial port")
        print()
        bridge.list_ports()
        bridge.tcp_only = True
    
    bridge.start()
    
    print("Commands:")
    print("  1  - Send test message 1")
    print("  2  - Send test message 2")
    print("  t  - Send timestamp")
    print("  l  - List COM ports")
    print("  q  - Quit")
    print()
    print("Or type any text to send it directly.")
    print()
    
    try:
        while True:
            cmd = input(">> ").strip()
            
            if cmd.lower() == 'q':
                break
            elif cmd == '1':
                bridge.send_test_data("Hello from Patterm test script!")
            elif cmd == '2':
                bridge.send_test_data("Test message: ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789")
            elif cmd.lower() == 't':
                bridge.send_test_data(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
            elif cmd.lower() == 'l':
                bridge.list_ports()
            elif cmd:
                bridge.send_test_data(cmd)
                
    except KeyboardInterrupt:
        print()
    finally:
        print("\nStopping bridge...")
        bridge.stop()
        print("Goodbye!")


if __name__ == "__main__":
    main()
