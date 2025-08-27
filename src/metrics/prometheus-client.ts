/**
 * TechSapo Prometheus Metrics Client
 * 壁打ち分析システム専用メトリクス収集
 */

import promClient from 'prom-client';
import { logger } from '../utils/logger';

/**
 * Prometheus Registry Setup
 */
export const register = new promClient.Registry();

// Add default metrics (process_*, nodejs_*)
promClient.collectDefaultMetrics({
  register,
  prefix: 'techsapo_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
  eventLoopMonitoringPrecision: 10,
});

/**
 * ビジネスメトリクス - Wall-bounce Analysis Performance
 */

// 壁打ち分析リクエスト総数
export const wallbounceRequestsTotal = new promClient.Counter({
  name: 'techsapo_wallbounce_requests_total',
  help: 'Total number of wall-bounce analysis requests',
  labelNames: ['task_type', 'provider', 'status'],
  registers: [register]
});

// 壁打ち合意信頼度分布
export const wallbounceConsensusConfidence = new promClient.Histogram({
  name: 'techsapo_wallbounce_consensus_confidence',
  help: 'Distribution of wall-bounce consensus confidence scores',
  buckets: [0.1, 0.3, 0.5, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0],
  registers: [register]
});

// 壁打ち処理時間
export const wallbounceProcessingDuration = new promClient.Histogram({
  name: 'techsapo_wallbounce_processing_duration_seconds',
  help: 'Wall-bounce analysis processing time in seconds',
  buckets: [0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0],
  labelNames: ['task_type'],
  registers: [register]
});

// 壁打ち分析コスト
export const wallbounceCostUsd = new promClient.Counter({
  name: 'techsapo_wallbounce_cost_usd',
  help: 'Total cost of wall-bounce analysis in USD',
  labelNames: ['provider', 'task_type'],
  registers: [register]
});

/**
 * LLMプロバイダー性能メトリクス
 */

// LLMリクエスト総数
export const llmRequestsTotal = new promClient.Counter({
  name: 'techsapo_llm_requests_total',
  help: 'Total number of LLM provider requests',
  labelNames: ['provider', 'model', 'status', 'task_type'],
  registers: [register]
});

// LLM応答時間
export const llmResponseTime = new promClient.Histogram({
  name: 'techsapo_llm_response_time_seconds',
  help: 'LLM provider response time in seconds',
  buckets: [0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
  labelNames: ['provider', 'model'],
  registers: [register]
});

// LLMトークン使用量
export const llmTokenUsage = new promClient.Counter({
  name: 'techsapo_llm_token_usage_total',
  help: 'Total token usage by LLM providers',
  labelNames: ['provider', 'type', 'model'],
  registers: [register]
});

// LLM間合意スコア
export const llmAgreementScore = new promClient.Histogram({
  name: 'techsapo_llm_agreement_score',
  help: 'Agreement score between LLM providers',
  buckets: [0.0, 0.1, 0.3, 0.5, 0.7, 0.8, 0.9, 1.0],
  labelNames: ['provider_pair'],
  registers: [register]
});

/**
 * アプリケーションメトリクス - API Performance
 */

// HTTP リクエスト総数
export const httpRequestsTotal = new promClient.Counter({
  name: 'techsapo_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// HTTP リクエスト処理時間
export const httpRequestDuration = new promClient.Histogram({
  name: 'techsapo_http_request_duration_seconds',
  help: 'HTTP request processing time in seconds',
  buckets: [0.1, 0.3, 0.5, 0.7, 1.0, 1.5, 2.0, 3.0, 5.0, 7.0, 10.0],
  labelNames: ['method', 'route'],
  registers: [register]
});

// HTTP リクエストサイズ
export const httpRequestSize = new promClient.Histogram({
  name: 'techsapo_http_request_size_bytes',
  help: 'HTTP request size in bytes',
  buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
  registers: [register]
});

// HTTP レスポンスサイズ
export const httpResponseSize = new promClient.Histogram({
  name: 'techsapo_http_response_size_bytes',
  help: 'HTTP response size in bytes',
  buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
  registers: [register]
});

/**
 * Database & Cache メトリクス
 */

// Redis操作
export const redisOperationsTotal = new promClient.Counter({
  name: 'techsapo_redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['operation', 'status'],
  registers: [register]
});

// Redis接続プールサイズ
export const redisConnectionPoolSize = new promClient.Gauge({
  name: 'techsapo_redis_connection_pool_size',
  help: 'Current Redis connection pool size',
  registers: [register]
});

// MySQLクエリ
export const mysqlQueriesTotal = new promClient.Counter({
  name: 'techsapo_mysql_queries_total',
  help: 'Total number of MySQL queries',
  labelNames: ['query_type', 'status'],
  registers: [register]
});

// キャッシュヒット率
export const cacheHitRatio = new promClient.Gauge({
  name: 'techsapo_cache_hit_ratio',
  help: 'Cache hit ratio',
  labelNames: ['cache_type'],
  registers: [register]
});

/**
 * エラートラッキング
 */

// エラー総数
export const errorsTotal = new promClient.Counter({
  name: 'techsapo_errors_total',
  help: 'Total number of application errors',
  labelNames: ['error_type', 'severity', 'service'],
  registers: [register]
});

// サーキットブレーカー状態
export const circuitBreakerState = new promClient.Gauge({
  name: 'techsapo_circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=half_open, 2=open)',
  labelNames: ['service'],
  registers: [register]
});

/**
 * カスタムリソース使用量
 */

// コンポーネント別メモリ使用量
export const memoryUsage = new promClient.Gauge({
  name: 'techsapo_memory_usage_bytes',
  help: 'Memory usage by component',
  labelNames: ['component'],
  registers: [register]
});

// アクティブ接続数
export const activeConnections = new promClient.Gauge({
  name: 'techsapo_active_connections',
  help: 'Number of active connections',
  labelNames: ['connection_type'],
  registers: [register]
});

// キューサイズ
export const queueSize = new promClient.Gauge({
  name: 'techsapo_queue_size',
  help: 'Current queue size',
  labelNames: ['queue_name'],
  registers: [register]
});

/**
 * セキュリティメトリクス
 */

// 認証試行回数
export const authAttemptsTotal = new promClient.Counter({
  name: 'techsapo_auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['status', 'method'],
  registers: [register]
});

// レート制限ヒット数
export const rateLimitHitsTotal = new promClient.Counter({
  name: 'techsapo_rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['endpoint', 'client_ip'],
  registers: [register]
});

// 入力サニタイゼーション
export const inputSanitizationTotal = new promClient.Counter({
  name: 'techsapo_input_sanitization_total',
  help: 'Total number of input sanitization events',
  labelNames: ['type', 'blocked'],
  registers: [register]
});

/**
 * メトリクス初期化とヘルスチェック
 */
export function initializeMetrics(): void {
  logger.info('🔥 Prometheus metrics initialized', {
    registry: 'techsapo',
    metrics_count: register.getMetricsAsArray().length,
    default_metrics: true
  });

  // 初期値設定
  circuitBreakerState.set({ service: 'wall_bounce_analyzer' }, 0);
  circuitBreakerState.set({ service: 'llm_providers' }, 0);
  circuitBreakerState.set({ service: 'redis_cache' }, 0);

  cacheHitRatio.set({ cache_type: 'redis' }, 0.95);
  cacheHitRatio.set({ cache_type: 'memory' }, 0.85);

  redisConnectionPoolSize.set(10);
  activeConnections.set({ connection_type: 'http' }, 0);
  activeConnections.set({ connection_type: 'websocket' }, 0);
  activeConnections.set({ connection_type: 'database' }, 0);
}

/**
 * メトリクス収集ヘルパー関数群
 */

// 壁打ち分析結果を記録
export function recordWallBounceAnalysis(
  taskType: string,
  providers: string[],
  confidence: number,
  processingTime: number,
  totalCost: number,
  status: 'success' | 'error' | 'timeout'
): void {
  // 基本メトリクス
  wallbounceRequestsTotal.inc({ task_type: taskType, provider: 'ensemble', status });
  wallbounceConsensusConfidence.observe(confidence);
  wallbounceProcessingDuration.observe({ task_type: taskType }, processingTime / 1000);
  wallbounceCostUsd.inc({ provider: 'ensemble', task_type: taskType }, totalCost);

  // プロバイダー別メトリクス
  providers.forEach(provider => {
    llmRequestsTotal.inc({ 
      provider, 
      model: getModelByProvider(provider), 
      status, 
      task_type: taskType 
    });
  });
}

// HTTP リクエストを記録
export function recordHttpRequest(
  method: string,
  route: string,
  statusCode: number,
  duration: number,
  requestSize?: number,
  responseSize?: number
): void {
  httpRequestsTotal.inc({ method, route, status_code: statusCode.toString() });
  httpRequestDuration.observe({ method, route }, duration / 1000);
  
  if (requestSize) {
    httpRequestSize.observe(requestSize);
  }
  if (responseSize) {
    httpResponseSize.observe(responseSize);
  }
}

// エラーを記録
export function recordError(
  errorType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  service: string
): void {
  errorsTotal.inc({ error_type: errorType, severity, service });
}

// LLM応答を記録
export function recordLLMResponse(
  provider: string,
  model: string,
  responseTime: number,
  inputTokens: number,
  outputTokens: number,
  cost: number,
  status: 'success' | 'error' | 'timeout'
): void {
  llmResponseTime.observe({ provider, model }, responseTime / 1000);
  llmTokenUsage.inc({ provider, type: 'input', model }, inputTokens);
  llmTokenUsage.inc({ provider, type: 'output', model }, outputTokens);
}

// プロバイダー名からモデル名を取得
function getModelByProvider(provider: string): string {
  const modelMap: { [key: string]: string } = {
    'Gemini': 'gemini-2.5-pro',
    'OpenAI': 'gpt-5',
    'Claude': 'claude-3-5-sonnet-latest',
    'OpenRouter': 'meta-llama/llama-3.1-405b-instruct'
  };
  return modelMap[provider] || 'unknown';
}

logger.info('📊 TechSapo Prometheus metrics client loaded', {
  metrics_defined: Object.keys(module.exports).length,
  registry: 'ready'
});