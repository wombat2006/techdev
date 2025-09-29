#!/bin/bash

# Comprehensive RAG System Test Suite
# RAGシステム網羅的テストスイート

set -euo pipefail

# 設定
BASE_URL="http://localhost:4000"
LOG_FILE="/tmp/comprehensive-rag-test-$(date +%Y%m%d-%H%M%S).log"
RESULTS_FILE="/tmp/rag-test-results.json"
TEST_DATA_DIR="/tmp/rag-test-data"

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# カウンター
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0

# ログ関数
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"
    ((FAILED_TESTS++))
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠️ $1${NC}" | tee -a "$LOG_FILE"
    ((WARNING_TESTS++))
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] ℹ️ $1${NC}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_FILE"
    ((PASSED_TESTS++))
}

# テスト結果記録
record_test() {
    local category="$1"
    local test_name="$2" 
    local status="$3"
    local details="$4"
    local duration="${5:-0}"
    
    ((TOTAL_TESTS++))
    
    local result="{\"category\":\"$category\",\"test\":\"$test_name\",\"status\":\"$status\",\"details\":\"$details\",\"duration\":$duration,\"timestamp\":\"$(date -Iseconds)\"}"
    echo "$result" >> "$RESULTS_FILE"
}

# APIリクエストヘルパー
api_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local timeout="${4:-30}"
    
    local start_time=$(date +%s%N)
    local response
    
    if [ "$method" = "GET" ]; then
        response=$(timeout ${timeout}s curl -s -X GET "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" 2>/dev/null || echo '{"error":"request_failed"}')
    else
        response=$(timeout ${timeout}s curl -s -X "$method" "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null || echo '{"error":"request_failed"}')
    fi
    
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 )) # ms
    
    echo "$response"
    return 0
}

# テストデータ準備
prepare_test_data() {
    log "📁 テストデータ準備"
    
    mkdir -p "$TEST_DATA_DIR"
    
    # テスト用テキストファイル作成
    cat > "$TEST_DATA_DIR/test_document_1.txt" << 'EOF'
# Kubernetes トラブルシューティングガイド

## Pod起動問題
Podが起動しない場合の確認手順:
1. kubectl describe pod [pod-name] でイベント確認
2. リソース不足の確認 (CPU、Memory)
3. イメージの存在確認
4. NodeSelectorやAffinityの設定確認

## Service接続問題
Serviceに接続できない場合:
1. kubectl get endpoints で確認
2. ラベルセレクターの確認
3. NetworkPolicyの確認

## 永続ボリューム問題
PVCがPendingの場合:
1. StorageClassの確認
2. 使用可能ノードの確認
3. リソース制限の確認
EOF

    # 日本語テストドキュメント
    cat > "$TEST_DATA_DIR/japanese_doc.txt" << 'EOF'
# サーバー運用手順書

## 日常点検項目
- ディスク使用量: df -h コマンドで確認
- メモリ使用量: free -h コマンドで確認  
- CPU使用率: top コマンドで確認
- ログ確認: tail -f /var/log/messages

## 障害対応
システム負荷が高い場合の対処法:
1. プロセス確認 (ps aux | sort -k3 -nr)
2. 不要プロセス停止
3. リソース監視強化
4. 必要に応じてスケールアウト
EOF

    # JSON形式テストデータ
    cat > "$TEST_DATA_DIR/test_config.json" << 'EOF'
{
  "database": {
    "host": "localhost",
    "port": 3306,
    "name": "techsapo_test",
    "settings": {
      "connection_pool": 10,
      "timeout": 30,
      "retry_attempts": 3
    }
  },
  "cache": {
    "type": "redis",
    "ttl": 3600,
    "max_entries": 1000
  }
}
EOF

    success "テストデータ準備完了: $TEST_DATA_DIR"
    record_test "setup" "test_data_preparation" "passed" "Test data created successfully" 0
}

# 1. 基本システムテスト
test_basic_system() {
    log "🔧 1. 基本システムテスト"
    
    # アプリケーション稼働確認
    info "アプリケーション稼働確認"
    local health_response=$(api_request "GET" "/health" "")
    
    if echo "$health_response" | grep -q "status.*ok\|healthy"; then
        success "アプリケーション稼働: OK"
        record_test "basic" "app_health" "passed" "Application is running" 0
    else
        error "アプリケーション稼働: FAILED"
        record_test "basic" "app_health" "failed" "Application not responding" 0
        return 1
    fi
    
    # メトリクスエンドポイント確認
    info "Prometheusメトリクスエンドポイント確認"
    local metrics_response=$(curl -s "$BASE_URL/metrics" 2>/dev/null | head -10)
    
    if [ -n "$metrics_response" ] && echo "$metrics_response" | grep -q "techsapo"; then
        success "メトリクスエンドポイント: OK"
        record_test "basic" "metrics_endpoint" "passed" "Metrics endpoint responding" 0
    else
        error "メトリクスエンドポイント: FAILED"
        record_test "basic" "metrics_endpoint" "failed" "Metrics endpoint not responding" 0
    fi
}

# 2. RAG基本機能テスト
test_rag_basic_functions() {
    log "🗂️ 2. RAG基本機能テスト"
    
    # RAGヘルスチェック
    info "RAGシステムヘルスチェック"
    local rag_health=$(api_request "GET" "/api/v1/rag/health" "")
    
    if echo "$rag_health" | grep -q "status.*healthy\|ok"; then
        success "RAGヘルスチェック: OK"
        record_test "rag" "health_check" "passed" "RAG system healthy" 0
    else
        warn "RAGヘルスチェック: PARTIAL"
        record_test "rag" "health_check" "warning" "RAG system may have issues" 0
    fi
    
    # Vector Store一覧取得
    info "Vector Store一覧取得"
    local vector_stores=$(api_request "GET" "/api/v1/rag/vector-stores" "")
    
    if echo "$vector_stores" | grep -q "success\|data"; then
        success "Vector Store一覧取得: OK"
        record_test "rag" "vector_stores_list" "passed" "Vector stores list retrieved" 0
    else
        warn "Vector Store一覧取得: PARTIAL"
        record_test "rag" "vector_stores_list" "warning" "Vector stores list incomplete" 0
    fi
}

# 3. GoogleDrive接続テスト
test_googledrive_connection() {
    log "🌐 3. GoogleDrive接続テスト"
    
    # 認証テスト
    info "GoogleDrive認証テスト"
    local auth_test=$(api_request "GET" "/api/v1/rag/test-auth" "" 10)
    
    if echo "$auth_test" | grep -q "success.*true\|authenticated"; then
        success "GoogleDrive認証: OK"
        record_test "googledrive" "authentication" "passed" "GoogleDrive authentication successful" 0
    else
        error "GoogleDrive認証: FAILED"
        record_test "googledrive" "authentication" "failed" "GoogleDrive authentication failed" 0
        return 1
    fi
    
    # フォルダアクセステスト
    if [ -n "${RAG_FOLDER_ID:-}" ]; then
        info "フォルダアクセステスト (ID: ${RAG_FOLDER_ID})"
        local folder_test=$(api_request "POST" "/api/v1/rag/list-documents" "{\"folder_id\":\"$RAG_FOLDER_ID\"}" 15)
        
        if echo "$folder_test" | grep -q "success\|documents"; then
            success "フォルダアクセス: OK"
            record_test "googledrive" "folder_access" "passed" "Folder access successful" 0
            
            # ドキュメント数確認
            local doc_count=$(echo "$folder_test" | jq '.data.documents | length' 2>/dev/null || echo "0")
            info "検出されたドキュメント数: $doc_count"
        else
            warn "フォルダアクセス: PARTIAL"
            record_test "googledrive" "folder_access" "warning" "Folder access issues" 0
        fi
    else
        warn "RAG_FOLDER_ID未設定のためフォルダテストスキップ"
        record_test "googledrive" "folder_access" "skipped" "RAG_FOLDER_ID not configured" 0
    fi
}

# 4. OpenAI Vector Store機能テスト
test_openai_vector_store() {
    log "🤖 4. OpenAI Vector Store機能テスト"
    
    # Vector Store作成テスト
    local test_store_name="techsapo-test-$(date +%s)"
    info "テスト用Vector Store作成: $test_store_name"
    
    local create_response=$(api_request "POST" "/api/v1/rag/create-vector-store" "{\"name\":\"$test_store_name\"}" 30)
    
    if echo "$create_response" | grep -q "success.*true\|id"; then
        success "Vector Store作成: OK"
        record_test "openai" "vector_store_creation" "passed" "Vector store created successfully" 0
        
        # Vector Store IDを取得
        local vector_store_id=$(echo "$create_response" | jq -r '.data.id // .id' 2>/dev/null || echo "")
        
        if [ -n "$vector_store_id" ] && [ "$vector_store_id" != "null" ]; then
            info "作成されたVector Store ID: $vector_store_id"
            
            # Vector Store詳細取得テスト
            local detail_response=$(api_request "GET" "/api/v1/rag/vector-store/$vector_store_id" "" 10)
            
            if echo "$detail_response" | grep -q "success\|$test_store_name"; then
                success "Vector Store詳細取得: OK"
                record_test "openai" "vector_store_details" "passed" "Vector store details retrieved" 0
            else
                warn "Vector Store詳細取得: PARTIAL"
                record_test "openai" "vector_store_details" "warning" "Vector store details incomplete" 0
            fi
            
            # クリーンアップ（テスト後削除）
            info "テスト用Vector Store削除"
            local delete_response=$(api_request "DELETE" "/api/v1/rag/vector-store/$vector_store_id" "" 10)
        fi
    else
        error "Vector Store作成: FAILED"
        record_test "openai" "vector_store_creation" "failed" "Vector store creation failed" 0
    fi
}

# 5. ドキュメント処理テスト
test_document_processing() {
    log "📄 5. ドキュメント処理テスト"
    
    # テスト用ドキュメント同期
    local test_vector_store="techsapo-doc-test-$(date +%s)"
    
    # 実際のGoogleDriveフォルダがある場合のテスト
    if [ -n "${RAG_FOLDER_ID:-}" ]; then
        info "実際のフォルダでドキュメント処理テスト"
        local sync_response=$(api_request "POST" "/api/v1/rag/sync-folder" \
            "{\"folder_id\":\"$RAG_FOLDER_ID\",\"vector_store_name\":\"$test_vector_store\",\"batch_size\":2}" 60)
        
        if echo "$sync_response" | grep -q "success.*true"; then
            success "フォルダ同期処理: OK"
            record_test "document" "folder_sync" "passed" "Folder sync completed successfully" 0
            
            # 処理結果詳細
            local processed_count=$(echo "$sync_response" | jq '.data.processed_documents // 0' 2>/dev/null || echo "0")
            local failed_count=$(echo "$sync_response" | jq '.data.failed_documents // 0' 2>/dev/null || echo "0")
            
            info "処理完了ドキュメント数: $processed_count"
            info "処理失敗ドキュメント数: $failed_count"
            
            if [ "$processed_count" -gt 0 ]; then
                success "ドキュメント処理: $processed_count件処理完了"
            else
                warn "ドキュメント処理: 処理されたドキュメントなし"
            fi
        else
            error "フォルダ同期処理: FAILED"
            record_test "document" "folder_sync" "failed" "Folder sync failed" 0
        fi
    else
        warn "RAG_FOLDER_ID未設定のため同期テストスキップ"
        record_test "document" "folder_sync" "skipped" "RAG_FOLDER_ID not configured" 0
    fi
    
    # ファイル形式対応テスト
    info "サポートファイル形式確認"
    local supported_formats=$(api_request "GET" "/api/v1/rag/supported-formats" "")
    
    if echo "$supported_formats" | grep -q "pdf\|text\|document"; then
        success "サポートファイル形式確認: OK"
        record_test "document" "supported_formats" "passed" "Supported formats available" 0
    else
        warn "サポートファイル形式確認: PARTIAL"
        record_test "document" "supported_formats" "warning" "Limited format support" 0
    fi
}

# 6. RAG検索機能テスト
test_rag_search() {
    log "🔍 6. RAG検索機能テスト"
    
    # 基本検索テスト
    local test_queries=(
        "Kubernetesのトラブルシューティング方法"
        "サーバーの負荷が高い場合の対処法"
        "データベース接続設定"
        "How to troubleshoot pod issues"
        "performance monitoring"
    )
    
    local search_success_count=0
    local total_search_tests=${#test_queries[@]}
    
    for query in "${test_queries[@]}"; do
        info "検索クエリテスト: '$query'"
        
        local search_response=$(api_request "POST" "/api/v1/rag/search" \
            "{\"query\":\"$query\",\"vector_store_name\":\"techsapo-documents\",\"max_results\":3}" 20)
        
        if echo "$search_response" | grep -q "success\|results"; then
            success "検索成功: '$query'"
            ((search_success_count++))
            
            # 結果数確認
            local result_count=$(echo "$search_response" | jq '.data.results | length' 2>/dev/null || echo "0")
            info "  検索結果数: $result_count"
        else
            warn "検索失敗: '$query'"
        fi
    done
    
    # 検索成功率判定
    local search_success_rate=$((search_success_count * 100 / total_search_tests))
    
    if [ $search_success_rate -gt 80 ]; then
        success "RAG検索機能: 優秀 ($search_success_count/$total_search_tests, ${search_success_rate}%)"
        record_test "search" "query_tests" "passed" "Search success rate: ${search_success_rate}%" 0
    elif [ $search_success_rate -gt 60 ]; then
        warn "RAG検索機能: 良好 ($search_success_count/$total_search_tests, ${search_success_rate}%)"
        record_test "search" "query_tests" "warning" "Search success rate: ${search_success_rate}%" 0
    else
        error "RAG検索機能: 要改善 ($search_success_count/$total_search_tests, ${search_success_rate}%)"
        record_test "search" "query_tests" "failed" "Search success rate: ${search_success_rate}%" 0
    fi
}

# 7. Webhook機能テスト
test_webhook_functionality() {
    log "🔔 7. Webhook機能テスト"
    
    # Webhook エンドポイント応答テスト
    info "Webhookエンドポイント応答テスト"
    local webhook_response=$(api_request "GET" "/api/v1/webhooks/googledrive/notifications" "")
    
    if echo "$webhook_response" | grep -q "Google Drive.*Webhook"; then
        success "Webhookエンドポイント: OK"
        record_test "webhook" "endpoint_response" "passed" "Webhook endpoint responding" 0
    else
        error "Webhookエンドポイント: FAILED"
        record_test "webhook" "endpoint_response" "failed" "Webhook endpoint not responding" 0
    fi
    
    # Webhook統計情報テスト
    info "Webhook統計情報テスト"
    local webhook_stats=$(api_request "GET" "/api/v1/webhooks/googledrive/webhook-stats" "")
    
    if echo "$webhook_stats" | grep -q "success.*true\|configuration"; then
        success "Webhook統計情報: OK"
        record_test "webhook" "stats_retrieval" "passed" "Webhook stats available" 0
    else
        warn "Webhook統計情報: PARTIAL"
        record_test "webhook" "stats_retrieval" "warning" "Webhook stats incomplete" 0
    fi
    
    # 模擬Webhookテスト
    info "模擬Webhookテスト"
    local mock_webhook=$(api_request "POST" "/api/v1/webhooks/googledrive/test-webhook" "{}")
    
    if echo "$mock_webhook" | grep -q "success.*true"; then
        success "模擬Webhook: OK"
        record_test "webhook" "mock_test" "passed" "Mock webhook test successful" 0
    else
        warn "模擬Webhook: PARTIAL"
        record_test "webhook" "mock_test" "warning" "Mock webhook test issues" 0
    fi
    
    # Push通知設定テスト
    info "Push通知設定テスト"
    local push_setup_test=$(api_request "GET" "/api/v1/webhook-setup/googledrive/test-setup" "")
    
    if echo "$push_setup_test" | grep -q "success.*true"; then
        success "Push通知設定: OK"
        record_test "webhook" "push_setup" "passed" "Push notification setup working" 0
    else
        warn "Push通知設定: 設定が必要"
        record_test "webhook" "push_setup" "warning" "Push notification setup needs attention" 0
    fi
}

# 8. エラーハンドリングテスト
test_error_handling() {
    log "🚨 8. エラーハンドリングテスト"
    
    # 不正なリクエストテスト
    info "不正なリクエストハンドリングテスト"
    
    # 存在しないVector Storeアクセス
    local invalid_search=$(api_request "POST" "/api/v1/rag/search" \
        "{\"query\":\"test\",\"vector_store_name\":\"nonexistent-store\"}")
    
    if echo "$invalid_search" | grep -q "error\|not found\|invalid"; then
        success "不正Vector Store処理: 適切にエラーハンドリング"
        record_test "error_handling" "invalid_vector_store" "passed" "Proper error handling for invalid vector store" 0
    else
        warn "不正Vector Store処理: エラーハンドリング要改善"
        record_test "error_handling" "invalid_vector_store" "warning" "Error handling could be improved" 0
    fi
    
    # 不正なフォルダIDテスト
    local invalid_folder=$(api_request "POST" "/api/v1/rag/list-documents" \
        "{\"folder_id\":\"invalid-folder-id\"}")
    
    if echo "$invalid_folder" | grep -q "error\|not found\|invalid\|permission"; then
        success "不正フォルダID処理: 適切にエラーハンドリング"
        record_test "error_handling" "invalid_folder" "passed" "Proper error handling for invalid folder" 0
    else
        warn "不正フォルダID処理: エラーハンドリング要改善"
        record_test "error_handling" "invalid_folder" "warning" "Error handling could be improved" 0
    fi
    
    # 空のクエリテスト
    local empty_query=$(api_request "POST" "/api/v1/rag/search" \
        "{\"query\":\"\",\"vector_store_name\":\"techsapo-documents\"}")
    
    if echo "$empty_query" | grep -q "error\|invalid\|required"; then
        success "空クエリ処理: 適切にエラーハンドリング"
        record_test "error_handling" "empty_query" "passed" "Proper error handling for empty query" 0
    else
        warn "空クエリ処理: エラーハンドリング要改善"
        record_test "error_handling" "empty_query" "warning" "Error handling could be improved" 0
    fi
}

# 9. パフォーマンステスト
test_performance() {
    log "⚡ 9. パフォーマンステスト"
    
    # レスポンス時間テスト
    info "レスポンス時間測定"
    
    local start_time=$(date +%s%N)
    local health_response=$(api_request "GET" "/health" "")
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 )) # ms
    
    if [ $response_time -lt 1000 ]; then
        success "ヘルスチェック応答時間: ${response_time}ms (優秀)"
        record_test "performance" "health_response_time" "passed" "Response time: ${response_time}ms" $response_time
    elif [ $response_time -lt 3000 ]; then
        warn "ヘルスチェック応答時間: ${response_time}ms (改善推奨)"
        record_test "performance" "health_response_time" "warning" "Response time: ${response_time}ms" $response_time
    else
        error "ヘルスチェック応答時間: ${response_time}ms (要改善)"
        record_test "performance" "health_response_time" "failed" "Response time: ${response_time}ms" $response_time
    fi
    
    # RAG検索パフォーマンステスト
    info "RAG検索パフォーマンス測定"
    
    start_time=$(date +%s%N)
    local search_response=$(api_request "POST" "/api/v1/rag/search" \
        "{\"query\":\"Kubernetes troubleshooting\",\"vector_store_name\":\"techsapo-documents\",\"max_results\":5}" 30)
    end_time=$(date +%s%N)
    local search_time=$(( (end_time - start_time) / 1000000 )) # ms
    
    if [ $search_time -lt 5000 ]; then
        success "RAG検索時間: ${search_time}ms (優秀)"
        record_test "performance" "rag_search_time" "passed" "Search time: ${search_time}ms" $search_time
    elif [ $search_time -lt 10000 ]; then
        warn "RAG検索時間: ${search_time}ms (改善推奨)"
        record_test "performance" "rag_search_time" "warning" "Search time: ${search_time}ms" $search_time
    else
        error "RAG検索時間: ${search_time}ms (要改善)"
        record_test "performance" "rag_search_time" "failed" "Search time: ${search_time}ms" $search_time
    fi
}

# 10. 統合テスト
test_integration() {
    log "🔗 10. 統合テスト"
    
    # 壁打ち分析 + RAG統合テスト
    info "壁打ち分析 + RAG統合テスト"
    
    local integration_response=$(api_request "POST" "/api/v1/generate" \
        "{\"prompt\":\"Kubernetesでポッドが起動しない問題を解決する方法を教えて\",\"task_type\":\"premium\",\"use_rag\":true,\"rag_vector_store\":\"techsapo-documents\"}" 45)
    
    if echo "$integration_response" | grep -q "success\|response\|analysis"; then
        success "壁打ち分析+RAG統合: OK"
        record_test "integration" "wallbounce_rag" "passed" "Wall-bounce analysis with RAG successful" 0
        
        # レスポンス品質確認
        if echo "$integration_response" | grep -q -i "kubernetes\|pod\|troubleshoot"; then
            success "レスポンス品質: 関連性の高い回答"
        else
            warn "レスポンス品質: 関連性要改善"
        fi
    else
        error "壁打ち分析+RAG統合: FAILED"
        record_test "integration" "wallbounce_rag" "failed" "Wall-bounce analysis with RAG failed" 0
    fi
}

# メトリクス確認
check_metrics() {
    log "📊 メトリクス確認"
    
    info "RAG関連メトリクス確認"
    local metrics=$(curl -s "$BASE_URL/metrics" 2>/dev/null | grep -E "techsapo_(rag|googledrive|webhook)" | head -10)
    
    if [ -n "$metrics" ]; then
        success "RAGメトリクス: 利用可能"
        record_test "metrics" "rag_metrics" "passed" "RAG metrics available" 0
        
        info "主要メトリクス:"
        echo "$metrics" | while IFS= read -r line; do
            info "  $line"
        done
    else
        warn "RAGメトリクス: 制限的"
        record_test "metrics" "rag_metrics" "warning" "Limited RAG metrics" 0
    fi
}

# 結果サマリー表示
show_summary() {
    log "📋 テスト結果サマリー"
    
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                         RAG SYSTEM COMPREHENSIVE TEST RESULTS                     ║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # 統計情報
    echo -e "${BLUE}📊 テスト統計:${NC}"
    echo -e "   総テスト数: ${TOTAL_TESTS}"
    echo -e "   ${GREEN}✅ 成功: ${PASSED_TESTS}${NC}"
    echo -e "   ${YELLOW}⚠️ 警告: ${WARNING_TESTS}${NC}"
    echo -e "   ${RED}❌ 失敗: ${FAILED_TESTS}${NC}"
    echo ""
    
    # 成功率計算
    if [ $TOTAL_TESTS -gt 0 ]; then
        local success_rate=$(( PASSED_TESTS * 100 / TOTAL_TESTS ))
        local warning_rate=$(( WARNING_TESTS * 100 / TOTAL_TESTS ))
        local failure_rate=$(( FAILED_TESTS * 100 / TOTAL_TESTS ))
        
        echo -e "${BLUE}📈 成功率分析:${NC}"
        echo -e "   成功率: ${success_rate}%"
        echo -e "   警告率: ${warning_rate}%"
        echo -e "   失敗率: ${failure_rate}%"
        echo ""
        
        # 総合判定
        if [ $success_rate -gt 90 ] && [ $FAILED_TESTS -eq 0 ]; then
            echo -e "${GREEN}🎉 総合判定: EXCELLENT${NC}"
            echo -e "${GREEN}   RAGシステムは完全に機能しています！${NC}"
        elif [ $success_rate -gt 80 ] && [ $FAILED_TESTS -eq 0 ]; then
            echo -e "${GREEN}👍 総合判定: VERY_GOOD${NC}"
            echo -e "${GREEN}   RAGシステムは良好に動作しています${NC}"
        elif [ $success_rate -gt 70 ] && [ $FAILED_TESTS -le 2 ]; then
            echo -e "${YELLOW}📝 総合判定: GOOD${NC}"
            echo -e "${YELLOW}   RAGシステムは概ね動作していますが、改善の余地があります${NC}"
        elif [ $FAILED_TESTS -le 5 ]; then
            echo -e "${YELLOW}⚠️ 総合判定: NEEDS_ATTENTION${NC}"
            echo -e "${YELLOW}   RAGシステムに設定・構成の問題があります${NC}"
        else
            echo -e "${RED}💔 総合判定: CRITICAL_ISSUES${NC}"
            echo -e "${RED}   RAGシステムに深刻な問題があります${NC}"
        fi
        echo ""
    fi
    
    # カテゴリ別結果
    echo -e "${BLUE}📋 カテゴリ別結果:${NC}"
    
    local categories=(
        "basic:基本システム"
        "rag:RAG機能" 
        "googledrive:GoogleDrive"
        "openai:OpenAI Vector Store"
        "document:ドキュメント処理"
        "search:検索機能"
        "webhook:Webhook"
        "error_handling:エラーハンドリング"
        "performance:パフォーマンス"
        "integration:統合機能"
        "metrics:メトリクス"
    )
    
    for category_info in "${categories[@]}"; do
        local cat_key="${category_info%%:*}"
        local cat_name="${category_info##*:}"
        
        local cat_passed=$(grep "\"category\":\"$cat_key\".*\"status\":\"passed\"" "$RESULTS_FILE" | wc -l)
        local cat_warning=$(grep "\"category\":\"$cat_key\".*\"status\":\"warning\"" "$RESULTS_FILE" | wc -l)
        local cat_failed=$(grep "\"category\":\"$cat_key\".*\"status\":\"failed\"" "$RESULTS_FILE" | wc -l)
        local cat_total=$((cat_passed + cat_warning + cat_failed))
        
        if [ $cat_total -gt 0 ]; then
            if [ $cat_failed -eq 0 ] && [ $cat_passed -gt $cat_warning ]; then
                echo -e "   ${GREEN}✅ ${cat_name}: ${cat_passed}/${cat_total} (良好)${NC}"
            elif [ $cat_failed -eq 0 ]; then
                echo -e "   ${YELLOW}⚠️ ${cat_name}: ${cat_passed}/${cat_total} (要注意)${NC}"
            else
                echo -e "   ${RED}❌ ${cat_name}: ${cat_passed}/${cat_total} (問題あり)${NC}"
            fi
        fi
    done
    echo ""
    
    # 推奨アクション
    echo -e "${BLUE}💡 推奨アクション:${NC}"
    
    if [ $FAILED_TESTS -gt 0 ]; then
        echo -e "${RED}   🔧 失敗したテストの詳細調査が必要です${NC}"
        echo -e "${RED}   📋 詳細ログを確認してください: $LOG_FILE${NC}"
    fi
    
    if [ $WARNING_TESTS -gt 3 ]; then
        echo -e "${YELLOW}   ⚙️ 環境変数設定を再確認してください${NC}"
        echo -e "${YELLOW}   🔑 API認証情報を確認してください${NC}"
    fi
    
    if [ $PASSED_TESTS -gt 15 ]; then
        echo -e "${GREEN}   🚀 本番環境デプロイの準備が整っています${NC}"
        echo -e "${GREEN}   📊 Grafana監視ダッシュボードを確認してください${NC}"
        echo -e "${GREEN}   🔄 リアルタイムWebhook同期をセットアップしてください${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}📁 出力ファイル:${NC}"
    echo -e "   詳細ログ: $LOG_FILE"
    echo -e "   結果JSON: $RESULTS_FILE"
    echo ""
}

# クリーンアップ
cleanup() {
    log "🧹 テストクリーンアップ実行"
    
    # テストデータ削除
    if [ -d "$TEST_DATA_DIR" ]; then
        rm -rf "$TEST_DATA_DIR"
        info "テストデータディレクトリ削除: $TEST_DATA_DIR"
    fi
    
    # テスト用Vector Store削除（もしあれば）
    # 実装: cleanup orphaned test vector stores
}

# メイン実行
main() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════════════════════════╗"
    echo "║                    RAG SYSTEM COMPREHENSIVE TEST SUITE                           ║"
    echo "║                        RAGシステム網羅的テストスイート                             ║"
    echo "╚═══════════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    log "🚀 RAGシステム網羅的テスト開始"
    
    # 結果ファイル初期化
    echo "[]" > "$RESULTS_FILE"
    
    # テスト実行
    prepare_test_data
    test_basic_system || { error "基本システムテスト失敗のため中断"; exit 1; }
    test_rag_basic_functions
    test_googledrive_connection
    test_openai_vector_store
    test_document_processing
    test_rag_search
    test_webhook_functionality
    test_error_handling
    test_performance
    test_integration
    check_metrics
    
    # 結果表示
    show_summary
    
    # 終了コード決定
    if [ $FAILED_TESTS -gt 5 ]; then
        exit 3  # Critical failures
    elif [ $FAILED_TESTS -gt 0 ]; then
        exit 2  # Some failures
    elif [ $WARNING_TESTS -gt 5 ]; then
        exit 1  # Configuration issues
    else
        exit 0  # Success
    fi
}

# シグナルハンドラー
trap cleanup EXIT

# コマンドライン処理
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    cat << EOF
RAG System Comprehensive Test Suite

使用方法:
    $0 [OPTIONS]

オプション:
    -h, --help     このヘルプを表示
    --base-url URL ベースURL指定 (デフォルト: http://localhost:4000)

終了コード:
    0  全テスト成功
    1  設定に問題あり
    2  一部テスト失敗
    3  重大な問題あり

テストカテゴリ:
    - 基本システム (アプリケーション稼働、メトリクス)
    - RAG機能 (ヘルスチェック、Vector Store)
    - GoogleDrive (認証、フォルダアクセス)
    - OpenAI Vector Store (作成、管理)
    - ドキュメント処理 (同期、フォーマット対応)
    - 検索機能 (クエリ処理、結果品質)
    - Webhook (リアルタイム同期、通知)
    - エラーハンドリング (異常系処理)
    - パフォーマンス (応答時間、処理速度)
    - 統合機能 (壁打ち分析+RAG)
    - メトリクス (Prometheus統計)

EOF
    exit 0
fi

if [[ "${1:-}" == "--base-url" ]] && [[ -n "${2:-}" ]]; then
    BASE_URL="$2"
fi

# メイン実行
main "$@"