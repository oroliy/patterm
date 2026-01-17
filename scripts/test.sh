#!/bin/bash

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

PORT_PATH="/tmp/ttyV0"
SOCAT_PID=""
CLEANUP_NEEDED=false

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cleanup() {
    if [ "$CLEANUP_NEEDED" = true ]; then
        echo ""
        echo -e "${BLUE}=== Cleaning up ===${NC}"
        if [ -n "$SOCAT_PID" ]; then
            kill $SOCAT_PID 2>/dev/null || true
            echo -e "${GREEN}✓${NC} Stopped virtual serial port (socat PID: $SOCAT_PID)"
        fi
        rm -f $PORT_PATH
        echo -e "${GREEN}✓${NC} Removed virtual port: $PORT_PATH"
    fi
}

trap cleanup EXIT INT TERM

show_help() {
    cat << EOF
${BLUE}Patterm One-Click Test Script${NC}

Usage: $0 [OPTIONS]

Options:
    -h, --help          Show this help message
    -p, --port PATH     Custom virtual port path (default: /tmp/ttyV0)
    -k, --keep          Keep virtual port running after exit
    -c, --clean-only    Only cleanup existing virtual ports

Examples:
    $0                  Start test with default port
    $0 -p /tmp/ttyUSB0  Use custom port path
    $0 -k               Keep virtual port running after exit
    $0 -c               Cleanup existing virtual ports

${YELLOW}Testing Workflow:${NC}
    1. Script creates virtual serial port
    2. Patterm app launches automatically
    3. Connect to $PORT_PATH in Patterm
    4. Send test data: echo "Hello" | nc localhost 12345
    5. Press Ctrl+C to stop (or close Patterm)

${YELLOW}Virtual Port Info:${NC}
    Port: $PORT_PATH
    TCP Port: 12345
    Test Command: echo "test" | nc localhost 12345

EOF
}

check_dependencies() {
    local missing=()

    command -v socat >/dev/null 2>&1 || missing+=("socat")
    command -v npm >/dev/null 2>&1 || missing+=("npm")

    if [ ${#missing[@]} -gt 0 ]; then
        echo -e "${RED}Error: Missing required dependencies:${NC}"
        for dep in "${missing[@]}"; do
            echo "  - $dep"
        done
        echo ""
        echo "Install with:"
        echo "  sudo apt-get install socat"
        echo "  npm install"
        exit 1
    fi
}

cleanup_ports() {
    echo -e "${BLUE}=== Cleaning up existing virtual ports ===${NC}"
    killall socat 2>/dev/null && echo -e "${GREEN}✓${NC} Stopped existing socat processes" || echo "No existing socat processes found"
    rm -f $PORT_PATH
    echo -e "${GREEN}✓${NC} Cleanup complete"
    exit 0
}

create_virtual_port() {
    echo -e "${BLUE}=== Creating Virtual Serial Port ===${NC}"
    echo "Port path: $PORT_PATH"

    if [ -e "$PORT_PATH" ]; then
        echo -e "${YELLOW}⚠ Port already exists, cleaning up...${NC}"
        killall socat 2>/dev/null || true
        rm -f $PORT_PATH
        sleep 1
    fi

    socat -d -d pty,link=$PORT_PATH,raw,echo=0,waitslave TCP-LISTEN:12345,fork,reuseaddr >/dev/null 2>&1 &
    SOCAT_PID=$!

    sleep 2

    if ! kill -0 $SOCAT_PID 2>/dev/null; then
        echo -e "${RED}✗ Failed to create virtual serial port${NC}"
        exit 1
    fi

    CLEANUP_NEEDED=true
    echo -e "${GREEN}✓${NC} Virtual serial port created: $PORT_PATH"
    echo -e "${GREEN}✓${NC} TCP listener on port 12345"
}

show_test_instructions() {
    echo ""
    echo -e "${BLUE}=== Patterm is Running ===${NC}"
    echo ""
    echo -e "${YELLOW}In Patterm:${NC}"
    echo "  1. Click 'New Connection' (or press Ctrl/Cmd+N)"
    echo "  2. Select port: ${GREEN}$PORT_PATH${NC}"
    echo "  3. Configure baud rate (default: 115200)"
    echo "  4. Click 'Connect'"
    echo ""
    echo -e "${YELLOW}Send Test Data (in another terminal):${NC}"
    echo "  echo 'Hello Patterm!' | nc localhost 12345"
    echo "  echo 'Test message' | nc localhost 12345"
    echo "  telnet localhost 12345"
    echo ""
    echo -e "${YELLOW}Stop Testing:${NC}"
    echo "  Press Ctrl+C here, or close Patterm window"
    echo ""
}

KEEP_PORT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -p|--port)
            PORT_PATH="$2"
            shift 2
            ;;
        -k|--keep)
            KEEP_PORT=true
            shift
            ;;
        -c|--clean-only)
            cleanup_ports
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use -h for help"
            exit 1
            ;;
    esac
done

check_dependencies

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   Patterm One-Click Test Environment${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

create_virtual_port

echo -e "${BLUE}=== Starting Patterm ===${NC}"
if [ "$KEEP_PORT" = true ]; then
    npm start &
    APP_PID=$!
    echo -e "${GREEN}✓${NC} Patterm started (PID: $APP_PID)"
    echo -e "${YELLOW}Note: Virtual port will keep running after exit${NC}"
    echo "Stop manually with: killall socat"
    CLEANUP_NEEDED=false
else
    show_test_instructions
    trap "echo ''; echo -e '${BLUE}=== Stopping ===${NC}'; cleanup" EXIT INT TERM
    npm start
fi
