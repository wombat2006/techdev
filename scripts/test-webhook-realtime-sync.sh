#!/bin/bash

# Google Drive Webhook Real-time Sync Test Script
# GoogleDrive Webhookリアルタイム同期テストスクリプト

set -euo pipefail

# 設定
BASE_URL="http://localhost:4000"
LOG_FILE="/tmp/webhook-test-$(date +%Y%m%d-%H%M%S).log"
TEST_RESULTS_FILE="/tmp/webhook-test-results.json"

# カラー出力設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARN: $1${NC}" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# テスト結果記録
record_test_result() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    
    echo "{\"test\":\"$test_name\",\"status\":\"$status\",\"details\":\"$details\",\"timestamp\":\"$(date -Iseconds)\"}" >> "$TEST_RESULTS_FILE"
}

# APIリクエストヘルパー
api_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    
    if [ "$method" = "GET" ]; then
        curl -s -X GET "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" || echo '{"error":"request_failed"}'
    else
        curl -s -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" || echo '{"error":"request_failed"}'
    fi
}

# テスト開始
main() {
    log "🚀 Google Drive Webhook リアルタイム同期テスト開始"
    
    # 初期化
    echo "[]" > "$TEST_RESULTS_FILE"
    
    # テスト1: サーバー稼働確認
    log "📊 テスト1: サーバー稼働確認"
    health_response=$(api_request "GET" "/health" "")
    if echo "$health_response" | grep -q "status.*ok\|healthy"; then
        log "✅ サーバー稼働確認: OK"
        record_test_result "server_health" "passed" "Server is running"
    else
        error "❌ サーバー稼働確認: FAILED"
        record_test_result "server_health" "failed" "Server not responding"
        exit 1
    fi
    
    # テスト2: Push通知設定テスト
    log "📋 テスト2: Push通知設定テスト"
    setup_test_response=$(api_request "GET" "/api/v1/webhook-setup/googledrive/test-setup" "")
    if echo "$setup_test_response" | grep -q "success.*true"; then
        log "✅ Push通知設定テスト: OK"
        record_test_result "push_setup_test" "passed" "Setup test completed"
    else
        warn "⚠️ Push通知設定テスト: PARTIAL - $(echo "$setup_test_response" | jq -r '.message // "Unknown issue"' 2>/dev/null || echo 'Configuration issues detected')"
        record_test_result "push_setup_test" "warning" "Setup test had issues"
    fi
    
    # テスト3: Webhookエンドポイント応答確認
    log "🔔 テスト3: Webhookエンドポイント応答確認"
    webhook_info_response=$(api_request "GET" "/api/v1/webhooks/googledrive/notifications" "")
    if echo "$webhook_info_response" | grep -q "service.*Google Drive"; then
        log "✅ Webhookエンドポイント応答: OK"
        record_test_result "webhook_endpoint" "passed" "Webhook endpoint responding"
    else
        error "❌ Webhookエンドポイント応答: FAILED"
        record_test_result "webhook_endpoint" "failed" "Webhook endpoint not responding"
    fi
    
    # テスト4: Webhook統計情報取得
    log "📊 テスト4: Webhook統計情報取得"
    webhook_stats_response=$(api_request "GET" "/api/v1/webhooks/googledrive/webhook-stats" "")
    if echo "$webhook_stats_response" | grep -q "success.*true"; then
        log "✅ Webhook統計情報取得: OK"
        record_test_result "webhook_stats" "passed" "Webhook stats available"
        
        # 統計情報表示
        info "📈 Webhook統計情報:"
        echo "$webhook_stats_response" | jq '.data' 2>/dev/null || info "統計データ解析失敗"
    else
        warn "⚠️ Webhook統計情報取得: PARTIAL"
        record_test_result "webhook_stats" "warning" "Webhook stats partially available"
    fi
    
    # テスト5: 模擬Webhookテスト
    log "🧪 テスト5: 模擬Webhookテスト"
    mock_webhook_response=$(api_request "POST" "/api/v1/webhooks/googledrive/test-webhook" "{}")
    if echo "$mock_webhook_response" | grep -q "success.*true"; then
        log "✅ 模擬Webhookテスト: OK"
        record_test_result "mock_webhook" "passed" "Mock webhook test completed"
    else
        warn "⚠️ 模擬Webhookテスト: PARTIAL - $(echo "$mock_webhook_response" | jq -r '.message // "Unknown issue"' 2>/dev/null || echo 'Mock test issues')"
        record_test_result "mock_webhook" "warning" "Mock webhook test had issues"
    fi
    
    # テスト6: RAG設定確認
    log "🗂️ テスト6: RAG設定確認"
    rag_health_response=$(api_request "GET" "/api/v1/rag/health" "{}")
    if echo "$rag_health_response" | grep -q "status.*healthy\|ok"; then
        log "✅ RAG設定確認: OK"
        record_test_result "rag_health" "passed" "RAG system healthy"
    else
        warn "⚠️ RAG設定確認: PARTIAL - RAG設定に問題がある可能性があります"
        record_test_result "rag_health" "warning" "RAG system configuration issues"
    fi
    
    # テスト7: メトリクス確認
    log "📊 テスト7: Prometheusメトリクス確認"
    metrics_response=$(curl -s "$BASE_URL/metrics" | grep -E "(techsapo_webhook|techsapo_rag|techsapo_googledrive)" | head -5)
    if [ -n "$metrics_response" ]; then
        log "✅ Prometheusメトリクス確認: OK"
        record_test_result "metrics_check" "passed" "Webhook and RAG metrics available"
        info "🔍 利用可能なメトリクス例:"
        echo "$metrics_response" | while IFS= read -r line; do
            info "  $line"
        done
    else
        warn "⚠️ Prometheusメトリクス確認: PARTIAL - Webhook/RAGメトリクスが見つかりません"
        record_test_result "metrics_check" "warning" "Some metrics may be missing"
    fi
    
    # テスト8: 環境変数設定確認
    log "🔧 テスト8: 環境変数設定確認"
    env_check_count=0
    env_total_count=6
    
    # 必要な環境変数チェック
    if [ -n "${GOOGLE_CLIENT_ID:-}" ]; then ((env_check_count++)); fi
    if [ -n "${GOOGLE_CLIENT_SECRET:-}" ]; then ((env_check_count++)); fi
    if [ -n "${GOOGLE_REFRESH_TOKEN:-}" ]; then ((env_check_count++)); fi
    if [ -n "${OPENAI_API_KEY:-}" ]; then ((env_check_count++)); fi
    if [ -n "${WEBHOOK_BASE_URL:-}" ]; then ((env_check_count++)); fi
    if [ -n "${DEFAULT_VECTOR_STORE_NAME:-}" ]; then ((env_check_count++)); fi
    
    env_percentage=$((env_check_count * 100 / env_total_count))
    
    if [ $env_check_count -eq $env_total_count ]; then
        log "✅ 環境変数設定確認: OK ($env_check_count/$env_total_count)"
        record_test_result "environment_check" "passed" "All required environment variables set"
    elif [ $env_check_count -gt 3 ]; then
        warn "⚠️ 環境変数設定確認: PARTIAL ($env_check_count/$env_total_count) - $env_percentage%"
        record_test_result "environment_check" "warning" "Some environment variables missing"
    else
        error "❌ 環境変数設定確認: FAILED ($env_check_count/$env_total_count) - $env_percentage%"
        record_test_result "environment_check" "failed" "Too many environment variables missing"
    fi
    
    # テスト結果サマリー
    log "📋 テスト結果サマリー"
    
    passed_count=$(grep -c '"status":"passed"' "$TEST_RESULTS_FILE" || echo "0")
    warning_count=$(grep -c '"status":"warning"' "$TEST_RESULTS_FILE" || echo "0")
    failed_count=$(grep -c '"status":"failed"' "$TEST_RESULTS_FILE" || echo "0")
    total_count=$((passed_count + warning_count + failed_count))
    
    log "📊 テスト結果統計:"
    log "   ✅ 成功: $passed_count/$total_count"
    log "   ⚠️ 警告: $warning_count/$total_count"  
    log "   ❌ 失敗: $failed_count/$total_count"
    
    # 成功率計算
    if [ $total_count -gt 0 ]; then
        success_rate=$(( (passed_count * 100) / total_count ))
        warning_rate=$(( (warning_count * 100) / total_count ))
        
        if [ $success_rate -gt 80 ] && [ $failed_count -eq 0 ]; then
            log "🎉 総合判定: EXCELLENT ($success_rate% success, $warning_rate% warnings)"
        elif [ $success_rate -gt 60 ] && [ $failed_count -eq 0 ]; then
            warn "👍 総合判定: GOOD ($success_rate% success, $warning_rate% warnings)"
        elif [ $failed_count -eq 0 ]; then
            warn "📝 総合判定: NEEDS_ATTENTION ($success_rate% success, $warning_rate% warnings)"
        else
            error "💔 総合判定: CRITICAL_ISSUES ($success_rate% success, $failed_count failures)"
        fi
    fi
    
    # 推奨事項
    log "💡 推奨事項とNext Steps:"
    
    if [ $failed_count -gt 0 ]; then
        error "   🔧 失敗したテストの原因を調査してください"
    fi
    
    if [ $warning_count -gt 0 ]; then
        warn "   ⚙️ 環境変数設定と認証情報を確認してください"
    fi
    
    if [ $passed_count -gt 5 ]; then
        log "   🚀 Google Drive Push通知セットアップを実行してください:"
        log "      curl -X POST $BASE_URL/api/v1/webhook-setup/googledrive/setup \\"
        log "        -H 'Content-Type: application/json' \\"
        log "        -d '{\"folder_id\":\"YOUR_FOLDER_ID\",\"ttl_hours\":168}'"
        log ""
        log "   📝 実際のファイル更新でリアルタイム同期をテストしてください"
        log "   📊 Grafanaダッシュボードでメトリクスを確認してください: http://localhost:3000"
    fi
    
    log "📁 詳細ログファイル: $LOG_FILE"
    log "📄 テスト結果JSON: $TEST_RESULTS_FILE"
    
    log "✅ Google Drive Webhook リアルタイム同期テスト完了"
    
    # 終了コード決定
    if [ $failed_count -gt 0 ]; then
        exit 2  # Critical issues
    elif [ $warning_count -gt 2 ]; then
        exit 1  # Configuration issues
    else
        exit 0  # Success
    fi
}

# クリーンアップ
cleanup() {
    log "🧹 クリーンアップ実行"
    # 必要に応じてテスト後のクリーンアップ処理
}

# シグナルハンドラー
trap cleanup EXIT

# ヘルプ表示
show_help() {
    cat << EOF
Google Drive Webhook Real-time Sync Test Script

使用方法:
    $0 [OPTIONS]

オプション:
    -h, --help     このヘルプを表示
    -v, --verbose  詳細ログ出力
    --base-url URL ベースURL指定 (デフォルト: http://localhost:4000)

例:
    $0                              # 基本テスト実行
    $0 --base-url https://your.domain.com   # 本番環境テスト
    $0 --verbose                    # 詳細ログ付きテスト

終了コード:
    0  テスト成功
    1  設定に問題あり
    2  クリティカルエラー

EOF
}

# コマンドライン引数処理
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            set -x
            shift
            ;;
        --base-url)
            BASE_URL="$2"
            shift 2
            ;;
        *)
            error "不明なオプション: $1"
            show_help
            exit 1
            ;;
    esac
done

# メイン実行
main "$@"