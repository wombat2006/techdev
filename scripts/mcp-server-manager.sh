#!/bin/bash
# MCP Server Manager - Ensure only one instance per server type runs
# Usage: ./mcp-server-manager.sh <server-type> <command...>
# Example: ./mcp-server-manager.sh cipher npx @byterover/cipher --mode mcp --mcp-transport-type stdio

set -euo pipefail

SERVER_TYPE="${1:-}"
shift || true
COMMAND=("$@")

if [[ -z "$SERVER_TYPE" ]] || [[ ${#COMMAND[@]} -eq 0 ]]; then
    echo "Usage: $0 <server-type> <command...>"
    echo "Example: $0 cipher npx @byterover/cipher --mode mcp --mcp-transport-type stdio"
    exit 1
fi

# PID file location
PID_DIR="/tmp/mcp-servers"
PID_FILE="$PID_DIR/${SERVER_TYPE}.pid"
mkdir -p "$PID_DIR"

# Function to check if process is running
is_running() {
    local pid="$1"
    [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

# Function to kill existing instance
kill_existing() {
    if [[ -f "$PID_FILE" ]]; then
        local old_pid
        old_pid=$(cat "$PID_FILE")
        if is_running "$old_pid"; then
            echo "[$SERVER_TYPE] Killing existing instance (PID: $old_pid)"
            # Kill entire process group
            pkill -P "$old_pid" 2>/dev/null || true
            kill "$old_pid" 2>/dev/null || true
            sleep 1
            # Force kill if still running
            if is_running "$old_pid"; then
                kill -9 "$old_pid" 2>/dev/null || true
            fi
        fi
        rm -f "$PID_FILE"
    fi

    # Kill any orphaned processes matching the command pattern
    case "$SERVER_TYPE" in
        cipher)
            pkill -f 'cipher.*--mode mcp' 2>/dev/null || true
            ;;
        serena)
            pkill -f 'serena start-mcp-server' 2>/dev/null || true
            ;;
        codex)
            pkill -f 'codex mcp' 2>/dev/null || true
            ;;
    esac
}

# Kill existing instance before starting
kill_existing

# Start new instance in background
echo "[$SERVER_TYPE] Starting: ${COMMAND[*]}"
"${COMMAND[@]}" &
NEW_PID=$!

# Save PID
echo "$NEW_PID" > "$PID_FILE"
echo "[$SERVER_TYPE] Started with PID: $NEW_PID"

# Wait for process (will be killed by parent if needed)
wait "$NEW_PID" 2>/dev/null || true

# Clean up PID file on exit
rm -f "$PID_FILE"
echo "[$SERVER_TYPE] Stopped"
