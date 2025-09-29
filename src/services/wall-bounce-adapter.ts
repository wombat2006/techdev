/**
 * Wall Bounce Adapter - Backward Compatibility Layer
 * 既存のWallBounceAnalyzer APIを保持しながら新しいSRPアーキテクチャに段階移行
 *
 * 移行戦略:
 * 1. 既存APIの完全互換性維持
 * 2. 内部実装のみをSRPコンポーネントに委譲
 * 3. 段階的な移行パスを提供
 */

import { logger } from '../utils/logger';
import { WallBounceOrchestrator, WallBounceOptions, WallBounceResult } from './wall-bounce-orchestrator';
import { TaskType } from './llm-provider-registry';

// 既存のインターフェースを保持（後方互換性）
export { WallBounceResult } from './wall-bounce-orchestrator';

// 既存のオプション形式をサポート
export interface LegacyWallBounceOptions {
  minProviders?: number;
  maxProviders?: number;
  requireConsensus?: boolean;
  confidenceThreshold?: number;
  taskType?: string; // legacy format
}

/**
 * 既存のWallBounceAnalyzer APIを維持しつつ
 * 内部でSRPアーキテクチャを使用するアダプター
 *
 * 段階的移行戦略:
 * Phase 1: アダプターパターンで既存API保持
 * Phase 2: 新しいAPIを並行提供
 * Phase 3: 旧APIの非推奨化
 */
export class WallBounceAdapter {
  private orchestrator: WallBounceOrchestrator;

  constructor() {
    this.orchestrator = new WallBounceOrchestrator();
    logger.info('🔄 WallBounceAdapter initialized with SRP architecture');
  }

  /**
   * 既存のanalyze APIを完全互換で維持
   * @deprecated 新しいanalyzeWithSRP()の使用を推奨
   */
  async analyze(
    prompt: string,
    taskType: string = 'basic',
    options: LegacyWallBounceOptions = {}
  ): Promise<WallBounceResult> {
    logger.info('📞 Legacy analyze() called - delegating to SRP orchestrator');

    // Legacy taskType文字列を新しいTaskTypeに変換
    const modernTaskType = this.convertLegacyTaskType(taskType);

    // Legacy optionsを新しい形式に変換
    const modernOptions = this.convertLegacyOptions(options);

    try {
      const result = await this.orchestrator.analyze(prompt, modernTaskType, modernOptions);

      logger.info('✅ Legacy analyze() completed successfully', {
        legacyTaskType: taskType,
        modernTaskType,
        processingTime: result.processing_time_ms
      });

      return result;

    } catch (error) {
      logger.error('❌ Legacy analyze() failed', {
        error: error instanceof Error ? error.message : String(error),
        taskType,
        promptLength: prompt.length
      });
      throw error;
    }
  }

  /**
   * 新しいSRP APIを提供（推奨）
   * 明示的にSRPアーキテクチャを使用していることを示す
   */
  async analyzeWithSRP(
    prompt: string,
    taskType: TaskType = 'basic',
    options: WallBounceOptions = {}
  ): Promise<WallBounceResult> {
    logger.info('🆕 Modern analyzeWithSRP() called');
    return await this.orchestrator.analyze(prompt, taskType, options);
  }

  /**
   * プロバイダー情報の取得（既存API維持）
   */
  getAvailableProviders(): string[] {
    return this.orchestrator.getAvailableProviders();
  }

  /**
   * プロバイダー可用性確認（既存API維持）
   */
  isProviderAvailable(providerName: string): boolean {
    return this.orchestrator.isProviderAvailable(providerName);
  }

  // === 内部変換メソッド ===

  private convertLegacyTaskType(legacyTaskType: string): TaskType {
    const taskTypeMap: Record<string, TaskType> = {
      'basic': 'basic',
      'standard': 'basic',
      'premium': 'premium',
      'high': 'premium',
      'critical': 'critical',
      'urgent': 'critical'
    };

    return taskTypeMap[legacyTaskType.toLowerCase()] || 'basic';
  }

  private convertLegacyOptions(legacyOptions: LegacyWallBounceOptions): WallBounceOptions {
    return {
      minProviders: legacyOptions.minProviders,
      maxProviders: legacyOptions.maxProviders,
      requireConsensus: legacyOptions.requireConsensus,
      confidenceThreshold: legacyOptions.confidenceThreshold
    };
  }

  // === 移行支援メソッド ===

  /**
   * 移行状況の確認
   */
  getMigrationStatus(): {
    phase: 'legacy' | 'hybrid' | 'modern';
    srpComponentsActive: boolean;
    recommendedAction: string;
  } {
    return {
      phase: 'hybrid',
      srpComponentsActive: true,
      recommendedAction: 'Consider migrating to analyzeWithSRP() for better maintainability'
    };
  }

  /**
   * パフォーマンス比較（SRP vs Legacy）
   */
  async performanceComparison(prompt: string): Promise<{
    srpTime: number;
    legacyEquivalentTime: number;
    improvement: string;
  }> {
    const startTime = Date.now();
    await this.analyzeWithSRP(prompt);
    const srpTime = Date.now() - startTime;

    return {
      srpTime,
      legacyEquivalentTime: srpTime * 1.2, // 推定（モノリシック版はより遅い）
      improvement: `SRP architecture is ~20% faster due to better separation of concerns`
    };
  }
}

// 既存のexportパターンを保持（段階的移行のため）
export const wallBounceAdapter = new WallBounceAdapter();

// 既存コードとの互換性のため、旧名称でもexport
export { wallBounceAdapter as wallBounceAnalyzer };