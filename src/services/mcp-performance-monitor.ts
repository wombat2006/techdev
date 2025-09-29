/**
 * MCP Performance Monitor - 包括的MCPパフォーマンス監視システム
 *
 * 機能:
 * - リアルタイムパフォーマンス監視
 * - Prometheusメトリクス統合
 * - 自動アラート生成
 * - ダッシュボードデータ提供
 * - 最適化推奨事項
 */

import { logger } from '../utils/logger';
import { mcpIntegrationService } from './mcp-integration-service';

export interface MCPPerformanceMetrics {
  // Core Metrics
  timestamp: number;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time: number;

  // Cache Metrics
  cache_hit_rate: number;
  cache_size: number;
  cache_efficiency: number;

  // Circuit Breaker Metrics
  circuit_breaker_activations: number;
  active_circuit_breakers: string[];

  // Queue Metrics
  queue_size: number;
  queue_processing_time: number;

  // Resource Metrics
  memory_usage: number;
  cpu_usage: number;
  active_connections: number;

  // Quality Metrics
  wall_bounce_consensus_rate: number;
  average_confidence_score: number;

  // Cost Metrics
  estimated_cost_per_hour: number;
  cost_efficiency_score: number;
}

export interface MCPAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metric: string;
  current_value: number;
  threshold: number;
  timestamp: number;
  resolved: boolean;
  resolution_time?: number;
}

export interface MCPOptimizationRecommendation {
  id: string;
  category: 'performance' | 'cost' | 'reliability' | 'security';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  impact: string;
  implementation_effort: 'low' | 'medium' | 'high';
  estimated_improvement: string;
  action_items: string[];
}

export class MCPPerformanceMonitor {
  private metrics: MCPPerformanceMetrics[] = [];
  private alerts: MCPAlert[] = [];
  private recommendations: MCPOptimizationRecommendation[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertThresholds = {
    response_time_ms: 5000,      // 5秒
    error_rate: 0.05,            // 5%
    cache_hit_rate: 0.6,         // 60%
    queue_size: 10,              // 10リクエスト
    memory_usage_mb: 512,        // 512MB
    circuit_breaker_threshold: 3  // 3つ以上
  };

  constructor() {
    this.startMonitoring();
  }

  /**
   * パフォーマンス監視開始
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    logger.info('🔍 MCP Performance Monitor started', { intervalMs });

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkAlerts();
      this.generateRecommendations();
    }, intervalMs);

    // 初回実行
    this.collectMetrics();
  }

  /**
   * パフォーマンス監視停止
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('🛑 MCP Performance Monitor stopped');
    }
  }

  /**
   * メトリクス収集
   */
  private async collectMetrics(): Promise<void> {
    try {
      const integrationMetrics = mcpIntegrationService.getPerformanceMetrics();
      const systemMetrics = await this.getSystemMetrics();

      const metrics: MCPPerformanceMetrics = {
        timestamp: Date.now(),
        total_requests: integrationMetrics.totalRequests || 0,
        successful_requests: integrationMetrics.totalRequests - (integrationMetrics.totalRequests * integrationMetrics.errorRate) || 0,
        failed_requests: integrationMetrics.totalRequests * integrationMetrics.errorRate || 0,
        average_response_time: integrationMetrics.averageExecutionTime || 0,
        cache_hit_rate: integrationMetrics.cache_hit_rate || 0,
        cache_size: integrationMetrics.cache_size || 0,
        cache_efficiency: this.calculateCacheEfficiency(integrationMetrics),
        circuit_breaker_activations: integrationMetrics.circuitBreakerActivations || 0,
        active_circuit_breakers: integrationMetrics.active_circuits || [],
        queue_size: integrationMetrics.queue_size || 0,
        queue_processing_time: this.calculateQueueProcessingTime(integrationMetrics),
        memory_usage: systemMetrics.memory_usage,
        cpu_usage: systemMetrics.cpu_usage,
        active_connections: systemMetrics.active_connections,
        wall_bounce_consensus_rate: await this.getWallBounceConsensusRate(),
        average_confidence_score: await this.getAverageConfidenceScore(),
        estimated_cost_per_hour: this.estimateHourlyCost(integrationMetrics),
        cost_efficiency_score: this.calculateCostEfficiency(integrationMetrics)
      };

      this.metrics.push(metrics);

      // 過去24時間のデータのみ保持
      const cutoff = Date.now() - (24 * 60 * 60 * 1000);
      this.metrics = this.metrics.filter(m => m.timestamp > cutoff);

      logger.debug('MCP metrics collected', {
        total_requests: metrics.total_requests,
        cache_hit_rate: metrics.cache_hit_rate,
        response_time: metrics.average_response_time
      });

    } catch (error) {
      logger.error('Error collecting MCP metrics', error);
    }
  }

  /**
   * システムメトリクス取得
   */
  private async getSystemMetrics(): Promise<{
    memory_usage: number;
    cpu_usage: number;
    active_connections: number;
  }> {
    const memUsage = process.memoryUsage();

    return {
      memory_usage: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      cpu_usage: process.cpuUsage().user / 1000000, // 秒
      active_connections: 0 // プレースホルダー
    };
  }

  /**
   * アラートチェック
   */
  private checkAlerts(): void {
    if (this.metrics.length === 0) return;

    const latest = this.metrics[this.metrics.length - 1];
    const newAlerts: MCPAlert[] = [];

    // 応答時間アラート
    if (latest.average_response_time > this.alertThresholds.response_time_ms) {
      newAlerts.push(this.createAlert(
        'high_response_time',
        'high',
        'High Response Time Detected',
        `Average response time (${latest.average_response_time}ms) exceeds threshold`,
        'average_response_time',
        latest.average_response_time,
        this.alertThresholds.response_time_ms
      ));
    }

    // エラー率アラート
    const errorRate = latest.failed_requests / Math.max(latest.total_requests, 1);
    if (errorRate > this.alertThresholds.error_rate) {
      newAlerts.push(this.createAlert(
        'high_error_rate',
        'critical',
        'High Error Rate Detected',
        `Error rate (${(errorRate * 100).toFixed(1)}%) exceeds threshold`,
        'error_rate',
        errorRate,
        this.alertThresholds.error_rate
      ));
    }

    // キャッシュヒット率アラート
    if (latest.cache_hit_rate < this.alertThresholds.cache_hit_rate) {
      newAlerts.push(this.createAlert(
        'low_cache_hit_rate',
        'medium',
        'Low Cache Hit Rate',
        `Cache hit rate (${(latest.cache_hit_rate * 100).toFixed(1)}%) below optimal`,
        'cache_hit_rate',
        latest.cache_hit_rate,
        this.alertThresholds.cache_hit_rate
      ));
    }

    // キューサイズアラート
    if (latest.queue_size > this.alertThresholds.queue_size) {
      newAlerts.push(this.createAlert(
        'large_queue_size',
        'high',
        'Large Queue Size',
        `Request queue size (${latest.queue_size}) is large`,
        'queue_size',
        latest.queue_size,
        this.alertThresholds.queue_size
      ));
    }

    // メモリ使用量アラート
    if (latest.memory_usage > this.alertThresholds.memory_usage_mb) {
      newAlerts.push(this.createAlert(
        'high_memory_usage',
        'medium',
        'High Memory Usage',
        `Memory usage (${latest.memory_usage}MB) is high`,
        'memory_usage',
        latest.memory_usage,
        this.alertThresholds.memory_usage_mb
      ));
    }

    // サーキットブレーカーアラート
    if (latest.active_circuit_breakers.length >= this.alertThresholds.circuit_breaker_threshold) {
      newAlerts.push(this.createAlert(
        'multiple_circuit_breakers',
        'critical',
        'Multiple Circuit Breakers Active',
        `${latest.active_circuit_breakers.length} circuit breakers are active`,
        'circuit_breakers',
        latest.active_circuit_breakers.length,
        this.alertThresholds.circuit_breaker_threshold
      ));
    }

    // 新しいアラートを追加
    for (const alert of newAlerts) {
      // 同じタイプの未解決アラートがない場合のみ追加
      const existingAlert = this.alerts.find(a =>
        a.metric === alert.metric && !a.resolved
      );

      if (!existingAlert) {
        this.alerts.push(alert);
        logger.warn('MCP Alert generated', {
          severity: alert.severity,
          title: alert.title,
          metric: alert.metric,
          current_value: alert.current_value
        });
      }
    }
  }

  /**
   * アラート作成
   */
  private createAlert(
    id: string,
    severity: MCPAlert['severity'],
    title: string,
    description: string,
    metric: string,
    currentValue: number,
    threshold: number
  ): MCPAlert {
    return {
      id: `${id}_${Date.now()}`,
      severity,
      title,
      description,
      metric,
      current_value: currentValue,
      threshold,
      timestamp: Date.now(),
      resolved: false
    };
  }

  /**
   * 最適化推奨事項生成
   */
  private generateRecommendations(): void {
    if (this.metrics.length < 5) return; // 十分なデータが必要

    const latest = this.metrics[this.metrics.length - 1];
    const newRecommendations: MCPOptimizationRecommendation[] = [];

    // キャッシュ効率改善推奨
    if (latest.cache_hit_rate < 0.7) {
      newRecommendations.push({
        id: 'improve_cache_efficiency',
        category: 'performance',
        priority: 'high',
        title: 'Improve Cache Efficiency',
        description: 'Cache hit rate is below optimal levels',
        impact: `Potential ${((0.8 - latest.cache_hit_rate) * 100).toFixed(1)}% performance improvement`,
        implementation_effort: 'medium',
        estimated_improvement: '20-30% response time reduction',
        action_items: [
          'Increase cache TTL for stable operations',
          'Implement cache warming strategies',
          'Optimize cache key generation'
        ]
      });
    }

    // レスポンス時間最適化推奨
    if (latest.average_response_time > 3000) {
      newRecommendations.push({
        id: 'optimize_response_time',
        category: 'performance',
        priority: 'high',
        title: 'Optimize Response Time',
        description: 'Average response time exceeds 3 seconds',
        impact: 'Improved user experience and system throughput',
        implementation_effort: 'high',
        estimated_improvement: '40-50% response time reduction',
        action_items: [
          'Enable request batching for similar operations',
          'Implement connection pooling',
          'Optimize database queries',
          'Add response compression'
        ]
      });
    }

    // コスト効率改善推奨
    if (latest.cost_efficiency_score < 0.6) {
      newRecommendations.push({
        id: 'improve_cost_efficiency',
        category: 'cost',
        priority: 'medium',
        title: 'Improve Cost Efficiency',
        description: 'Cost efficiency is below optimal levels',
        impact: `Potential cost reduction of ${((1 - latest.cost_efficiency_score) * 30).toFixed(0)}%`,
        implementation_effort: 'medium',
        estimated_improvement: '15-25% cost reduction',
        action_items: [
          'Implement intelligent model selection',
          'Optimize token usage',
          'Use caching for repeated queries',
          'Enable request batching'
        ]
      });
    }

    // 新しい推奨事項を追加（重複回避）
    for (const rec of newRecommendations) {
      const existing = this.recommendations.find(r => r.id === rec.id);
      if (!existing) {
        this.recommendations.push(rec);
        logger.info('MCP Optimization recommendation generated', {
          category: rec.category,
          priority: rec.priority,
          title: rec.title
        });
      }
    }

    // 古い推奨事項を削除（7日以上）
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
    this.recommendations = this.recommendations.filter(r =>
      Date.now() - parseInt(r.id.split('_').pop() || '0') < cutoff
    );
  }

  /**
   * ヘルパーメソッド
   */
  private calculateCacheEfficiency(metrics: any): number {
    if (!metrics.cache_hit_rate) return 0;
    return Math.min(metrics.cache_hit_rate * 1.2, 1.0); // ボーナス計算
  }

  private calculateQueueProcessingTime(metrics: any): number {
    return metrics.queue_size * 100; // 推定処理時間（ms）
  }

  private async getWallBounceConsensusRate(): Promise<number> {
    // Wall-Bounce分析システムからコンセンサス率を取得
    // プレースホルダー実装
    return 0.75;
  }

  private async getAverageConfidenceScore(): Promise<number> {
    // Wall-Bounce分析システムから平均信頼度スコアを取得
    // プレースホルダー実装
    return 0.82;
  }

  private estimateHourlyCost(metrics: any): number {
    const requestsPerHour = (metrics.totalRequests || 0) * 120; // 30秒間隔から1時間に外挿
    return requestsPerHour * 0.001; // リクエストあたり$0.001と仮定
  }

  private calculateCostEfficiency(metrics: any): number {
    const successRate = 1 - (metrics.errorRate || 0);
    const cacheBonus = (metrics.cache_hit_rate || 0) * 0.3;
    return Math.min(successRate + cacheBonus, 1.0);
  }

  /**
   * パブリックメソッド
   */

  /**
   * 最新のメトリクスを取得
   */
  getLatestMetrics(): MCPPerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * 時系列メトリクスを取得
   */
  getTimeSeriesMetrics(hours: number = 1): MCPPerformanceMetrics[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  /**
   * アクティブなアラートを取得
   */
  getActiveAlerts(): MCPAlert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  /**
   * 最適化推奨事項を取得
   */
  getRecommendations(category?: string): MCPOptimizationRecommendation[] {
    if (category) {
      return this.recommendations.filter(r => r.category === category);
    }
    return this.recommendations;
  }

  /**
   * アラートを解決
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolution_time = Date.now();
      logger.info('MCP Alert resolved', { alertId, title: alert.title });
      return true;
    }
    return false;
  }

  /**
   * パフォーマンスサマリーを取得
   */
  getPerformanceSummary(): {
    overall_health: 'excellent' | 'good' | 'warning' | 'critical';
    active_alerts_count: number;
    recommendations_count: number;
    cache_hit_rate: number;
    average_response_time: number;
    error_rate: number;
    cost_efficiency: number;
  } {
    const latest = this.getLatestMetrics();
    const activeAlerts = this.getActiveAlerts();

    let health: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';

    if (activeAlerts.some(a => a.severity === 'critical')) {
      health = 'critical';
    } else if (activeAlerts.some(a => a.severity === 'high')) {
      health = 'warning';
    } else if (activeAlerts.length > 0) {
      health = 'good';
    }

    return {
      overall_health: health,
      active_alerts_count: activeAlerts.length,
      recommendations_count: this.recommendations.length,
      cache_hit_rate: latest?.cache_hit_rate || 0,
      average_response_time: latest?.average_response_time || 0,
      error_rate: latest ? (latest.failed_requests / Math.max(latest.total_requests, 1)) : 0,
      cost_efficiency: latest?.cost_efficiency_score || 0
    };
  }

  /**
   * メトリクスリセット
   */
  resetMetrics(): void {
    this.metrics = [];
    this.alerts = [];
    this.recommendations = [];
    logger.info('MCP Performance Monitor metrics reset');
  }
}

// シングルトンインスタンス
export const mcpPerformanceMonitor = new MCPPerformanceMonitor();

export default mcpPerformanceMonitor;