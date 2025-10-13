#!/bin/bash
# Start Cipher MCP with single instance guarantee
# Robust lock file management with automatic cleanup
set -euo pipefail

LOCK_FILE="/tmp/mcp-cipher.lock"
LOCK_FD=200

# Function to cleanup lock file
cleanup() {
    local exit_code=$?
    # Only remove lock file if we own it (our PID is in it)
    if [[ -f "$LOCK_FILE" ]]; then
        local stored_pid
        stored_pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
        if [[ "$stored_pid" == "$$" ]]; then
            rm -f "$LOCK_FILE"
        fi
    fi
    # Close file descriptor if open
    exec 200>&- 2>/dev/null || true
    exit $exit_code
}

# Register cleanup handler for all exit scenarios
trap cleanup EXIT INT TERM HUP

# Kill stale lock files (no process running)
if [[ -f "$LOCK_FILE" ]]; then
    OLD_PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
    if [[ -n "$OLD_PID" ]] && ! kill -0 "$OLD_PID" 2>/dev/null; then
        echo "[CIPHER-MCP] Removing stale lock file (PID $OLD_PID not running)" >&2
        rm -f "$LOCK_FILE"
    fi
fi

# Acquire exclusive lock (create file if doesn't exist)
exec 200>>"$LOCK_FILE"
if ! flock -n 200; then
    # Lock already held - check if process is alive
    OLD_PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
    if [[ -n "$OLD_PID" ]] && kill -0 "$OLD_PID" 2>/dev/null; then
        echo "[CIPHER-MCP] Killing existing instance (PID: $OLD_PID)" >&2
        # Kill process tree
        pkill -P "$OLD_PID" 2>/dev/null || true
        kill "$OLD_PID" 2>/dev/null || true
        sleep 1
        # Force kill if still running
        if kill -0 "$OLD_PID" 2>/dev/null; then
            kill -9 "$OLD_PID" 2>/dev/null || true
        fi
        # Remove the lock file
        rm -f "$LOCK_FILE"
    else
        # Stale lock file, remove it
        echo "[CIPHER-MCP] Removing stale lock file" >&2
        rm -f "$LOCK_FILE"
    fi

    # Try to acquire lock again with new file
    exec 200>>"$LOCK_FILE"
    if ! flock -w 5 200; then
        echo "[CIPHER-MCP] Failed to acquire lock after cleanup" >&2
        exit 1
    fi
fi

# Truncate and write our PID (while holding lock)
# Using >> mode means file won't be truncated on open, so we do it explicitly
: > "$LOCK_FILE"
echo $$ > "$LOCK_FILE"

# Verify lock file was written correctly
WRITTEN_PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
if [[ "$WRITTEN_PID" != "$$" ]]; then
    echo "[CIPHER-MCP] ERROR: Failed to write PID to lock file (wrote: '$WRITTEN_PID', expected: $$)" >&2
    rm -f "$LOCK_FILE"
    exit 1
fi

echo "[CIPHER-MCP] Lock file created successfully with PID $$" >&2

# Kill any orphaned cipher MCP processes
pkill -f 'cipher.*--mode mcp' 2>/dev/null || true
sleep 0.5

# Start Cipher MCP server (stdio will be inherited)
# Using exec replaces this process, so our PID remains valid in lock file
exec npx @byterover/cipher --mode mcp --mcp-transport-type stdio
