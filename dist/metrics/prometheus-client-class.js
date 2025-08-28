"use strict";
/**
 * TechSapo Prometheus Client Class
 * シングルトンクラスでメトリクス管理を統一
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrometheusClient = void 0;
const metrics = __importStar(require("./prometheus-client"));
const logger_1 = require("../utils/logger");
class PrometheusClient {
    static instance;
    constructor() {
        // シングルトンパターン
    }
    static getInstance() {
        if (!PrometheusClient.instance) {
            PrometheusClient.instance = new PrometheusClient();
            logger_1.logger.info('📊 PrometheusClient シングルトンインスタンス作成');
        }
        return PrometheusClient.instance;
    }
    /**
     * 壁打ち分析メトリクス記録
     */
    recordWallBounceAnalysis(taskType, providers, confidence, processingTime, totalCost, status) {
        metrics.recordWallBounceAnalysis(taskType, providers, confidence, processingTime, totalCost, status);
    }
    /**
     * HTTP リクエストメトリクス記録
     */
    recordHttpRequest(method, route, statusCode, duration, requestSize, responseSize) {
        metrics.recordHttpRequest(method, route, statusCode, duration, requestSize, responseSize);
    }
    /**
     * LLM応答メトリクス記録
     */
    recordLLMResponse(provider, model, responseTime, inputTokens, outputTokens, cost, status) {
        metrics.recordLLMResponse(provider, model, responseTime, inputTokens, outputTokens, cost, status);
    }
    /**
     * エラーメトリクス記録
     */
    recordError(errorType, severity, service) {
        metrics.recordError(errorType, severity, service);
    }
    /**
     * RAG同期イベント記録
     */
    recordRAGSyncEvent(eventType, mimeType, status, folderId, duration) {
        metrics.recordRAGSyncEvent(eventType, mimeType, status, folderId, duration);
    }
    /**
     * RAG検索記録
     */
    recordRAGSearch(vectorStoreId, queryType, duration, resultCount, status) {
        metrics.recordRAGSearch(vectorStoreId, queryType, duration, resultCount, status);
    }
    /**
     * Webhook通知記録
     */
    recordWebhookNotification(resourceState, status) {
        metrics.recordWebhookNotification(resourceState, status);
    }
    /**
     * Webhook処理時間記録
     */
    recordWebhookProcessingDuration(duration) {
        metrics.recordWebhookProcessingDuration(duration);
    }
    /**
     * Webhookエラー記録
     */
    recordWebhookError(errorType) {
        metrics.recordWebhookError(errorType);
    }
    /**
     * Drive同期イベント記録
     */
    recordDriveSyncEvent(eventType, resourceId) {
        metrics.recordDriveSyncEvent(eventType, resourceId);
    }
    /**
     * RAGコスト記録
     */
    recordRAGCost(operation, provider, cost) {
        metrics.recordRAGCost(operation, provider, cost);
    }
    /**
     * メトリクスレジストリ取得
     */
    getMetricsRegistry() {
        return metrics.register;
    }
    /**
     * メトリクス初期化
     */
    initialize() {
        metrics.initializeMetrics();
    }
    /**
     * システム健康度チェック
     */
    getSystemHealth() {
        // 簡易的な健康度計算（実際の実装では過去データを参照）
        return {
            status: 'healthy',
            metrics: {
                totalRequests: 0,
                errorRate: 0,
                avgResponseTime: 0
            }
        };
    }
    /**
     * デバッグ情報取得
     */
    getDebugInfo() {
        const metricsArray = metrics.register.getMetricsAsArray();
        return {
            registeredMetrics: metricsArray.map(metric => metric.name),
            instanceCreated: true,
            metricsCount: metricsArray.length
        };
    }
}
exports.PrometheusClient = PrometheusClient;
exports.default = PrometheusClient;
//# sourceMappingURL=prometheus-client-class.js.map