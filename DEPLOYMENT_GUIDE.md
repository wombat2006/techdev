# TechSapo Deployment Guide - Production Ready

本番環境でのTechSapo壁打ち分析システム + Prometheus監視環境の完全デプロイメントガイド

## 🎯 デプロイメント概要

### 基本構成
- **アプリケーション**: TechSapo Wall-Bounce Analysis Server
- **監視システム**: Prometheus + Grafana + AlertManager
- **インフラ**: Docker/Podman + Nginx + SSL/TLS
- **データベース**: Redis (キャッシュ) + MySQL (ログ)
- **セキュリティ**: Let's Encrypt SSL + 認証・認可

### 対応環境
- **OS**: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- **Container**: Docker 20.10+ または Podman 3.0+
- **Node.js**: 18.0+ (コンテナ内)
- **メモリ**: 最低 4GB (推奨 8GB+)
- **ディスク**: 最低 20GB (推奨 50GB+)

## 🚀 クイックデプロイメント

### 1. Repository Clone & Setup
```bash
# Repository取得
git clone https://github.com/wombat2006/techsapo.git
cd techsapo

# 必要パッケージインストール
sudo apt update && sudo apt install -y docker.io docker-compose curl git

# Dockerサービス開始
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
# ログアウト・ログインして権限反映
```

### 2. Environment Configuration
```bash
# 環境設定ファイル作成
cp .env.example .env

# API Keys設定 (必須)
cat << 'EOF' > .env
# Core Configuration
NODE_ENV=production
PORT=4000
PROMETHEUS_METRICS=true

# LLM API Keys (必須設定)
OPENAI_API_KEY=sk-your-openai-key-here
GOOGLE_API_KEY=your-google-api-key
CLAUDE_API_KEY=your-claude-api-key
OPENROUTER_API_KEY=your-openrouter-key

# Security
JWT_SECRET=your-secure-jwt-secret-here
CORS_ORIGIN=https://yourdomain.com

# Database (Optional - 本番推奨)
REDIS_URL=redis://localhost:6379
MYSQL_HOST=localhost
MYSQL_USER=techsapo
MYSQL_PASSWORD=secure-password
MYSQL_DATABASE=techsapo

# Cost Management
MONTHLY_BUDGET_LIMIT=70
COST_ALERT_THRESHOLD=0.8

# SSL Certificate (Let's Encrypt)
DOMAIN=yourdomain.com
EMAIL=admin@yourdomain.com
EOF
```

### 3. SSL Certificate Setup (本番環境)
```bash
# ドメインの場合: Let's Encrypt自動設定
sudo ./scripts/install-renewal-cron.sh yourdomain.com admin@yourdomain.com

# ローカル開発の場合: 自己署名証明書
./scripts/renew-certificates.sh
```

### 4. 監視スタック起動
```bash
# 完全な監視環境を一発起動
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
# - Executive Dashboard
# - Operations Dashboard
# - Development Dashboard
```

### アラート通知設定
```bash
# Slack通知設定 (optional)
# docker/alertmanager/alertmanager.yml を編集

# Email通知設定
sed -i 's/alerts@techsapo.com/your-email@company.com/g' \
  docker/alertmanager/alertmanager.yml

# 設定反映
docker-compose -f docker/docker-compose.monitoring.yml restart alertmanager
```

## 🔐 セキュリティ設定

### Firewall Configuration
```bash
# Ubuntu/Debian
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (リダイレクト用)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 4000/tcp  # TechSapo App (内部のみ)
sudo ufw --force enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=4000/tcp
sudo firewall-cmd --reload
```

### Nginx Reverse Proxy (推奨)
```bash
# Nginx設定（SSL termination）
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

# TechSapo certificate renewal
./scripts/renew-certificates.sh
```

## 📈 Performance Optimization

### システムチューニング
```bash
# Node.js heap size調整 (8GB環境)
echo "NODE_OPTIONS='--max-old-space-size=4096'" >> .env

# Docker resource limits
# docker/docker-compose.monitoring.yml のmem_limit設定を調整

# Prometheus retention設定
# docker/prometheus/prometheus.yml
# retention.time: 15d → 30d (必要に応じて)
```

### Database Optimization
```bash
# Redis設定最適化
docker exec techsapo-redis redis-cli CONFIG SET maxmemory 512mb
docker exec techsapo-redis redis-cli CONFIG SET maxmemory-policy allkeys-lru

# MySQL設定最適化 (optional)
# my.cnf設定でinnodb_buffer_pool_size調整
```

## 🔄 Backup & Recovery

### データベースバックアップ
```bash
# Redis バックアップ
docker exec techsapo-redis redis-cli BGSAVE
docker cp techsapo-redis:/data/dump.rdb ./backups/redis-$(date +%Y%m%d).rdb

# Prometheus データバックアップ
docker-compose -f docker/docker-compose.monitoring.yml exec prometheus \
  tar czf /prometheus/backup-$(date +%Y%m%d).tar.gz /prometheus/data

# Grafana 設定バックアップ  
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

### Critical Alerts (P0)
- 壁打ち分析信頼度 < 0.7 → Slack + Email
- LLMエラー率 > 5% → 即座通知
- メモリ使用率 > 90% → SMS + Email

### Warning Alerts (P1)  
- 応答時間 > 5秒 → Email通知
- 日次コスト > $1.87 → 予算アラート
- キャッシュヒット率 < 80% → 性能アラート

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
        subject: '🚨 CRITICAL: TechSapo Alert'
```

## 🚀 Production Checklist

### デプロイ前確認
- [ ] 全API Keys設定完了
- [ ] SSL証明書設定完了  
- [ ] Firewall設定完了
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

## 📞 サポート・お問い合わせ

### 技術サポート
- **GitHub Issues**: https://github.com/wombat2006/techsapo/issues
- **ドキュメント**: README.md, MONITORING_SETUP.md
- **設定例**: docker/ ディレクトリ内各種設定ファイル

### 緊急時対応
- **Grafana Alert**: http://localhost:3000/alerting
- **Prometheus Status**: http://localhost:9090/targets
- **Application Logs**: `docker logs techsapo-app`
- **System Health**: `curl http://localhost:4000/health`

---

**🎯 Production-Grade Deployment Complete!**

**TechSapo壁打ち分析システム + 完全監視環境の本番デプロイメント完了**

*Enterprise-Ready Infrastructure with Full Observability*