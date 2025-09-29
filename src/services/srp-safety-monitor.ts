/**
 * SRP Safety Monitor
 * Phase 3 (5%) テスト用の自動安全監視システム
 *
 * 機能:
 * - リアルタイムメトリクス監視
 * - 自動閾値チェック
 * - 緊急時自動ロールバック
 * - アラート通知
 */

import { logger } from '../utils/logger';
import { emergencyDisableSRP } from '../config/feature-flags';
import { EventEmitter } from 'events';

export interface SafetyThresholds {
  // Error rate thresholds
  warningErrorRate: number;      // 0.01 = 1%
  criticalErrorRate: number;     // 0.05 = 5%

  // Latency thresholds (milliseconds)
  warningLatency: number;        // 5000ms
  criticalLatency: number;       // 8000ms

  // Memory usage thresholds (percentage)
  warningMemory: number;         // 80%
  criticalMemory: number;        // 95%

  // Consensus quality thresholds
  minConsensusConfidence: number; // 0.6
  minAgreementScore: number;      // 0.7
}

export interface SafetyMetrics {
  timestamp: Date;

  // Request metrics
  totalRequests: number;
  srpRequests: number;
  errorCount: number;
  srpErrorCount: number;

  // Performance metrics
  avgLatency: number;
  srpAvgLatency: number;
  memoryUsagePercent: number;

  // SRP specific metrics
  consensusSuccessRate: number;
  averageConfidence: number;
  providersHealthy: number;

  // Calculated rates
  errorRate: number;
  srpErrorRate: number;
  srp5MinuteErrorRate: number;
}

export interface SafetyAlert {
  level: 'info' | 'warning' | 'critical' | 'emergency';
  category: 'error_rate' | 'latency' | 'memory' | 'consensus' | 'system';
  message: string;
  metrics: Partial<SafetyMetrics>;
  timestamp: Date;
  actionRequired?: string;
}

export class SRPSafetyMonitor extends EventEmitter {
  private static instance: SRPSafetyMonitor;
  private thresholds: SafetyThresholds;
  private metricsHistory: SafetyMetrics[] = [];
  private alertHistory: SafetyAlert[] = [];
  private monitoringInterval?: ReturnType<typeof setInterval>;
  private isEmergencyMode = false;

  private constructor() {
    super();

    this.thresholds = this.loadSafetyThresholds();

    // Set up event listeners
    this.on('warning', this.handleWarning.bind(this));
    this.on('critical', this.handleCritical.bind(this));
    this.on('emergency', this.handleEmergency.bind(this));

    logger.info('🛡️ SRP Safety Monitor initialized', {
      phase: 'phase3_5percent',
      thresholds: this.thresholds
    });
  }

  public static getInstance(): SRPSafetyMonitor {
    if (!SRPSafetyMonitor.instance) {
      SRPSafetyMonitor.instance = new SRPSafetyMonitor();
    }
    return SRPSafetyMonitor.instance;
  }

  private loadSafetyThresholds(): SafetyThresholds {
    return {
      warningErrorRate: parseFloat(process.env.SRP_ERROR_RATE_THRESHOLD || '0.01'),
      criticalErrorRate: parseFloat(process.env.AUTO_ROLLBACK_ERROR_RATE || '0.05'),

      warningLatency: parseInt(process.env.SRP_LATENCY_THRESHOLD_MS || '5000'),
      criticalLatency: parseInt(process.env.AUTO_ROLLBACK_LATENCY_MS || '8000'),

      warningMemory: parseInt(process.env.SRP_MEMORY_USAGE_THRESHOLD || '80'),
      criticalMemory: 95,

      minConsensusConfidence: 0.6,
      minAgreementScore: 0.7
    };
  }

  public startMonitoring(): void {
    if (this.monitoringInterval) {
      logger.warn('⚠️ Safety monitor already running');
      return;
    }

    logger.info('🚀 Starting SRP Safety Monitor for Phase 3', {
      monitoringInterval: '30 seconds',
      autoRollbackEnabled: process.env.AUTO_ROLLBACK_ON_ERROR_SPIKE === 'true'
    });

    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.performSafetyCheck();
    }, 30000);

    // Initial safety check
    this.performSafetyCheck();
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      logger.info('🛑 SRP Safety Monitor stopped');
    }
  }

  private async performSafetyCheck(): Promise<void> {
    try {
      const metrics = await this.collectCurrentMetrics();
      this.metricsHistory.push(metrics);

      // Keep only last 100 entries (50 minutes of history)
      if (this.metricsHistory.length > 100) {
        this.metricsHistory = this.metricsHistory.slice(-100);
      }

      // Perform safety evaluations
      this.evaluateErrorRates(metrics);
      this.evaluateLatency(metrics);
      this.evaluateMemoryUsage(metrics);
      this.evaluateConsensusQuality(metrics);

      logger.debug('🔍 Safety check completed', {
        timestamp: metrics.timestamp,
        errorRate: metrics.errorRate,
        avgLatency: metrics.avgLatency,
        memoryUsage: metrics.memoryUsagePercent
      });

    } catch (error) {
      logger.error('❌ Safety check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // If safety checks are failing, this could be a problem
      this.emitAlert('warning', 'system', 'Safety monitoring system failure', {});
    }
  }

  private async collectCurrentMetrics(): Promise<SafetyMetrics> {
    // This would integrate with actual metrics collection
    // For now, simulating with process metrics and log analysis

    const memoryUsage = process.memoryUsage();
    const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    // In real implementation, this would collect from:
    // - Prometheus metrics
    // - Application logs
    // - Performance monitoring systems

    const now = new Date();
    const recentMetrics = this.getRecentMetrics(5); // Last 5 minutes

    const totalRequests = recentMetrics.reduce((sum, m) => sum + m.totalRequests, 0);
    const srpRequests = recentMetrics.reduce((sum, m) => sum + m.srpRequests, 0);
    const errorCount = recentMetrics.reduce((sum, m) => sum + m.errorCount, 0);

    return {
      timestamp: now,
      totalRequests,
      srpRequests,
      errorCount,
      srpErrorCount: Math.floor(errorCount * 0.1), // Assume 10% of errors are SRP-related
      avgLatency: this.calculateAverageLatency(recentMetrics),
      srpAvgLatency: this.calculateAverageLatency(recentMetrics) * 1.1, // SRP slightly higher
      memoryUsagePercent: Math.round(memoryPercent),
      consensusSuccessRate: 0.95, // Would be calculated from actual consensus data
      averageConfidence: 0.78,    // Would be calculated from actual confidence scores
      providersHealthy: 4,        // Number of healthy LLM providers
      errorRate: totalRequests > 0 ? errorCount / totalRequests : 0,
      srpErrorRate: srpRequests > 0 ? Math.floor(errorCount * 0.1) / srpRequests : 0,
      srp5MinuteErrorRate: this.calculate5MinuteErrorRate()
    };
  }

  private getRecentMetrics(minutes: number): SafetyMetrics[] {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
    return this.metricsHistory.filter(m => m.timestamp >= cutoffTime);
  }

  private calculateAverageLatency(metrics: SafetyMetrics[]): number {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((total, m) => total + m.avgLatency, 0);
    return Math.round(sum / metrics.length);
  }

  private calculate5MinuteErrorRate(): number {
    const recentMetrics = this.getRecentMetrics(5);
    if (recentMetrics.length === 0) return 0;

    const totalRequests = recentMetrics.reduce((sum, m) => sum + m.srpRequests, 0);
    const totalErrors = recentMetrics.reduce((sum, m) => sum + m.srpErrorCount, 0);

    return totalRequests > 0 ? totalErrors / totalRequests : 0;
  }

  private evaluateErrorRates(metrics: SafetyMetrics): void {
    // Current error rate check
    if (metrics.errorRate >= this.thresholds.criticalErrorRate) {
      this.emitAlert('emergency', 'error_rate',
        `Critical error rate: ${(metrics.errorRate * 100).toFixed(2)}%`,
        metrics);
    } else if (metrics.errorRate >= this.thresholds.warningErrorRate) {
      this.emitAlert('warning', 'error_rate',
        `High error rate: ${(metrics.errorRate * 100).toFixed(2)}%`,
        metrics);
    }

    // 5-minute error rate trend
    if (metrics.srp5MinuteErrorRate >= this.thresholds.criticalErrorRate * 0.8) {
      this.emitAlert('critical', 'error_rate',
        `Sustained high SRP error rate over 5 minutes: ${(metrics.srp5MinuteErrorRate * 100).toFixed(2)}%`,
        metrics);
    }
  }

  private evaluateLatency(metrics: SafetyMetrics): void {
    if (metrics.srpAvgLatency >= this.thresholds.criticalLatency) {
      this.emitAlert('critical', 'latency',
        `Critical SRP latency: ${metrics.srpAvgLatency}ms`,
        metrics);
    } else if (metrics.srpAvgLatency >= this.thresholds.warningLatency) {
      this.emitAlert('warning', 'latency',
        `High SRP latency: ${metrics.srpAvgLatency}ms`,
        metrics);
    }
  }

  private evaluateMemoryUsage(metrics: SafetyMetrics): void {
    if (metrics.memoryUsagePercent >= this.thresholds.criticalMemory) {
      this.emitAlert('emergency', 'memory',
        `Critical memory usage: ${metrics.memoryUsagePercent}%`,
        metrics);
    } else if (metrics.memoryUsagePercent >= this.thresholds.warningMemory) {
      this.emitAlert('warning', 'memory',
        `High memory usage: ${metrics.memoryUsagePercent}%`,
        metrics);
    }
  }

  private evaluateConsensusQuality(metrics: SafetyMetrics): void {
    if (metrics.averageConfidence < this.thresholds.minConsensusConfidence) {
      this.emitAlert('warning', 'consensus',
        `Low consensus confidence: ${metrics.averageConfidence.toFixed(2)}`,
        metrics);
    }

    if (metrics.consensusSuccessRate < 0.8) {
      this.emitAlert('critical', 'consensus',
        `Low consensus success rate: ${(metrics.consensusSuccessRate * 100).toFixed(1)}%`,
        metrics);
    }
  }

  private emitAlert(level: SafetyAlert['level'], category: SafetyAlert['category'], message: string, metrics: Partial<SafetyMetrics>): void {
    const alert: SafetyAlert = {
      level,
      category,
      message,
      metrics,
      timestamp: new Date(),
      actionRequired: this.getActionRequiredForAlert(level, category)
    };

    this.alertHistory.push(alert);

    // Keep only last 50 alerts
    if (this.alertHistory.length > 50) {
      this.alertHistory = this.alertHistory.slice(-50);
    }

    this.emit(level, alert);
  }

  private getActionRequiredForAlert(level: SafetyAlert['level'], category: SafetyAlert['category']): string {
    if (category === 'system' && level !== 'info') {
      return 'Initiate infrastructure diagnostic runbook';
    }
    switch (level) {
      case 'emergency':
        return 'IMMEDIATE AUTO-ROLLBACK';
      case 'critical':
        return 'Evaluate for manual rollback';
      case 'warning':
        return 'Increase monitoring frequency';
      case 'info':
      default:
        return 'Monitor and log';
    }
  }

  private handleWarning(alert: SafetyAlert): void {
    logger.warn(`⚠️ SRP Safety Warning: ${alert.message}`, {
      category: alert.category,
      metrics: alert.metrics,
      actionRequired: alert.actionRequired
    });
  }

  private handleCritical(alert: SafetyAlert): void {
    logger.error(`🚨 SRP Safety Critical Alert: ${alert.message}`, {
      category: alert.category,
      metrics: alert.metrics,
      actionRequired: alert.actionRequired
    });

    // Send notifications to monitoring systems
    this.sendCriticalAlertNotification(alert);
  }

  private async handleEmergency(alert: SafetyAlert): Promise<void> {
    logger.error(`💥 SRP EMERGENCY: ${alert.message}`, {
      category: alert.category,
      metrics: alert.metrics,
      actionRequired: alert.actionRequired
    });

    if (!this.isEmergencyMode) {
      this.isEmergencyMode = true;

      // Execute emergency rollback
      await this.executeEmergencyRollback(alert);
    }
  }

  private sendCriticalAlertNotification(alert: SafetyAlert): void {
    // Integration with notification systems (Slack, email, etc.)
    // For now, just enhanced logging
    logger.error('📢 CRITICAL ALERT NOTIFICATION', {
      alert,
      phase: 'phase3_5percent',
      recommendation: 'Consider immediate intervention'
    });
  }

  private async executeEmergencyRollback(alert: SafetyAlert): Promise<void> {
    try {
      logger.error('🚨 EXECUTING EMERGENCY SRP ROLLBACK');

      // Disable SRP immediately
      emergencyDisableSRP();

      // Log the emergency rollback
      const rollbackRecord = {
        timestamp: new Date().toISOString(),
        trigger: alert,
        phase: 'phase3_5percent',
        cause: 'Automated safety system',
        metricsAtRollback: alert.metrics
      };

      // Save rollback details (in real implementation, this would go to persistent storage)
      logger.error('💾 Emergency rollback executed', rollbackRecord);

      // Stop monitoring since SRP is now disabled
      this.stopMonitoring();

      // Emit notification
      this.emit('rollback-executed', rollbackRecord);

      logger.error('✅ Emergency rollback completed successfully');

    } catch (error) {
      logger.error('❌ Emergency rollback failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        originalAlert: alert
      });
    }
  }

  public getStatusReport(): object {
    const latestMetrics = this.metricsHistory[this.metricsHistory.length - 1];
    const recentAlerts = this.alertHistory.slice(-10);

    return {
      monitoringActive: !!this.monitoringInterval,
      emergencyMode: this.isEmergencyMode,
      latestMetrics,
      recentAlerts,
      thresholds: this.thresholds,
      metricsHistoryCount: this.metricsHistory.length,
      alertHistoryCount: this.alertHistory.length
    };
  }
}
