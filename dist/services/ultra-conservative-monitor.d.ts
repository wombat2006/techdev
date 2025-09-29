/**
 * Ultra-Conservative Monitor for Gradual Phase 3
 * 段階的移行 (1% → 2% → 5%) のための超保守的監視システム
 *
 * 特徴:
 * - 段階ごとに異なる厳格な閾値
 * - 早期警告システム
 * - 自動降格機能（5% → 2% → 1%）
 * - 複数の承認ゲート
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
export type PhaseLevel = '1percent' | '2percent' | '5percent';
export interface PhaseConfiguration {
    level: PhaseLevel;
    trafficPercentage: number;
    description: string;
    thresholds: {
        errorRate: {
            warning: number;
            critical: number;
            emergency: number;
        };
        latency: {
            warning: number;
            critical: number;
            emergency: number;
        };
        memory: {
            warning: number;
            critical: number;
            emergency: number;
        };
        consensus: {
            minWarning: number;
            minCritical: number;
            minEmergency: number;
        };
    };
    stabilityRequirements: {
        minDurationHours: number;
        requiredStabilityHours: number;
        evaluationIntervalMinutes: number;
    };
}
export interface ConservativeMetrics {
    timestamp: Date;
    phase: PhaseLevel;
    totalRequests: number;
    srpRequests: number;
    errorCount: number;
    srpErrorCount: number;
    avgLatency: number;
    p95Latency: number;
    p99Latency: number;
    memoryUsagePercent: number;
    consensusSuccessRate: number;
    averageConfidence: number;
    providerFailures: Record<string, number>;
    errorRate: number;
    srpErrorRate: number;
    latencyFromBaseline: number;
    stabilityScore: number;
}
export interface SafetyEvaluation {
    phase: PhaseLevel;
    status: 'healthy' | 'warning' | 'critical' | 'emergency';
    canProgressToNext: boolean;
    shouldRollbackToPrevious: boolean;
    shouldEmergencyStop: boolean;
    issues: string[];
    positiveIndicators: string[];
    recommendations: string[];
    timeToNextEvaluation: number;
    requiredStabilityRemaining: number;
}
export declare class UltraConservativeMonitor extends EventEmitter {
    private static instance;
    private phases;
    private currentPhase;
    private phaseStartTime?;
    private baselineMetrics?;
    private metricsHistory;
    private monitoringInterval?;
    private evaluationCount;
    private constructor();
    static getInstance(): UltraConservativeMonitor;
    private initializePhaseConfigurations;
    setBaselineMetrics(): Promise<void>;
    requestPhaseTransition(targetPhase: PhaseLevel): Promise<boolean>;
    private performPreTransitionSafetyCheck;
    transitionToPhase(newPhase: PhaseLevel): Promise<void>;
    private startPhaseMonitoring;
    private performConservativeEvaluation;
    private collectCurrentMetrics;
    private calculateStabilityScore;
    private calculateVariance;
    private evaluatePhaseHealth;
    private executeEmergencyStop;
    private executeRollbackToPrevious;
    private getPreviousPhase;
    private getCurrentTrafficPercentage;
    getStatus(): object;
}
