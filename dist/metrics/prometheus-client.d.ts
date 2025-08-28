/**
 * TechSapo Prometheus Metrics Client
 * 壁打ち分析システム専用メトリクス収集
 */
import promClient from 'prom-client';
/**
 * Prometheus Registry Setup
 */
export declare const register: promClient.Registry<"text/plain; version=0.0.4; charset=utf-8">;
/**
 * ビジネスメトリクス - Wall-bounce Analysis Performance
 */
export declare const wallbounceRequestsTotal: promClient.Counter<"status" | "task_type" | "provider">;
export declare const wallbounceConsensusConfidence: promClient.Histogram<string>;
export declare const wallbounceProcessingDuration: promClient.Histogram<"task_type">;
export declare const wallbounceCostUsd: promClient.Counter<"task_type" | "provider">;
/**
 * LLMプロバイダー性能メトリクス
 */
export declare const llmRequestsTotal: promClient.Counter<"model" | "status" | "task_type" | "provider">;
export declare const llmResponseTime: promClient.Histogram<"model" | "provider">;
export declare const llmTokenUsage: promClient.Counter<"model" | "provider" | "type">;
export declare const llmAgreementScore: promClient.Histogram<"provider_pair">;
/**
 * アプリケーションメトリクス - API Performance
 */
export declare const httpRequestsTotal: promClient.Counter<"route" | "method" | "status_code">;
export declare const httpRequestDuration: promClient.Histogram<"route" | "method">;
export declare const httpRequestSize: promClient.Histogram<string>;
export declare const httpResponseSize: promClient.Histogram<string>;
/**
 * Database & Cache メトリクス
 */
export declare const redisOperationsTotal: promClient.Counter<"status" | "operation">;
export declare const redisConnectionPoolSize: promClient.Gauge<string>;
export declare const mysqlQueriesTotal: promClient.Counter<"status" | "query_type">;
export declare const cacheHitRatio: promClient.Gauge<"cache_type">;
/**
 * エラートラッキング
 */
export declare const errorsTotal: promClient.Counter<"service" | "error_type" | "severity">;
export declare const circuitBreakerState: promClient.Gauge<"service">;
/**
 * カスタムリソース使用量
 */
export declare const memoryUsage: promClient.Gauge<"component">;
export declare const activeConnections: promClient.Gauge<"connection_type">;
export declare const queueSize: promClient.Gauge<"queue_name">;
/**
 * Google Drive RAG & Webhook メトリクス
 */
export declare const googledriveApiRequestsTotal: promClient.Counter<"status" | "folder_id" | "operation">;
export declare const ragSyncDuration: promClient.Histogram<"folder_id" | "batch_size" | "document_count">;
export declare const ragSearchRequests: promClient.Counter<"status" | "vector_store_id">;
export declare const ragSearchDuration: promClient.Histogram<"vector_store_id" | "query_type">;
export declare const ragDocumentProcessingTotal: promClient.Counter<"status" | "mime_type">;
export declare const webhookNotificationsTotal: promClient.Counter<"status" | "source" | "resource_state">;
export declare const webhookProcessingDuration: promClient.Histogram<"webhook_type">;
export declare const ragCostUsd: promClient.Counter<"provider" | "operation">;
/**
 * セキュリティメトリクス
 */
export declare const authAttemptsTotal: promClient.Counter<"method" | "status">;
export declare const rateLimitHitsTotal: promClient.Counter<"endpoint" | "client_ip">;
export declare const inputSanitizationTotal: promClient.Counter<"type" | "blocked">;
/**
 * メトリクス初期化とヘルスチェック
 */
export declare function initializeMetrics(): void;
/**
 * メトリクス収集ヘルパー関数群
 */
export declare function recordWallBounceAnalysis(taskType: string, providers: string[], confidence: number, processingTime: number, totalCost: number, status: 'success' | 'error' | 'timeout'): void;
export declare function recordHttpRequest(method: string, route: string, statusCode: number, duration: number, requestSize?: number, responseSize?: number): void;
export declare function recordError(errorType: string, severity: 'low' | 'medium' | 'high' | 'critical', service: string): void;
export declare function recordLLMResponse(provider: string, model: string, responseTime: number, inputTokens: number, outputTokens: number, cost: number, status: 'success' | 'error' | 'timeout'): void;
/**
 * RAG & Webhook メトリクス記録関数群
 */
export declare function recordRAGSyncEvent(eventType: string, mimeType: string, status: string, folderId?: string, duration?: number): void;
export declare function recordRAGSearch(vectorStoreId: string, queryType: string, duration: number, resultCount: number, status: string): void;
export declare function recordWebhookNotification(resourceState: string, status: string): void;
export declare function recordWebhookProcessingDuration(duration: number): void;
export declare function recordWebhookError(errorType: string): void;
export declare function recordDriveSyncEvent(eventType: string, resourceId: string): void;
export declare function recordRAGCost(operation: string, provider: string, cost: number): void;
