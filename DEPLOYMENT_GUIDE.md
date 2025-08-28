# TechSapo MCP Orchestration デプロイメントガイド - 本番環境対応

本番環境でのTechSapo Enhanced MCP Orchestration + 7つの専門MCPサーバー + 包括的監視環境の完全デプロイメント手順書

## 🎯 Enhanced MCP デプロイメント概要

### MCP Services Architecture  
- **Core MCP Services**: 7つの専門MCPサーバー統合
- **Wall-Bounce MCP**: 複数LLM協調処理オーケストレーター
- **Vault MCP**: AES-256-GCM暗号化環境変数管理
- **Context7 MCP**: リアルタイムライブラリドキュメント統合
- **Stash MCP**: セマンティックコード検索・コンテキスト管理
- **OpenRouter MCP**: 200+モデルAPIゲートウェイ
- **Cipher MCP**: 高度暗号化・セキュリティサービス
- **Monitoring MCP**: 統合監視・メトリクス収集

### Infrastructure Components
- **MCP Protocol**: v2025-03-26準拠統一通信
- **監視システム**: Prometheus + Grafana + AlertManager + MCP監視
- **インフラストラクチャ**: Docker/Podman + Nginx + SSL/TLS
- **データストレージ**: Redis（Vault Cache）+ File Storage（暗号化）
- **セキュリティ**: Let's Encrypt SSL + JWT認証 + RBAC

### 対応環境
- **OS**: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- **コンテナ**: Docker 20.10+ または Podman 3.0+
- **Node.js**: 18.0+（MCPサーバー内）
- **メモリ**: 最低 8GB（推奨 16GB+ for 7 MCP services）
- **ディスク容量**: 最低 50GB（推奨 100GB+ for encrypted storage）

## 🚀 Enhanced MCP デプロイメント

### 1. リポジトリ取得とセットアップ
```bash
# リポジトリ取得
git clone https://github.com/wombat2006/techsapo.git
cd techsapo

# 必要パッケージインストール
sudo apt update && sudo apt install -y docker.io docker-compose curl git

# Dockerサービス開始
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
# ログアウト・ログインして権限を反映
```

### 2. MCP Services 環境設定
```bash
# MCP サービス設定ファイル作成
cp .env.example .env

# MCP統合環境設定（必須）
cat << 'EOF' > .env
# MCP Core Configuration
NODE_ENV=production
MCP_SERVER_PORT=3000
MCP_LOG_LEVEL=info

# Wall-Bounce MCP Settings
WALL_BOUNCE_MAX_CONCURRENT=4
WALL_BOUNCE_QUALITY_THRESHOLD=0.7
WALL_BOUNCE_CONSENSUS_THRESHOLD=0.6

# Vault MCP Encryption Settings  
VAULT_ENCRYPTION_KEY=base64_encoded_256bit_key
VAULT_JWT_SECRET=your_jwt_secret_key
REDIS_URL=redis://localhost:6379

# Context7 MCP Integration
CONTEXT7_API_KEY=your_context7_api_key
CONTEXT7_CACHE_TTL=3600

# OpenRouter MCP Gateway
OPENROUTER_API_KEY=sk-or-your-openrouter-key
OPENROUTER_COST_TRACKING=enabled

# Cipher MCP Security
CIPHER_HSM_ENABLED=false
CIPHER_POST_QUANTUM=experimental

# Monitoring MCP
PROMETHEUS_URL=http://localhost:9090
GRAFANA_URL=http://localhost:3001

# LLM API キー（必須設定）
OPENAI_API_KEY=sk-your-openai-key-here
GOOGLE_API_KEY=your-google-api-key
CLAUDE_API_KEY=your-claude-api-key
OPENROUTER_API_KEY=your-openrouter-key

# セキュリティ
JWT_SECRET=your-secure-jwt-secret-here
CORS_ORIGIN=https://yourdomain.com

# データベース（オプション - 本番推奨）
REDIS_URL=redis://localhost:6379
MYSQL_HOST=localhost
MYSQL_USER=techsapo
MYSQL_PASSWORD=secure-password
MYSQL_DATABASE=techsapo

# コスト管理
MONTHLY_BUDGET_LIMIT=70
COST_ALERT_THRESHOLD=0.8

# SSL証明書（Let's Encrypt）
DOMAIN=yourdomain.com
EMAIL=admin@yourdomain.com
EOF
```

### 3. SSL証明書セットアップ（本番環境）
```bash
# ドメイン使用の場合: Let's Encrypt自動設定
sudo ./scripts/install-renewal-cron.sh yourdomain.com admin@yourdomain.com

# ローカル開発の場合: 自己署名証明書
./scripts/renew-certificates.sh
```

### 4. 監視スタック起動
```bash
# 完全な監視環境を一括起動
./scripts/start-monitoring.sh

# または手動起動
docker-compose -f docker/docker-compose.monitoring.yml up -d
```

### 5. 動作確認
```bash
# サービス確認
curl http://localhost:4000/health
curl http://localhost:9090/-/healthy  # Prometheus
curl http://localhost:3000/api/health  # Grafana

# 壁打ち分析テスト
curl -X POST http://localhost:4000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"サーバー起動確認テスト","task_type":"basic"}'

# メトリクス確認
curl http://localhost:4000/metrics | grep techsapo_wallbounce
```

## 📊 監視システム設定

### Grafana初期設定
```bash
# アクセス: http://localhost:3000
# 初期認証: admin / techsapo2024!

# データソース自動設定済み
# - Prometheus: http://prometheus:9090
# - AlertManager: http://alertmanager:9093

# ダッシュボード自動インポート済み
# - 経営ダッシュボード（Executive Dashboard）
# - 運用ダッシュボード（Operations Dashboard）
# - 開発ダッシュボード（Development Dashboard）
```

### アラート通知設定
```bash
# Slack通知設定（オプション）
# docker/alertmanager/alertmanager.yml を編集

# Email通知設定
sed -i 's/alerts@techsapo.com/your-email@company.com/g' \
  docker/alertmanager/alertmanager.yml

# 設定反映
docker-compose -f docker/docker-compose.monitoring.yml restart alertmanager
```

## 🔐 セキュリティ設定

### ファイアウォール設定
```bash
# Ubuntu/Debian
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP（リダイレクト用）
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 4000/tcp  # TechSapoアプリ（内部のみ）
sudo ufw --force enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=4000/tcp
sudo firewall-cmd --reload
```

### Nginxリバースプロキシ（推奨）
```bash
# Nginx設定（SSL終端処理）
sudo cp docker/production/nginx-letsencrypt.conf /etc/nginx/sites-available/techsapo
sudo ln -s /etc/nginx/sites-available/techsapo /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### SSL証明書自動更新
```bash
# Cron設定確認
crontab -l | grep certbot

# 手動更新テスト
sudo certbot renew --dry-run

# TechSapo証明書更新
./scripts/renew-certificates.sh
```

## 📈 パフォーマンス最適化

### システムチューニング
```bash
# Node.js ヒープサイズ調整（8GB環境）
echo "NODE_OPTIONS='--max-old-space-size=4096'" >> .env

# Dockerリソース制限
# docker/docker-compose.monitoring.yml のmem_limit設定を調整

# Prometheus保持期間設定
# docker/prometheus/prometheus.yml
# retention.time: 15d → 30d（必要に応じて）
```

### データベース最適化
```bash
# Redis設定最適化
docker exec techsapo-redis redis-cli CONFIG SET maxmemory 512mb
docker exec techsapo-redis redis-cli CONFIG SET maxmemory-policy allkeys-lru

# MySQL設定最適化（オプション）
# my.cnf設定でinnodb_buffer_pool_size調整
```

## 🔄 バックアップ・復旧

### データベースバックアップ
```bash
# Redisバックアップ
docker exec techsapo-redis redis-cli BGSAVE
docker cp techsapo-redis:/data/dump.rdb ./backups/redis-$(date +%Y%m%d).rdb

# Prometheusデータバックアップ
docker-compose -f docker/docker-compose.monitoring.yml exec prometheus \
  tar czf /prometheus/backup-$(date +%Y%m%d).tar.gz /prometheus/data

# Grafana設定バックアップ
docker cp techsapo-grafana:/var/lib/grafana ./backups/grafana-$(date +%Y%m%d)
```

### 設定ファイルバックアップ
```bash
# 自動バックアップスクリプト実行
./scripts/backup-claude.sh

# 手動設定バックアップ
tar czf config-backup-$(date +%Y%m%d).tar.gz \
  docker/ scripts/ .env CLAUDE.md *.md
```

## 🔧 トラブルシューティング

### よくある問題と対処法

#### コンテナ起動失敗
```bash
# ログ確認
docker-compose -f docker/docker-compose.monitoring.yml logs techsapo-app
docker-compose -f docker/docker-compose.monitoring.yml logs prometheus

# ポート競合確認
sudo netstat -tulnp | grep :4000
sudo netstat -tulnp | grep :9090

# 権限問題
sudo chown -R $USER:$USER /ai/prj/techsapo
sudo chmod +x scripts/*.sh
```

#### メトリクス収集失敗
```bash
# Prometheusターゲット確認
curl http://localhost:9090/api/v1/targets

# アプリケーションメトリクス確認
curl http://localhost:4000/metrics

# ファイアウォール確認
sudo ufw status verbose
```

#### SSL証明書エラー
```bash
# 証明書状態確認
sudo certbot certificates

# 手動更新実行
sudo certbot renew --force-renewal

# Nginx設定確認
sudo nginx -t
sudo systemctl status nginx
```

#### LLM API接続エラー
```bash
# 環境変数確認
docker exec techsapo-app env | grep API_KEY

# API接続テスト
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  https://api.openai.com/v1/models

# ログ確認
docker logs techsapo-app --tail 100
```

## 📊 監視・アラート設定詳細

### クリティカルアラート（P0）
- 壁打ち分析信頼度 < 0.7 → Slack + Email
- LLMエラー率 > 5% → 即座通知
- メモリ使用率 > 90% → SMS + Email

### 警告アラート（P1）
- 応答時間 > 5秒 → Email通知
- 日次コスト > $1.87 → 予算アラート
- キャッシュヒット率 < 80% → パフォーマンスアラート

### 通知チャネル設定
```yaml
# docker/alertmanager/alertmanager.yml
receivers:
  - name: 'critical-alerts'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts-critical'
    email_configs:
      - to: 'oncall@company.com'
        subject: '🚨 緊急: TechSapoアラート'
```

## 🚀 本番環境チェックリスト

### デプロイ前確認
- [ ] 全APIキー設定完了
- [ ] SSL証明書設定完了
- [ ] ファイアウォール設定完了
- [ ] バックアップ設定完了
- [ ] 監視アラート設定完了
- [ ] DNS設定完了（ドメイン使用時）
- [ ] ログローテーション設定完了

### デプロイ後確認
- [ ] 全サービス正常起動確認
- [ ] 壁打ち分析動作確認
- [ ] メトリクス収集確認
- [ ] アラート動作確認
- [ ] SSL/HTTPS動作確認
- [ ] バックアップ動作確認
- [ ] ログ出力確認

### 運用開始準備
- [ ] 運用手順書作成
- [ ] 障害対応手順確認
- [ ] エスカレーション体制確立
- [ ] 定期メンテナンス計画策定
- [ ] 容量監視閾値設定
- [ ] コスト監視設定確認

## 📊 パフォーマンス監視指標

### アプリケーション指標
- **壁打ち分析成功率**: > 95%
- **平均応答時間**: < 3秒
- **LLM合意信頼度**: > 0.8
- **日次コスト**: < $2.33

### インフラ指標
- **CPU使用率**: < 70%
- **メモリ使用率**: < 80%
- **ディスク使用率**: < 85%
- **ネットワークレイテンシ**: < 100ms

### ビジネス指標
- **月次予算遵守率**: > 95%
- **SLA達成率**: > 99.9%
- **エラー率**: < 0.1%
- **ユーザー満足度**: > 4.5/5.0

## 🛡️ セキュリティ運用

### 日常監視項目
- 認証失敗回数の監視
- 異常なトラフィックパターンの検出
- APIキー使用量の追跡
- 不正アクセス試行の記録

### 定期セキュリティタスク
- **週次**: ログ分析とセキュリティイベント確認
- **月次**: 脆弱性スキャンとパッチ適用
- **四半期**: セキュリティ設定レビュー
- **年次**: 包括的セキュリティ監査

## 💡 運用のベストプラクティス

### 日常運用
1. **朝次チェック**: Grafanaダッシュボードでシステム状態確認
2. **コスト監視**: 日次予算消費率確認
3. **アラート対応**: P0は即座、P1は15分以内、P2は1時間以内
4. **ログレビュー**: エラーログと異常パターンの確認

### 週次・月次メンテナンス
1. **週次**: バックアップ確認とシステム更新
2. **月次**: パフォーマンス分析とキャパシティプランニング
3. **四半期**: システムアーキテクチャレビュー
4. **年次**: 災害復旧テストとSLA見直し

## 📞 サポート・お問い合わせ

### 技術サポート
- **GitHub Issues**: https://github.com/wombat2006/techsapo/issues
- **ドキュメント**: README.md, MONITORING_SETUP.md
- **設定例**: docker/ ディレクトリ内各種設定ファイル

### 緊急時対応
- **Grafanaアラート**: http://localhost:3000/alerting
- **Prometheusステータス**: http://localhost:9090/targets
- **アプリケーションログ**: `docker logs techsapo-app`
- **システムヘルス**: `curl http://localhost:4000/health`

### エスカレーション手順
1. **L1サポート**: 基本的な動作確認とログ収集
2. **L2サポート**: システム分析と一次対応
3. **L3サポート**: 深刻な問題の根本原因分析
4. **緊急対応**: 24時間体制でのクリティカル問題対応

---

**🎯 本番環境デプロイメント完了！**

**TechSapo壁打ち分析システム + 完全監視環境の本番デプロイメントが完了しました**

*エンタープライズ対応インフラストラクチャ with フル・オブザーバビリティ*