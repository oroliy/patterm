#!/bin/bash

echo "=== Simple Virtual Serial Port ==="
echo ""

python3 << 'PYEOF'
import pty
import os
import select

master, slave = pty.openpty()
os.chmod(slave, 0o666)

print(f"Virtual port created: {slave}")
print(f"Connect to this port in Patterm")
print("Press Ctrl+C to stop")

try:
    while True:
        r, _, _ = select.select([master], [], [], 0.1)
        if r:
            data = os.read(master, 1024)
            os.write(master, data)
except KeyboardInterrupt:
    print()
finally:
    os.close(master)
    print(f"Closed: {slave}")
PYEOF
