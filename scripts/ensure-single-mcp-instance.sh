#!/bin/bash
# Ensure Single MCP Instance - Kill duplicates before starting
# This script is executed BEFORE the actual MCP server command
# Usage: source this script with SERVER_TYPE set

set -euo pipefail

SERVER_TYPE="${1:-unknown}"

# Kill any existing instances based on server type
case "$SERVER_TYPE" in
    cipher)
        # Kill all cipher MCP processes except the current parent
        pgrep -f 'cipher.*--mode mcp' | while read -r pid; do
            [[ "$pid" != "$$" ]] && [[ "$pid" != "$PPID" ]] && kill "$pid" 2>/dev/null || true
        done
        ;;
    serena)
        # Kill all serena MCP processes
        pkill -f 'serena start-mcp-server' 2>/dev/null || true
        ;;
    codex)
        # Kill all codex MCP processes
        pkill -f 'codex mcp' 2>/dev/null || true
        ;;
esac

# Small delay to ensure processes are killed
sleep 0.5
