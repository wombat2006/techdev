#!/bin/bash

# Claude Code MCP Server Launcher
# Sonnet 4.5を明示的に使用するMCPサーバの起動管理

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PID_FILE="/tmp/claude-code-mcp.pid"
LOG_FILE="/tmp/claude-code-mcp.log"

function show_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Options:
  -s, --stop     Stop Claude Code MCP server
  -r, --restart  Restart Claude Code MCP server
  -t, --test     Test Claude Code MCP server
  -h, --help     Show this help message

Examples:
  $0              # Start server
  $0 --stop       # Stop server
  $0 --restart    # Restart server
  $0 --test       # Test server
EOF
}

function start_server() {
    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo "✅ Claude Code MCP server is already running (PID: $pid)"
            return 0
        else
            echo "⚠️  Stale PID file found, removing..."
            rm -f "$PID_FILE"
        fi
    fi
    
    echo "🚀 Starting Claude Code MCP server..."
    
    # Check if ANTHROPIC_API_KEY is set
    if [ -z "$ANTHROPIC_API_KEY" ]; then
        echo "❌ Error: ANTHROPIC_API_KEY environment variable is not set"
        exit 1
    fi
    
    # Start server in background
    cd "$PROJECT_ROOT"
    nohup npm run claude-code-mcp > "$LOG_FILE" 2>&1 &
    local pid=$!
    echo "$pid" > "$PID_FILE"
    
    # Wait and verify
    sleep 2
    if ps -p "$pid" > /dev/null 2>&1; then
        echo "✅ Claude Code MCP server started successfully (PID: $pid)"
        echo "📄 Logs: $LOG_FILE"
        return 0
    else
        echo "❌ Failed to start server. Check logs: $LOG_FILE"
        rm -f "$PID_FILE"
        return 1
    fi
}

function stop_server() {
    if [ ! -f "$PID_FILE" ]; then
        echo "⚠️  Claude Code MCP server is not running"
        return 0
    fi
    
    local pid
    pid=$(cat "$PID_FILE")
    
    if ps -p "$pid" > /dev/null 2>&1; then
        echo "🛑 Stopping Claude Code MCP server (PID: $pid)..."
        kill "$pid"
        
        # Wait for graceful shutdown
        local count=0
        while ps -p "$pid" > /dev/null 2>&1 && [ $count -lt 10 ]; do
            sleep 1
            count=$((count + 1))
        done
        
        if ps -p "$pid" > /dev/null 2>&1; then
            echo "⚠️  Forcing shutdown..."
            kill -9 "$pid"
        fi
        
        rm -f "$PID_FILE"
        echo "✅ Claude Code MCP server stopped"
    else
        echo "⚠️  Server process not found, cleaning up PID file"
        rm -f "$PID_FILE"
    fi
}

function test_server() {
    echo "🧪 Testing Claude Code MCP server..."
    
    # Test using stdio transport with echo command
    cat <<'EOF' | node dist/services/claude-code-mcp-server.js
{"jsonrpc":"2.0","id":1,"method":"tools/list"}
EOF
    
    if [ $? -eq 0 ]; then
        echo "✅ Claude Code MCP server test passed"
        return 0
    else
        echo "❌ Claude Code MCP server test failed"
        return 1
    fi
}

# Main logic
case "${1:-}" in
    -s|--stop)
        stop_server
        ;;
    -r|--restart)
        stop_server
        start_server
        ;;
    -t|--test)
        test_server
        ;;
    -h|--help)
        show_usage
        ;;
    "")
        start_server
        ;;
    *)
        echo "❌ Unknown option: $1"
        show_usage
        exit 1
        ;;
esac
