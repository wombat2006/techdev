# 🏓 TechSapo - Enhanced MCP Orchestration with Wall-Bounce Analysis

[![Test Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](./tests/)
[![MCP Services](https://img.shields.io/badge/MCP%20services-7+-blue.svg)](#mcp-services)
[![Security](https://img.shields.io/badge/security-enterprise-red.svg)](#security)
[![Wall-Bounce](https://img.shields.io/badge/wall--bounce-enabled-green.svg)](#wall-bounce)

**Model Context Protocol統合**による壁打ち分析システム、環境変数暗号化、包括的テスト戦略による次世代IT支援プラットフォーム

## 🎯 Enhanced MCP Architecture

### 🏓 Wall-Bounce Analysis with MCP Integration
Model Context Protocol基盤の協調分析システム
- **必須MCP壁打ち**: 複数MCPサーバー経由での分析実行
- **品質統合**: ハルシネーション検証とコンセンサス評価
- **リファレンス強化**: Context7/Stash経由での最新ドキュメント参照

### Multi-LLM MCP Orchestration
- **Tier 0**: Stash/Context7 - リファレンス・ドキュメント参照層（非LLM）
- **Tier 1**: Claude Code - ルーティング・統合責任者
- **Tier 2**: Antigravity CLI（Gemini 2.5 Flash）+ Claude Haiku 3.5 + cursor-mcp - 基本処理
- **Tier 3**: Claude Sonnet4 + OpenRouter - 複雑分析
- **Tier 4**: GPT-5 - 最高品質
- **Tier 5**: Claude Opus4.1 + Cipher - 緊急時・セキュリティ専用

### 🔗 MCP Services Infrastructure {#mcp-services}
- **Wall-Bounce MCP**: 複数LLM協調処理オーケストレーター
- **Vault MCP**: AES-256-GCM暗号化環境変数管理
- **Stash MCP**: セマンティックコード検索・コンテキスト管理
- **OpenRouter MCP**: 200+モデルAPIゲートウェイ
- **Context7 MCP**: リアルタイムライブラリドキュメント統合
- **Cipher MCP**: 高度暗号化・セキュリティサービス
- **Monitoring MCP**: システム監視・メトリクス収集

## 🚀 主要機能

### 🤖 Enhanced AI Analysis
- **MCP Wall-Bounce**: Model Context Protocol経由の協調分析
- **Environment Security**: Vault MCP暗号化環境変数管理
- **Code Intelligence**: Stash MCP + cursor-mcp統合コード理解
- **Reference Integration**: Context7必須参照でドキュメント品質向上
- **Multi-Model Gateway**: OpenRouter 200+モデル統合

### 🔐 Advanced Security Features {#security}
- **Vault MCP**: AES-256-GCM暗号化 + JWT認証
- **Redis+File Hybrid**: 高可用性環境変数ストレージ
- **自動ローテーション**: 90日サイクル暗号キー更新
- **監査ログ**: 全アクセスパターン完全追跡
- **RBAC**: ロールベースアクセス制御
- **GDPR/HIPAA準拠**: 機密情報マスキング対応

### 📊 MCP Monitoring & Observability
- **Monitoring MCP**: 専用MCPサーバーによる統合監視
- **Wall-Bounce Metrics**: 品質スコア・コンセンサス・実行時間追跡
- **Vault Security Metrics**: 暗号化操作・認証・アクセス監視  
- **Multi-Service Health**: 全MCPサービス稼働状況統合管理
- **Cost Optimization**: $70/月予算でのリアルタイム最適化

### 🧪 Comprehensive Testing Strategy {#wall-bounce}
- **Property-Based Testing**: fast-check活用の体系的テスト
- **Wall-Bounce Quality Assurance**: 複数LLM品質検証
- **Security Testing**: ReDOS・暗号化・認証脆弱性検出
- **E2E MCP Integration**: 全サービス統合テスト
- **Performance Validation**: 負荷耐性・応答時間検証

### ⚡ Enhanced Performance
- **MCP Protocol Efficiency**: 標準化通信による最適化
- **Concurrent Processing**: 並列MCPサービス実行
- **Reference Caching**: Context7/Stash結果キャッシュ  
- **Quality Thresholds**: 信頼度0.7・コンセンサス0.6自動保証
- **Property-Test Coverage**: 包括的品質保証システム

### 🏗️ 本番環境インフラ
- **Docker完全対応**: フルコンテナ化
- **SSL証明書自動更新**: 90日サイクル
- **ゼロダウンタイム**: Nginx + PM2
- **高可用性**: Prometheus HA + Grafana クラスタリング

## 📋 前提条件

- Node.js 18.0.0 以上
- Docker & Docker Compose（またはPodman）
- **Antigravity CLI**（`agy`）— Google Tier 1（Gemini 2.5 Pro/Flash）。`agy auth login` で認証
- **Codex CLI** — GPT-5 Codex 連携
- APIキー: OpenAI、Claude（SDK）、OpenRouter 等（Google Gemini API キー直埋めは禁止）
- （オプション）本番環境用 Redis、MySQL

> Google プロバイダー詳細: [docs/ANTIGRAVITY_CLI_MIGRATION.md](docs/ANTIGRAVITY_CLI_MIGRATION.md)  
> ※ 実装は legacy `gemini` spawn のまま（Antigravity CLI へ移行予定）

## 🛠 クイックスタート

### 1. リポジトリセットアップ
```bash
git clone https://github.com/wombat2006/techsapo.git
cd techsapo
npm install
```

### 2. 環境設定
```bash
cp .env.example .env
# .envファイルにAPIキーを設定
```

### 3. ビルドと起動
```bash
# 完全監視スタック起動
./scripts/start-monitoring.sh

# または手動起動
npm run build
npm start
```

## 🎯 MCP エンドポイント

### Wall-Bounce MCP Analysis
```bash
# MCP Wall-Bounce 基本分析
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "wall-bounce-analyze",
      "arguments": {
        "query": "Dockerコンテナ起動問題の解決方法",
        "priority": "standard"
      }
    }
  }'

# 高品質分析（Context7参照付き）
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "wall-bounce-analyze",
      "arguments": {
        "query": "Kubernetes最新ベストプラクティス分析",
        "priority": "high",
        "context": {"useContext7": true}
      }
    }
  }'

# 緊急時対応（全MCPサービス統合）
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "wall-bounce-analyze",
      "arguments": {
        "query": "本番データベース全停止の緊急復旧",
        "priority": "critical"
      }
    }
  }'
```

### Vault MCP 環境変数管理
```bash
# 暗号化環境変数設定
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "vault-set-secret",
      "arguments": {
        "key": "DATABASE_URL",
        "value": "postgresql://user:pass@host:5432/db",
        "environment": "production"
      }
    }
  }'

# 暗号化環境変数取得
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "tools/call",
    "params": {
      "name": "vault-get-secret",
      "arguments": {
        "key": "DATABASE_URL",
        "environment": "production"
      }
    }
  }'
```

### Context7 MCP ドキュメント参照
```bash
# ライブラリドキュメント取得
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "tools/call",
    "params": {
      "name": "context7-get-docs",
      "arguments": {
        "libraryId": "/microsoft/typescript",
        "topic": "advanced types",
        "maxTokens": 2000
      }
    }
  }'
```

### ログ解析
```bash
curl -X POST http://localhost:4000/api/v1/analyze-logs \
  -H "Content-Type: application/json" \
  -d '{
    "user_command": "systemctl start mysql",
    "error_output": "Job for mysql.service failed. Connection refused on port 3306",
    "system_context": "Ubuntu 20.04, MySQL 8.0"
  }'
```

### RAG検索
```bash
curl -X POST http://localhost:4000/api/v1/rag/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "過去のサーバー移行手順書を検索",
    "user_drive_folder_id": "1BxYz..."
  }'
```

## 📊 監視とオブザーバビリティ

### アクセス先
- **アプリケーション**: http://localhost:4000
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000（admin/techsapo2024!）
- **AlertManager**: http://localhost:9093
- **メトリクス**: http://localhost:4000/metrics

### 主要メトリクス
```prometheus
# 壁打ち分析成功率
techsapo:wallbounce_success_rate

# 平均信頼度スコア（5分間）
techsapo:wallbounce_avg_confidence_5m

# LLMプロバイダー性能
techsapo:llm_success_rate_by_provider{provider="Gemini"}

# 日次コスト追跡
sum(increase(techsapo_wallbounce_cost_usd[24h]))

# HTTP P95応答時間
techsapo:http_p95_response_time
```

### アラート例
- **クリティカル**: 壁打ち合意信頼度 < 0.7（5分間）
- **警告**: 平均応答時間 > 5秒（5分間）
- **情報**: 日次リクエスト数 > 平常時150%

## 🏗️ アーキテクチャ概要

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│   TechSapoアプリ │───▶│ Prometheus   │───▶│  Grafana    │
│  （ポート 4000） │    │（ポート 9090）│    │（ポート 3000）│
│   壁打ち分析    │    │   メトリクス  │    │ ダッシュボード│
└─────────────────┘    └──────────────┘    └─────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│ マルチLLM       │    │AlertManager  │    │ Node        │
│ オーケストレータ │    │（ポート 9093）│    │ Exporter    │
│ ┌─────────────┐ │    │ 通知管理     │    │（ポート 9100）│
│ │Gemini 2.5Pro│ │    └──────────────┘    └─────────────┘
│ │GPT-5        │ │
│ │Claude Sonnet│ │         ┌──────────────┐
│ │OpenRouter   │ │         │ Redisキャッシュ│
│ └─────────────┘ │         │（ポート 6379）│
└─────────────────┘         └──────────────┘
```

## 📈 デプロイメントオプション

### Docker本番スタック
```bash
# 完全監視環境
docker-compose -f docker/docker-compose.monitoring.yml up -d

# 本番環境デプロイメント
docker-compose -f docker/production/docker-compose.prod.yml up -d
```

### SSL証明書管理
```bash
# 自動更新インストール（90日サイクル）
./scripts/install-renewal-cron.sh

# 手動更新
./scripts/renew-certificates.sh
```

### PM2プロセス管理
```bash
pm2 start ecosystem.config.js
pm2 monit
pm2 logs techsapo
```

## 🔐 セキュリティ機能

- **認証**: OpenAI APIキー検証ミドルウェア
- **入力サニタイゼーション**: XSS/SQLインジェクション保護
- **レート制限**: エンドポイント別設定可能制限
- **データプライバシー**: PII マスキングとGDPR準拠
- **監査ログ**: 完全な活動追跡
- **SSL/TLS**: 自動更新証明書

## 💰 コスト管理

- **月次予算**: $70（設定可能）
- **リアルタイム追跡**: リクエスト毎のコスト監視
- **自動アラート**: 予算80%閾値
- **プロバイダー最適化**: コスト効率分析
- **使用量予測**: ML ベース予測

## 🧪 テストと品質保証

```bash
# 包括的テスト実行
npm test

# カバレッジ付きテスト
npm run test:coverage  

# Punycode置換テスト
npm test tests/punycode-replacement.test.ts

# 統合テスト
npm run test:integration
```

## 📚 ドキュメント

- **[監視セットアップ](./MONITORING_SETUP.md)**: 完全なPrometheus監視ガイド
- **[Prometheus設計](./docs/prometheus-monitoring-design.md)**: 詳細なメトリクスアーキテクチャ
- **[RAGセットアップガイド](./docs/RAG_SETUP_GUIDE.md)**: GoogleDrive統合
- **[CLAUDE.md](./CLAUDE.md)**: システム設定と要件

## 🔧 設定ファイル

```
├── docker/
│   ├── docker-compose.monitoring.yml    # 完全監視スタック
│   ├── prometheus/                       # Prometheus設定
│   ├── grafana/                         # Grafanaダッシュボード
│   └── production/                      # 本番環境デプロイメント
├── src/
│   ├── services/wall-bounce-analyzer.ts # コア分析エンジン
│   ├── metrics/prometheus-client.ts     # カスタムメトリクス
│   └── wall-bounce-server.ts           # メインアプリケーションサーバー
└── scripts/
    ├── start-monitoring.sh              # 監視スタック起動
    └── renew-certificates.sh            # SSL証明書管理
```

## 🌟 本番環境機能

### 高可用性
- **マルチインスタンス**: PM2クラスタモード
- **負荷分散**: Nginxアップストリーム設定
- **ヘルスチェック**: 自動フェイルオーバー
- **グレースフルシャットダウン**: ゼロダウンタイム再起動

### 監視とアラート
- **マルチチャネル通知**: Email、Slack、SMS
- **エスカレーションポリシー**: P0/P1/P2優先度処理
- **SLA監視**: 99.9%稼働率追跡
- **性能最適化**: 自動スケーリング判定

### データ管理
- **バックアップ戦略**: 自動日次バックアップ
- **災害復旧**: リージョン間レプリケーション
- **データ保持**: 15日詳細、90日集約
- **プライバシー準拠**: GDPR/HIPAA対応

## 🤝 貢献方法

1. リポジトリをフォーク
2. 機能ブランチを作成（`git checkout -b feature/amazing-feature`）
3. 壁打ち分析パターンに従う
4. 包括的監視メトリクスを追加
5. テストとドキュメントを含める
6. プルリクエストを送信

## 📄 ライセンス

MITライセンス - エンタープライズ利用可。詳細は[LICENSE](LICENSE)を参照。

## 📞 サポート

- **ドキュメント**: 完全なセットアップガイド付属
- **問題報告**: [GitHub Issues](https://github.com/wombat2006/techsapo/issues)
- **監視**: 組み込みヘルスチェックとアラート
- **コミュニティ**: 日本語サポート

---

**🎯 エンタープライズグレードIT基盤支援ツール**
**壁打ち分析システム - 本番環境対応完了！**

*マルチLLMオーケストレーションと包括的Prometheus監視による強力な支援*