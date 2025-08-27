"use strict";
/**
 * TechSapo Prometheus Metrics Client
 * 壁打ち分析システム専用メトリクス収集
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inputSanitizationTotal = exports.rateLimitHitsTotal = exports.authAttemptsTotal = exports.queueSize = exports.activeConnections = exports.memoryUsage = exports.circuitBreakerState = exports.errorsTotal = exports.cacheHitRatio = exports.mysqlQueriesTotal = exports.redisConnectionPoolSize = exports.redisOperationsTotal = exports.httpResponseSize = exports.httpRequestSize = exports.httpRequestDuration = exports.httpRequestsTotal = exports.llmAgreementScore = exports.llmTokenUsage = exports.llmResponseTime = exports.llmRequestsTotal = exports.wallbounceCostUsd = exports.wallbounceProcessingDuration = exports.wallbounceConsensusConfidence = exports.wallbounceRequestsTotal = exports.register = void 0;
exports.initializeMetrics = initializeMetrics;
exports.recordWallBounceAnalysis = recordWallBounceAnalysis;
exports.recordHttpRequest = recordHttpRequest;
exports.recordError = recordError;
exports.recordLLMResponse = recordLLMResponse;
const prom_client_1 = __importDefault(require("prom-client"));
const logger_1 = require("../utils/logger");
/**
 * Prometheus Registry Setup
 */
exports.register = new prom_client_1.default.Registry();
// Add default metrics (process_*, nodejs_*)
prom_client_1.default.collectDefaultMetrics({
    register: exports.register,
    prefix: 'techsapo_',
    gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    eventLoopMonitoringPrecision: 10,
});
/**
 * ビジネスメトリクス - Wall-bounce Analysis Performance
 */
// 壁打ち分析リクエスト総数
exports.wallbounceRequestsTotal = new prom_client_1.default.Counter({
    name: 'techsapo_wallbounce_requests_total',
    help: 'Total number of wall-bounce analysis requests',
    labelNames: ['task_type', 'provider', 'status'],
    registers: [exports.register]
});
// 壁打ち合意信頼度分布
exports.wallbounceConsensusConfidence = new prom_client_1.default.Histogram({
    name: 'techsapo_wallbounce_consensus_confidence',
    help: 'Distribution of wall-bounce consensus confidence scores',
    buckets: [0.1, 0.3, 0.5, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0],
    registers: [exports.register]
});
// 壁打ち処理時間
exports.wallbounceProcessingDuration = new prom_client_1.default.Histogram({
    name: 'techsapo_wallbounce_processing_duration_seconds',
    help: 'Wall-bounce analysis processing time in seconds',
    buckets: [0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0],
    labelNames: ['task_type'],
    registers: [exports.register]
});
// 壁打ち分析コスト
exports.wallbounceCostUsd = new prom_client_1.default.Counter({
    name: 'techsapo_wallbounce_cost_usd',
    help: 'Total cost of wall-bounce analysis in USD',
    labelNames: ['provider', 'task_type'],
    registers: [exports.register]
});
/**
 * LLMプロバイダー性能メトリクス
 */
// LLMリクエスト総数
exports.llmRequestsTotal = new prom_client_1.default.Counter({
    name: 'techsapo_llm_requests_total',
    help: 'Total number of LLM provider requests',
    labelNames: ['provider', 'model', 'status', 'task_type'],
    registers: [exports.register]
});
// LLM応答時間
exports.llmResponseTime = new prom_client_1.default.Histogram({
    name: 'techsapo_llm_response_time_seconds',
    help: 'LLM provider response time in seconds',
    buckets: [0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
    labelNames: ['provider', 'model'],
    registers: [exports.register]
});
// LLMトークン使用量
exports.llmTokenUsage = new prom_client_1.default.Counter({
    name: 'techsapo_llm_token_usage_total',
    help: 'Total token usage by LLM providers',
    labelNames: ['provider', 'type', 'model'],
    registers: [exports.register]
});
// LLM間合意スコア
exports.llmAgreementScore = new prom_client_1.default.Histogram({
    name: 'techsapo_llm_agreement_score',
    help: 'Agreement score between LLM providers',
    buckets: [0.0, 0.1, 0.3, 0.5, 0.7, 0.8, 0.9, 1.0],
    labelNames: ['provider_pair'],
    registers: [exports.register]
});
/**
 * アプリケーションメトリクス - API Performance
 */
// HTTP リクエスト総数
exports.httpRequestsTotal = new prom_client_1.default.Counter({
    name: 'techsapo_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [exports.register]
});
// HTTP リクエスト処理時間
exports.httpRequestDuration = new prom_client_1.default.Histogram({
    name: 'techsapo_http_request_duration_seconds',
    help: 'HTTP request processing time in seconds',
    buckets: [0.1, 0.3, 0.5, 0.7, 1.0, 1.5, 2.0, 3.0, 5.0, 7.0, 10.0],
    labelNames: ['method', 'route'],
    registers: [exports.register]
});
// HTTP リクエストサイズ
exports.httpRequestSize = new prom_client_1.default.Histogram({
    name: 'techsapo_http_request_size_bytes',
    help: 'HTTP request size in bytes',
    buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
    registers: [exports.register]
});
// HTTP レスポンスサイズ
exports.httpResponseSize = new prom_client_1.default.Histogram({
    name: 'techsapo_http_response_size_bytes',
    help: 'HTTP response size in bytes',
    buckets: [100, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
    registers: [exports.register]
});
/**
 * Database & Cache メトリクス
 */
// Redis操作
exports.redisOperationsTotal = new prom_client_1.default.Counter({
    name: 'techsapo_redis_operations_total',
    help: 'Total number of Redis operations',
    labelNames: ['operation', 'status'],
    registers: [exports.register]
});
// Redis接続プールサイズ
exports.redisConnectionPoolSize = new prom_client_1.default.Gauge({
    name: 'techsapo_redis_connection_pool_size',
    help: 'Current Redis connection pool size',
    registers: [exports.register]
});
// MySQLクエリ
exports.mysqlQueriesTotal = new prom_client_1.default.Counter({
    name: 'techsapo_mysql_queries_total',
    help: 'Total number of MySQL queries',
    labelNames: ['query_type', 'status'],
    registers: [exports.register]
});
// キャッシュヒット率
exports.cacheHitRatio = new prom_client_1.default.Gauge({
    name: 'techsapo_cache_hit_ratio',
    help: 'Cache hit ratio',
    labelNames: ['cache_type'],
    registers: [exports.register]
});
/**
 * エラートラッキング
 */
// エラー総数
exports.errorsTotal = new prom_client_1.default.Counter({
    name: 'techsapo_errors_total',
    help: 'Total number of application errors',
    labelNames: ['error_type', 'severity', 'service'],
    registers: [exports.register]
});
// サーキットブレーカー状態
exports.circuitBreakerState = new prom_client_1.default.Gauge({
    name: 'techsapo_circuit_breaker_state',
    help: 'Circuit breaker state (0=closed, 1=half_open, 2=open)',
    labelNames: ['service'],
    registers: [exports.register]
});
/**
 * カスタムリソース使用量
 */
// コンポーネント別メモリ使用量
exports.memoryUsage = new prom_client_1.default.Gauge({
    name: 'techsapo_memory_usage_bytes',
    help: 'Memory usage by component',
    labelNames: ['component'],
    registers: [exports.register]
});
// アクティブ接続数
exports.activeConnections = new prom_client_1.default.Gauge({
    name: 'techsapo_active_connections',
    help: 'Number of active connections',
    labelNames: ['connection_type'],
    registers: [exports.register]
});
// キューサイズ
exports.queueSize = new prom_client_1.default.Gauge({
    name: 'techsapo_queue_size',
    help: 'Current queue size',
    labelNames: ['queue_name'],
    registers: [exports.register]
});
/**
 * セキュリティメトリクス
 */
// 認証試行回数
exports.authAttemptsTotal = new prom_client_1.default.Counter({
    name: 'techsapo_auth_attempts_total',
    help: 'Total number of authentication attempts',
    labelNames: ['status', 'method'],
    registers: [exports.register]
});
// レート制限ヒット数
exports.rateLimitHitsTotal = new prom_client_1.default.Counter({
    name: 'techsapo_rate_limit_hits_total',
    help: 'Total number of rate limit hits',
    labelNames: ['endpoint', 'client_ip'],
    registers: [exports.register]
});
// 入力サニタイゼーション
exports.inputSanitizationTotal = new prom_client_1.default.Counter({
    name: 'techsapo_input_sanitization_total',
    help: 'Total number of input sanitization events',
    labelNames: ['type', 'blocked'],
    registers: [exports.register]
});
/**
 * メトリクス初期化とヘルスチェック
 */
function initializeMetrics() {
    logger_1.logger.info('🔥 Prometheus metrics initialized', {
        registry: 'techsapo',
        metrics_count: exports.register.getMetricsAsArray().length,
        default_metrics: true
    });
    // 初期値設定
    exports.circuitBreakerState.set({ service: 'wall_bounce_analyzer' }, 0);
    exports.circuitBreakerState.set({ service: 'llm_providers' }, 0);
    exports.circuitBreakerState.set({ service: 'redis_cache' }, 0);
    exports.cacheHitRatio.set({ cache_type: 'redis' }, 0.95);
    exports.cacheHitRatio.set({ cache_type: 'memory' }, 0.85);
    exports.redisConnectionPoolSize.set(10);
    exports.activeConnections.set({ connection_type: 'http' }, 0);
    exports.activeConnections.set({ connection_type: 'websocket' }, 0);
    exports.activeConnections.set({ connection_type: 'database' }, 0);
}
/**
 * メトリクス収集ヘルパー関数群
 */
// 壁打ち分析結果を記録
function recordWallBounceAnalysis(taskType, providers, confidence, processingTime, totalCost, status) {
    // 基本メトリクス
    exports.wallbounceRequestsTotal.inc({ task_type: taskType, provider: 'ensemble', status });
    exports.wallbounceConsensusConfidence.observe(confidence);
    exports.wallbounceProcessingDuration.observe({ task_type: taskType }, processingTime / 1000);
    exports.wallbounceCostUsd.inc({ provider: 'ensemble', task_type: taskType }, totalCost);
    // プロバイダー別メトリクス
    providers.forEach(provider => {
        exports.llmRequestsTotal.inc({
            provider,
            model: getModelByProvider(provider),
            status,
            task_type: taskType
        });
    });
}
// HTTP リクエストを記録
function recordHttpRequest(method, route, statusCode, duration, requestSize, responseSize) {
    exports.httpRequestsTotal.inc({ method, route, status_code: statusCode.toString() });
    exports.httpRequestDuration.observe({ method, route }, duration / 1000);
    if (requestSize) {
        exports.httpRequestSize.observe(requestSize);
    }
    if (responseSize) {
        exports.httpResponseSize.observe(responseSize);
    }
}
// エラーを記録
function recordError(errorType, severity, service) {
    exports.errorsTotal.inc({ error_type: errorType, severity, service });
}
// LLM応答を記録
function recordLLMResponse(provider, model, responseTime, inputTokens, outputTokens, cost, status) {
    exports.llmResponseTime.observe({ provider, model }, responseTime / 1000);
    exports.llmTokenUsage.inc({ provider, type: 'input', model }, inputTokens);
    exports.llmTokenUsage.inc({ provider, type: 'output', model }, outputTokens);
}
// プロバイダー名からモデル名を取得
function getModelByProvider(provider) {
    const modelMap = {
        'Gemini': 'gemini-2.5-pro',
        'OpenAI': 'gpt-5',
        'Claude': 'claude-3-5-sonnet-latest',
        'OpenRouter': 'meta-llama/llama-3.1-405b-instruct'
    };
    return modelMap[provider] || 'unknown';
}
logger_1.logger.info('📊 TechSapo Prometheus metrics client loaded', {
    metrics_defined: Object.keys(module.exports).length,
    registry: 'ready'
});
//# sourceMappingURL=prometheus-client.js.map