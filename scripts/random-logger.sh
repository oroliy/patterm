#!/bin/bash

set -e

PORT=${1:-12345}
HOST=${2:-localhost}
INTERVAL_MIN=${3:-0.5}
INTERVAL_MAX=${4:-2.0}

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

cleanup() {
    echo ""
    echo -e "${BLUE}=== Stopping Random Logger ===${NC}"
    echo -e "${GREEN}✓${NC} Sent $TOTAL_MSGS messages"
    exit 0
}

trap cleanup EXIT INT TERM

TOTAL_MSGS=0

LOG_LEVELS=(
    "${GREEN}[INFO]${NC}"
    "${YELLOW}[WARN]${NC}"
    "${RED}[ERROR]${NC}"
    "${CYAN}[DEBUG]${NC}"
)

INFO_MSGS=(
    "System initialized successfully"
    "Connection established with remote server"
    "Data transmission started"
    "Configuration loaded from /etc/config/app.conf"
    "User authenticated: admin@example.com"
    "Background task completed"
    "Cache cleared, 145 entries removed"
    "Service health check: OK"
    "Database connection pool ready (10 connections)"
    "File synced to remote storage"
    "Memory usage: 245MB / 512MB"
    "CPU temperature: 45°C"
    "Network interface eth0: UP (1000 Mbps)"
    "Disk space: 15.2GB free"
    "Application started in 234ms"
)

WARN_MSGS=(
    "High memory usage detected: 85%"
    "Connection timeout, retrying... (3/5)"
    "Deprecated API usage detected"
    "Configuration file missing, using defaults"
    "Response time slower than expected: 850ms"
    "Battery level low: 15%"
    "Disk space warning: < 10% remaining"
    "Unusual login attempt from 192.168.1.100"
    "Certificate expires in 7 days"
    "Rate limit approaching: 950/1000 requests"
)

ERROR_MSGS=(
    "Failed to connect to database: Connection refused"
    "Null pointer exception in module handler"
    "File not found: /var/log/system.log"
    "Authentication failed for user 'guest'"
    "Out of memory error in worker process"
    "Network unreachable: 192.168.1.1"
    "Invalid JSON received from API endpoint"
    "Thread deadlock detected in scheduler"
    "Segmentation fault in driver module"
    "Permission denied: /etc/shadow"
)

DEBUG_MSGS=(
    "Entering function: processData() with args: {id: 123}"
    "SQL query: SELECT * FROM users WHERE id=42"
    "Variable dump: data={status:'ok', count:5}"
    "Heap snapshot saved to /tmp/heap-123.heapsnapshot"
    "Event fired: 'user.login' with payload {user:'admin'}"
    "Cache hit for key: 'user_sessions_admin'"
    "Network packet: [0x4A, 0xFF, 0x00, 0x1C]"
    "Thread 'worker-3' sleeping for 100ms"
    "Mutex acquired for resource: 'db_connection'"
)

get_random_message() {
    local level_idx=$((RANDOM % 4))
    local log_level="${LOG_LEVELS[$level_idx]}"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case $level_idx in
        0)
            local msg="${INFO_MSGS[$((RANDOM % ${#INFO_MSGS[@]}))]}"
            ;;
        1)
            local msg="${WARN_MSGS[$((RANDOM % ${#WARN_MSGS[@]}))]}"
            ;;
        2)
            local msg="${ERROR_MSGS[$((RANDOM % ${#ERROR_MSGS[@]}))]}"
            ;;
        3)
            local msg="${DEBUG_MSGS[$((RANDOM % ${#DEBUG_MSGS[@]}))]}"
            ;;
    esac

    echo -e "${log_level} ${timestamp} - ${msg}"
}

show_help() {
    cat << EOF
${BLUE}Patterm Random Log Generator${NC}

Usage: $0 [PORT] [HOST] [INTERVAL_MIN] [INTERVAL_MAX]

Arguments:
    PORT            TCP port to send logs to (default: 12345)
    HOST            TCP host to send logs to (default: localhost)
    INTERVAL_MIN    Minimum interval between logs in seconds (default: 0.5)
    INTERVAL_MAX    Maximum interval between logs in seconds (default: 2.0)

Examples:
    $0                                      # Default settings
    $0 12345                                # Custom port
    $0 12345 localhost 0.1 0.5              # Fast logging
    $0 12345 localhost 1.0 3.0              # Slow logging

${YELLOW}Log Levels:${NC}
    INFO    (green)   - Informational messages
    WARN    (yellow)  - Warning messages
    ERROR   (red)     - Error messages
    DEBUG   (cyan)    - Debug messages

${YELLOW}Stop:${NC}
    Press Ctrl+C

EOF
}

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            break
            ;;
    esac
done

echo -e "${BLUE}=== Random Log Generator ===${NC}"
echo -e "${CYAN}Target:${NC} $HOST:$PORT"
echo -e "${CYAN}Interval:${NC} ${INTERVAL_MIN}s - ${INTERVAL_MAX}s"
echo -e "${CYAN}Press Ctrl+C to stop${NC}"
echo ""

while true; do
    MSG=$(get_random_message)
    echo "$MSG" | nc -q 0 $HOST $PORT 2>/dev/null || true
    echo -e "\r${CYAN}Messages sent:${NC} $((++TOTAL_MSGS))" | tr -d '\n'

    interval=$(echo "$INTERVAL_MIN $INTERVAL_MAX" | awk '{
        min=$1; max=$2
        srand()
        printf "%.2f", min + rand() * (max - min)
    }')
    sleep "$interval"
done
