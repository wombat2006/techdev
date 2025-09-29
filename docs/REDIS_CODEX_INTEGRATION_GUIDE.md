# Redis・Codex MCP統合設定ガイド

## 概要

TechSapoシステムにおけるUpstash Redis統合とCodex MCPサーバ自動起動機能の完全実装ガイドです。Claude Code起動時の自動統合、セッション管理、パフォーマンス監視を含む包括的なドキュメントです。

## アーキテクチャ概要

### 統合アーキテクチャ図

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Claude Code   │────│   TechSapo      │────│  Codex MCP      │
│   起動コマンド    │    │  メインアプリ     │    │   サーバ        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ start-with-     │    │  Upstash Redis  │    │ MCP Performance │
│ codex-mcp.sh    │    │  セッション管理   │    │  Monitor        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### コンポーネント構成

| コンポーネント | 役割 | 設定ファイル |
|-------------|------|------------|
| **TechSapo App** | メインアプリケーション | `src/index.ts` |
| **Codex MCP Server** | GPT-5/Codex統合 | `config/codex-mcp.toml` |
| **Upstash Redis** | セッション・キャッシュ | `.env` |
| **起動スクリプト** | 統合起動管理 | `scripts/start-with-codex-mcp.sh` |
| **MCP監視** | パフォーマンス監視 | `mcp-performance-monitor.ts` |

## Upstash Redis統合

### 環境設定

#### .env設定
```bash
# Upstash Redis接続情報
UPSTASH_REDIS_REST_URL="https://known-pipefish-11878.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AS5mAAIncDJmYWZlN2FiZTc5ZWQ0YmE5YTBmZjg4NTIzYjdkMTgyM3AyMTE4Nzg"

# その他の設定
NODE_ENV=production
PORT=4000
```

#### environment.ts設定
```typescript
redis: {
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN || '',
},
```

### Redis Service実装

#### 基本操作
```typescript
// Redis接続取得
const redis = getRedisService();

// 基本的なキー・バリュー操作
await redis.set('key', 'value', { ex: 3600 }); // 1時間TTL
const value = await redis.get('key');
await redis.del('key');
```

#### セッション管理
```typescript
// セッション保存（1時間）
await redis.setSession('session-id', {
  userId: 'user123',
  timestamp: Date.now()
}, 3600);

// セッション取得
const session = await redis.getSession('session-id');

// セッション削除
await redis.deleteSession('session-id');
```

#### キャッシュ管理
```typescript
// キャッシュ保存（5分）
await redis.setCache('cache-key', {
  data: 'cached-data'
}, 300);

// キャッシュ取得
const cached = await redis.getCache('cache-key');

// キャッシュ削除
await redis.deleteCache('cache-key');
```

#### コスト追跡
```typescript
// コスト記録
await redis.trackCost('user123', 'gpt-5-codex', 1500, 0.15);

// コストサマリー取得
const costs = await redis.getCostSummary('user123', '2024-09-29');
```

### Redis運用監視

#### 接続テスト
```bash
# Redis接続確認
node -e "
const { getRedisService } = require('./dist/services/redis-service');
const redis = getRedisService();
redis.set('test', 'hello').then(() =>
  redis.get('test')
).then(result =>
  console.log('Redis OK:', result)
).catch(err =>
  console.error('Redis Error:', err)
);
"
```

#### 監視コマンド
```bash
# セッション数確認
redis.keys('session:*').then(keys => console.log('Sessions:', keys.length))

# キャッシュ効率確認
redis.keys('cache:*').then(keys => console.log('Cache entries:', keys.length))

# コスト集計確認
redis.keys('cost:*').then(keys => console.log('Cost records:', keys.length))
```

## Codex MCP自動起動

### 起動スクリプト構成

#### start-with-codex-mcp.sh
```bash
#!/bin/bash
# TechSapo + Codex MCP Server 統合起動スクリプト

# 主要機能：
# - Codex CLI認証確認
# - 設定ファイル検証
# - TypeScriptビルド
# - Codex MCPサーバ起動
# - TechSapoアプリケーション起動
# - ヘルスチェック実行
# - MCP Performance Monitor初期化
```

#### 起動シーケンス
1. **環境確認**
   - Codex CLI インストール確認
   - 認証状態確認
   - 設定ファイル存在確認

2. **ビルドプロセス**
   - TypeScript コンパイル
   - 依存関係確認

3. **サービス起動**
   - 既存プロセス停止
   - Codex MCP サーバ起動（バックグラウンド）
   - TechSapo アプリケーション起動

4. **動作確認**
   - ヘルスチェック実行
   - MCP Performance Monitor 初期化
   - 起動状態レポート

### 起動コマンド

#### package.json設定
```json
{
  "scripts": {
    "start": "npm run start:with-codex",
    "start:app": "node dist/index.js",
    "start:with-codex": "./scripts/start-with-codex-mcp.sh",
    "stop": "./scripts/stop-services.sh"
  }
}
```

#### 使用方法
```bash
# 統合起動（推奨）
npm start

# フォアグラウンド起動
./scripts/start-with-codex-mcp.sh --foreground

# 個別起動
npm run start:app          # TechSapoのみ
npm run codex-mcp          # Codex MCPのみ

# 停止
npm stop
```

### プロセス管理

#### PIDファイル管理
```bash
# プロセスID保存場所
/tmp/techsapo-app.pid          # TechSapoアプリケーション
/tmp/techsapo-codex-mcp.pid    # Codex MCPサーバ
```

#### 停止スクリプト（stop-services.sh）
```bash
# グレースフル停止シーケンス
1. TERM シグナル送信
2. 10秒待機
3. 必要に応じてKILL シグナル
4. PIDファイル削除
5. ポート使用状況確認
```

### ログ管理

#### ログファイル構成
```bash
logs/
├── techsapo.log          # TechSapoメインログ
├── codex-mcp.log         # Codex MCPサーバログ
├── performance.log       # パフォーマンス監視ログ
└── error.log            # エラー専用ログ
```

#### ログローテーション設定
```bash
# logrotate設定例 (/etc/logrotate.d/techsapo)
/ai/prj/techdev/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        # 必要に応じてサービス再起動
    endscript
}
```

## MCP統合設定

### Codex MCP設定ファイル

#### config/codex-mcp.toml（抜粋）
```toml
[codex]
model = "gpt-5-codex"
sandbox = "read-only"
auth_file = "/home/wombat/.codex/auth.json"

[mcp]
approval_policy = "risk-based"
max_concurrent_sessions = 15
session_timeout_ms = 600000

# パフォーマンス最適化
enable_response_caching = true
cache_ttl_ms = 300000
enable_request_batching = true
batch_size = 5

[monitoring]
enable_real_time_monitoring = true
metrics_collection_interval_ms = 30000
alert_thresholds_response_time_ms = 5000
```

### Wall-Bounce統合

#### 複数LLM連携フロー
```
User Query → Claude Code → GPT-5/Codex → Sonnet 4 → Gemini 2.5 Pro → Response
    ↑                          ↓             ↓           ↓            ↓
    └─────── 統合回答作成 ←──── Wall-Bounce Analysis System ─────┘
```

#### 品質管理指標
- **信頼度閾値**: ≥ 0.7
- **合意度閾値**: ≥ 0.6
- **最小プロバイダー数**: 2
- **最大Wall-Bounce回数**: 5

## パフォーマンス監視

### MCP Performance Monitor

#### 監視メトリクス
```typescript
interface MCPPerformanceMetrics {
  timestamp: number;
  response_time: number;        // 応答時間（ms）
  cache_hit_rate: number;       // キャッシュヒット率
  active_sessions: number;      // アクティブセッション数
  error_rate: number;          // エラー率
  memory_usage: number;        // メモリ使用量（MB）
  cost_per_hour: number;       // 時間当たりコスト（USD）
}
```

#### アラート設定
```toml
[monitoring]
alert_thresholds_response_time_ms = 5000     # 応答時間 > 5秒
alert_thresholds_error_rate = 0.05           # エラー率 > 5%
alert_thresholds_cache_hit_rate = 0.6        # ヒット率 < 60%
alert_thresholds_queue_size = 10             # キューサイズ > 10
alert_thresholds_memory_usage_mb = 512       # メモリ使用量 > 512MB
```

#### 監視コマンド
```bash
# パフォーマンス概要
npm run mcp-performance

# 詳細メトリクス
npm run mcp-metrics

# アクティブアラート
npm run mcp-alerts

# 最適化推奨事項
npm run mcp-recommendations

# 総合最適化チェック
npm run mcp-optimize
```

### 監視ダッシュボード

#### リアルタイム監視
```bash
# 5分間隔でパフォーマンス監視
watch -n 300 'npm run mcp-performance'

# 1分間隔でアラート監視
watch -n 60 'npm run mcp-alerts'

# ログ監視
tail -f logs/techsapo.log logs/codex-mcp.log
```

#### Prometheus統合
```yaml
# prometheus.yml設定例
- job_name: 'techsapo-mcp'
  static_configs:
    - targets: ['localhost:4000']
  metrics_path: '/metrics'
  scrape_interval: 30s
```

## トラブルシューティング

### 一般的な問題と解決策

#### 1. Redis接続エラー
```bash
# 症状: "Upstash Redis URL and TOKEN are required"
# 解決策:
1. .env ファイル確認
2. 環境変数設定確認
   echo $UPSTASH_REDIS_REST_URL
   echo $UPSTASH_REDIS_REST_TOKEN
3. Redis接続テスト実行
```

#### 2. Codex MCP起動失敗
```bash
# 症状: "Failed to start Codex MCP server"
# 解決策:
1. Codex CLI認証確認
   codex login status
2. 設定ファイル確認
   cat config/codex-mcp.toml
3. 手動起動テスト
   codex mcp serve
```

#### 3. ポート競合
```bash
# 症状: "Port 4000 already in use"
# 解決策:
1. 使用中プロセス確認
   netstat -tulpn | grep :4000
2. プロセス停止
   npm stop
3. 強制停止（必要時）
   kill $(lsof -t -i:4000)
```

#### 4. メモリ不足
```bash
# 症状: "Memory usage alert"
# 解決策:
1. メモリ使用量確認
   npm run mcp-metrics | grep memory
2. キャッシュクリア
   # config/codex-mcp.toml で cache_ttl_ms を短縮
3. セッション数制限
   # max_concurrent_sessions を削減
```

### ログ分析

#### エラーパターン
```bash
# Redis関連エラー
grep "Redis.*error" logs/techsapo.log

# Codex MCP関連エラー
grep "MCP.*error" logs/codex-mcp.log

# パフォーマンス警告
grep "performance.*warning" logs/performance.log

# 認証エラー
grep "auth.*fail" logs/codex-mcp.log
```

#### パフォーマンス分析
```bash
# 応答時間トレンド
npm run mcp-metrics | jq '.[] | .response_time' | sort -n

# キャッシュ効率分析
npm run mcp-metrics | jq '.[] | .cache_hit_rate' | awk '{sum+=$1; count++} END {print "Average:", sum/count}'

# エラー率計算
npm run mcp-alerts | jq '[.[] | select(.metric == "error_rate")] | length'
```

## セキュリティ設定

### 認証・認可

#### Codex認証
```bash
# ChatGPT認証（推奨）
codex login

# API Key認証（代替）
codex login --api-key YOUR_API_KEY
```

#### Redis認証
```bash
# Upstash REST API認証
# .env ファイルでのトークン管理
# 環境変数での上書き可能
```

### データ保護

#### セッションセキュリティ
```typescript
// セッションデータ暗号化（実装例）
await redis.setSession(sessionId, encrypt(sessionData), ttl);
const sessionData = decrypt(await redis.getSession(sessionId));
```

#### 機密データ検出
```toml
[security]
sensitive_data_detection = true
audit_logging = true
risk_assessment = true
```

### アクセス制御

#### サンドボックス設定
```toml
[codex]
sandbox = "read-only"              # 読み取り専用
# sandbox = "isolated"             # 分離環境
# sandbox = "full-access"          # フルアクセス（非推奨）
```

#### 承認ワークフロー
```toml
[security.approval_workflows]
auto_approve_read_only = true
auto_approve_isolated = false
auto_approve_full_access = false
require_manual_approval_for_ci = true
```

## 運用ベストプラクティス

### 日常運用

#### 定期チェック項目
```bash
# 日次チェック
1. サービス稼働状況確認
   npm run mcp-performance
2. エラーログ確認
   tail -100 logs/error.log
3. コスト使用量確認
   npm run mcp-metrics | grep cost

# 週次チェック
1. パフォーマンストレンド分析
   npm run mcp-recommendations
2. 設定最適化レビュー
   npm run mcp-optimize
3. セキュリティ監査
   grep "security.*alert" logs/techsapo.log
```

#### メンテナンス作業
```bash
# ログローテーション
logrotate -f /etc/logrotate.d/techsapo

# キャッシュクリア
redis.flushdb()

# セッションクリーンアップ
redis.keys('session:*').then(keys =>
  keys.filter(key => isExpired(key)).forEach(key => redis.del(key))
)
```

### パフォーマンス最適化

#### 設定チューニング
```toml
# 高負荷時設定
[mcp]
max_concurrent_sessions = 10         # 削減
session_timeout_ms = 300000          # 短縮

[performance]
max_processes = 6                    # 削減
initial_response_timeout = 30000     # 短縮

# 低負荷時設定
[mcp]
max_concurrent_sessions = 20         # 増加
enable_request_batching = true
batch_size = 8                       # 増加

[performance]
max_processes = 12                   # 増加
connection_pool_size = 15            # 増加
```

#### キャッシュ戦略
```typescript
// 階層キャッシュ戦略
1. メモリキャッシュ（高速・短期）
2. Redisキャッシュ（中速・中期）
3. セッション永続化（低速・長期）

// TTL設定指針
- セッション: 1-24時間
- API レスポンス: 5-30分
- 設定データ: 1-6時間
- メトリクス: 1-5分
```

### 容量計画

#### リソース使用量予測
```bash
# メモリ使用量予測
current_memory=$(npm run mcp-metrics | jq '.memory_usage')
sessions=$(npm run mcp-metrics | jq '.active_sessions')
memory_per_session=$((current_memory / sessions))
max_sessions=$((512 / memory_per_session))  # 512MB制限

# コスト予測
hourly_cost=$(npm run mcp-metrics | jq '.cost_per_hour')
monthly_cost=$((hourly_cost * 24 * 30))
echo "Monthly cost projection: $${monthly_cost}"
```

#### スケーリング指針
```toml
# スケールアップ指標
- CPU使用率 > 80%
- メモリ使用率 > 90%
- 応答時間 > 10秒
- エラー率 > 10%

# スケールダウン指標
- CPU使用率 < 30%
- メモリ使用率 < 50%
- 応答時間 < 2秒
- エラー率 < 1%
```

## 付録

### 設定ファイル一覧

#### 主要設定ファイル
- `.env` - 環境変数設定
- `config/codex-mcp.toml` - Codex MCP設定
- `src/config/environment.ts` - アプリケーション設定
- `package.json` - NPMスクリプト設定

#### スクリプトファイル
- `scripts/start-with-codex-mcp.sh` - 統合起動
- `scripts/stop-services.sh` - サービス停止
- `scripts/start-codex-mcp.sh` - Codex MCP単体起動

### 環境変数リファレンス

#### 必須環境変数
```bash
UPSTASH_REDIS_REST_URL          # Upstash Redis URL
UPSTASH_REDIS_REST_TOKEN        # Upstash Redis認証トークン
HUGGINGFACE_API_KEY             # HuggingFace API Key
```

#### オプション環境変数
```bash
NODE_ENV                        # 実行環境 (development/production)
PORT                           # アプリケーションポート (default: 4000)
LOG_LEVEL                      # ログレベル (error/warn/info/debug)
MONTHLY_BUDGET_LIMIT           # 月次予算制限 (default: 70)
COST_ALERT_THRESHOLD           # コストアラート閾値 (default: 0.8)
WALL_BOUNCE_MIN_PROVIDERS      # Wall-Bounce最小プロバイダー数 (default: 2)
MCP_DEBUG_LEVEL               # MCP デバッグレベル
ENABLE_PROMETHEUS_METRICS      # Prometheus メトリクス有効化
```

### API エンドポイント

#### 基本エンドポイント
```bash
GET  /health                    # ヘルスチェック
GET  /ping                      # 疎通確認
GET  /metrics                   # Prometheus メトリクス
GET  /api/docs                  # API ドキュメント
```

#### MCP管理エンドポイント
```bash
GET  /api/v1/mcp/status         # MCP サーバ状態
GET  /api/v1/mcp/metrics        # MCP メトリクス
POST /api/v1/mcp/restart        # MCP サーバ再起動
```

#### セッション管理エンドポイント
```bash
GET  /api/v1/sessions           # セッション一覧
GET  /api/v1/sessions/:id       # セッション詳細
POST /api/v1/sessions           # セッション作成
DELETE /api/v1/sessions/:id     # セッション削除
```

---

**作成日**: 2024年9月29日
**対象バージョン**: TechSapo v1.0
**最終更新**: 統合設定完了時
**メンテナンス**: 月次レビュー推奨