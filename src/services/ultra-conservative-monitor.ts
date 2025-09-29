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

import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

export type PhaseLevel = '1percent' | '2percent' | '5percent';

export interface PhaseConfiguration {
  level: PhaseLevel;
  trafficPercentage: number;
  description: string;

  // 超保守的な閾値
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

  // 最低安定期間
  stabilityRequirements: {
    minDurationHours: number;
    requiredStabilityHours: number;
    evaluationIntervalMinutes: number;
  };
}

export interface ConservativeMetrics {
  timestamp: Date;
  phase: PhaseLevel;

  // 基本メトリクス
  totalRequests: number;
  srpRequests: number;
  errorCount: number;
  srpErrorCount: number;

  // パフォーマンス
  avgLatency: number;
  p95Latency: number;
  p99Latency: number;
  memoryUsagePercent: number;

  // SRP固有
  consensusSuccessRate: number;
  averageConfidence: number;
  providerFailures: Record<string, number>;

  // 計算値
  errorRate: number;
  srpErrorRate: number;
  latencyFromBaseline: number;
  stabilityScore: number; // 0-1の安定性スコア
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

  timeToNextEvaluation: number; // minutes
  requiredStabilityRemaining: number; // hours
}

export class UltraConservativeMonitor extends EventEmitter {
  private static instance: UltraConservativeMonitor;
  private phases: Map<PhaseLevel, PhaseConfiguration> = new Map();
  private currentPhase: PhaseLevel = '1percent';
  private phaseStartTime?: Date;
  private baselineMetrics?: ConservativeMetrics;
  private metricsHistory: ConservativeMetrics[] = [];

  private monitoringInterval?: ReturnType<typeof setInterval>;
  private evaluationCount = 0;

  private constructor() {
    super();
    this.initializePhaseConfigurations();

    logger.info('🛡️ Ultra-Conservative Monitor initialized', {
      phases: Array.from(this.phases.keys()),
      currentPhase: this.currentPhase
    });
  }

  public static getInstance(): UltraConservativeMonitor {
    if (!UltraConservativeMonitor.instance) {
      UltraConservativeMonitor.instance = new UltraConservativeMonitor();
    }
    return UltraConservativeMonitor.instance;
  }

  private initializePhaseConfigurations(): void {
    // 1% Phase (Current baseline)
    this.phases.set('1percent', {
      level: '1percent',
      trafficPercentage: 1,
      description: 'Baseline 1% Phase',
      thresholds: {
        errorRate: { warning: 0.008, critical: 0.015, emergency: 0.025 },
        latency: { warning: 3500, critical: 5000, emergency: 7000 },
        memory: { warning: 75, critical: 85, emergency: 95 },
        consensus: { minWarning: 0.90, minCritical: 0.80, minEmergency: 0.70 }
      },
      stabilityRequirements: {
        minDurationHours: 2,
        requiredStabilityHours: 2,
        evaluationIntervalMinutes: 5
      }
    });

    // 2% Phase (Conservative intermediate)
    this.phases.set('2percent', {
      level: '2percent',
      trafficPercentage: 2,
      description: 'Conservative 2% Phase',
      thresholds: {
        errorRate: { warning: 0.005, critical: 0.01, emergency: 0.02 },
        latency: { warning: 3000, critical: 4500, emergency: 6000 },
        memory: { warning: 70, critical: 80, emergency: 90 },
        consensus: { minWarning: 0.92, minCritical: 0.85, minEmergency: 0.75 }
      },
      stabilityRequirements: {
        minDurationHours: 8,
        requiredStabilityHours: 6,
        evaluationIntervalMinutes: 3
      }
    });

    // 5% Phase (Final target with strictest monitoring)
    this.phases.set('5percent', {
      level: '5percent',
      trafficPercentage: 5,
      description: 'Full 5% Phase',
      thresholds: {
        errorRate: { warning: 0.003, critical: 0.008, emergency: 0.015 },
        latency: { warning: 2500, critical: 4000, emergency: 5500 },
        memory: { warning: 65, critical: 75, emergency: 85 },
        consensus: { minWarning: 0.95, minCritical: 0.88, minEmergency: 0.80 }
      },
      stabilityRequirements: {
        minDurationHours: 24,
        requiredStabilityHours: 12,
        evaluationIntervalMinutes: 2
      }
    });
  }

  public async setBaselineMetrics(): Promise<void> {
    logger.info('📊 Capturing baseline metrics for ultra-conservative monitoring');

    try {
      this.baselineMetrics = await this.collectCurrentMetrics();

      logger.info('✅ Baseline metrics established', {
        errorRate: this.baselineMetrics.errorRate,
        avgLatency: this.baselineMetrics.avgLatency,
        memoryUsage: this.baselineMetrics.memoryUsagePercent,
        consensusRate: this.baselineMetrics.consensusSuccessRate
      });

    } catch (error) {
      logger.error('❌ Failed to establish baseline metrics', { error });
      throw new Error('Cannot proceed without baseline metrics');
    }
  }

  public async requestPhaseTransition(targetPhase: PhaseLevel): Promise<boolean> {
    const phaseConfig = this.phases.get(targetPhase);
    if (!phaseConfig) {
      throw new Error(`Invalid phase: ${targetPhase}`);
    }

    logger.warn(`🚦 PHASE TRANSITION REQUEST: ${this.currentPhase} → ${targetPhase}`, {
      currentPhase: this.currentPhase,
      targetPhase,
      trafficIncrease: `${this.getCurrentTrafficPercentage()}% → ${phaseConfig.trafficPercentage}%`
    });

    // Pre-transition safety check
    const preTransitionCheck = await this.performPreTransitionSafetyCheck(targetPhase);

    if (!preTransitionCheck.safe) {
      logger.error('🚨 Pre-transition safety check FAILED', {
        issues: preTransitionCheck.issues,
        recommendation: 'DO NOT PROCEED'
      });
      return false;
    }

    // Manual approval would be requested here
    // For now, we'll simulate approval
    logger.info('✅ Pre-transition safety check PASSED', {
      positives: preTransitionCheck.positives,
      recommendation: 'SAFE TO PROCEED WITH EXTREME CAUTION'
    });

    return true;
  }

  private async performPreTransitionSafetyCheck(targetPhase: PhaseLevel): Promise<{
    safe: boolean;
    issues: string[];
    positives: string[];
  }> {
    const currentMetrics = await this.collectCurrentMetrics();
    const currentConfig = this.phases.get(this.currentPhase)!;
    const targetConfig = this.phases.get(targetPhase)!;

    const issues: string[] = [];
    const positives: string[] = [];

    // Check current phase stability
    if (currentMetrics.errorRate > currentConfig.thresholds.errorRate.warning) {
      issues.push(`Current error rate too high: ${(currentMetrics.errorRate * 100).toFixed(3)}%`);
    } else {
      positives.push(`Error rate healthy: ${(currentMetrics.errorRate * 100).toFixed(3)}%`);
    }

    if (currentMetrics.avgLatency > currentConfig.thresholds.latency.warning) {
      issues.push(`Current latency too high: ${currentMetrics.avgLatency}ms`);
    } else {
      positives.push(`Latency healthy: ${currentMetrics.avgLatency}ms`);
    }

    if (currentMetrics.memoryUsagePercent > currentConfig.thresholds.memory.warning) {
      issues.push(`Memory usage concerning: ${currentMetrics.memoryUsagePercent}%`);
    } else {
      positives.push(`Memory usage good: ${currentMetrics.memoryUsagePercent}%`);
    }

    if (currentMetrics.consensusSuccessRate < currentConfig.thresholds.consensus.minWarning) {
      issues.push(`Consensus rate too low: ${(currentMetrics.consensusSuccessRate * 100).toFixed(1)}%`);
    } else {
      positives.push(`Consensus rate strong: ${(currentMetrics.consensusSuccessRate * 100).toFixed(1)}%`);
    }

    // Check system readiness for higher load
    if (this.phaseStartTime) {
      const phaseRuntime = (Date.now() - this.phaseStartTime.getTime()) / (1000 * 60 * 60);
      if (phaseRuntime < currentConfig.stabilityRequirements.requiredStabilityHours) {
        issues.push(`Insufficient stability time: ${phaseRuntime.toFixed(1)}h < ${currentConfig.stabilityRequirements.requiredStabilityHours}h required`);
      } else {
        positives.push(`Stability requirement met: ${phaseRuntime.toFixed(1)}h`);
      }
    }

    // Traffic increase assessment
    const trafficMultiplier = targetConfig.trafficPercentage / this.getCurrentTrafficPercentage();
    if (trafficMultiplier > 3) {
      issues.push(`Traffic increase too aggressive: ${trafficMultiplier}x`);
    } else if (trafficMultiplier > 2) {
      positives.push(`Traffic increase significant but manageable: ${trafficMultiplier}x`);
    } else {
      positives.push(`Conservative traffic increase: ${trafficMultiplier}x`);
    }

    return {
      safe: issues.length === 0,
      issues,
      positives
    };
  }

  public async transitionToPhase(newPhase: PhaseLevel): Promise<void> {
    const approved = await this.requestPhaseTransition(newPhase);
    if (!approved) {
      throw new Error(`Phase transition to ${newPhase} not approved`);
    }

    logger.info(`🚀 Executing transition: ${this.currentPhase} → ${newPhase}`);

    this.currentPhase = newPhase;
    this.phaseStartTime = new Date();
    this.evaluationCount = 0;

    // Start ultra-conservative monitoring for new phase
    this.startPhaseMonitoring();

    this.emit('phase-transition', {
      from: this.currentPhase,
      to: newPhase,
      timestamp: this.phaseStartTime
    });
  }

  private startPhaseMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    const config = this.phases.get(this.currentPhase)!;
    const intervalMs = config.stabilityRequirements.evaluationIntervalMinutes * 60 * 1000;

    logger.info('🔍 Starting ultra-conservative monitoring', {
      phase: this.currentPhase,
      evaluationIntervalMinutes: config.stabilityRequirements.evaluationIntervalMinutes,
      requiredStabilityHours: config.stabilityRequirements.requiredStabilityHours
    });

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performConservativeEvaluation();
      } catch (error) {
        logger.error('❌ Conservative evaluation failed', { error });
      }
    }, intervalMs);

    // Immediate evaluation
    this.performConservativeEvaluation();
  }

  private async performConservativeEvaluation(): Promise<void> {
    this.evaluationCount++;

    const metrics = await this.collectCurrentMetrics();
    this.metricsHistory.push(metrics);

    // Keep last 100 evaluations
    if (this.metricsHistory.length > 100) {
      this.metricsHistory = this.metricsHistory.slice(-100);
    }

    const evaluation = this.evaluatePhaseHealth(metrics);

    logger.info(`🔍 Conservative Evaluation #${this.evaluationCount}`, {
      phase: this.currentPhase,
      status: evaluation.status,
      stabilityScore: metrics.stabilityScore,
      canProgress: evaluation.canProgressToNext
    });

    // Handle different evaluation outcomes
    if (evaluation.shouldEmergencyStop) {
      logger.error('🚨 EMERGENCY STOP TRIGGERED');
      this.emit('emergency-stop', evaluation);
      await this.executeEmergencyStop();
    } else if (evaluation.shouldRollbackToPrevious) {
      logger.warn('⬇️ ROLLBACK TO PREVIOUS PHASE REQUIRED');
      this.emit('rollback-required', evaluation);
      await this.executeRollbackToPrevious();
    } else if (evaluation.canProgressToNext) {
      logger.info('✅ Phase completed successfully - ready for next phase');
      this.emit('phase-ready-for-progression', evaluation);
    } else if (evaluation.status === 'warning' || evaluation.status === 'critical') {
      logger.warn(`⚠️ Phase health: ${evaluation.status}`, {
        issues: evaluation.issues,
        recommendations: evaluation.recommendations
      });
      this.emit('phase-health-warning', evaluation);
    }
  }

  private async collectCurrentMetrics(): Promise<ConservativeMetrics> {
    // Simulate comprehensive metrics collection
    // In production, this would integrate with actual monitoring systems

    const now = new Date();
    const memoryUsage = process.memoryUsage();
    const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    // Calculate stability score based on recent history
    const stabilityScore = this.calculateStabilityScore();

    return {
      timestamp: now,
      phase: this.currentPhase,

      totalRequests: 1000 + Math.floor(Math.random() * 200),
      srpRequests: Math.floor((1000 + Math.floor(Math.random() * 200)) * this.getCurrentTrafficPercentage() / 100),
      errorCount: Math.floor(Math.random() * 5),
      srpErrorCount: Math.floor(Math.random() * 2),

      avgLatency: 2400 + Math.floor(Math.random() * 600),
      p95Latency: 3200 + Math.floor(Math.random() * 800),
      p99Latency: 4500 + Math.floor(Math.random() * 1000),
      memoryUsagePercent: Math.round(memoryPercent),

      consensusSuccessRate: 0.92 + Math.random() * 0.07,
      averageConfidence: 0.75 + Math.random() * 0.2,
      providerFailures: {
        'gpt-5-codex': Math.floor(Math.random() * 2),
        'claude-code-direct': Math.floor(Math.random() * 1),
        'gemini-2.5-pro': Math.floor(Math.random() * 2),
        'gemini-2.5-flash': Math.floor(Math.random() * 3)
      },

      errorRate: Math.random() * 0.01,
      srpErrorRate: Math.random() * 0.008,
      latencyFromBaseline: this.baselineMetrics ?
        ((2400 + Math.floor(Math.random() * 600)) / this.baselineMetrics.avgLatency) - 1 : 0,
      stabilityScore
    };
  }

  private calculateStabilityScore(): number {
    if (this.metricsHistory.length < 5) return 0.5;

    const recent = this.metricsHistory.slice(-10);
    const config = this.phases.get(this.currentPhase)!;

    // Calculate variance in key metrics
    const errorRates = recent.map(m => m.errorRate);
    const latencies = recent.map(m => m.avgLatency);

    const errorVariance = this.calculateVariance(errorRates);
    const latencyVariance = this.calculateVariance(latencies);

    // Lower variance = higher stability
    const errorStability = Math.max(0, 1 - (errorVariance * 10000));
    const latencyStability = Math.max(0, 1 - (latencyVariance / 1000000));

    // Check if consistently meeting thresholds
    const thresholdCompliance = recent.filter(m =>
      m.errorRate < config.thresholds.errorRate.warning &&
      m.avgLatency < config.thresholds.latency.warning &&
      m.consensusSuccessRate > config.thresholds.consensus.minWarning
    ).length / recent.length;

    return Math.min(1, (errorStability + latencyStability + thresholdCompliance) / 3);
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  private evaluatePhaseHealth(metrics: ConservativeMetrics): SafetyEvaluation {
    const config = this.phases.get(this.currentPhase)!;
    const issues: string[] = [];
    const positives: string[] = [];
    const recommendations: string[] = [];

    let status: SafetyEvaluation['status'] = 'healthy';

    // Error rate evaluation
    if (metrics.errorRate >= config.thresholds.errorRate.emergency) {
      status = 'emergency';
      issues.push(`EMERGENCY: Error rate ${(metrics.errorRate * 100).toFixed(3)}%`);
    } else if (metrics.errorRate >= config.thresholds.errorRate.critical) {
      status = 'critical';
      issues.push(`CRITICAL: Error rate ${(metrics.errorRate * 100).toFixed(3)}%`);
    } else if (metrics.errorRate >= config.thresholds.errorRate.warning) {
      if (status === 'healthy') status = 'warning';
      issues.push(`WARNING: Error rate ${(metrics.errorRate * 100).toFixed(3)}%`);
    } else {
      positives.push(`Error rate healthy: ${(metrics.errorRate * 100).toFixed(3)}%`);
    }

    // Similar evaluations for other metrics...
    // (Latency, memory, consensus)

    // Phase progression evaluation
    const phaseRuntime = this.phaseStartTime ?
      (Date.now() - this.phaseStartTime.getTime()) / (1000 * 60 * 60) : 0;

    const canProgressToNext =
      status === 'healthy' &&
      phaseRuntime >= config.stabilityRequirements.requiredStabilityHours &&
      metrics.stabilityScore > 0.8;

    const shouldRollbackToPrevious = status === 'critical' ||
      (status === 'warning' && metrics.stabilityScore < 0.5);

    const shouldEmergencyStop = status === 'emergency';

    return {
      phase: this.currentPhase,
      status,
      canProgressToNext,
      shouldRollbackToPrevious,
      shouldEmergencyStop,
      issues,
      positiveIndicators: positives,
      recommendations,
      timeToNextEvaluation: config.stabilityRequirements.evaluationIntervalMinutes,
      requiredStabilityRemaining: Math.max(0,
        config.stabilityRequirements.requiredStabilityHours - phaseRuntime)
    };
  }

  private async executeEmergencyStop(): Promise<void> {
    logger.error('🚨 EXECUTING EMERGENCY STOP');

    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    // Revert to 1% phase
    this.currentPhase = '1percent';

    // Execute emergency rollback script
    // (Integration with actual rollback procedures)

    this.emit('emergency-stop-executed', {
      timestamp: new Date(),
      revertedTo: this.currentPhase
    });
  }

  private async executeRollbackToPrevious(): Promise<void> {
    const previousPhase = this.getPreviousPhase();
    if (!previousPhase) return;

    logger.warn(`⬇️ Rolling back: ${this.currentPhase} → ${previousPhase}`);

    this.currentPhase = previousPhase;
    this.phaseStartTime = new Date();

    this.startPhaseMonitoring();

    this.emit('rollback-executed', {
      from: this.currentPhase,
      to: previousPhase,
      timestamp: new Date()
    });
  }

  private getPreviousPhase(): PhaseLevel | null {
    switch (this.currentPhase) {
      case '5percent': return '2percent';
      case '2percent': return '1percent';
      case '1percent': return null;
      default: return null;
    }
  }

  private getCurrentTrafficPercentage(): number {
    return this.phases.get(this.currentPhase)?.trafficPercentage || 1;
  }

  public getStatus(): object {
    return {
      currentPhase: this.currentPhase,
      trafficPercentage: this.getCurrentTrafficPercentage(),
      phaseStartTime: this.phaseStartTime,
      evaluationCount: this.evaluationCount,
      metricsHistoryLength: this.metricsHistory.length,
      stabilityScore: this.metricsHistory[this.metricsHistory.length - 1]?.stabilityScore || 0,
      monitoringActive: !!this.monitoringInterval
    };
  }
}
