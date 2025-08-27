# TechSapo デプロイメントガイド - 本番環境対応

本番環境でのTechSapo壁打ち分析システム + Prometheus監視環境の完全デプロイメント手順書

*[English](DEPLOYMENT_GUIDE.md) | 日本語*

## 🎯 デプロイメント概要

### 基本構成
- **アプリケーション**: TechSapo 壁打ち分析サーバー
- **監視システム**: Prometheus + Grafana + AlertManager
- **インフラストラクチャ**: Docker/Podman + Nginx + SSL/TLS
- **データベース**: Redis（キャッシュ）+ MySQL（ログ）
- **セキュリティ**: Let's Encrypt SSL + 認証・認可

### 対応環境
- **OS**: Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- **コンテナ**: Docker 20.10+ または Podman 3.0+
- **Node.js**: 18.0+（コンテナ内）
- **メモリ**: 最低 4GB（推奨 8GB+）
- **ディスク容量**: 最低 20GB（推奨 50GB+）

## 🚀 クイックデプロイメント

### ステップ 1: システム準備
```bash
# リポジトリ取得
git clone https://github.com/wombat2006/techsapo.git
cd techsapo

# 必要パッケージインストール（Ubuntu/Debian）
sudo apt update && sudo apt install -y docker.io docker-compose curl git

# 必要パッケージインストール（CentOS/RHEL）
sudo dnf install -y docker docker-compose curl git

# Dockerサービス開始と有効化
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

**注意**: ユーザーをdockerグループに追加した後は、ログアウト・ログインして権限を反映してください。

### ステップ 2: 環境設定ファイル作成
```bash
# 環境設定ファイル作成
cp .env.example .env

# APIキー設定（必須）
cat << 'EOF' > .env
# ===========================================
# TechSapo 本番環境設定
# ===========================================

# コア設定
NODE_ENV=production
PORT=4000
PROMETHEUS_METRICS=true
LOG_LEVEL=info

# ===========================================
# LLM API キー（必須設定）
# ===========================================
OPENAI_API_KEY=sk-your-openai-key-here
GOOGLE_API_KEY=your-google-api-key
CLAUDE_API_KEY=your-claude-api-key
OPENROUTER_API_KEY=your-openrouter-key

# ===========================================
# セキュリティ設定
# ===========================================
JWT_SECRET=your-super-secure-jwt-secret-here-min-32-chars
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ===========================================
# データベース設定（オプション - 本番推奨）
# ===========================================
REDIS_URL=redis://localhost:6379
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=techsapo
MYSQL_PASSWORD=secure-database-password-here
MYSQL_DATABASE=techsapo

# ===========================================
# コスト管理
# ===========================================
MONTHLY_BUDGET_LIMIT=70
COST_ALERT_THRESHOLD=0.8
COST_ALERT_EMAIL=admin@yourdomain.com

# ===========================================
# SSL証明書設定（Let's Encrypt）
# ===========================================
DOMAIN=yourdomain.com
EMAIL=admin@yourdomain.com
CERTBOT_EMAIL=admin@yourdomain.com

# ===========================================
# 監視・アラート設定
# ===========================================
GRAFANA_ADMIN_PASSWORD=techsapo2024!
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
ALERT_EMAIL=alerts@yourdomain.com
EOF
```

### ステップ 3: SSL証明書セットアップ
```bash
# 本番環境（ドメイン使用）: Let's Encrypt自動設定
sudo ./scripts/install-renewal-cron.sh yourdomain.com admin@yourdomain.com

# 開発/テスト環境: 自己署名証明書
./scripts/renew-certificates.sh

# 証明書設定確認
sudo certbot certificates
```

### ステップ 4: 監視スタック起動
```bash
# 完全な監視環境を一括起動
chmod +x scripts/start-monitoring.sh
./scripts/start-monitoring.sh

# または手動起動
docker-compose -f docker/docker-compose.monitoring.yml up -d

# 起動確認
docker-compose -f docker/docker-compose.monitoring.yml ps
```

### ステップ 5: 動作確認とテスト
```bash
# 基本サービス確認
curl -f http://localhost:4000/health
curl -f http://localhost:9090/-/healthy  # Prometheus
curl -f http://localhost:3000/api/health  # Grafana
curl -f http://localhost:9093/-/healthy  # AlertManager

# 壁打ち分析テスト
curl -X POST http://localhost:4000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "サーバー起動確認テスト - システムの動作状況を確認してください",
    "task_type": "basic",
    "user_id": "test-user"
  }'

# メトリクス収集確認
curl http://localhost:4000/metrics | grep -E "techsapo_wallbounce|techsapo_llm"

# ログ確認
docker logs techsapo-app --tail 20
```

## 📊 監視システム設定

### Grafana初期設定と確認
```bash
# Grafanaアクセス
# URL: http://localhost:3000
# 初期認証: admin / techsapo2024!

# データソース確認（自動設定済み）
curl -u admin:techsapo2024! http://localhost:3000/api/datasources

# ダッシュボード確認（自動インポート済み）
# - 経営ダッシュボード（Executive Dashboard）
# - 運用ダッシュボード（Operations Dashboard）
# - 開発ダッシュボード（Development Dashboard）

# アラート設定確認
curl http://localhost:9093/api/v1/alerts
```

### アラート通知設定カスタマイズ
```bash
# Slack通知設定（オプション）
# 1. docker/alertmanager/alertmanager.yml を編集
# 2. YOUR_SLACK_WEBHOOK_URL を実際のWebhook URLに置換

# Email通知設定
sed -i 's/alerts@techsapo.com/your-email@company.com/g' \
  docker/alertmanager/alertmanager.yml

# 設定反映
docker-compose -f docker/docker-compose.monitoring.yml restart alertmanager

# アラート設定テスト
curl -X POST http://localhost:9093/api/v1/alerts
```

## 🔐 セキュリティ設定

### ファイアウォール設定
```bash
# Ubuntu/Debian の場合
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    comment 'SSH'
sudo ufw allow 80/tcp    comment 'HTTP (redirect to HTTPS)'
sudo ufw allow 443/tcp   comment 'HTTPS'
sudo ufw allow from 10.0.0.0/8 to any port 4000 comment 'TechSapo App (internal)'
sudo ufw allow from 172.16.0.0/12 to any port 9090 comment 'Prometheus (internal)'
sudo ufw allow from 192.168.0.0/16 to any port 3000 comment 'Grafana (internal)'
sudo ufw --force enable

# CentOS/RHEL の場合
sudo firewall-cmd --permanent --remove-service=dhcpv6-client
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=4000/tcp --add-rich-rule='rule family="ipv4" source address="10.0.0.0/8" accept'
sudo firewall-cmd --permanent --add-port=9090/tcp --add-rich-rule='rule family="ipv4" source address="172.16.0.0/12" accept'
sudo firewall-cmd --permanent --add-port=3000/tcp --add-rich-rule='rule family="ipv4" source address="192.168.0.0/16" accept'
sudo firewall-cmd --reload

# 設定確認
sudo ufw status numbered  # Ubuntu/Debian
sudo firewall-cmd --list-all  # CentOS/RHEL
```

### Nginxリバースプロキシ設定（推奨）
```bash
# Nginx インストール（未インストールの場合）
sudo apt install nginx  # Ubuntu/Debian
sudo dnf install nginx  # CentOS/RHEL

# TechSapo専用設定ファイル配置
sudo cp docker/production/nginx-letsencrypt.conf /etc/nginx/sites-available/techsapo
sudo ln -s /etc/nginx/sites-available/techsapo /etc/nginx/sites-enabled/

# デフォルト設定を無効化
sudo rm -f /etc/nginx/sites-enabled/default

# Nginx設定テストと再起動
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# SSL設定確認
sudo nginx -T | grep -A 10 -B 5 ssl
```

### SSL証明書自動更新設定
```bash
# Cron設定確認
crontab -l | grep certbot

# 自動更新テスト（本番環境では--dry-runを外す）
sudo certbot renew --dry-run

# TechSapo専用証明書更新スクリプト
chmod +x scripts/renew-certificates.sh
./scripts/renew-certificates.sh

# 更新ログ確認
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

## 📈 パフォーマンス最適化

### Node.jsアプリケーションチューニング
```bash
# メモリ使用量に応じたヒープサイズ調整
# 8GB環境の場合
echo "NODE_OPTIONS='--max-old-space-size=4096'" >> .env

# 16GB環境の場合
echo "NODE_OPTIONS='--max-old-space-size=8192'" >> .env

# GCチューニング（高負荷環境）
echo "NODE_OPTIONS='--max-old-space-size=4096 --gc-interval=100'" >> .env
```

### Docker/Podmanリソース最適化
```bash
# Docker Compose でのリソース制限設定
# docker/docker-compose.monitoring.yml を編集

# 例：TechSapoアプリケーション用
services:
  techsapo-app:
    mem_limit: 2g
    cpus: 1.5

# Redisリソース制限
  techsapo-redis:
    mem_limit: 512m
    cpus: 0.5
```

## 🗂️ GoogleDrive RAG統合セットアップ

### GoogleDrive API設定
```bash
# Google Cloud Console設定手順
# 1. https://console.cloud.google.com でプロジェクト作成
# 2. Google Drive API有効化
# 3. OAuth 2.0認証情報作成

# 認証情報を環境変数に追加
cat >> .env << 'EOF'

# GoogleDrive RAG設定
GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=urn:ietf:wg:oauth:2.0:oob
GOOGLE_REFRESH_TOKEN=your-refresh-token

# OpenAI Vector Store設定
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_ORGANIZATION=org-your-organization-id
EOF
```

### OAuth認証トークン取得
```bash
# OAuth認証フロー実行
node << 'EOF'
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const scopes = ['https://www.googleapis.com/auth/drive.readonly'];
const url = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes
});

console.log('🔗 ブラウザでこのURLにアクセスしてください:');
console.log(url);
console.log('\n📋 認証コードを取得して次のコマンドを実行:');
console.log('GOOGLE_AUTH_CODE="取得した認証コード" node scripts/get-refresh-token.js');
EOF

# 認証コード設定後、リフレッシュトークン取得
cat > scripts/get-refresh-token.js << 'EOF'
const { OAuth2Client } = require('google-auth-library');

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.getToken(process.env.GOOGLE_AUTH_CODE).then(({ tokens }) => {
  console.log('✅ リフレッシュトークン取得完了:');
  console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
  console.log('\n📝 このトークンを.envファイルに追加してください');
}).catch(console.error);
EOF

chmod +x scripts/get-refresh-token.js
```

### GoogleDriveフォルダID取得
```bash
# GoogleDriveフォルダのURLからID抽出
# URL例: https://drive.google.com/drive/folders/1BxYzCdEfGhIjKlMnOpQrStUvWxYz123456
# フォルダID: 1BxYzCdEfGhIjKlMnOpQrStUvWxYz123456

# 環境変数に追加
echo "RAG_FOLDER_ID=1BxYzCdEfGhIjKlMnOpQrStUvWxYz123456" >> .env
```

### RAGシステム初期化
```bash
# GoogleDriveフォルダをRAGに同期
curl -X POST http://localhost:4000/api/v1/rag/sync-folder \
  -H "Content-Type: application/json" \
  -d '{
    "folder_id": "1BxYzCdEfGhIjKlMnOpQrStUvWxYz123456",
    "vector_store_name": "techsapo-documents",
    "batch_size": 5
  }'

# RAG検索テスト
curl -X POST http://localhost:4000/api/v1/rag/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "過去のサーバー移行手順書を検索",
    "vector_store_name": "techsapo-documents",
    "max_results": 5
  }'
```

### RAG統合監視メトリクス
```bash
# Prometheusメトリクス確認
curl http://localhost:4000/metrics | grep -E "(rag|googledrive)"

# 主要RAGメトリクス:
# - techsapo_rag_sync_duration_seconds
# - techsapo_rag_search_requests_total  
# - techsapo_rag_document_processing_total
# - techsapo_googledrive_api_requests_total
```

### RAGシステム運用
```bash
# 定期同期（日次バッチ）
cat > scripts/daily-rag-sync.sh << 'EOF'
#!/bin/bash
# 毎日深夜2時にGoogleDriveフォルダを同期

LOG_FILE="/var/log/techsapo/rag-sync.log"
FOLDER_ID="${RAG_FOLDER_ID}"

echo "$(date): RAG同期開始" >> $LOG_FILE

curl -X POST http://localhost:4000/api/v1/rag/sync-folder \
  -H "Content-Type: application/json" \
  -d "{
    \"folder_id\": \"$FOLDER_ID\",
    \"vector_store_name\": \"techsapo-documents\",
    \"batch_size\": 5
  }" >> $LOG_FILE 2>&1

echo "$(date): RAG同期完了" >> $LOG_FILE
EOF

chmod +x scripts/daily-rag-sync.sh

# Cron設定
echo "0 2 * * * /ai/prj/techsapo/scripts/daily-rag-sync.sh" | crontab -
```

### RAGトラブルシューティング
```bash
# Google Drive API接続テスト
curl -X GET http://localhost:4000/api/v1/rag/list-documents \
  -H "Content-Type: application/json" \
  -d '{"folder_id": "1BxYzCdEfGhIjKlMnOpQrStUvWxYz123456"}'

# OpenAI Vector Store状態確認
curl -X GET http://localhost:4000/api/v1/rag/vector-stores

# RAG処理ログ確認
docker logs techsapo-app --tail 100 | grep -E "(RAG|GoogleDrive|Vector Store)"

# よくあるエラーと対処法:
# - "Invalid credentials": GOOGLE_REFRESH_TOKEN再取得
# - "Quota exceeded": Google Cloud API制限確認
# - "Vector store not found": vector_store_name確認
```
    mem_reservation: 1g
    cpus: 1.5

# 例：Prometheus用
  prometheus:
    mem_limit: 4g
    mem_reservation: 2g
    cpus: 2.0

# 設定反映
docker-compose -f docker/docker-compose.monitoring.yml up -d --force-recreate
```

### データベースパフォーマンスチューニング
```bash
# Redis設定最適化
docker exec techsapo-redis redis-cli CONFIG SET maxmemory 1gb
docker exec techsapo-redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
docker exec techsapo-redis redis-cli CONFIG SET save "900 1 300 10 60 10000"

# MySQL設定最適化（オプション）
# /etc/mysql/mysql.conf.d/techsapo.cnf を作成
sudo tee /etc/mysql/mysql.conf.d/techsapo.cnf << 'EOF'
[mysqld]
# TechSapo 最適化設定
innodb_buffer_pool_size = 2G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
query_cache_size = 256M
max_connections = 200
table_open_cache = 4000
EOF

sudo systemctl restart mysql
```

### Prometheus最適化設定
```bash
# 保持期間とストレージ最適化
# docker/prometheus/prometheus.yml を編集
storage:
  tsdb:
    path: /prometheus/data
    retention.time: 30d  # 本番環境では30日
    retention.size: 20GB  # ディスク容量に応じて調整
    wal-compression: true

# スクラップ間隔の調整（高負荷環境）
scrape_configs:
  - job_name: 'techsapo-wallbounce'
    scrape_interval: 30s  # デフォルト15s -> 30s
    scrape_timeout: 15s   # デフォルト10s -> 15s
```

## 🔄 バックアップと災害復旧

### 自動バックアップ設定
```bash
# バックアップディレクトリ作成
sudo mkdir -p /backup/techsapo/{daily,weekly,monthly}
sudo chown -R $USER:$USER /backup/techsapo

# 日次バックアップスクリプト作成
cat << 'EOF' > /backup/techsapo/daily-backup.sh
#!/bin/bash
# TechSapo 日次バックアップスクリプト
set -e

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/techsapo/daily/$BACKUP_DATE"
mkdir -p "$BACKUP_DIR"

# Redis バックアップ
echo "Redis バックアップ開始..."
docker exec techsapo-redis redis-cli BGSAVE
sleep 10
docker cp techsapo-redis:/data/dump.rdb "$BACKUP_DIR/redis-dump.rdb"

# Prometheus データバックアップ
echo "Prometheus データバックアップ開始..."
docker exec prometheus tar czf /prometheus/backup.tar.gz /prometheus/data 2>/dev/null || true
docker cp prometheus:/prometheus/backup.tar.gz "$BACKUP_DIR/prometheus-data.tar.gz"

# Grafana 設定バックアップ
echo "Grafana 設定バックアップ開始..."
docker cp grafana:/var/lib/grafana "$BACKUP_DIR/grafana-lib"

# アプリケーション設定バックアップ
echo "アプリケーション設定バックアップ開始..."
tar czf "$BACKUP_DIR/app-config.tar.gz" \
  docker/ scripts/ .env* *.md 2>/dev/null || true

# 古いバックアップ削除（7日以上古いもの）
find /backup/techsapo/daily -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true

echo "日次バックアップ完了: $BACKUP_DIR"
EOF

chmod +x /backup/techsapo/daily-backup.sh

# Cron設定（毎日3:00AMに実行）
echo "0 3 * * * /backup/techsapo/daily-backup.sh >> /var/log/techsapo-backup.log 2>&1" | crontab -
```

### 災害復旧手順
```bash
# 緊急時復旧スクリプト
cat << 'EOF' > scripts/emergency-restore.sh
#!/bin/bash
# TechSapo 緊急復旧スクリプト
set -e

RESTORE_DIR="${1:-/backup/techsapo/daily/latest}"

if [ ! -d "$RESTORE_DIR" ]; then
    echo "エラー: バックアップディレクトリが見つかりません: $RESTORE_DIR"
    exit 1
fi

echo "緊急復旧開始: $RESTORE_DIR"

# サービス停止
docker-compose -f docker/docker-compose.monitoring.yml down

# Redis復旧
if [ -f "$RESTORE_DIR/redis-dump.rdb" ]; then
    echo "Redis データ復旧中..."
    docker run --rm -v redis_data:/data -v "$RESTORE_DIR":/backup alpine \
      cp /backup/redis-dump.rdb /data/dump.rdb
fi

# Prometheus復旧
if [ -f "$RESTORE_DIR/prometheus-data.tar.gz" ]; then
    echo "Prometheus データ復旧中..."
    docker run --rm -v prometheus_data:/prometheus -v "$RESTORE_DIR":/backup alpine \
      tar xzf /backup/prometheus-data.tar.gz -C /
fi

# Grafana復旧
if [ -d "$RESTORE_DIR/grafana-lib" ]; then
    echo "Grafana 設定復旧中..."
    docker run --rm -v grafana_data:/var/lib/grafana -v "$RESTORE_DIR":/backup alpine \
      cp -r /backup/grafana-lib/* /var/lib/grafana/
fi

# アプリケーション設定復旧
if [ -f "$RESTORE_DIR/app-config.tar.gz" ]; then
    echo "アプリケーション設定復旧中..."
    tar xzf "$RESTORE_DIR/app-config.tar.gz"
fi

# サービス再起動
docker-compose -f docker/docker-compose.monitoring.yml up -d

echo "緊急復旧完了"
echo "動作確認: curl http://localhost:4000/health"
EOF

chmod +x scripts/emergency-restore.sh
```

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. コンテナ起動失敗
```bash
# 詳細ログ確認
docker-compose -f docker/docker-compose.monitoring.yml logs --tail=50 techsapo-app
docker-compose -f docker/docker-compose.monitoring.yml logs --tail=50 prometheus

# ポート競合確認と解決
sudo ss -tulnp | grep -E ':(4000|9090|3000|9093)'
# 競合プロセス終了
sudo kill -9 $(sudo lsof -t -i:4000)

# ディスク容量確認
df -h
docker system df
# 不要イメージ・コンテナ削除
docker system prune -a --volumes

# 権限問題解決
sudo chown -R $USER:$USER /ai/prj/techsapo
find scripts/ -name "*.sh" -exec chmod +x {} \;
```

#### 2. メトリクス収集失敗
```bash
# Prometheusターゲット状態確認
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .job, health: .health, lastError: .lastError}'

# アプリケーションメトリクス直接確認
curl -s http://localhost:4000/metrics | grep -E "techsapo_|up "

# ネットワーク接続確認
docker network inspect techsapo_monitoring
docker exec prometheus ping techsapo-app
docker exec prometheus nslookup techsapo-app

# ファイアウォール確認
sudo ufw status verbose
sudo iptables -L INPUT -v -n
```

#### 3. SSL証明書問題
```bash
# 証明書状態詳細確認
sudo certbot certificates --cert-name yourdomain.com

# 証明書手動更新（強制）
sudo certbot renew --force-renewal --cert-name yourdomain.com

# Nginx SSL設定確認
sudo nginx -T | grep -A 20 -B 5 "ssl_certificate"
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Let's Encrypt制限確認
curl -s "https://crt.sh/?q=yourdomain.com&output=json" | jq '.[0:5]'
```

#### 4. LLM API接続問題
```bash
# 環境変数確認（機密情報をマスク）
docker exec techsapo-app env | grep -E "API_KEY|OPENAI|GOOGLE|CLAUDE" | sed 's/=.*/=***masked***/'

# OpenAI API接続テスト
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  https://api.openai.com/v1/models | jq '.data[0].id'

# Google API接続テスト  
curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GOOGLE_API_KEY" | jq '.models[0].name'

# ネットワーク・プロキシ確認
docker exec techsapo-app nslookup api.openai.com
docker exec techsapo-app curl -I https://api.openai.com

# アプリケーションログ詳細確認
docker logs techsapo-app --tail 100 | grep -E "(ERROR|WARN|API)"
```

## 📊 監視・アラート設定詳細

### 本番環境アラート設定
```yaml
# Critical Alert（P0）- 即座対応必須
- 壁打ち分析信頼度 < 0.7（5分間継続）
  → Slack（#critical-alerts）+ Email + SMS
- LLMエラー率 > 5%（2分間継続）
  → 即座通知、エスカレーション自動実行
- メモリ使用率 > 90%（30秒間継続）
  → SMS + Email、自動スケールアップ検討

# Warning Alert（P1）- 15分以内対応
- 平均応答時間 > 5秒（5分間継続）
  → Email通知、パフォーマンス分析開始
- 日次コスト > $1.87（予算80%超過）
  → 予算アラート、コスト分析レポート生成
- キャッシュヒット率 < 80%（30分間継続）
  → パフォーマンス最適化検討

# Info Alert（P2）- 1時間以内対応  
- 日次リクエスト数 > 平常時150%
  → キャパシティプランニング検討
- 新機能デプロイメント通知
  → 運用チームへ情報共有
```

### カスタムアラート設定例
```bash
# 独自アラートルール追加
cat << 'EOF' >> docker/prometheus/alert_rules.yml
- name: techsapo.custom
  rules:
    - alert: TechSapoHighMemoryUsage
      expr: (techsapo_memory_usage_bytes{component="heap_used"} / techsapo_memory_usage_bytes{component="heap_total"}) > 0.85
      for: 10m
      labels:
        severity: warning
        priority: P1
        service: nodejs-runtime
      annotations:
        summary: "TechSapo メモリ使用率が85%を超過"
        description: "Node.jsヒープメモリ使用率が85%を超えて10分間継続しています"
        
    - alert: TechSapoCostSpike  
      expr: increase(techsapo_wallbounce_cost_usd[1h]) > 0.5
      for: 0m
      labels:
        severity: warning
        priority: P1
        service: cost-management
      annotations:
        summary: "TechSapo 時間あたりコストが急上昇"
        description: "過去1時間のコストが$0.50を超えました"
EOF

# アラート設定再読み込み
docker-compose -f docker/docker-compose.monitoring.yml restart prometheus
```

## 🚀 本番環境チェックリスト

### デプロイ前チェック（Pre-deployment）
- [ ] **セキュリティ**
  - [ ] 全APIキーが設定済み（.env確認）
  - [ ] JWT_SECRETが32文字以上の強固なパスワード
  - [ ] ファイアウォール設定完了と確認
  - [ ] SSL証明書設定完了（本番ドメインで確認）
  - [ ] CORS設定が本番ドメインに対応
  
- [ ] **インフラ**
  - [ ] Docker/Podman動作確認
  - [ ] 必要なポートがオープン（4000, 9090, 3000, 9093）
  - [ ] ディスク容量充分確保（最低50GB推奨）
  - [ ] メモリ容量充分確保（最低8GB推奨）
  - [ ] DNS設定完了（ドメイン使用時）

- [ ] **監視・バックアップ**
  - [ ] Prometheus設定確認
  - [ ] Grafana認証情報設定
  - [ ] AlertManager通知先設定
  - [ ] バックアップスクリプト設定と動作確認
  - [ ] ログローテーション設定

### デプロイ後検証（Post-deployment）
- [ ] **基本動作確認**
  - [ ] 全サービス正常起動（docker ps確認）
  - [ ] ヘルスチェックエンドポイント応答確認
  - [ ] 壁打ち分析API動作確認（basic/premium/critical）
  - [ ] ログ解析API動作確認
  - [ ] RAG検索API動作確認（GoogleDrive統合）

- [ ] **監視システム確認**
  - [ ] Prometheusメトリクス収集確認
  - [ ] Grafanaダッシュボード表示確認
  - [ ] AlertManager設定動作確認
  - [ ] テストアラート送信・受信確認

- [ ] **セキュリティ・パフォーマンス**
  - [ ] SSL/HTTPS動作確認（証明書有効性確認）
  - [ ] 負荷テスト実施（想定負荷での動作確認）
  - [ ] メモリ・CPU使用量確認
  - [ ] レスポンス時間確認（< 3秒目標）

### 運用開始準備（Operations Ready）
- [ ] **ドキュメント・手順書**
  - [ ] 運用手順書作成・更新
  - [ ] 障害対応手順書作成
  - [ ] エスカレーション連絡先一覧作成
  - [ ] 定期メンテナンススケジュール策定

- [ ] **監視・アラート**
  - [ ] 監視閾値設定と妥当性確認
  - [ ] アラート通知先設定と動作確認
  - [ ] ダッシュボード設定カスタマイズ
  - [ ] SLA目標設定（99.9%稼働率等）

- [ ] **バックアップ・災害復旧**
  - [ ] バックアップ自動実行確認
  - [ ] 復旧手順テスト実施
  - [ ] 障害シミュレーション実施
  - [ ] データ保持ポリシー設定

## 💡 本番運用のベストプラクティス

### 日常運用タスク
```bash
# 毎朝の健康チェックスクリプト
cat << 'EOF' > scripts/daily-health-check.sh
#!/bin/bash
echo "=== TechSapo 日次健康チェック $(date) ==="

# サービス状態確認
echo "1. サービス状態確認"
curl -sf http://localhost:4000/health && echo "✅ TechSapo App: OK" || echo "❌ TechSapo App: NG"
curl -sf http://localhost:9090/-/healthy && echo "✅ Prometheus: OK" || echo "❌ Prometheus: NG"  
curl -sf http://localhost:3000/api/health && echo "✅ Grafana: OK" || echo "❌ Grafana: NG"

# リソース使用状況
echo -e "\n2. リソース使用状況"
echo "メモリ使用率: $(free | grep Mem | awk '{printf "%.1f%%\n", $3/$2 * 100.0}')"
echo "ディスク使用率: $(df -h / | awk 'NR==2{printf "%s\n", $5}')"
echo "CPU負荷: $(uptime | awk -F'load average:' '{print $2}')"

# 直近24時間のメトリクス
echo -e "\n3. 直近24時間のパフォーマンス"
echo "壁打ち分析リクエスト数: $(curl -s 'http://localhost:9090/api/v1/query?query=increase(techsapo_wallbounce_requests_total[24h])' | jq -r '.data.result[0].value[1] // "0"')"
echo "平均応答時間: $(curl -s 'http://localhost:9090/api/v1/query?query=rate(techsapo_http_request_duration_seconds_sum[24h])/rate(techsapo_http_request_duration_seconds_count[24h])' | jq -r '.data.result[0].value[1] // "0"' | xargs printf "%.2f秒\n")"
echo "日次コスト: $$(curl -s 'http://localhost:9090/api/v1/query?query=increase(techsapo_wallbounce_cost_usd[24h])' | jq -r '.data.result[0].value[1] // "0"')"

# アクティブアラート確認
echo -e "\n4. アクティブアラート"
ACTIVE_ALERTS=$(curl -s http://localhost:9093/api/v1/alerts | jq '[.data[] | select(.status.state=="active")] | length')
echo "アクティブアラート数: $ACTIVE_ALERTS"

echo -e "\n=== 健康チェック完了 ==="
EOF

chmod +x scripts/daily-health-check.sh

# Cron設定（毎朝8:00に実行）
echo "0 8 * * * /ai/prj/techsapo/scripts/daily-health-check.sh >> /var/log/techsapo-health.log 2>&1" | crontab -
```

### 週次メンテナンススクリプト
```bash
cat << 'EOF' > scripts/weekly-maintenance.sh
#!/bin/bash
echo "=== TechSapo 週次メンテナンス $(date) ==="

# Docker リソース清理
echo "1. Docker リソース清理"
docker system prune -f
docker image prune -f
docker volume prune -f

# ログローテーション
echo "2. ログローテーション"
docker logs techsapo-app --tail 1000 > /var/log/techsapo-app-$(date +%Y%m%d).log
docker logs prometheus --tail 1000 > /var/log/prometheus-$(date +%Y%m%d).log
find /var/log -name "*techsapo*" -mtime +30 -delete

# パフォーマンス分析
echo "3. 週次パフォーマンス分析"
echo "週次リクエスト数: $(curl -s 'http://localhost:9090/api/v1/query?query=increase(techsapo_wallbounce_requests_total[7d])' | jq -r '.data.result[0].value[1] // "0"')"
echo "平均信頼度: $(curl -s 'http://localhost:9090/api/v1/query?query=avg_over_time(techsapo_wallbounce_consensus_confidence[7d])' | jq -r '.data.result[0].value[1] // "0"' | xargs printf "%.3f\n")"
echo "週次コスト: $$(curl -s 'http://localhost:9090/api/v1/query?query=increase(techsapo_wallbounce_cost_usd[7d])' | jq -r '.data.result[0].value[1] // "0"')"

# セキュリティチェック
echo "4. セキュリティチェック"
echo "認証失敗回数（過去7日）: $(curl -s 'http://localhost:9090/api/v1/query?query=increase(techsapo_auth_attempts_total{status="failed"}[7d])' | jq -r '.data.result[0].value[1] // "0"')"

echo "=== 週次メンテナンス完了 ==="
EOF

chmod +x scripts/weekly-maintenance.sh

# Cron設定（毎週日曜日22:00に実行）
echo "0 22 * * 0 /ai/prj/techsapo/scripts/weekly-maintenance.sh >> /var/log/techsapo-maintenance.log 2>&1" | crontab -l | { cat; echo "0 22 * * 0 /ai/prj/techsapo/scripts/weekly-maintenance.sh >> /var/log/techsapo-maintenance.log 2>&1"; } | crontab -
```

## 📞 サポートとエスカレーション

### 技術サポート連絡先
- **GitHub Issues**: https://github.com/wombat2006/techsapo/issues
- **ドキュメント**: 
  - [README_ja.md](README_ja.md): システム概要
  - [MONITORING_SETUP_ja.md](MONITORING_SETUP_ja.md): 監視設定詳細
  - [CLAUDE.md](CLAUDE.md): システム要件・設定

### 緊急時対応手順
```bash
# L1: 基本確認（5分以内）
curl http://localhost:4000/health
docker-compose -f docker/docker-compose.monitoring.yml ps

# L2: 詳細調査（15分以内）  
docker logs techsapo-app --tail 50
curl http://localhost:9090/api/v1/targets

# L3: 根本原因分析（30分以内）
./scripts/emergency-restore.sh
docker-compose -f docker/docker-compose.monitoring.yml restart

# エスカレーション条件
# - サービス復旧に30分以上かかる場合
# - データ損失の可能性がある場合  
# - セキュリティインシデントの疑いがある場合
```

### 監視・アラート連絡先
- **Grafanaアラート**: http://localhost:3000/alerting
- **Prometheusメトリクス**: http://localhost:9090/targets  
- **AlertManager**: http://localhost:9093/#/alerts
- **システムヘルス**: `curl http://localhost:4000/health`

---

**🎯 TechSapo本番環境デプロイメント完了！**

**企業グレードの壁打ち分析システム + 完全監視環境の本番運用が可能になりました**

*エンタープライズ対応インフラストラクチャ with フル・オブザーバビリティ*

---
🌐 **言語**: [English](DEPLOYMENT_GUIDE.md) | **日本語**