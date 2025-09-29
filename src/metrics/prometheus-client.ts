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
 * Google Drive RAG & Webhook メトリクス
 */

// GoogleDrive API呼び出し統計
export const googledriveApiRequestsTotal = new promClient.Counter({
  name: 'techsapo_googledrive_api_requests_total',
  help: 'Total number of Google Drive API requests',
  labelNames: ['operation', 'status', 'folder_id'],
  registers: [register]
});

// RAG同期処理時間
export const ragSyncDuration = new promClient.Histogram({
  name: 'techsapo_rag_sync_duration_seconds',
  help: 'RAG synchronization processing time in seconds',
  buckets: [1, 5, 15, 30, 60, 120, 300, 600],
  labelNames: ['folder_id', 'document_count', 'batch_size'],
  registers: [register]
});

// RAG検索リクエスト
export const ragSearchRequests = new promClient.Counter({
  name: 'techsapo_rag_search_requests_total',
  help: 'Total number of RAG search requests',
  labelNames: ['vector_store_id', 'status'],
  registers: [register]
});

// RAG検索処理時間
export const ragSearchDuration = new promClient.Histogram({
  name: 'techsapo_rag_search_duration_seconds',
  help: 'RAG search processing time in seconds',
  buckets: [0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
  labelNames: ['vector_store_id', 'query_type'],
  registers: [register]
});

// RAGドキュメント処理統計
export const ragDocumentProcessingTotal = new promClient.Counter({
  name: 'techsapo_rag_document_processing_total',
  help: 'Total number of RAG document processing events',
  labelNames: ['mime_type', 'status'],
  registers: [register]
});

// Webhook通知統計
export const webhookNotificationsTotal = new promClient.Counter({
  name: 'techsapo_webhook_notifications_total',
  help: 'Total number of webhook notifications received',
  labelNames: ['source', 'resource_state', 'status'],
  registers: [register]
});

// Webhook処理時間
export const webhookProcessingDuration = new promClient.Histogram({
  name: 'techsapo_webhook_processing_duration_seconds',
  help: 'Webhook processing time in seconds',
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0],
  labelNames: ['webhook_type'],
  registers: [register]
});

// RAGコスト追跡
export const ragCostUsd = new promClient.Counter({
  name: 'techsapo_rag_cost_usd',
  help: 'RAG operations cost in USD',
  labelNames: ['operation', 'provider'],
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

  // Redisから永続化されたメトリクスを復元
  restoreMetrics().catch(error => {
    logger.warn('Failed to restore metrics on initialization', { error });
  });
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
  _cost: number,
  _status: 'success' | 'error' | 'timeout'
): void {
  void _cost;
  void _status;
  llmResponseTime.observe({ provider, model }, responseTime / 1000);
  llmTokenUsage.inc({ provider, type: 'input', model }, inputTokens);
  llmTokenUsage.inc({ provider, type: 'output', model }, outputTokens);
}

/**
 * RAG & Webhook メトリクス記録関数群
 */

// RAG同期イベント記録
export function recordRAGSyncEvent(
  eventType: string,
  mimeType: string,
  status: string,
  folderId?: string,
  duration?: number
): void {
  ragDocumentProcessingTotal.inc({ mime_type: mimeType, status });
  
  if (folderId) {
    googledriveApiRequestsTotal.inc({ 
      operation: eventType, 
      status, 
      folder_id: folderId 
    });
  }
  
  if (duration) {
    ragSyncDuration.observe({ 
      folder_id: folderId || 'unknown',
      document_count: '1',
      batch_size: '1' 
    }, duration / 1000);
  }
}

// RAG検索記録
export function recordRAGSearch(
  vectorStoreId: string,
  queryType: string,
  duration: number,
  resultCount: number,
  status: string
): void {
  ragSearchRequests.inc({ vector_store_id: vectorStoreId, status });
  ragSearchDuration.observe({ vector_store_id: vectorStoreId, query_type: queryType }, duration / 1000);
}

// Webhook通知記録
export function recordWebhookNotification(resourceState: string, status: string): void {
  webhookNotificationsTotal.inc({ 
    source: 'googledrive', 
    resource_state: resourceState, 
    status 
  });
}

// Webhook処理時間記録
export function recordWebhookProcessingDuration(duration: number): void {
  webhookProcessingDuration.observe({ webhook_type: 'googledrive' }, duration / 1000);
}

// Webhookエラー記録
export function recordWebhookError(errorType: string): void {
  recordError(errorType, 'medium', 'webhook_handler');
  webhookNotificationsTotal.inc({ 
    source: 'googledrive', 
    resource_state: 'error', 
    status: 'failed' 
  });
}

// Drive同期イベント記録
export function recordDriveSyncEvent(eventType: string, resourceId: string): void {
  googledriveApiRequestsTotal.inc({ 
    operation: eventType, 
    status: 'success', 
    folder_id: resourceId 
  });
}

// RAGコスト記録
export function recordRAGCost(operation: string, provider: string, cost: number): void {
  ragCostUsd.inc({ operation, provider }, cost);
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

/**
 * メトリクス永続化機能 (Redis)
 */
let redisClient: any = null;

// Redis接続を遅延初期化
async function getRedisClient() {
  if (!redisClient) {
    try {
      const { getRedisService } = await import('../services/redis-service');
      redisClient = getRedisService();
    } catch (error) {
      logger.warn('Redis not available for metrics persistence', { error });
    }
  }
  return redisClient;
}

// メトリクスをRedisに保存
export async function persistMetrics(): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;

    const metrics = await register.getMetricsAsJSON();
    const metricsData: any = {};

    for (const metric of metrics) {
      if (metric.name.startsWith('techsapo_') && (metric as any).type === 'counter') {
        metricsData[metric.name] = (metric as any).values;
      }
    }

    await client.set('prometheus:metrics:snapshot', JSON.stringify(metricsData), {
      EX: 86400 * 30 // 30日間保持
    });

    logger.debug('Metrics persisted to Redis', { metrics_count: Object.keys(metricsData).length });
  } catch (error) {
    logger.error('Failed to persist metrics', { error });
  }
}

// Redisからメトリクスを復元
export async function restoreMetrics(): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;

    const data = await client.get('prometheus:metrics:snapshot');
    if (!data) {
      logger.info('No persisted metrics found');
      return;
    }

    const metricsData = JSON.parse(data);
    let restored = 0;

    for (const [metricName, values] of Object.entries(metricsData)) {
      const metric = getMetricByName(metricName);
      if (metric && Array.isArray(values)) {
        for (const item of values as any[]) {
          if (item.labels && typeof item.value === 'number' && item.value > 0) {
            metric.inc(item.labels, item.value);
            restored++;
          }
        }
      }
    }

    logger.info('Metrics restored from Redis', { restored_values: restored });
  } catch (error) {
    logger.error('Failed to restore metrics', { error });
  }
}

// メトリクス名から実際のメトリックオブジェクトを取得
function getMetricByName(name: string): any {
  const metricsMap: { [key: string]: any } = {
    'techsapo_llm_requests_total': llmRequestsTotal,
    'techsapo_wallbounce_cost_usd': wallbounceCostUsd,
    'techsapo_llm_token_usage_total': llmTokenUsage,
    'techsapo_wallbounce_requests_total': wallbounceRequestsTotal,
    'techsapo_http_requests_total': httpRequestsTotal,
    'techsapo_redis_operations_total': redisOperationsTotal
  };
  return metricsMap[name];
}

// 定期的にメトリクスを保存（5分ごと）
setInterval(async () => {
  await persistMetrics();
}, 5 * 60 * 1000);

// プロセス終了時にメトリクスを保存
process.on('SIGTERM', async () => {
  await persistMetrics();
});

process.on('SIGINT', async () => {
  await persistMetrics();
});

logger.info('📊 TechSapo Prometheus metrics client loaded', {
  metrics_defined: Object.keys(module.exports).length,
  registry: 'ready',
  persistence: 'redis'
});
