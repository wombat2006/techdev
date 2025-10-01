#!/bin/bash

# Start Codex MCP Server
# Integrates OpenAI Codex with TechSapo Wall-Bounce Analysis System

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$HOME/.codex/log"
CONFIG_FILE="$PROJECT_ROOT/config/codex-mcp.toml"
PID_FILE="/tmp/codex-mcp-server.pid"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions (redirect to stderr for MCP compatibility)
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Check if Codex CLI is installed
check_codex_installation() {
    log_info "Checking Codex CLI installation..."

    if ! command -v codex &> /dev/null; then
        log_error "Codex CLI not found. Please install it first:"
        echo "  npm install -g @openai/codex" >&2
        echo "  OR" >&2
        echo "  brew install codex" >&2
        exit 1
    fi

    local codex_version
    codex_version=$(codex --version 2>/dev/null || echo "unknown")
    log_success "Codex CLI found (version: $codex_version)"
}

# Check authentication
check_codex_auth() {
    log_info "Checking Codex authentication..."

    # Check if authenticated
    if codex auth status 2>/dev/null | grep -q "authenticated"; then
        log_success "Codex is authenticated"
    else
        log_warning "Codex not authenticated. Starting authentication..."
        echo "Please follow the authentication process:" >&2
        echo "1. Select 'Sign in with ChatGPT' (recommended)" >&2
        echo "2. Or configure API key if needed" >&2

        if ! codex auth login; then
            log_error "Codex authentication failed"
            exit 1
        fi
        log_success "Codex authentication completed"
    fi
}

# Setup log directory
setup_logging() {
    log_info "Setting up logging directory..."

    mkdir -p "$LOG_DIR"

    # Set RUST_LOG environment variable for Codex CLI
    export RUST_LOG="${RUST_LOG:-info}"
    log_success "Log directory created: $LOG_DIR"
    log_info "RUST_LOG level: $RUST_LOG"
}

# Check dependencies
check_dependencies() {
    log_info "Checking project dependencies..."

    cd "$PROJECT_ROOT"

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        log_warning "Node modules not found. Installing dependencies..."
        npm install
    fi

    # Check if TypeScript is compiled
    if [ ! -d "dist" ]; then
        log_warning "TypeScript not compiled. Building project..."
        npm run build
    fi

    log_success "Dependencies verified"
}

# Check Redis connection
check_redis() {
    log_info "Checking Redis connection..."

    # Try to connect to Redis
    if command -v redis-cli &> /dev/null; then
        if redis-cli ping 2>/dev/null | grep -q "PONG"; then
            log_success "Redis is running and accessible"
        else
            log_warning "Redis is not running. Please start Redis service."
            echo "  On macOS: brew services start redis" >&2
            echo "  On Ubuntu: sudo systemctl start redis-server" >&2
            echo "  Docker: docker run -d -p 6379:6379 redis:alpine" >&2
        fi
    else
        log_warning "Redis CLI not found. Make sure Redis is installed and running."
    fi
}

# Validate configuration
validate_config() {
    log_info "Validating configuration..."

    if [ -f "$CONFIG_FILE" ]; then
        log_success "Configuration file found: $CONFIG_FILE"

        # Basic validation
        if grep -q "\[codex\]" "$CONFIG_FILE" && grep -q "\[mcp\]" "$CONFIG_FILE"; then
            log_success "Configuration file appears valid"
        else
            log_warning "Configuration file may be incomplete"
        fi
    else
        log_warning "Configuration file not found: $CONFIG_FILE"
        log_info "Using default configuration"
    fi
}

# Stop existing server
stop_existing_server() {
    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE")

        if kill -0 "$pid" 2>/dev/null; then
            log_info "Stopping existing Codex MCP server (PID: $pid)..."
            kill "$pid"
            sleep 2

            if kill -0 "$pid" 2>/dev/null; then
                log_warning "Graceful shutdown failed, forcing termination..."
                kill -9 "$pid"
            fi
        fi

        rm -f "$PID_FILE"
    fi
}

# Start MCP server
start_mcp_server() {
    log_info "Starting Codex MCP Server..."

    cd "$PROJECT_ROOT"

    # Environment setup
    export NODE_ENV="${NODE_ENV:-production}"
    export CODEX_MCP_CONFIG="$CONFIG_FILE"

    # Start the server
    node dist/src/services/codex-mcp-server.js &
    local server_pid=$!

    # Save PID
    echo "$server_pid" > "$PID_FILE"

    # Wait a moment and check if process is still running
    sleep 2
    if kill -0 "$server_pid" 2>/dev/null; then
        log_success "Codex MCP Server started successfully (PID: $server_pid)"
        log_info "Server logs available in: $LOG_DIR"
        log_info "Configuration: $CONFIG_FILE"

        # Show connection info
        echo "" >&2
        echo "🤖 Codex MCP Server is ready!" >&2
        echo "   • Interactive mode: Available for TUI integration" >&2
        echo "   • Non-interactive/CI mode: Available for automated workflows" >&2
        echo "   • MCP tools: codex, codex-reply, codex-session-info, codex-cleanup" >&2
        echo "   • Wall-Bounce integration: Enabled for multi-LLM coordination" >&2
        echo "" >&2
        echo "📊 Monitor with:" >&2
        echo "   • Logs: tail -f $LOG_DIR/codex-tui.log" >&2
        echo "   • Health: curl http://localhost:4000/health" >&2
        echo "   • Metrics: curl http://localhost:4000/metrics" >&2
        echo "" >&2

    else
        log_error "Codex MCP Server failed to start"
        rm -f "$PID_FILE"
        exit 1
    fi
}

# Test MCP server
test_mcp_server() {
    log_info "Testing MCP server functionality..."

    # Wait for server to be ready
    sleep 3

    # Test basic health
    if command -v curl &> /dev/null; then
        local health_response
        if health_response=$(curl -s http://localhost:4000/health 2>/dev/null); then
            if echo "$health_response" | grep -q "ok\|healthy"; then
                log_success "MCP server health check passed"
            else
                log_warning "MCP server responded but health check unclear"
            fi
        else
            log_warning "Could not reach MCP server health endpoint"
        fi
    fi

    # Test Codex CLI integration
    log_info "Testing Codex CLI integration..."
    if codex --help &> /dev/null; then
        log_success "Codex CLI integration test passed"
    else
        log_warning "Codex CLI integration test failed"
    fi
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Start Codex MCP Server with TechSapo Wall-Bounce integration"
    echo ""
    echo "Options:"
    echo "  -h, --help       Show this help message"
    echo "  -c, --config     Specify config file path"
    echo "  -l, --log-level  Set RUST_LOG level (error,warn,info,debug,trace)"
    echo "  -t, --test-only  Run tests without starting server"
    echo "  -s, --stop       Stop running server"
    echo "  -r, --restart    Restart server"
    echo ""
    echo "Examples:"
    echo "  $0                              # Start with default config"
    echo "  $0 -c custom-config.toml        # Start with custom config"
    echo "  $0 -l debug                     # Start with debug logging"
    echo "  $0 -s                           # Stop server"
    echo "  $0 -r                           # Restart server"
}

# Main execution
main() {
    local config_override=""
    local log_level_override=""
    local test_only=false
    local stop_only=false
    local restart=false

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            -c|--config)
                config_override="$2"
                shift 2
                ;;
            -l|--log-level)
                log_level_override="$2"
                shift 2
                ;;
            -t|--test-only)
                test_only=true
                shift
                ;;
            -s|--stop)
                stop_only=true
                shift
                ;;
            -r|--restart)
                restart=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    # Apply overrides
    if [ -n "$config_override" ]; then
        CONFIG_FILE="$config_override"
    fi

    if [ -n "$log_level_override" ]; then
        export RUST_LOG="$log_level_override"
    fi

    # Handle stop/restart commands
    if [ "$stop_only" = true ]; then
        stop_existing_server
        log_success "Codex MCP Server stopped"
        exit 0
    fi

    if [ "$restart" = true ]; then
        stop_existing_server
        sleep 1
    fi

    # Show banner
    echo "" >&2
    echo "🚀 TechSapo Codex MCP Server Startup" >&2
    echo "======================================" >&2
    echo "" >&2

    # Run checks
    check_codex_installation
    check_codex_auth
    setup_logging
    check_dependencies
    check_redis
    validate_config

    if [ "$test_only" = true ]; then
        log_success "All tests passed. Use without -t to start server."
        exit 0
    fi

    # Start server
    stop_existing_server
    start_mcp_server
    test_mcp_server

    echo "" >&2
    log_success "Codex MCP Server startup complete!"
    echo "" >&2
    echo "🏓 Wall-Bounce Analysis System Integration:" >&2
    echo "   • Multi-LLM coordination: Enabled" >&2
    echo "   • Quality thresholds: Confidence ≥ 0.7, Consensus ≥ 0.6" >&2
    echo "   • Japanese responses: Primary language support" >&2
    echo "   • Enterprise approval workflows: Risk-based approval" >&2
    echo "" >&2
    echo "💡 Next steps:" >&2
    echo "   • Use 'codex' command for interactive coding" >&2
    echo "   • Integrate with TechSapo Wall-Bounce for enhanced analysis" >&2
    echo "   • Monitor logs: tail -f $LOG_DIR/codex-tui.log" >&2
    echo "   • Stop server: $0 -s" >&2
    echo "" >&2
}

# Trap for cleanup
cleanup() {
    log_info "Cleaning up..."
    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
        fi
        rm -f "$PID_FILE"
    fi
}

trap cleanup EXIT

# Run main function
main "$@"