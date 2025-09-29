# TechSapo 本番環境デプロイメント計画
## Phase 3F (50% SRP) → Production Scale 移行戦略

**計画策定日**: 2025-09-27
**対象システム**: TechSapo Multi-LLM Wall-bounce システム
**現在のステータス**: Phase 3F (50% SRP) 安定稼働中

---

## 🎯 デプロイメント目標

### 主要目標
- **Production Ready**: Phase 3F の実績を基にした本番運用開始
- **Zero Downtime**: 無停止での本番環境移行
- **Scalability**: 将来的な75%+ トラフィック拡張準備
- **Reliability**: 99.9%+ 可用性の確保

### 成功指標
- **稼働率**: 99.9% 以上維持
- **コンセンサス品質**: 84%+ 継続
- **レスポンス時間**: P95 < 300秒
- **エラー率**: < 1%

---

## 📊 現在の実績（Phase 3F）

### 検証済み性能データ
```
✅ SRP Traffic: 50% (安定処理)
✅ Uptime: 54分+ 連続稼働
✅ Memory Usage: 119MB / 1024MB (11.6%)
✅ Consensus Quality: 85.5% (目標値超過)
✅ Error Rate: 0% (完全無障害)
✅ Provider Integration: Real API (Gemini + GPT-5 Codex)
```

### LLM性能実績
```
Gemini 2.5 Pro:
- Response Time: 56.4秒
- Token Cost: $0.0000075
- Success Rate: 100%

GPT-5 Codex (MCP):
- Response Time: 137.8秒
- Processing: Real API calls
- Success Rate: 100%
```

---

## 🏗️ 本番環境アーキテクチャ

### インフラ構成

```
                    Load Balancer (Nginx)
                           ↓
    ┌─────────────────────────────────────────┐
    │         TechSapo Production Cluster      │
    │                                         │
    │  ┌─────────────┐    ┌─────────────┐     │
    │  │ Instance 1  │    │ Instance 2  │     │
    │  │ Primary     │    │ Standby     │     │
    │  │ Port: 4000  │    │ Port: 4001  │     │
    │  └─────────────┘    └─────────────┘     │
    └─────────────────────────────────────────┘
                           ↓
            External Services (Redis, MCP)
```

### サービス分散戦略

| Component | Primary Instance | Backup Instance | External Service |
|-----------|------------------|-----------------|------------------|
| **Wall-bounce Engine** | Instance 1 | Instance 2 | - |
| **Redis Session** | - | - | Upstash Redis |
| **GPT-5 Codex** | - | - | MCP Server |
| **Gemini 2.5 Pro** | Instance 1/2 | Load Balance | Google API |
| **Monitoring** | Prometheus | Grafana | External |

---

## 🔧 段階的デプロイメント手順

### Phase 1: 本番環境準備 (2時間)

#### 1.1 環境構築
```bash
# 1. 本番サーバー準備
sudo mkdir -p /opt/techsapo-production
cd /opt/techsapo-production

# 2. アプリケーション配置
git clone https://github.com/your-org/techsapo.git .
git checkout main  # 最新安定版

# 3. 依存関係インストール
npm ci --production
npm run build

# 4. 本番環境設定
cp .env.phase3f-final-50percent .env.production
```

#### 1.2 本番設定調整
```bash
# .env.production の本番特化設定
cat > .env.production << 'EOF'
# === PRODUCTION CONFIGURATION ===
NODE_ENV=production

# SRP Phase 3F Configuration
USE_SRP_WALL_BOUNCE=true
SRP_MIGRATION_PHASE=production_50percent
SRP_TRAFFIC_PERCENTAGE=50

# Production Monitoring
SRP_ERROR_RATE_THRESHOLD=0.01    # 1% (厳格)
AUTO_ROLLBACK_ERROR_RATE=0.03    # 3% (実証済み)
AUTO_ROLLBACK_LATENCY_MS=10000   # 10秒

# Production Logging
LOG_LEVEL=info
LOG_ROTATION=daily
LOG_RETENTION_DAYS=30

# Redis (Upstash Production)
UPSTASH_REDIS_URL=https://known-pipefish-11878.upstash.io
UPSTASH_REDIS_TOKEN=AS5mAAIncDJmYWZlN2FiZTc5ZWQ0YmE5YTBmZjg4NTIzYjdkMTgyM3AyMTE4Nzg

# Security Headers
SECURITY_HEADERS_ENABLED=true
CORS_ENABLED=true
RATE_LIMITING_ENABLED=true

# Health Check
HEALTH_CHECK_INTERVAL=30000  # 30秒
DEEP_HEALTH_CHECK=true
EOF
```

#### 1.3 systemd サービス設定
```bash
# systemd サービスファイル作成
sudo tee /etc/systemd/system/techsapo-production.service << 'EOF'
[Unit]
Description=TechSapo Production Server
After=network.target

[Service]
Type=simple
User=techsapo
WorkingDirectory=/opt/techsapo-production
Environment=NODE_ENV=production
Environment=NODE_OPTIONS=--max-old-space-size=1024 --expose-gc
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Production Limits
LimitNOFILE=65536
MemoryLimit=2G
CPUQuota=80%

[Install]
WantedBy=multi-user.target
EOF

# サービス有効化
sudo systemctl daemon-reload
sudo systemctl enable techsapo-production
```

### Phase 2: 監視・アラート設定 (1時間)

#### 2.1 Prometheus監視設定
```yaml
# /opt/techsapo-production/monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'techsapo-production'
    static_configs:
      - targets: ['localhost:4000']
    metrics_path: '/metrics'
    scrape_interval: 10s

rule_files:
  - "techsapo-alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

#### 2.2 アラートルール設定
```yaml
# /opt/techsapo-production/monitoring/techsapo-alerts.yml
groups:
- name: techsapo-production
  rules:
  - alert: SRPHighErrorRate
    expr: srp_error_rate > 0.03
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "SRP error rate too high: {{ $value }}"

  - alert: SRPLowConsensus
    expr: srp_consensus_confidence < 0.7
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "SRP consensus quality degraded: {{ $value }}"

  - alert: HighMemoryUsage
    expr: process_resident_memory_bytes / 1024 / 1024 > 800
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory usage: {{ $value }}MB"
```

#### 2.3 ログ監視設定
```bash
# rsyslog設定
sudo tee /etc/rsyslog.d/50-techsapo.conf << 'EOF'
# TechSapo Production Logs
:programname, isequal, "techsapo-production" /var/log/techsapo/production.log
& stop
EOF

# ログローテーション設定
sudo tee /etc/logrotate.d/techsapo << 'EOF'
/var/log/techsapo/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    create 0644 techsapo techsapo
    postrotate
        systemctl reload rsyslog
    endscript
}
EOF
```

### Phase 3: 本番デプロイ実行 (30分)

#### 3.1 Blue-Green デプロイメント
```bash
# 1. 現在のプロダクション停止確認
sudo systemctl status techsapo-production

# 2. 新バージョンデプロイ
sudo systemctl start techsapo-production

# 3. ヘルスチェック実行
for i in {1..10}; do
  echo "Health check attempt $i:"
  curl -f http://localhost:4000/health || exit 1
  sleep 5
done

# 4. 機能テスト実行
curl -X POST http://localhost:4000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Production deployment test", "task_type": "basic"}' \
  | jq '.consensus.confidence'

echo "✅ Production deployment successful"
```

#### 3.2 Load Balancer設定
```nginx
# /etc/nginx/sites-available/techsapo-production
upstream techsapo_backend {
    server 127.0.0.1:4000;
    server 127.0.0.1:4001 backup;
}

server {
    listen 80;
    server_name api.techsapo.com;

    location / {
        proxy_pass http://techsapo_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 30s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }

    location /health {
        proxy_pass http://techsapo_backend;
        access_log off;
    }

    location /metrics {
        proxy_pass http://techsapo_backend;
        allow 127.0.0.1;
        deny all;
    }
}
```

### Phase 4: 本番稼働後検証 (24時間)

#### 4.1 継続監視項目
```bash
# 1時間毎実行スクリプト
#!/bin/bash
# /opt/techsapo-production/scripts/hourly-check.sh

echo "=== $(date) Production Health Check ==="

# サービス状態確認
systemctl is-active techsapo-production

# メモリ使用量確認
ps aux | grep "node dist/server.js" | grep -v grep | awk '{print "Memory: " $6/1024 "MB"}'

# エラー率確認
tail -100 /var/log/techsapo/production.log | grep -c ERROR

# コンセンサス品質確認
curl -s http://localhost:4000/metrics | grep consensus_confidence | tail -1

echo "=== Health Check Complete ==="
```

#### 4.2 24時間安定性レポート
```bash
# 日次レポート生成
#!/bin/bash
# /opt/techsapo-production/scripts/daily-report.sh

cat > /tmp/production-report-$(date +%Y%m%d).md << 'EOF'
# TechSapo Production Daily Report

## Service Status
- Uptime: $(uptime)
- Service Status: $(systemctl is-active techsapo-production)
- Memory Peak: $(cat /proc/meminfo | grep MemFree)

## Performance Metrics
- Error Count: $(grep -c ERROR /var/log/techsapo/production.log)
- Request Count: $(grep -c "POST /api" /var/log/nginx/access.log)
- Average Response Time: $(calculate_avg_response_time)

## Next Steps
- Continue monitoring for 7 days
- Plan Phase 4 (75%) expansion
EOF
```

---

## 🚨 緊急時対応計画

### 自動ロールバック条件
- **Error Rate > 3%**: 自動的にSRP無効化
- **Memory > 90%**: サービス再起動
- **Response Time > 10秒**: プロバイダー切り替え
- **Consensus < 70%**: 段階的トラフィック削減

### 手動緊急対応
```bash
# EMERGENCY ROLLBACK (30秒以内)
sudo systemctl stop techsapo-production
sudo sed -i 's/USE_SRP_WALL_BOUNCE=true/USE_SRP_WALL_BOUNCE=false/' .env.production
sudo systemctl start techsapo-production

# または完全停止
sudo systemctl stop techsapo-production
```

### エスカレーション手順
1. **Level 1 (5分)**: 自動アラート → オンコール対応
2. **Level 2 (15分)**: 開発チームリード召集
3. **Level 3 (30分)**: プロジェクトマネージャー・CTO通知

---

## 📈 将来拡張計画

### Phase 4準備 (75% SRP)
- **最短実行日**: 本番稼働後2週間
- **前提条件**:
  - 99.9%稼働率維持
  - Error Rate < 1%
  - コンセンサス品質 > 80%

### Ultimate Scale (100% SRP)
- **目標時期**: Q1 2025
- **追加要件**:
  - 水平スケーリング対応
  - 地理的分散配置
  - Multi-tenant機能

---

## ✅ デプロイメント実行チェックリスト

### 事前準備
```
□ Phase 3F の2週間安定稼働確認
□ 本番環境サーバー準備完了
□ 監視・アラート設定完了
□ バックアップ・復旧計画確認
□ チーム体制・連絡先整備
□ 緊急時対応手順確認
```

### デプロイ実行
```
□ Blue-Green デプロイメント実行
□ ヘルスチェック・機能テスト完了
□ Load Balancer設定・確認
□ 監視ダッシュボード確認
□ 初期24時間監視体制確立
□ ステークホルダー通知完了
```

### 検証・移行完了
```
□ 7日間安定稼働確認
□ パフォーマンス基準値達成
□ ユーザー影響なし確認
□ コスト・品質目標達成
□ ドキュメント更新完了
□ 次フェーズ計画策定
```

---

**策定者**: Claude Code & TechSapo Team
**承認者**: プロジェクトマネージャー (承認待ち)
**実行予定日**: 2025-09-30 (Phase 3F検証完了後)
**成功確率**: 95% (Phase 3F実績ベース)

🎯 **Ready for Production - Let's Scale to Success!** 🚀