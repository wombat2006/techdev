/**
 * TechSapo Prometheus Client Class
 * シングルトンクラスでメトリクス管理を統一
 */
export declare class PrometheusClient {
    private static instance;
    private constructor();
    static getInstance(): PrometheusClient;
    /**
     * 壁打ち分析メトリクス記録
     */
    recordWallBounceAnalysis(taskType: string, providers: string[], confidence: number, processingTime: number, totalCost: number, status: 'success' | 'error' | 'timeout'): void;
    /**
     * HTTP リクエストメトリクス記録
     */
    recordHttpRequest(method: string, route: string, statusCode: number, duration: number, requestSize?: number, responseSize?: number): void;
    /**
     * LLM応答メトリクス記録
     */
    recordLLMResponse(provider: string, model: string, responseTime: number, inputTokens: number, outputTokens: number, cost: number, status: 'success' | 'error' | 'timeout'): void;
    /**
     * エラーメトリクス記録
     */
    recordError(errorType: string, severity: 'low' | 'medium' | 'high' | 'critical', service: string): void;
    /**
     * RAG同期イベント記録
     */
    recordRAGSyncEvent(eventType: string, mimeType: string, status: string, folderId?: string, duration?: number): void;
    /**
     * RAG検索記録
     */
    recordRAGSearch(vectorStoreId: string, queryType: string, duration: number, resultCount: number, status: string): void;
    /**
     * Webhook通知記録
     */
    recordWebhookNotification(resourceState: string, status: string): void;
    /**
     * Webhook処理時間記録
     */
    recordWebhookProcessingDuration(duration: number): void;
    /**
     * Webhookエラー記録
     */
    recordWebhookError(errorType: string): void;
    /**
     * Drive同期イベント記録
     */
    recordDriveSyncEvent(eventType: string, resourceId: string): void;
    /**
     * RAGコスト記録
     */
    recordRAGCost(operation: string, provider: string, cost: number): void;
    /**
     * メトリクスレジストリ取得
     */
    getMetricsRegistry(): import("prom-client").Registry<"text/plain; version=0.0.4; charset=utf-8">;
    /**
     * メトリクス初期化
     */
    initialize(): void;
    /**
     * システム健康度チェック
     */
    getSystemHealth(): {
        status: 'healthy' | 'degraded' | 'unhealthy';
        metrics: {
            totalRequests: number;
            errorRate: number;
            avgResponseTime: number;
        };
    };
    /**
     * デバッグ情報取得
     */
    getDebugInfo(): {
        registeredMetrics: string[];
        instanceCreated: boolean;
        metricsCount: number;
    };
}
export default PrometheusClient;
