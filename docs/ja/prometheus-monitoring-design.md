# TechSapo Prometheus監視システム 設計書（日本語版）

## 🎯 監視戦略概要

### システムアーキテクチャ分析
- **メインアプリケーション**: マルチLLMオーケストレーションによる壁打ち分析システム
- **主要サービス**: 4つのLLMプロバイダー統合 (Gemini 2.5 Pro, GPT-5, Claude Sonnet4, OpenRouter)
- **データ層**: Redis, MySQL, GoogleDrive統合
- **API層**: セキュリティミドルウェア付きExpress.js REST エンドポイント

*[English](../prometheus-monitoring-design.md) | 日本語*

## 📊 メトリクス分類

### 1. ビジネスメトリクス (Business Metrics)

**壁打ち分析パフォーマンス**
- `techsapo_wallbounce_requests_total` (Counter)
  - ラベル: `task_type` (basic/premium/critical), `provider`, `status`
- `techsapo_wallbounce_consensus_confidence` (Histogram)
  - バケット: [0.1, 0.3, 0.5, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0]
- `techsapo_wallbounce_processing_duration_seconds` (Histogram)
  - バケット: [0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0]
- `techsapo_wallbounce_cost_usd` (Counter)
  - ラベル: `provider`, `task_type`

**LLMプロバイダーパフォーマンス**
- `techsapo_llm_requests_total` (Counter)
  - ラベル: `provider`, `model`, `status`, `task_type`
- `techsapo_llm_response_time_seconds` (Histogram)
  - ラベル: `provider`, `model`
- `techsapo_llm_token_usage_total` (Counter)
  - ラベル: `provider`, `type` (input/output), `model`
- `techsapo_llm_agreement_score` (Histogram)
  - ラベル: `provider_pair`

**GoogleDrive RAGメトリクス**
- `techsapo_rag_sync_requests_total` (Counter)
  - ラベル: `folder_id`, `status`, `operation`
- `techsapo_rag_sync_duration_seconds` (Histogram)
  - ラベル: `folder_id`, `batch_size`
- `techsapo_rag_search_requests_total` (Counter)
  - ラベル: `vector_store_id`, `status`
- `techsapo_rag_search_duration_seconds` (Histogram)
  - ラベル: `vector_store_id`, `max_results`
- `techsapo_rag_document_processing_total` (Counter)
  - ラベル: `mime_type`, `status`
- `techsapo_googledrive_api_requests_total` (Counter)
  - ラベル: `operation`, `status`, `folder_id`

### 2. アプリケーションメトリクス (Application Metrics)

**API パフォーマンス**
- `techsapo_http_requests_total` (Counter)
  - ラベル: `method`, `route`, `status_code`
- `techsapo_http_request_duration_seconds` (Histogram)
  - ラベル: `method`, `route`
- `techsapo_http_request_size_bytes` (Histogram)
- `techsapo_http_response_size_bytes` (Histogram)

**データベース・キャッシュ**
- `techsapo_redis_operations_total` (Counter)
  - ラベル: `operation`, `status`
- `techsapo_redis_connection_pool_size` (Gauge)
- `techsapo_mysql_queries_total` (Counter)
  - ラベル: `query_type`, `status`
- `techsapo_cache_hit_ratio` (Gauge)
  - ラベル: `cache_type`

**エラー追跡**
- `techsapo_errors_total` (Counter)
  - ラベル: `error_type`, `severity`, `service`
- `techsapo_circuit_breaker_state` (Gauge)
  - ラベル: `service`, `state` (open/closed/half_open)

### 3. システムメトリクス (System Metrics)

**Node.js ランタイム**
- `nodejs_heap_size_total_bytes` (Gauge)
- `nodejs_heap_size_used_bytes` (Gauge)
- `nodejs_eventloop_lag_seconds` (Histogram)
- `nodejs_gc_duration_seconds` (Histogram)

**カスタムリソース使用量**
- `techsapo_memory_usage_bytes` (Gauge)
  - ラベル: `component`
- `techsapo_active_connections` (Gauge)
  - ラベル: `connection_type`
- `techsapo_queue_size` (Gauge)
  - ラベル: `queue_name`

### 4. セキュリティメトリクス (Security Metrics)
- `techsapo_auth_attempts_total` (Counter)
  - ラベル: `status`, `method`
- `techsapo_rate_limit_hits_total` (Counter)
  - ラベル: `endpoint`, `client_ip`
- `techsapo_input_sanitization_total` (Counter)
  - ラベル: `type`, `blocked`

### 5. 多言語・国際化メトリクス (i18n Metrics)
- `techsapo_requests_by_language` (Counter)
  - ラベル: `language` (ja, en, zh, ko)
- `techsapo_japanese_query_processing_seconds` (Histogram)
- `techsapo_response_quality_by_language` (Histogram)
  - ラベル: `language`, `quality_score`

## 🚦 アラート設定

### Critical Alerts (P0 - 即座対応)
- 壁打ち合意信頼度 < 0.7 (5分間継続)
- LLMプロバイダーエラー率 > 5% (2分間継続)
- HTTP エラー率 (5xx) > 1% (1分間継続)
- メモリ使用量 > 90% (30秒間継続)
- GoogleDrive API認証失敗 > 3回 (5分間)
- RAG Vector Store接続失敗 (2分間継続)

### Warning Alerts (P1 - 15分以内対応)
- 平均応答時間 > 5秒 (5分間継続)
- 予算消費量 > 日次予算の80%
- Redis接続失敗 > 10回 (5分間)
- 合意信頼度低下トレンド (1時間で10%以上低下)
- RAG同期エラー率 > 10% (10分間)

### Info Alerts (P2 - 1時間以内対応)
- 日次リクエスト量がベースライン比50%増加
- 新LLMプロバイダー追加/削除
- キャッシュヒット率 < 80% (30分間)
- GoogleDrive同期遅延 > 10分

## 📈 ダッシュボード構成

### 1. エグゼクティブダッシュボード
- システム全体健康度スコア
- 日次/時間別リクエスト量
- コスト追跡と予算使用率
- SLA準拠メトリクス
- ROI分析（壁打ち分析の価値指標）

### 2. 運用ダッシュボード
- 壁打ち分析パフォーマンス
- LLMプロバイダー比較分析
- エラー率・レイテンシトレンド
- インフラリソース使用状況
- GoogleDrive RAG統合状況

### 3. 開発ダッシュボード
- APIエンドポイント詳細パフォーマンス
- データベースクエリ性能
- キャッシュ効率分析
- エラーデバッグ情報
- 開発環境メトリクス

### 4. RAG統合ダッシュボード
- GoogleDrive同期状況
- Vector Store性能分析
- RAG検索精度・レイテンシ
- ドキュメント処理統計
- OpenAI API使用量・コスト

### 5. セキュリティダッシュボード
- 認証・認可メトリクス
- レート制限統計
- 入力サニタイゼーション状況
- セキュリティアラート履歴
- 不正アクセス試行検出

## 🔧 実装要件

### パフォーマンス要件
- メトリクス収集オーバーヘッド < 1% CPU使用率
- メトリクス用メモリオーバーヘッド < 50MB
- スクレイプ間隔: 15秒
- データ保持期間: 15日（詳細）、90日（集約）

### 高可用性
- Prometheus HA構成（2レプリカ）
- Grafanaクラスタリング
- AlertManager冗長化
- データバックアップ（6時間間隔）

### セキュリティ
- Prometheusとターゲット間mTLS
- Grafanaアクセス用RBAC
- メトリクスストレージ暗号化
- ログ内PII データマスキング

## 🌍 国際化対応

### 多言語サポート
- ダッシュボード表示言語: 日本語/English
- アラートメッセージ多言語化
- ログメッセージ国際化
- 地域別メトリクス収集

### タイムゾーン対応
- Asia/Tokyo標準時での表示
- グローバル利用時のタイムゾーン変換
- 地域別利用統計
- 時差を考慮したアラート配信

## 📊 カスタムメトリクス実装例

### 壁打ち分析品質メトリクス
```typescript
// 合意信頼度ヒストグラム
const consensusConfidenceHistogram = new prometheus.Histogram({
  name: 'techsapo_wallbounce_consensus_confidence',
  help: '壁打ち分析における複数LLM間の合意信頼度',
  buckets: [0.1, 0.3, 0.5, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0],
  labelNames: ['task_type', 'provider_count', 'user_id']
});

// LLM間合意スコア
const llmAgreementScore = new prometheus.Histogram({
  name: 'techsapo_llm_agreement_score',
  help: 'LLMプロバイダー間の回答合意度スコア',
  buckets: [0.0, 0.2, 0.4, 0.6, 0.8, 0.9, 0.95, 1.0],
  labelNames: ['provider_pair', 'task_complexity']
});
```

### RAG統合メトリクス
```typescript
// GoogleDrive同期性能
const ragSyncDuration = new prometheus.Histogram({
  name: 'techsapo_rag_sync_duration_seconds',
  help: 'GoogleDriveフォルダのRAG同期処理時間',
  buckets: [1, 5, 15, 30, 60, 120, 300, 600],
  labelNames: ['folder_id', 'document_count', 'batch_size']
});

// RAG検索精度
const ragSearchAccuracy = new prometheus.Histogram({
  name: 'techsapo_rag_search_accuracy',
  help: 'RAG検索結果の精度スコア',
  buckets: [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0],
  labelNames: ['vector_store_id', 'query_type', 'language']
});
```

### コスト効率メトリクス
```typescript
// プロバイダー別コスト効率
const costEfficiencyRatio = new prometheus.Gauge({
  name: 'techsapo_cost_efficiency_ratio',
  help: 'LLMプロバイダー別コスト効率比（品質/コスト）',
  labelNames: ['provider', 'model', 'task_type']
});

// 日次予算消費率
const dailyBudgetConsumption = new prometheus.Gauge({
  name: 'techsapo_daily_budget_consumption_ratio',
  help: '日次予算消費率（0.0-1.0）',
  labelNames: ['date', 'service_tier']
});
```

## 🔍 監視クエリ例

### ビジネスKPI監視
```prometheus
# 壁打ち分析成功率（過去24時間）
sum(rate(techsapo_wallbounce_requests_total{status="success"}[24h])) 
/ 
sum(rate(techsapo_wallbounce_requests_total[24h])) * 100

# 平均合意信頼度（過去1時間）
histogram_quantile(0.5, 
  sum(rate(techsapo_wallbounce_consensus_confidence_bucket[1h])) by (le)
)

# LLMプロバイダー別応答時間比較
histogram_quantile(0.95, 
  sum(rate(techsapo_llm_response_time_seconds_bucket[5m])) 
  by (provider, le)
)

# 日次コスト追跡
sum(increase(techsapo_wallbounce_cost_usd[24h])) by (provider)
```

### RAG統合監視
```prometheus
# GoogleDrive同期成功率
sum(rate(techsapo_rag_sync_requests_total{status="success"}[1h]))
/
sum(rate(techsapo_rag_sync_requests_total[1h])) * 100

# RAG検索平均応答時間
histogram_quantile(0.5,
  sum(rate(techsapo_rag_search_duration_seconds_bucket[5m])) by (le)
)

# Vector Store使用効率
sum(techsapo_rag_search_requests_total) 
/ 
sum(techsapo_rag_document_processing_total) * 100
```

### 運用効率監視
```prometheus
# システム可用性
up{job="techsapo-app"} * 100

# メモリ使用効率
(techsapo_memory_usage_bytes / nodejs_heap_size_total_bytes) * 100

# エラー率トレンド
rate(techsapo_errors_total[5m]) * 100
```

## 📋 アラートルール実装例

### P0クリティカルアラート
```yaml
groups:
- name: techsapo-critical-alerts
  rules:
  - alert: WallBounceConsensusConfidenceLow
    expr: |
      histogram_quantile(0.5, 
        sum(rate(techsapo_wallbounce_consensus_confidence_bucket[5m])) by (le)
      ) < 0.7
    for: 5m
    labels:
      severity: critical
      priority: P0
      service: wall-bounce-analyzer
      team: sre
    annotations:
      summary: "壁打ち分析の合意信頼度が危険レベルまで低下"
      description: "過去5分間の壁打ち分析で合意信頼度中央値が0.7を下回りました"
      playbook_url: "https://docs.techsapo.com/runbooks/wallbounce-confidence"
      
  - alert: GoogleDriveRAGConnectionFailed
    expr: |
      sum(rate(techsapo_googledrive_api_requests_total{status="error"}[2m])) > 0
    for: 2m
    labels:
      severity: critical
      priority: P0
      service: rag-system
      team: platform
    annotations:
      summary: "GoogleDrive RAGシステム接続失敗"
      description: "GoogleDrive APIとの接続が2分間失敗し続けています"
```

### P1警告アラート
```yaml
  - alert: RAGSearchLatencyHigh
    expr: |
      histogram_quantile(0.95, 
        sum(rate(techsapo_rag_search_duration_seconds_bucket[5m])) by (le)
      ) > 10
    for: 5m
    labels:
      severity: warning
      priority: P1
      service: rag-system
      team: platform
    annotations:
      summary: "RAG検索のレイテンシが高すぎます"
      description: "RAG検索の95パーセンタイルレイテンシが10秒を超えています"
      
  - alert: DailyBudgetConsumptionHigh
    expr: techsapo_daily_budget_consumption_ratio > 0.8
    for: 10m
    labels:
      severity: warning
      priority: P1
      service: cost-management
      team: finance
    annotations:
      summary: "日次予算消費率が80%を超過"
      description: "本日の予算消費率が{{ $value | humanizePercentage }}に達しました"
```

## 🎯 SLA・SLI・SLO定義

### Service Level Indicators (SLI)
1. **可用性**: `up{job="techsapo-app"}` = 1
2. **成功率**: 壁打ち分析成功率 > 95%
3. **レイテンシ**: HTTP応答時間P95 < 3秒
4. **RAG精度**: RAG検索精度 > 85%
5. **コスト効率**: 日次予算遵守率 > 95%

### Service Level Objectives (SLO)
- **月次可用性**: 99.9%以上
- **壁打ち分析成功率**: 95%以上
- **平均応答時間**: 3秒以下
- **RAG同期成功率**: 98%以上
- **予算超過頻度**: 月1回以下

### Service Level Agreements (SLA)
- **システム稼働保証**: 99.5%
- **データ損失ゼロ保証**: RPO=0, RTO<15分
- **セキュリティ侵害対応**: 4時間以内
- **メジャーバグ修正**: 24時間以内

---

**設計完了日**: 2025-08-27  
**対象システム**: TechSapo壁打ち分析システム + GoogleDrive RAG統合  
**設計方針**: ゼロベース、注意深い設計、包括的システム状態監視

**🎯 TechSapo Prometheus監視システム設計書（日本語版） - 完成！**

*エンタープライズグレード監視による完全なオブザーバビリティの実現*

---
🌐 **言語**: [English](../prometheus-monitoring-design.md) | **日本語**