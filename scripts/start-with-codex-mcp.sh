#!/bin/bash

# TechSapo + Codex MCP Server Startup Script
# Starts TechSapo main application with Codex MCP server integration

set -e

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 設定変数
CODEX_MCP_CONFIG="config/codex-mcp.toml"
CODEX_MCP_PID_FILE="/tmp/techsapo-codex-mcp.pid"
APP_PID_FILE="/tmp/techsapo-app.pid"
STARTUP_TIMEOUT=30

echo "🚀 TechSapo + Codex MCP Server Startup"
echo "======================================"

# Codex CLI インストール確認
log_info "Checking Codex CLI installation..."
if ! command -v codex &> /dev/null; then
    log_error "Codex CLI not found. Please install: npm install -g @openai/codex"
    exit 1
fi
log_success "Codex CLI found (version: $(codex --version 2>&1 | head -1))"

# Codex 認証確認
log_info "Checking Codex authentication..."
if ! codex login status > /dev/null 2>&1; then
    log_warning "Codex not authenticated. Continuing with manual authentication required."
else
    log_success "Codex authentication verified"
fi

# 設定ファイル確認
log_info "Checking configuration files..."
if [[ ! -f "$CODEX_MCP_CONFIG" ]]; then
    log_error "Codex MCP config file not found: $CODEX_MCP_CONFIG"
    exit 1
fi
log_success "Configuration files found"

# .env ファイル確認
log_info "Checking environment configuration..."
if [[ ! -f ".env" ]]; then
    log_warning ".env file not found. Using environment variables only."
else
    # Upstash Redis 設定確認
    if grep -q "UPSTASH_REDIS_REST_URL" .env && grep -q "UPSTASH_REDIS_REST_TOKEN" .env; then
        log_success "Upstash Redis configuration found"
    else
        log_warning "Upstash Redis configuration may be missing"
    fi
fi

# プロジェクトビルド
log_info "Building TypeScript project..."
if npm run build > /dev/null 2>&1; then
    log_success "Project build completed"
else
    log_error "Project build failed"
    exit 1
fi

# 既存プロセス停止
log_info "Stopping existing processes..."

# Codex MCP サーバ停止
if [[ -f "$CODEX_MCP_PID_FILE" ]]; then
    CODEX_PID=$(cat "$CODEX_MCP_PID_FILE")
    if kill -0 "$CODEX_PID" 2>/dev/null; then
        log_info "Stopping existing Codex MCP server (PID: $CODEX_PID)"
        kill "$CODEX_PID" 2>/dev/null || true
        sleep 2
    fi
    rm -f "$CODEX_MCP_PID_FILE"
fi

# TechSapo アプリ停止
if [[ -f "$APP_PID_FILE" ]]; then
    APP_PID=$(cat "$APP_PID_FILE")
    if kill -0 "$APP_PID" 2>/dev/null; then
        log_info "Stopping existing TechSapo application (PID: $APP_PID)"
        kill "$APP_PID" 2>/dev/null || true
        sleep 2
    fi
    rm -f "$APP_PID_FILE"
fi

# Codex MCP サーバ起動
log_info "Starting Codex MCP server..."
nohup codex mcp serve > logs/codex-mcp.log 2>&1 &
CODEX_MCP_PID=$!
echo "$CODEX_MCP_PID" > "$CODEX_MCP_PID_FILE"

# MCP サーバ起動確認
sleep 3
if kill -0 "$CODEX_MCP_PID" 2>/dev/null; then
    log_success "Codex MCP server started (PID: $CODEX_MCP_PID)"
else
    log_error "Failed to start Codex MCP server"
    exit 1
fi

# TechSapo メインアプリケーション起動
log_info "Starting TechSapo main application..."
nohup node dist/index.js > logs/techsapo.log 2>&1 &
APP_PID=$!
echo "$APP_PID" > "$APP_PID_FILE"

# アプリケーション起動確認
sleep 5
if kill -0 "$APP_PID" 2>/dev/null; then
    log_success "TechSapo application started (PID: $APP_PID)"
else
    log_error "Failed to start TechSapo application"
    # Codex MCP サーバも停止
    kill "$CODEX_MCP_PID" 2>/dev/null || true
    rm -f "$CODEX_MCP_PID_FILE"
    exit 1
fi

# ヘルスチェック
log_info "Performing health checks..."

# アプリケーションヘルスチェック (30秒タイムアウト)
APP_HEALTHY=false
for i in {1..30}; do
    if curl -s http://localhost:4000/health > /dev/null 2>&1; then
        APP_HEALTHY=true
        break
    fi
    sleep 1
done

if [[ "$APP_HEALTHY" == "true" ]]; then
    log_success "TechSapo application health check passed"
else
    log_warning "TechSapo application health check failed (may still be starting)"
fi

# MCP Performance Monitor 起動
log_info "Starting MCP Performance Monitor..."
if npm run mcp-performance > /dev/null 2>&1; then
    log_success "MCP Performance Monitor initialized"
else
    log_warning "MCP Performance Monitor startup issue (check logs)"
fi

# 起動完了
echo ""
echo "🎉 Startup Complete!"
echo "=================="
echo "• TechSapo Application: http://localhost:4000"
echo "• Health Check: http://localhost:4000/health"
echo "• API Documentation: http://localhost:4000/api/docs"
echo "• Metrics: http://localhost:4000/metrics"
echo ""
echo "📊 Monitoring Commands:"
echo "• npm run mcp-performance    # パフォーマンス監視"
echo "• npm run mcp-alerts        # アクティブアラート"
echo "• npm run mcp-metrics       # 詳細メトリクス"
echo ""
echo "📋 Process Information:"
echo "• TechSapo PID: $APP_PID (saved to $APP_PID_FILE)"
echo "• Codex MCP PID: $CODEX_MCP_PID (saved to $CODEX_MCP_PID_FILE)"
echo ""
echo "📝 Log Files:"
echo "• TechSapo: logs/techsapo.log"
echo "• Codex MCP: logs/codex-mcp.log"
echo ""
echo "🔧 Management Commands:"
echo "• npm run codex-mcp-restart  # Codex MCP サーバ再起動"
echo "• npm run codex-mcp-stop     # Codex MCP サーバ停止"
echo "• kill $APP_PID              # TechSapo 停止"
echo ""

# バックグラウンド継続
if [[ "$1" != "--foreground" ]]; then
    log_info "Services running in background. Use 'tail -f logs/techsapo.log' to monitor."
    log_info "To stop services: kill $APP_PID && kill $CODEX_MCP_PID"
else
    log_info "Running in foreground mode. Press Ctrl+C to stop services."

    # シグナルハンドラ設定
    cleanup() {
        log_info "Stopping services..."
        kill "$APP_PID" 2>/dev/null || true
        kill "$CODEX_MCP_PID" 2>/dev/null || true
        rm -f "$APP_PID_FILE" "$CODEX_MCP_PID_FILE"
        log_success "Services stopped"
        exit 0
    }

    trap cleanup INT TERM

    # フォアグラウンドで待機
    wait "$APP_PID"
fi

exit 0