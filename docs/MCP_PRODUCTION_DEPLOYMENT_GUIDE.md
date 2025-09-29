# MCP サーバ最適化版本番デプロイメントガイド

## 概要

TechSapo MCP サーバ群の最適化版を本番環境にデプロイするための詳細な手順書です。パフォーマンス向上、信頼性確保、監視システム統合を含む包括的なデプロイメント戦略を提供します。

## 事前準備

### 1. システム要件確認

```bash
# Node.js バージョン確認
node --version  # v18.0.0 以上必須

# Redis サービス確認
redis-cli ping  # PONG が返ることを確認

# Codex 認証確認
ls -la /home/wombat/.codex/auth.json  # 認証ファイル存在確認
```

### 2. 依存関係の確認

```bash
# プロジェクトディレクトリに移動
cd /ai/prj/techdev

# 依存関係インストール確認
npm install

# TypeScript ビルド確認
npm run build
```

### 3. 設定ファイルの検証

```bash
# 最適化設定ファイル確認
cat config/codex-mcp.toml

# 認証設定確認
grep -i "auth_file" config/codex-mcp.toml
```

## デプロイメント手順

### Phase 1: ビルドと基本検証

```bash
# 1. 最新コードのビルド
npm run build

# 2. 基本テスト実行
npm test

# 3. 型チェック
npm run lint
```

### Phase 2: MCP サーバ最適化版起動

```bash
# 1. 既存 MCP サーバ停止（安全のため）
npm run codex-mcp-stop

# 2. 最適化版 MCP サーバ起動
npm run codex-mcp-restart

# 3. サーバ状態確認
npm run codex-mcp-test
```

### Phase 3: パフォーマンス監視開始

```bash
# 1. パフォーマンス監視システム開始
npm run mcp-performance

# 2. メトリクス収集開始確認
npm run mcp-metrics

# 3. アラートシステム確認
npm run mcp-alerts
```

### Phase 4: 統合動作テスト

```bash
# 1. 総合最適化チェック
npm run mcp-optimize

# 2. 最適化推奨事項確認
npm run mcp-recommendations

# 3. Wall-Bounce システム連携テスト
# Codex MCP サーバとの連携確認
```

## 監視とヘルスチェック

### リアルタイム監視コマンド

```bash
# パフォーマンスサマリー（推奨：5分間隔）
watch -n 300 'npm run mcp-performance'

# アクティブアラート監視（推奨：1分間隔）
watch -n 60 'npm run mcp-alerts'

# システムメトリクス詳細（推奨：必要時）
npm run mcp-metrics
```

### 重要な監視指標

| メトリクス | 正常範囲 | 警告レベル | 危険レベル |
|-----------|---------|-----------|-----------|
| **応答時間** | < 3秒 | 3-5秒 | > 5秒 |
| **キャッシュヒット率** | > 60% | 40-60% | < 40% |
| **エラー率** | < 2% | 2-5% | > 5% |
| **並列セッション数** | < 12 | 12-15 | > 15 |
| **メモリ使用量** | < 400MB | 400-512MB | > 512MB |

### アラート対応手順

#### 1. 高応答時間アラート
```bash
# キャッシュ状態確認
npm run mcp-metrics | grep cache

# サーキットブレーカー状態確認
npm run mcp-alerts | grep circuit

# 必要に応じてキャッシュクリア
# 設定ファイルで enable_response_caching = false に一時変更
```

#### 2. 高エラー率アラート
```bash
# エラーログ確認
tail -n 100 ~/.codex/log/codex-mcp.log

# サーキットブレーカー動作確認
npm run mcp-metrics | grep circuit_breaker

# 必要に応じてサーバ再起動
npm run codex-mcp-restart
```

#### 3. メモリ使用量アラート
```bash
# メモリ使用状況詳細確認
npm run mcp-metrics | grep memory

# キャッシュサイズ確認・調整
# config/codex-mcp.toml で cache_ttl_ms を短縮検討

# プロセス数調整
# config/codex-mcp.toml で max_processes を削減検討
```

## パフォーマンス最適化設定

### 高負荷時の設定調整

#### 設定ファイル: `config/codex-mcp.toml`

```toml
# 高負荷対応設定例
[mcp]
max_concurrent_sessions = 12        # 15 → 12 に削減
session_timeout_ms = 300000         # 600000 → 300000 に短縮

[performance]
max_processes = 6                   # 8 → 6 に削減
initial_response_timeout = 30000    # 45000 → 30000 に短縮
```

### 低負荷時の最適化設定

```toml
# 高パフォーマンス設定例
[mcp]
max_concurrent_sessions = 20        # 15 → 20 に増加
enable_request_batching = true
batch_size = 8                      # 5 → 8 に増加

[performance]
max_processes = 10                  # 8 → 10 に増加
connection_pool_size = 15           # 10 → 15 に増加
```

## トラブルシューティング

### よくある問題と解決策

#### 1. MCP サーバ起動失敗
```bash
# 認証ファイル確認
ls -la /home/wombat/.codex/auth.json

# ポート使用状況確認
netstat -tulpn | grep :3001

# 設定ファイル構文確認
npm run codex-mcp-test --dry-run
```

#### 2. パフォーマンス劣化
```bash
# キャッシュ効率確認
npm run mcp-performance | grep cache_hit_rate

# サーキットブレーカー状態確認
npm run mcp-alerts | grep circuit

# メトリクス履歴確認
npm run mcp-metrics | tail -n 20
```

#### 3. 監視システム応答なし
```bash
# 監視プロセス確認
ps aux | grep mcp-performance

# Redis 接続確認
redis-cli ping

# ログファイル確認
tail -n 50 ~/.codex/log/mcp-monitor.log
```

### 緊急時対応手順

#### 重大なパフォーマンス問題時
```bash
# 1. 最適化機能を一時無効化
# config/codex-mcp.toml で以下を false に設定：
# enable_response_caching = false
# enable_request_batching = false
# enable_circuit_breaker = false

# 2. 基本設定でサーバ再起動
npm run codex-mcp-restart

# 3. 基本動作確認
npm run codex-mcp-test
```

#### システム復旧手順
```bash
# 1. 段階的最適化再有効化
# キャッシュのみ有効化
sed -i 's/enable_response_caching = false/enable_response_caching = true/' config/codex-mcp.toml

# 2. 動作確認後、バッチ処理有効化
sed -i 's/enable_request_batching = false/enable_request_batching = true/' config/codex-mcp.toml

# 3. 最後にサーキットブレーカー有効化
sed -i 's/enable_circuit_breaker = false/enable_circuit_breaker = true/' config/codex-mcp.toml

# 各段階でサーバ再起動と動作確認
npm run codex-mcp-restart && npm run mcp-optimize
```

## 継続的改善

### 週次チェックリスト

```bash
# 1. パフォーマンストレンド分析
npm run mcp-recommendations

# 2. コスト効率分析
npm run mcp-metrics | grep cost

# 3. アラート履歴レビュー
npm run mcp-alerts --history

# 4. 設定最適化提案確認
npm run mcp-optimize --suggestions
```

### 月次最適化レビュー

```bash
# 1. 詳細メトリクス分析
npm run mcp-metrics --detailed --period=30d

# 2. 設定パラメータ調整提案
npm run mcp-recommendations --config-tuning

# 3. パフォーマンスベンチマーク
npm run mcp-optimize --benchmark

# 4. 容量計画レビュー
npm run mcp-metrics --capacity-planning
```

## セキュリティ要件

### 認証・認可確認
```bash
# MCP 認証設定確認
grep -A 5 "\[security\]" config/codex-mcp.toml

# リスクベース承認ポリシー確認
grep -A 10 "approval_workflows" config/codex-mcp.toml

# 監査ログ設定確認
grep "audit_logging" config/codex-mcp.toml
```

### データ保護確認
```bash
# 機密データ検出設定確認
grep "sensitive_data_detection" config/codex-mcp.toml

# 通信暗号化確認
grep -A 3 "enable_compression" config/codex-mcp.toml

# セッション管理セキュリティ確認
redis-cli keys "mcp:session:*" | wc -l
```

## 本番環境固有設定

### 環境変数設定
```bash
# 本番環境フラグ
export NODE_ENV=production

# MCP デバッグレベル
export MCP_DEBUG_LEVEL=info

# Redis 接続設定
export REDIS_URL=redis://localhost:6379

# 監視メトリクス出力
export ENABLE_PROMETHEUS_METRICS=true
```

### ログ設定最適化
```bash
# ログローテーション設定
sudo logrotate -d /etc/logrotate.d/techsapo-mcp

# ログレベル最適化（本番用）
sed -i 's/rust_log_level = "debug"/rust_log_level = "info"/' config/codex-mcp.toml
sed -i 's/log_level_performance = "debug"/log_level_performance = "info"/' config/codex-mcp.toml
```

## 成功指標

### デプロイメント成功基準

| 指標 | 目標値 | 測定方法 |
|------|-------|---------|
| **デプロイ時間** | < 10分 | `time npm run codex-mcp-restart` |
| **初期応答時間** | < 5秒 | `npm run mcp-performance` |
| **キャッシュヒット率** | > 50% | 1時間後の `npm run mcp-metrics` |
| **エラー率** | < 1% | 24時間後の `npm run mcp-alerts` |
| **利用可能性** | > 99.5% | 1週間のアップタイム監視 |

### 運用成功指標

- **パフォーマンス**: 40-50% 応答時間改善維持
- **信頼性**: サーキットブレーカー作動時の自動復旧
- **コスト効率**: 30-50% API コスト削減達成
- **監視**: アラート応答時間 < 5分
- **運用**: 手動介入頻度 < 1回/週

## 付録

### 設定ファイル完全版
```bash
# 本番最適化設定のバックアップ
cp config/codex-mcp.toml config/codex-mcp.toml.production.backup

# 設定確認コマンド
cat config/codex-mcp.toml | grep -E "(max_|enable_|timeout|threshold)"
```

### ログファイル場所
- **MCP サーバログ**: `~/.codex/log/codex-mcp.log`
- **パフォーマンスログ**: `~/.codex/log/performance.log`
- **アプリケーションログ**: `logs/techsapo.log`
- **エラーログ**: `logs/error.log`

### サポートコマンド一覧
```bash
# 基本操作
npm run codex-mcp              # MCP サーバ起動
npm run codex-mcp-stop         # MCP サーバ停止
npm run codex-mcp-restart      # MCP サーバ再起動
npm run codex-mcp-test         # 設定テスト

# 監視・メトリクス
npm run mcp-performance        # パフォーマンスサマリー
npm run mcp-metrics           # 詳細メトリクス
npm run mcp-alerts            # アクティブアラート
npm run mcp-recommendations   # 最適化推奨
npm run mcp-optimize          # 総合最適化チェック

# トラブルシューティング
npm run mcp-reset-cache       # キャッシュクリア
npm run mcp-health-check      # ヘルスチェック
npm run mcp-debug-mode        # デバッグモード起動
```

---

**作成日**: 2024年9月29日
**対象システム**: TechSapo MCP Server Infrastructure
**バージョン**: 最適化版 v1.0
**メンテナンス**: 月次更新推奨