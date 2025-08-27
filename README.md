# TechSapo - IT Infrastructure Support Tool with AI Orchestration

Enterprise-grade IT Infrastructure Support Tool featuring **Wall-Bounce Analysis** with Multi-LLM orchestration, comprehensive Prometheus monitoring, and Japanese AI integration.

## 🎯 Core Architecture

### Wall-Bounce Analysis System (必須壁打ち)
すべてのクエリで複数LLMによる協調分析を実行する革新的システム
- **必須要件**: 最低2つのLLMによる分析
- **合意形成**: 複数の回答から最適解を導出
- **品質保証**: ハルシネーション検証とエスカレーション機能

### Multi-LLM Orchestration
- **Tier 1**: Claude Code (総司令官・ルーティング)
- **Tier 2**: Gemini 2.5 Pro + GPT-5 (基本処理)
- **Tier 3**: Claude Sonnet4 (プレミアム分析)
- **Tier 4**: OpenRouter Ensemble (補助分析)
- **Tier 5**: Claude Opus4.1 (緊急時専用)

## 🚀 Key Features

### 🤖 AI-Powered Analysis
- **壁打ち分析**: 複数LLMによる協調分析で高品質な回答生成
- **IT障害解析**: システムログとエラー出力の自動分析
- **RAG検索**: GoogleDrive統合による個人データ活用
- **3段階品質**: Basic/Premium/Critical対応

### 📊 Comprehensive Monitoring
- **Prometheus統合**: 20+ カスタムメトリクス
- **Grafana可視化**: Executive/Operations/Development ダッシュボード
- **3段階アラート**: P0(即座)/P1(15分)/P2(1時間)対応
- **コスト監視**: リアルタイム予算追跡($70/月)

### 🔐 Enterprise Security
- **セキュリティメトリクス**: 認証・レート制限・入力検証
- **GDPR/HIPAA準拠**: 機密情報マスキング
- **監査ログ**: MySQL全活動記録
- **SSL/TLS**: Let's Encrypt自動更新

### 🏗️ Production Infrastructure
- **Docker完全対応**: フルコンテナ化
- **SSL証明書自動更新**: 90日サイクル
- **ゼロダウンタイム**: Nginx + PM2
- **高可用性**: Prometheus HA + Grafana clustering

## 📋 Prerequisites

- Node.js 18.0.0 or higher
- Docker & Docker Compose (または Podman)
- API Keys: OpenAI, Google (Gemini), Claude, OpenRouter
- (Optional) Redis, MySQL for production

## 🛠 Quick Start

### 1. Repository Setup
```bash
git clone https://github.com/wombat2006/techsapo.git
cd techsapo
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Build and Start
```bash
# Complete monitoring stack startup
./scripts/start-monitoring.sh

# Or manual startup
npm run build
npm start
```

## 🎯 Core Endpoints

### Wall-Bounce Analysis
```bash
# Basic IT support
curl -X POST http://localhost:4000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Dockerコンテナが起動しない問題を解決したい",
    "task_type": "basic",
    "user_id": "engineer-001"
  }'

# Premium analysis (3 LLMs)
curl -X POST http://localhost:4000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Kubernetesクラスタのネットワーク問題を分析",
    "task_type": "premium"
  }'

# Critical emergency response (4 LLMs)
curl -X POST http://localhost:4000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "本番データベース全停止の緊急復旧",
    "task_type": "critical"
  }'
```

### Log Analysis
```bash
curl -X POST http://localhost:4000/api/v1/analyze-logs \
  -H "Content-Type: application/json" \
  -d '{
    "user_command": "systemctl start mysql",
    "error_output": "Job for mysql.service failed. Connection refused on port 3306",
    "system_context": "Ubuntu 20.04, MySQL 8.0"
  }'
```

### RAG Search
```bash
curl -X POST http://localhost:4000/api/v1/rag/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "過去のサーバー移行手順書を検索",
    "user_drive_folder_id": "1BxYz..."
  }'
```

## 📊 Monitoring & Observability

### Access Points
- **Application**: http://localhost:4000
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/techsapo2024!)
- **AlertManager**: http://localhost:9093
- **Metrics**: http://localhost:4000/metrics

### Key Metrics
```prometheus
# Wall-bounce analysis success rate
techsapo:wallbounce_success_rate

# Average confidence score (5min)
techsapo:wallbounce_avg_confidence_5m

# LLM provider performance
techsapo:llm_success_rate_by_provider{provider="Gemini"}

# Daily cost tracking
sum(increase(techsapo_wallbounce_cost_usd[24h]))

# HTTP P95 response time
techsapo:http_p95_response_time
```

### Alert Examples
- **Critical**: 壁打ち合意信頼度 < 0.7 (5分間)
- **Warning**: 平均応答時間 > 5秒 (5分間)
- **Info**: 日次リクエスト数 > 平常時150%

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│   TechSapo App  │───▶│  Prometheus  │───▶│   Grafana   │
│   (Port 4000)   │    │  (Port 9090) │    │ (Port 3000) │
│   Wall-Bounce   │    │   Metrics    │    │ Dashboards  │
└─────────────────┘    └──────────────┘    └─────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌──────────────┐    ┌─────────────┐
│  Multi-LLM      │    │ AlertManager │    │ Node        │
│  Orchestrator   │    │ (Port 9093)  │    │ Exporter    │
│  ┌─────────────┐│    │ Notifications│    │ (Port 9100) │
│  │Gemini 2.5Pro││    └──────────────┘    └─────────────┘
│  │GPT-5        ││
│  │Claude Sonnet││         ┌──────────────┐
│  │OpenRouter   ││         │ Redis Cache  │
│  └─────────────┘│         │ (Port 6379)  │
└─────────────────┘         └──────────────┘
```

## 📈 Deployment Options

### Docker Production Stack
```bash
# Complete monitoring environment
docker-compose -f docker/docker-compose.monitoring.yml up -d

# Production deployment
docker-compose -f docker/production/docker-compose.prod.yml up -d
```

### SSL Certificate Management
```bash
# Install auto-renewal (90-day cycle)
./scripts/install-renewal-cron.sh

# Manual renewal
./scripts/renew-certificates.sh
```

### PM2 Process Management
```bash
pm2 start ecosystem.config.js
pm2 monit
pm2 logs techsapo
```

## 🔐 Security Features

- **Authentication**: OpenAI API key validation middleware
- **Input Sanitization**: XSS/SQL injection protection
- **Rate Limiting**: Configurable per-endpoint limits  
- **Data Privacy**: PII masking and GDPR compliance
- **Audit Logging**: Complete activity tracking
- **SSL/TLS**: Auto-renewed certificates

## 💰 Cost Management

- **Monthly Budget**: $70 (configurable)
- **Real-time Tracking**: Per-request cost monitoring
- **Automatic Alerts**: 80% budget threshold
- **Provider Optimization**: Cost-efficiency analysis
- **Usage Prediction**: ML-based forecasting

## 🧪 Testing & Quality

```bash
# Run comprehensive tests
npm test

# Test with coverage
npm run test:coverage  

# Punycode replacement tests
npm test tests/punycode-replacement.test.ts

# Integration tests
npm run test:integration
```

## 📚 Documentation

- **[Monitoring Setup](./MONITORING_SETUP.md)**: Complete Prometheus monitoring guide
- **[Prometheus Design](./docs/prometheus-monitoring-design.md)**: Detailed metrics architecture
- **[RAG Setup Guide](./docs/RAG_SETUP_GUIDE.md)**: GoogleDrive integration
- **[CLAUDE.md](./CLAUDE.md)**: System configuration and requirements

## 🔧 Configuration Files

```
├── docker/
│   ├── docker-compose.monitoring.yml    # Complete monitoring stack
│   ├── prometheus/                       # Prometheus configuration
│   ├── grafana/                         # Grafana dashboards
│   └── production/                      # Production deployment
├── src/
│   ├── services/wall-bounce-analyzer.ts # Core analysis engine
│   ├── metrics/prometheus-client.ts     # Custom metrics
│   └── wall-bounce-server.ts           # Main application server
└── scripts/
    ├── start-monitoring.sh              # Monitoring stack startup
    └── renew-certificates.sh            # SSL certificate management
```

## 🌟 Production Features

### High Availability
- **Multi-instance**: PM2 cluster mode
- **Load Balancing**: Nginx upstream configuration
- **Health Checks**: Automated failover
- **Graceful Shutdown**: Zero-downtime restarts

### Monitoring & Alerting
- **Multi-channel Notifications**: Email, Slack, SMS
- **Escalation Policies**: P0/P1/P2 priority handling
- **SLA Monitoring**: 99.9% uptime tracking
- **Performance Optimization**: Automated scaling decisions

### Data Management
- **Backup Strategy**: Automated daily backups
- **Disaster Recovery**: Cross-region replication
- **Data Retention**: 15 days detailed, 90 days aggregated
- **Privacy Compliance**: GDPR/HIPAA ready

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Follow wall-bounce analysis patterns
4. Add comprehensive monitoring metrics
5. Include tests and documentation
6. Submit Pull Request

## 📄 License

MIT License - Enterprise usage permitted. See [LICENSE](LICENSE) for details.

## 📞 Support

- **Documentation**: Complete setup guides included
- **Issues**: [GitHub Issues](https://github.com/wombat2006/techsapo/issues)
- **Monitoring**: Built-in health checks and alerts
- **Community**: Japanese language support

---

**🎯 Enterprise-Grade IT Infrastructure Support Tool**
**壁打ち分析システム - Production Ready!**

*Powered by Multi-LLM Orchestration with Comprehensive Prometheus Monitoring*