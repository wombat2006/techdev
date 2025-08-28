/**
 * TechSapo Prometheus Client Class
 * シングルトンクラスでメトリクス管理を統一
 */

import * as metrics from './prometheus-client';
import { logger } from '../utils/logger';

export class PrometheusClient {
  private static instance: PrometheusClient;

  private constructor() {
    // シングルトンパターン
  }

  public static getInstance(): PrometheusClient {
    if (!PrometheusClient.instance) {
      PrometheusClient.instance = new PrometheusClient();
      logger.info('📊 PrometheusClient シングルトンインスタンス作成');
    }
    return PrometheusClient.instance;
  }

  /**
   * 壁打ち分析メトリクス記録
   */
  recordWallBounceAnalysis(
    taskType: string,
    providers: string[],
    confidence: number,
    processingTime: number,
    totalCost: number,
    status: 'success' | 'error' | 'timeout'
  ): void {
    metrics.recordWallBounceAnalysis(taskType, providers, confidence, processingTime, totalCost, status);
  }

  /**
   * HTTP リクエストメトリクス記録
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    requestSize?: number,
    responseSize?: number
  ): void {
    metrics.recordHttpRequest(method, route, statusCode, duration, requestSize, responseSize);
  }

  /**
   * LLM応答メトリクス記録
   */
  recordLLMResponse(
    provider: string,
    model: string,
    responseTime: number,
    inputTokens: number,
    outputTokens: number,
    cost: number,
    status: 'success' | 'error' | 'timeout'
  ): void {
    metrics.recordLLMResponse(provider, model, responseTime, inputTokens, outputTokens, cost, status);
  }

  /**
   * エラーメトリクス記録
   */
  recordError(
    errorType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    service: string
  ): void {
    metrics.recordError(errorType, severity, service);
  }

  /**
   * RAG同期イベント記録
   */
  recordRAGSyncEvent(
    eventType: string,
    mimeType: string,
    status: string,
    folderId?: string,
    duration?: number
  ): void {
    metrics.recordRAGSyncEvent(eventType, mimeType, status, folderId, duration);
  }

  /**
   * RAG検索記録
   */
  recordRAGSearch(
    vectorStoreId: string,
    queryType: string,
    duration: number,
    resultCount: number,
    status: string
  ): void {
    metrics.recordRAGSearch(vectorStoreId, queryType, duration, resultCount, status);
  }

  /**
   * Webhook通知記録
   */
  recordWebhookNotification(resourceState: string, status: string): void {
    metrics.recordWebhookNotification(resourceState, status);
  }

  /**
   * Webhook処理時間記録
   */
  recordWebhookProcessingDuration(duration: number): void {
    metrics.recordWebhookProcessingDuration(duration);
  }

  /**
   * Webhookエラー記録
   */
  recordWebhookError(errorType: string): void {
    metrics.recordWebhookError(errorType);
  }

  /**
   * Drive同期イベント記録
   */
  recordDriveSyncEvent(eventType: string, resourceId: string): void {
    metrics.recordDriveSyncEvent(eventType, resourceId);
  }

  /**
   * RAGコスト記録
   */
  recordRAGCost(operation: string, provider: string, cost: number): void {
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
  initialize(): void {
    metrics.initializeMetrics();
  }

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
  } {
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
  getDebugInfo(): {
    registeredMetrics: string[];
    instanceCreated: boolean;
    metricsCount: number;
  } {
    const metricsArray = metrics.register.getMetricsAsArray();
    
    return {
      registeredMetrics: metricsArray.map(metric => metric.name),
      instanceCreated: true,
      metricsCount: metricsArray.length
    };
  }
}

export default PrometheusClient;