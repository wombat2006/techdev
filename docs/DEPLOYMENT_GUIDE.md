# 🚀 Deployment Guide

Google Drive RAGシステムの本番環境デプロイメント・運用ガイド

## 📋 目次
- [デプロイメント概要](#overview)
- [環境要件](#requirements)
- [環境設定](#environment-setup)
- [デプロイメント手順](#deployment-steps)
- [監視・運用](#monitoring)
- [トラブルシューティング](#troubleshooting)
- [スケーリング](#scaling)

## 🎯 デプロイメント概要 {#overview}

### 対象環境
- **開発環境**: Docker Compose (ローカル開発)
- **ステージング環境**: GKE + Cloud SQL (検証用)
- **本番環境**: Multi-AZ GKE + 高可用性構成

### アーキテクチャ概要
```mermaid
graph TB
    A[Load Balancer] --> B[Nginx Ingress]
    B --> C[TechSapo App Pods]
    C --> D[Google Drive API]
    C --> E[OpenAI Vector Store]
    C --> F[Cloud SQL]
    C --> G[Redis Cache]
    
    H[Prometheus] --> I[Grafana]
    H --> J[AlertManager]
    
    C --> H
```

## 🔧 環境要件 {#requirements}

### システム要件
- **CPU**: 4コア以上 (本番：8コア推奨)
- **メモリ**: 8GB以上 (本番：16GB推奨)
- **ストレージ**: 100GB以上 SSD
- **ネットワーク**: 1Gbps以上

### ソフトウェア要件
- **Node.js**: 22.9.0以上
- **npm**: 10.0.0以上
- **Docker**: 24.0以上
- **Docker Compose**: 2.0以上
- **kubectl**: 1.28以上 (Kubernetes環境)

### クラウドサービス要件
- **Google Cloud Platform**
  - GKE (Kubernetes)
  - Cloud SQL (PostgreSQL)
  - Cloud Storage
  - Cloud Load Balancing
- **外部サービス**
  - OpenAI API
  - Anthropic Claude API
  - Google Gemini API

## 🌐 環境設定 {#environment-setup}

### 1. ローカル開発環境

#### 基本セットアップ
```bash
# リポジトリクローン
git clone https://github.com/yourusername/techsapo.git
cd techsapo

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env
```

#### 環境変数設定 (.env)
```bash
# アプリケーション基本設定
NODE_ENV=development
PORT=4000
LOG_LEVEL=debug

# Google Drive API
GOOGLE_CLIENT_ID=3861889604-eale8hvlh3238ibgadrago5oeumhghqq.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=urn:ietf:wg:oauth:2.0:oob

# OpenAI API
OPENAI_API_KEY=sk-your-openai-key
OPENAI_ORG_ID=org-your-organization

# RAG設定
RAG_FOLDER_ID=1FWaeY0DRv_fb4fA8RrKk0WbIk-TMK3qb
TEST_VECTOR_STORE_ID=vs_68afb31d429c8191bd4f520b096b54d9

# データベース (開発用)
DATABASE_URL=postgresql://user:pass@localhost:5432/techsapo_dev

# Redis (キャッシュ)
REDIS_URL=redis://localhost:6379

# 監視設定
PROMETHEUS_PORT=9090
GRAFANA_PORT=3000
METRICS_ENABLED=true
```

#### Docker Compose起動
```bash
# 開発環境一括起動
docker-compose up -d

# 監視スタック込み起動
./scripts/start-monitoring.sh

# ログ確認
docker-compose logs -f app
```

### 2. ステージング環境

#### GKE クラスタ作成
```bash
# GKE クラスタ作成
gcloud container clusters create techsapo-staging \
  --machine-type=e2-standard-4 \
  --num-nodes=3 \
  --enable-autoscaling \
  --min-nodes=2 \
  --max-nodes=10 \
  --zone=asia-northeast1-a

# kubectl設定
gcloud container clusters get-credentials techsapo-staging \
  --zone=asia-northeast1-a
```

#### Kubernetes設定ファイル
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: techsapo-staging

---
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: techsapo-app
  namespace: techsapo-staging
spec:
  replicas: 3
  selector:
    matchLabels:
      app: techsapo-app
  template:
    metadata:
      labels:
        app: techsapo-app
    spec:
      containers:
      - name: techsapo
        image: gcr.io/your-project/techsapo:latest
        ports:
        - containerPort: 4000
        env:
        - name: NODE_ENV
          value: "staging"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: techsapo-secrets
              key: database-url
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 4000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### 3. 本番環境

#### インフラストラクチャ設定 (Terraform)
```hcl
# terraform/main.tf
provider "google" {
  project = var.project_id
  region  = var.region
}

# GKE クラスタ (本番用)
resource "google_container_cluster" "production" {
  name     = "techsapo-production"
  location = var.region
  
  remove_default_node_pool = true
  initial_node_count       = 1
  
  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name
  
  # セキュリティ設定
  private_cluster_config {
    enable_private_nodes    = true
    master_ipv4_cidr_block = "172.16.0.0/28"
  }
  
  # 監視・ログ設定
  logging_service    = "logging.googleapis.com/kubernetes"
  monitoring_service = "monitoring.googleapis.com/kubernetes"
}

# ノードプール
resource "google_container_node_pool" "production_nodes" {
  name       = "production-node-pool"
  cluster    = google_container_cluster.production.name
  location   = var.region
  node_count = 3
  
  node_config {
    machine_type = "e2-standard-8"
    disk_size_gb = 100
    disk_type    = "pd-ssd"
    
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
  }
  
  autoscaling {
    min_node_count = 3
    max_node_count = 20
  }
}

# Cloud SQL (PostgreSQL)
resource "google_sql_database_instance" "production" {
  name             = "techsapo-prod-db"
  database_version = "POSTGRES_15"
  region          = var.region
  
  settings {
    tier = "db-custom-4-16384"
    
    backup_configuration {
      enabled                        = true
      start_time                    = "02:00"
      location                      = var.region
      transaction_log_retention_days = 7
    }
    
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }
    
    database_flags {
      name  = "max_connections"
      value = "200"
    }
  }
}
```

## 🚢 デプロイメント手順 {#deployment-steps}

### 1. ビルド・パッケージング

#### Docker イメージビルド
```bash
# マルチステージビルド
docker build -t gcr.io/your-project/techsapo:$(git rev-parse --short HEAD) .

# イメージプッシュ
docker push gcr.io/your-project/techsapo:$(git rev-parse --short HEAD)

# latest タグ更新
docker tag gcr.io/your-project/techsapo:$(git rev-parse --short HEAD) \
           gcr.io/your-project/techsapo:latest
docker push gcr.io/your-project/techsapo:latest
```

#### Dockerfile (本番用)
```dockerfile
# Dockerfile.production
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# 実行ステージ
FROM node:22-alpine AS runtime

# セキュリティ設定
RUN addgroup -g 1001 -S nodejs && \
    adduser -S techsapo -u 1001

WORKDIR /app

# 依存関係のみコピー
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# 権限設定
RUN chown -R techsapo:nodejs /app
USER techsapo

EXPOSE 4000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/healthcheck.js

CMD ["node", "dist/index.js"]
```

### 2. デプロイメント実行

#### CI/CDパイプライン (GitHub Actions)
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '22'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: |
        npm run build
        npm test
        npx ts-node tests/test-execution-report.ts
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Google Cloud CLI
      uses: google-github-actions/setup-gcloud@v1
      with:
        service_account_key: ${{ secrets.GCP_SA_KEY }}
        project_id: ${{ secrets.GCP_PROJECT_ID }}
    
    - name: Configure Docker
      run: gcloud auth configure-docker
    
    - name: Build and push Docker image
      run: |
        IMAGE_TAG=gcr.io/${{ secrets.GCP_PROJECT_ID }}/techsapo:${{ github.sha }}
        docker build -f Dockerfile.production -t $IMAGE_TAG .
        docker push $IMAGE_TAG
    
    - name: Deploy to GKE
      run: |
        gcloud container clusters get-credentials techsapo-production \
          --zone=asia-northeast1-a
        
        kubectl set image deployment/techsapo-app \
          techsapo=gcr.io/${{ secrets.GCP_PROJECT_ID }}/techsapo:${{ github.sha }}
        
        kubectl rollout status deployment/techsapo-app
```

#### Blue-Green デプロイメント
```bash
# Blue-Green デプロイメント実行
./scripts/deploy-blue-green.sh production v1.2.3

# ロールバック (必要時)
./scripts/rollback.sh production v1.2.2
```

### 3. データベースマイグレーション

#### マイグレーション実行
```bash
# 本番DBマイグレーション (慎重に実行)
kubectl exec -it deployment/techsapo-app -- npm run migrate:production

# マイグレーション確認
kubectl exec -it deployment/techsapo-app -- npm run migrate:status
```

#### バックアップ・リストア
```bash
# データベースバックアップ
gcloud sql export sql techsapo-prod-db \
  gs://techsapo-backups/backup-$(date +%Y%m%d-%H%M%S).sql \
  --database=techsapo

# リストア (緊急時)
gcloud sql import sql techsapo-prod-db \
  gs://techsapo-backups/backup-20240115-120000.sql \
  --database=techsapo
```

## 📊 監視・運用 {#monitoring}

### Prometheus 監視設定

#### メトリクス設定
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "techsapo-rules.yml"

scrape_configs:
  - job_name: 'techsapo-app'
    static_configs:
      - targets: ['techsapo-app:4000']
    metrics_path: /metrics
    scrape_interval: 10s
    
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

#### アラートルール
```yaml
# monitoring/techsapo-rules.yml
groups:
  - name: techsapo-alerts
    rules:
    - alert: HighErrorRate
      expr: rate(techsapo_http_errors_total[5m]) > 0.1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate detected"
        description: "Error rate is {{ $value }} errors per second"
    
    - alert: HighMemoryUsage
      expr: process_resident_memory_bytes / 1024 / 1024 > 1024
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "High memory usage"
        description: "Memory usage is {{ $value }}MB"
    
    - alert: LLMResponseSlow
      expr: histogram_quantile(0.95, techsapo_llm_response_duration_seconds) > 5.0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "LLM response time is slow"
        description: "95th percentile response time is {{ $value }} seconds"
```

### Grafana ダッシュボード

#### システムメトリクス
- **CPU使用率**: ノード・Pod単位
- **メモリ使用量**: アプリケーション・システム
- **ネットワークI/O**: 送受信トラフィック
- **ディスクI/O**: 読み書き性能

#### アプリケーションメトリクス
- **リクエスト数**: エンドポイント別
- **レスポンス時間**: P50, P95, P99
- **エラー率**: 4xx, 5xx分類
- **壁打ち分析**: 成功率, 信頼度

#### ビジネスメトリクス
- **ファイル処理数**: 形式別統計
- **LLM使用量**: プロバイダー別
- **コスト監視**: 日次・月次トラッキング

### ログ管理

#### 構造化ログ設定
```javascript
// src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

#### ログアグリゲーション
```bash
# Cloud Logging設定
gcloud logging sinks create techsapo-sink \
  bigquery.googleapis.com/projects/your-project/datasets/logs \
  --log-filter='resource.type="k8s_container" AND resource.labels.namespace_name="techsapo-production"'
```

## 🔧 トラブルシューティング {#troubleshooting}

### 一般的な問題と対処法

#### 1. アプリケーション起動失敗
```bash
# ログ確認
kubectl logs deployment/techsapo-app --tail=100

# 詳細な状態確認
kubectl describe pod techsapo-app-xxxxx

# 設定確認
kubectl get configmap techsapo-config -o yaml
kubectl get secret techsapo-secrets -o yaml
```

#### 2. データベース接続エラー
```bash
# データベース接続テスト
kubectl exec -it deployment/techsapo-app -- npm run db:test

# Cloud SQL プロキシ起動
cloud_sql_proxy -instances=your-project:asia-northeast1:techsapo-prod-db=tcp:5432
```

#### 3. LLM API エラー
```bash
# API キー確認
kubectl exec -it deployment/techsapo-app -- env | grep API_KEY

# レート制限確認
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models
```

#### 4. メモリ不足
```bash
# メモリ使用量確認
kubectl top pods

# リソース制限調整
kubectl patch deployment techsapo-app -p \
  '{"spec":{"template":{"spec":{"containers":[{"name":"techsapo","resources":{"limits":{"memory":"8Gi"}}}]}}}}'
```

### 緊急対応手順

#### 1. サービス停止時
```bash
# 即座にスケールアップ
kubectl scale deployment techsapo-app --replicas=10

# ロードバランサー確認
kubectl get services
kubectl describe service techsapo-service
```

#### 2. データ喪失時
```bash
# 最新バックアップからリストア
./scripts/restore-backup.sh latest

# データ整合性チェック
kubectl exec -it deployment/techsapo-app -- npm run data:verify
```

## 📈 スケーリング {#scaling}

### 水平スケーリング

#### Horizontal Pod Autoscaler (HPA)
```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: techsapo-hpa
  namespace: techsapo-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: techsapo-app
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### 垂直スケーリング

#### Vertical Pod Autoscaler (VPA)
```yaml
# k8s/vpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: techsapo-vpa
  namespace: techsapo-production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: techsapo-app
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: techsapo
      maxAllowed:
        cpu: 4000m
        memory: 8Gi
      minAllowed:
        cpu: 100m
        memory: 128Mi
```

### データベーススケーリング

#### リードレプリカ設定
```bash
# リードレプリカ作成
gcloud sql instances create techsapo-read-replica \
  --master-instance-name=techsapo-prod-db \
  --tier=db-custom-2-8192 \
  --region=asia-northeast1

# アプリケーション設定更新
kubectl patch configmap techsapo-config -p \
  '{"data":{"READ_DB_URL":"postgresql://user:pass@read-replica:5432/techsapo"}}'
```

---

**🚀 デプロイメント完了チェックリスト**

- [ ] 本番環境テスト通過 (100%成功率)
- [ ] セキュリティスキャン完了
- [ ] パフォーマンステスト合格
- [ ] 監視・アラート設定済み
- [ ] バックアップ・リストア検証済み
- [ ] ドキュメント更新済み

**📖 関連ドキュメント**
- [API リファレンス](./API_REFERENCE.md)
- [テストガイド](./TESTING_GUIDE.md)
- [アーキテクチャ概要](./ARCHITECTURE_OVERVIEW.md)