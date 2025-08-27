# TechSapo Prometheus監視システム セットアップガイド（日本語版）

## 🎯 監視戦略概要

TechSapoの壁打ち分析システム用に包括的なPrometheus監視環境を構築するための完全ガイドです。ゼロベースから注意深く設計し、システムの状態を十分に確認できるようになります。

*[English](MONITORING_SETUP.md) | 日本語*

## 📊 実装済み監視メトリクス

### ビジネスメトリクス
- **壁打ち分析性能**: リクエスト数、信頼度分布、処理時間、コスト追跡
- **LLMプロバイダー性能**: 成功率、応答時間、トークン使用量、合意スコア

### アプリケーションメトリクス  
- **API性能**: HTTP リクエスト数、応答時間、エラー率
- **データベース・キャッシュ**: Redis操作、MySQL クエリ、キャッシュヒット率

### システムメトリクス
- **Node.js ランタイム**: ヒープ使用量、イベントループ遅延、GC時間
- **リソース使用量**: メモリ、接続数、キューサイズ

### セキュリティメトリクス
- **認証・アクセス制御**: 認証試行、レート制限、入力サニタイゼーション

## 🚦 アラート設定

### Critical (P0) - 即座対応
- 壁打ち合意信頼度 < 0.7 (5分間)
- LLMエラー率 > 5% (2分間)  
- HTTP 5xxエラー率 > 1% (1分間)
- メモリ使用率 > 90% (30秒間)

### Warning (P1) - 15分以内
- 平均応答時間 > 5秒 (5分間)
- 予算消費 > 80% (日次)
- Redis接続失敗 > 10回 (5分間)

### Info (P2) - 1時間以内
- 日次リクエスト数 > 平常時150%
- キャッシュヒット率 < 80%

## 🏗️ アーキテクチャ構成

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│   TechSapo App  │───▶│  Prometheus  │───▶│   Grafana   │
│   (Port 4000)   │    │  (Port 9090) │    │ (Port 3000) │
│   /metrics       │    │              │    │             │
└─────────────────┘    └──────────────┘    └─────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────┐
│ Node Exporter   │    │ AlertManager │
│ (Port 9100)     │    │ (Port 9093)  │
└─────────────────┘    └──────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────┐
│ Redis + Exporter│    │ Email/Slack  │
│ (Port 6379/9121)│    │ Notifications│
└─────────────────┘    └──────────────┘
```

## 📈 ダッシュボード構成

### 1. 経営ダッシュボード (Executive Dashboard)
- システム全体健康度スコア
- 日次リクエスト量・コスト追跡  
- SLA準拠状況
- LLMプロバイダー性能比較

### 2. 運用ダッシュボード (Operations Dashboard)
- 壁打ち分析成功率・信頼度
- LLMプロバイダー比較
- エラー率・レイテンシトレンド
- インフラリソース使用量

### 3. 開発ダッシュボード (Development Dashboard)
- APIエンドポイント性能
- データベースクエリ性能
- キャッシュ効率
- エラーデバッグ情報

## 🚀 起動方法

### 1. 監視スタック起動
```bash
./scripts/start-monitoring.sh
```

### 2. 手動起動
```bash
# 監視環境起動
docker-compose -f docker/docker-compose.monitoring.yml up -d

# アプリケーション起動（別ターミナル）  
npm run build
npm start
```

### 3. 動作確認
```bash
# ヘルスチェック
curl http://localhost:4000/health

# 壁打ち分析テスト
curl -X POST http://localhost:4000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"テスト用クエリ","task_type":"basic"}'

# メトリクス確認
curl http://localhost:4000/metrics | grep techsapo_wallbounce
```

## 📊 アクセス先

| サービス | URL | 認証情報 |
|---------|-----|----------|
| TechSapo App | http://localhost:4000 | - |
| Prometheus | http://localhost:9090 | - |
| Grafana | http://localhost:3000 | admin/techsapo2024! |
| AlertManager | http://localhost:9093 | - |
| Node Exporter | http://localhost:9100 | - |

## 🔧 設定ファイル構成

```
docker/
├── prometheus/
│   ├── prometheus.yml          # Prometheus設定
│   ├── alert_rules.yml         # アラートルール
│   └── recording_rules.yml     # レコーディングルール
├── alertmanager/
│   └── alertmanager.yml        # 通知設定
├── grafana/
│   ├── datasources/
│   │   └── datasource.yml      # データソース設定
│   └── dashboards/
│       ├── executive/          # 経営ダッシュボード
│       └── operations/         # 運用ダッシュボード
└── docker-compose.monitoring.yml
```

## 📈 メトリクス例

```prometheus
# 壁打ち分析成功率
techsapo:wallbounce_success_rate

# 平均信頼度 (5分間)
techsapo:wallbounce_avg_confidence_5m

# LLMプロバイダー別成功率
techsapo:llm_success_rate_by_provider{provider="Gemini"}

# HTTP P95応答時間
techsapo:http_p95_response_time

# 日次コスト
sum(increase(techsapo_wallbounce_cost_usd[24h]))
```

## 🔐 セキュリティ考慮事項

- メトリクスにPII情報は含めない
- Alert Manager でSMTP/Slack認証情報は環境変数設定
- Grafanaは強固なパスワード設定済み
- mTLS設定は本番環境で有効化

## 💰 コスト監視

- 月次予算: $70 (日次 $2.33)
- 予算80%到達時にWarningアラート  
- リアルタイムコスト追跡
- プロバイダー別コスト効率分析

## 🎯 運用ポイント

1. **定期確認**: Grafanaダッシュボードで日次システム状態確認
2. **アラート対応**: P0は即座対応、P1は15分以内、P2は1時間以内
3. **コスト最適化**: 週次でLLMプロバイダー効率分析
4. **性能チューニング**: 壁打ち分析信頼度とレスポンス時間のバランス調整

## 📋 メトリクス詳細定義

### 壁打ち分析メトリクス
- `techsapo_wallbounce_requests_total`: 壁打ち分析リクエスト総数
- `techsapo_wallbounce_consensus_confidence`: 合意信頼度分布
- `techsapo_wallbounce_processing_duration_seconds`: 処理時間
- `techsapo_wallbounce_cost_usd`: 分析コスト（USD）

### LLMプロバイダーメトリクス
- `techsapo_llm_requests_total`: LLMリクエスト総数
- `techsapo_llm_response_time_seconds`: LLM応答時間
- `techsapo_llm_token_usage_total`: トークン使用量
- `techsapo_llm_agreement_score`: プロバイダー間合意スコア

### アプリケーションメトリクス
- `techsapo_http_requests_total`: HTTPリクエスト総数
- `techsapo_http_request_duration_seconds`: HTTP応答時間
- `techsapo_http_request_size_bytes`: HTTPリクエストサイズ
- `techsapo_http_response_size_bytes`: HTTPレスポンスサイズ

### エラートラッキング
- `techsapo_errors_total`: エラー総数
- `techsapo_circuit_breaker_state`: サーキットブレーカー状態

## 🗂️ GoogleDrive RAG監視

### RAG専用メトリクス
```prometheus
# GoogleDrive API呼び出し監視
techsapo_googledrive_api_requests_total{operation="list_documents", status="success"}

# RAG検索性能監視
techsapo_rag_search_duration_seconds

# Vector Store同期監視
techsapo_rag_sync_documents_processed_total

# RAGコスト監視
techsapo_rag_openai_api_cost_usd{operation="vector_search"}
```

### RAGアラート設定
```yaml
# RAGシステム停止アラート
- alert: RAGSystemDown
  expr: up{job="techsapo-rag"} == 0
  for: 2m
  labels:
    severity: critical
    priority: P0
  annotations:
    summary: "RAGシステムが停止しています"

# GoogleDrive同期失敗アラート  
- alert: GoogleDriveSyncFailed
  expr: rate(techsapo_googledrive_api_requests_total{status="error"}[5m]) > 0.1
  for: 5m
  labels:
    severity: warning
    priority: P1
  annotations:
    summary: "GoogleDrive同期エラー率が上昇"

# Vector Store検索レイテンシアラート
- alert: RAGSearchLatencyHigh
  expr: histogram_quantile(0.95, rate(techsapo_rag_search_duration_seconds_bucket[5m])) > 10
  for: 5m
  labels:
    severity: warning
    priority: P1
  annotations:
    summary: "RAG検索のレイテンシが高すぎます"
```

## 🛠 トラブルシューティング

### よくある問題

#### Prometheusがメトリクスを収集できない
```bash
# ターゲット確認
curl http://localhost:9090/api/v1/targets

# アプリケーション側メトリクス確認
curl http://localhost:4000/metrics

# ネットワーク接続確認
docker network ls
docker exec prometheus ping techsapo-app
```

#### Grafanaダッシュボードが表示されない
```bash
# Grafana ログ確認
docker logs grafana

# データソース接続確認  
curl http://localhost:3000/api/datasources

# ダッシュボード設定確認
docker exec grafana ls -la /etc/grafana/provisioning/dashboards/
```

#### アラートが送信されない
```bash
# AlertManager設定確認
curl http://localhost:9093/api/v1/status

# アラートルール確認
curl http://localhost:9090/api/v1/rules

# SMTP設定テスト (本番環境)
docker exec alertmanager amtool config show
```

#### GoogleDrive RAG同期問題
```bash
# Google Drive API認証確認
curl -X GET http://localhost:4000/api/v1/rag/test-connection

# Vector Store状態確認
curl -X GET http://localhost:4000/api/v1/rag/vector-stores

# RAG処理ログ確認
docker logs techsapo-app --tail 100 | grep -E "(RAG|GoogleDrive)"

# OAuth トークン更新
node scripts/get-refresh-token.js
```

## 🔄 メンテナンス手順

### 日常メンテナンス
1. **朝次確認**: Grafanaダッシュボードチェック
2. **アラート確認**: 新しいアラートの確認と対応
3. **コスト確認**: 日次予算消費量確認
4. **ログ確認**: エラーログの確認
5. **RAG同期確認**: GoogleDrive同期状況確認

### 週次メンテナンス
1. **メトリクス確認**: 週次トレンド分析
2. **キャパシティ確認**: リソース使用量推移確認
3. **バックアップ確認**: Prometheus/Grafanaデータバックアップ
4. **アラート調整**: 誤検知アラートの閾値調整
5. **RAG最適化**: Vector Store性能分析

### 月次メンテナンス
1. **パフォーマンスレビュー**: 月次性能分析
2. **コスト分析**: 月次コスト分析とプロバイダー効率評価
3. **アーキテクチャレビュー**: システム構成の見直し
4. **SLA評価**: 月次SLA達成率評価
5. **RAGデータ整理**: 古いVector Storeデータクリーンアップ

## 📊 アラート設定詳細

### Critical Alert (P0) 設定例
```yaml
- alert: WallBounceConsensusConfidenceLow
  expr: techsapo_wallbounce_consensus_confidence < 0.7
  for: 5m
  labels:
    severity: critical
    priority: P0
    service: wall-bounce-analyzer
  annotations:
    summary: "壁打ち分析の合意信頼度が低下"
    description: "過去5分間の壁打ち分析で合意信頼度が0.7を下回りました"
```

### Warning Alert (P1) 設定例
```yaml
- alert: AverageResponseTimeSlow
  expr: rate(techsapo_http_request_duration_seconds_sum[10m]) / rate(techsapo_http_request_duration_seconds_count[10m]) > 5
  for: 5m
  labels:
    severity: warning
    priority: P1
    service: http-api
  annotations:
    summary: "平均応答時間が5秒を超過"
    description: "HTTPリクエストの平均応答時間が5秒を超えました"
```

### RAG Alert 設定例
```yaml
- alert: GoogleDriveRAGSyncFailure
  expr: increase(techsapo_rag_sync_errors_total[1h]) > 5
  for: 10m
  labels:
    severity: warning
    priority: P1
    service: rag-system
  annotations:
    summary: "GoogleDrive RAG同期エラー多発"
    description: "過去1時間でRAG同期エラーが5回を超えました"
```

## 🎯 成功指標 (KPI)

### 可用性指標
- **システム稼働率**: > 99.9%
- **壁打ち分析成功率**: > 95%
- **平均応答時間**: < 3秒
- **RAG検索成功率**: > 98%

### 品質指標
- **LLM合意信頼度**: > 0.8
- **エラー率**: < 0.1%
- **ユーザー満足度**: > 4.5/5.0
- **RAG検索精度**: > 85%

### 効率指標
- **コスト効率**: < $2.33/日
- **リソース使用効率**: CPU < 70%, Memory < 80%
- **キャッシュヒット率**: > 85%
- **RAG処理効率**: < 2秒/検索

## 🌐 多言語対応監視

### 日本語ログ処理
```bash
# 日本語ログの文字エンコーディング監視
techsapo_log_encoding_errors_total{encoding="utf8"}

# 日本語クエリ処理時間監視
techsapo_japanese_query_processing_seconds

# 日本語応答品質監視
techsapo_japanese_response_quality_score
```

### 国際化メトリクス
```prometheus
# 言語別リクエスト分布
techsapo_requests_by_language{language="ja"}

# 地域別レイテンシ監視
techsapo_response_time_by_region{region="asia-northeast"}

# タイムゾーン別負荷分散
techsapo_requests_by_timezone{timezone="Asia/Tokyo"}
```

---

**実装完了日**: 2025-08-27  
**監視対象**: 壁打ち分析システム (TechSapo)  
**設計方針**: ゼロベース、注意深い設計、包括的システム状態確認

**🎯 TechSapo Prometheus監視システム（日本語版） - フル稼働中！**

*ゼロベース設計による包括的監視環境で、システムの状態を完全に把握*

---
🌐 **言語**: [English](MONITORING_SETUP.md) | **日本語**