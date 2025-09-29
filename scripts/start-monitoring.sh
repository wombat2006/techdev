#!/bin/bash
# TechSapo Prometheus Monitoring Stack Startup Script
# 完全な監視環境を起動

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKER_COMPOSE_FILE="$PROJECT_ROOT/docker/docker-compose.monitoring.yml"

echo "🚀 TechSapo Prometheus Monitoring Stack を開始します..."
echo "Project Root: $PROJECT_ROOT"

# 前提チェック
if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
    echo "❌ Docker Compose ファイルが見つかりません: $DOCKER_COMPOSE_FILE"
    exit 1
fi

# Podman/Docker 検出
if command -v podman-compose &> /dev/null; then
    COMPOSE_CMD="podman-compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "❌ podman-compose または docker-compose が見つかりません"
    exit 1
fi

echo "🔧 使用コマンド: $COMPOSE_CMD"

# 既存コンテナ停止・削除
echo "🛑 既存監視スタックを停止中..."
cd "$PROJECT_ROOT"
$COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" down -v 2>/dev/null || true

# イメージ更新
echo "📦 最新イメージをプル中..."
$COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" pull

# アプリケーションビルド
echo "🔨 TechSapoアプリケーションをビルド中..."
npm run build

# 監視スタック起動
echo "🚀 監視スタックを起動中..."
$COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" up -d

# ヘルスチェック待機
echo "⏳ サービスの起動を待機中..."
sleep 30

# サービス状態確認
echo "📋 サービス状態確認:"
$COMPOSE_CMD -f "$DOCKER_COMPOSE_FILE" ps

# エンドポイントチェック
echo ""
echo "🔍 エンドポイントチェック:"

# TechSapo アプリケーション
if curl -s -f http://localhost:4000/health > /dev/null; then
    echo "✅ TechSapo App: http://localhost:4000/health"
else
    echo "❌ TechSapo App: http://localhost:4000/health (失敗)"
fi

# Prometheus
if curl -s -f http://localhost:9090/-/healthy > /dev/null; then
    echo "✅ Prometheus: http://localhost:9090"
else
    echo "❌ Prometheus: http://localhost:9090 (失敗)"
fi

# Grafana
if curl -s -f http://localhost:3000/api/health > /dev/null; then
    echo "✅ Grafana: http://localhost:3000 (admin/techsapo2024!)"
else
    echo "❌ Grafana: http://localhost:3000 (失敗)"
fi

# Alert Manager
if curl -s -f http://localhost:9093/-/healthy > /dev/null; then
    echo "✅ AlertManager: http://localhost:9093"
else
    echo "❌ AlertManager: http://localhost:9093 (失敗)"
fi

echo ""
echo "🎯 監視環境起動完了！"
echo ""
echo "📊 アクセス先:"
echo "- TechSapo App: http://localhost:4000"
echo "- Prometheus: http://localhost:9090"
echo "- Grafana: http://localhost:3000 (admin/techsapo2024!)"
echo "- AlertManager: http://localhost:9093"
echo "- Node Exporter: http://localhost:9100"
echo "- Redis: localhost:6379"
echo ""
echo "🧪 テスト用コマンド:"
echo "curl -X POST http://localhost:4000/api/v1/generate \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"prompt\":\"テスト用クエリ\",\"task_type\":\"basic\"}'"
echo ""
echo "📈 メトリクス確認:"
echo "curl http://localhost:4000/metrics | grep techsapo_wallbounce"
echo ""
echo "🛑 停止コマンド:"
echo "$COMPOSE_CMD -f docker/docker-compose.monitoring.yml down"