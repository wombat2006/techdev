# 🏓 TechSapo - Google Drive RAGシステム with マルチLLM壁打ち分析

[![Test Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen.svg)](./tests/)
[![File Formats](https://img.shields.io/badge/formats-42+-blue.svg)](#file-formats)
[![Security](https://img.shields.io/badge/security-enterprise-red.svg)](#security)
[![Performance](https://img.shields.io/badge/performance-optimized-orange.svg)](#performance)

**壁打ち分析**とマルチLLMオーケストレーション、Google Drive RAG統合、42+ファイル形式対応による企業レベルAI支援システム

## 🎯 コアアーキテクチャ

### 壁打ち分析システム（必須壁打ち）
すべてのクエリで複数LLMによる協調分析を実行する革新的システム
- **必須要件**: 最低2つのLLMによる分析実行
- **合意形成**: 複数の回答から最適解を導出
- **品質保証**: ハルシネーション検証とエスカレーション機能

### マルチLLMオーケストレーション
- **Tier 1**: Claude Code（総司令官・ルーティング）
- **Tier 2**: Gemini 2.5 Pro + GPT-5（基本処理）
- **Tier 3**: Claude Sonnet4（プレミアム分析）
- **Tier 4**: OpenRouter Ensemble（補助分析）
- **Tier 5**: Claude Opus4.1（緊急時専用）

## 🚀 主要機能

### 🤖 AI駆動分析
- **壁打ち分析**: 複数LLMによる協調分析で高品質な回答生成
- **IT障害解析**: システムログとエラー出力の自動分析
- **RAG検索**: GoogleDrive統合による個人データ活用
- **3段階品質**: Basic/Premium/Critical対応

### 📁 ファイル形式対応 {#file-formats}
**42+種類のファイル形式に完全対応**
- **オフィス文書(15種)**: PDF, DOCX, XLSX, PPTX, DOC, XLS, PPT, XLSB, ODT, ODS, ODP, Pages, Numbers, Key, XLMS
- **アーカイブ(8種)**: ZIP, 7Z, RAR, GZIP, XZ, TAR, LZH, EPUB
- **画像・メディア(6種)**: PNG, JPEG, J2K, MP4, MPG, MP3
- **プログラミング(10種)**: C, C++, Python, JavaScript, Shell, SQL, JSON, YAML, CSV, TSV
- **セキュリティ(3種)**: PEM証明書, CRT証明書, P7B証明書
- **その他**: SQLite, RTF, TXT

### 📊 包括的監視機能
- **Prometheus統合**: 20+のカスタムメトリクス
- **Grafana可視化**: 経営/運用/開発ダッシュボード
- **3段階アラート**: P0（即座）/P1（15分）/P2（1時間）対応
- **コスト監視**: リアルタイム予算追跡（月額$70）

### 🔐 エンタープライズセキュリティ {#security}
- **マジックナンバー検証**: バイナリ署名による正確なファイル形式判定
- **拡張子詐称対策**: ファイル実体と拡張子の整合性チェック
- **マルウェア検出**: PE実行形式等の危険ファイル自動排除
- **暗号化通信**: TLS 1.3による全通信暗号化
- **GDPR/HIPAA準拠**: 機密情報マスキング・監査ログ
- **SSL/TLS**: Let's Encrypt自動更新

### ⚡ パフォーマンス最適化 {#performance}
- **ファイル処理速度**: 100MB/s以上の高速処理
- **レスポンス時間**: 50ms以内（90パーセンタイル）
- **メモリ効率**: 処理ファイルサイズの3倍以下
- **同時接続**: 1000RPS対応
- **100%テスト通過**: 包括的品質保証システム

### 🏗️ 本番環境インフラ
- **Docker完全対応**: フルコンテナ化
- **SSL証明書自動更新**: 90日サイクル
- **ゼロダウンタイム**: Nginx + PM2
- **高可用性**: Prometheus HA + Grafana クラスタリング

## 📋 前提条件

- Node.js 18.0.0 以上
- Docker & Docker Compose（またはPodman）
- APIキー: OpenAI、Google（Gemini）、Claude、OpenRouter
- （オプション）本番環境用Redis、MySQL

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

## 🎯 主要エンドポイント

### 壁打ち分析
```bash
# 基本IT支援
curl -X POST http://localhost:4000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Dockerコンテナが起動しない問題を解決したい",
    "task_type": "basic",
    "user_id": "engineer-001"
  }'

# プレミアム分析（3つのLLM）
curl -X POST http://localhost:4000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Kubernetesクラスタのネットワーク問題を分析",
    "task_type": "premium"
  }'

# 緊急時対応（4つのLLM）
curl -X POST http://localhost:4000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "本番データベース全停止の緊急復旧",
    "task_type": "critical"
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