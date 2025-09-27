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
import { EventEmitter } from 'events';
export interface SafetyThresholds {
    warningErrorRate: number;
    criticalErrorRate: number;
    warningLatency: number;
    criticalLatency: number;
    warningMemory: number;
    criticalMemory: number;
    minConsensusConfidence: number;
    minAgreementScore: number;
}
export interface SafetyMetrics {
    timestamp: Date;
    totalRequests: number;
    srpRequests: number;
    errorCount: number;
    srpErrorCount: number;
    avgLatency: number;
    srpAvgLatency: number;
    memoryUsagePercent: number;
    consensusSuccessRate: number;
    averageConfidence: number;
    providersHealthy: number;
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
export declare class SRPSafetyMonitor extends EventEmitter {
    private static instance;
    private thresholds;
    private metricsHistory;
    private alertHistory;
    private monitoringInterval?;
    private isEmergencyMode;
    private constructor();
    static getInstance(): SRPSafetyMonitor;
    private loadSafetyThresholds;
    startMonitoring(): void;
    stopMonitoring(): void;
    private performSafetyCheck;
    private collectCurrentMetrics;
    private getRecentMetrics;
    private calculateAverageLatency;
    private calculate5MinuteErrorRate;
    private evaluateErrorRates;
    private evaluateLatency;
    private evaluateMemoryUsage;
    private evaluateConsensusQuality;
    private emitAlert;
    private getActionRequiredForAlert;
    private handleWarning;
    private handleCritical;
    private handleEmergency;
    private sendCriticalAlertNotification;
    private executeEmergencyRollback;
    getStatusReport(): object;
}
