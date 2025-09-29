# TechSapo Prometheus Monitoring System Design

## 🎯 監視戦略概要

### システムアーキテクチャ分析
- **メインアプリケーション**: Wall-bounce analyzer with multi-LLM orchestration
- **主要サービス**: 4つのLLMプロバイダー統合 (Gemini 2.5 Pro, GPT-5, Claude Sonnet4, OpenRouter)
- **データ層**: Redis, MySQL, GoogleDrive統合
- **API層**: Express.js REST endpoints with security middleware

## 📊 メトリクス分類

### 1. ビジネスメトリクス (Business Metrics)
**Wall-bounce Analysis Performance**
- `techsapo_wallbounce_requests_total` (Counter)
  - Labels: `task_type` (basic/premium/critical), `provider`, `status`
- `techsapo_wallbounce_consensus_confidence` (Histogram)
  - Buckets: [0.1, 0.3, 0.5, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0]
- `techsapo_wallbounce_processing_duration_seconds` (Histogram)
  - Buckets: [0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0]
- `techsapo_wallbounce_cost_usd` (Counter)
  - Labels: `provider`, `task_type`

**LLM Provider Performance**
- `techsapo_llm_requests_total` (Counter)
  - Labels: `provider`, `model`, `status`, `task_type`
- `techsapo_llm_response_time_seconds` (Histogram)
  - Labels: `provider`, `model`
- `techsapo_llm_token_usage_total` (Counter)
  - Labels: `provider`, `type` (input/output), `model`
- `techsapo_llm_agreement_score` (Histogram)
  - Labels: `provider_pair`

### 2. アプリケーションメトリクス (Application Metrics)
**API Performance**
- `techsapo_http_requests_total` (Counter)
  - Labels: `method`, `route`, `status_code`
- `techsapo_http_request_duration_seconds` (Histogram)
  - Labels: `method`, `route`
- `techsapo_http_request_size_bytes` (Histogram)
- `techsapo_http_response_size_bytes` (Histogram)

**Database & Cache**
- `techsapo_redis_operations_total` (Counter)
  - Labels: `operation`, `status`
- `techsapo_redis_connection_pool_size` (Gauge)
- `techsapo_mysql_queries_total` (Counter)
  - Labels: `query_type`, `status`
- `techsapo_cache_hit_ratio` (Gauge)
  - Labels: `cache_type`

**Error Tracking**
- `techsapo_errors_total` (Counter)
  - Labels: `error_type`, `severity`, `service`
- `techsapo_circuit_breaker_state` (Gauge)
  - Labels: `service`, `state` (open/closed/half_open)

### 3. システムメトリクス (System Metrics)
**Node.js Runtime**
- `nodejs_heap_size_total_bytes` (Gauge)
- `nodejs_heap_size_used_bytes` (Gauge)
- `nodejs_eventloop_lag_seconds` (Histogram)
- `nodejs_gc_duration_seconds` (Histogram)

**Custom Resource Usage**
- `techsapo_memory_usage_bytes` (Gauge)
  - Labels: `component`
- `techsapo_active_connections` (Gauge)
  - Labels: `connection_type`
- `techsapo_queue_size` (Gauge)
  - Labels: `queue_name`

### 4. セキュリティメトリクス (Security Metrics)
- `techsapo_auth_attempts_total` (Counter)
  - Labels: `status`, `method`
- `techsapo_rate_limit_hits_total` (Counter)
  - Labels: `endpoint`, `client_ip`
- `techsapo_input_sanitization_total` (Counter)
  - Labels: `type`, `blocked`

## 🚦 アラート設定

### Critical Alerts (P0 - 即座対応)
- Wall-bounce consensus confidence < 0.7 for 5 minutes
- LLM provider error rate > 5% for 2 minutes
- HTTP error rate (5xx) > 1% for 1 minute
- Memory usage > 90% for 30 seconds

### Warning Alerts (P1 - 15分以内)
- Average response time > 5 seconds for 5 minutes
- Budget consumption > 80% of daily limit
- Redis connection failures > 10 in 5 minutes
- Consensus confidence declining trend (>10% drop in 1 hour)

### Info Alerts (P2 - 1時間以内)
- Daily request volume 50% above baseline
- New LLM provider added/removed
- Cache hit rate < 80% for 30 minutes

## 📈 ダッシュボード構成

### 1. Executive Dashboard
- Overall system health score
- Daily/hourly request volume
- Cost tracking and budget utilization
- SLA compliance metrics

### 2. Operations Dashboard
- Wall-bounce analysis performance
- LLM provider comparison
- Error rate and latency trends
- Infrastructure resource usage

### 3. Development Dashboard
- API endpoint performance
- Database query performance
- Cache efficiency
- Error debugging information

## 🔧 実装要件

### Performance Requirements
- Metric collection overhead < 1% CPU
- Memory overhead < 50MB for metrics
- Scrape interval: 15 seconds
- Retention: 15 days (detailed), 90 days (aggregated)

### High Availability
- Prometheus HA with 2 replicas
- Grafana clustering
- Alert manager redundancy
- Data backup every 6 hours

### Security
- mTLS between Prometheus and targets
- RBAC for Grafana access
- Encrypted metric storage
- PII data masking in logs