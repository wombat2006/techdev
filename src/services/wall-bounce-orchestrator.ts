/**
 * Wall Bounce Orchestrator - Single Responsibility: Coordination & Flow Control
 * 壁打ち分析の調整と実行フロー制御のみを責任とする
 */

import { logger } from '../utils/logger';
import { recordError, recordWallBounceAnalysis } from '../metrics/prometheus-client';
import { LLMProviderRegistry, LLMProvider, TaskType } from './llm-provider-registry';
import { ConsensusEngine, VoteWithScore, ConsensusResult } from './consensus-engine';

export interface WallBounceOptions {
  minProviders?: number;
  maxProviders?: number;
  requireConsensus?: boolean;
  confidenceThreshold?: number;
}

export interface WallBounceResult {
  consensus: ConsensusResult;
  llm_votes: VoteWithScore[];
  total_cost: number;
  processing_time_ms: number;
  debug: {
    wall_bounce_verified: boolean;
    providers_used: string[];
    tier_escalated: boolean;
  };
}

/**
 * 壁打ち分析の実行調整のみを責任とする
 * プロバイダー管理はLLMProviderRegistry、合意形成はConsensusEngineに委譲
 */
export class WallBounceOrchestrator {
  private providerRegistry: LLMProviderRegistry;
  private consensusEngine: ConsensusEngine;

  constructor() {
    this.providerRegistry = new LLMProviderRegistry();
    this.consensusEngine = new ConsensusEngine();
  }

  /**
   * 壁打ち分析のメイン実行フロー
   */
  async analyze(
    prompt: string,
    taskType: TaskType = 'basic',
    options: WallBounceOptions = {}
  ): Promise<WallBounceResult> {
    const startTime = Date.now();
    const {
      minProviders = 2,
      maxProviders = 4,
      requireConsensus = true,
      confidenceThreshold = 0.8
    } = options;

    logger.info('🔄 Wall-bounce analysis started', {
      taskType,
      minProviders,
      maxProviders,
      promptLength: prompt.length
    });

    try {
      // 1. プロバイダー選択（委譲）
      const selectedProviders = this.providerRegistry.getProvidersForTask(taskType, minProviders);

      // 2. 並列LLM実行
      const llmVotes = await this.executeLLMCalls(selectedProviders, prompt);

      // 3. 合意形成（委譲）
      const consensus = await this.consensusEngine.buildConsensus(
        llmVotes,
        requireConsensus,
        confidenceThreshold
      );

      // 4. エスカレーション判定
      const tierEscalated = await this.checkTierEscalation(llmVotes, consensus, taskType);

      // 5. 結果構築
      const result = this.buildResult(llmVotes, consensus, startTime, tierEscalated);

      // 6. メトリクス記録
      this.recordMetrics(result, taskType);

      logger.info('✅ Wall-bounce analysis completed', {
        processingTime: result.processing_time_ms,
        finalConfidence: result.consensus.confidence,
        providersUsed: result.debug.providers_used
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('❌ Wall-bounce analysis failed', {
        error: error instanceof Error ? error.message : String(error),
        processingTime,
        taskType
      });

      recordError('wall_bounce_analysis_error', 'high', 'wall-bounce-orchestrator');
      throw error;
    }
  }

  /**
   * 並列LLM呼び出しの実行
   */
  private async executeLLMCalls(providers: LLMProvider[], prompt: string): Promise<VoteWithScore[]> {
    const promises = providers.map(async (provider) => {
      const startTime = Date.now();
      try {
        logger.debug(`Calling LLM provider: ${provider.name}`);
        const response = await provider.invoke(prompt, {});

        const processingTime = Date.now() - startTime;
        logger.debug('LLM provider response received', {
          provider: provider.name,
          processingTime
        });

        return {
          provider: provider.name,
          model: provider.model,
          response,
          agreement_score: 0 // ConsensusEngineで計算される
        };

      } catch (error) {
        const processingTime = Date.now() - startTime;
        logger.warn(`LLM provider ${provider.name} failed`, {
          error: error instanceof Error ? error.message : String(error),
          processingTime
        });

        // 失敗時のダミー応答
        return {
          provider: provider.name,
          model: provider.model,
          response: {
            content: `Error: ${provider.name} provider failed`,
            confidence: 0,
            reasoning: `Provider ${provider.name} encountered an error`,
            cost: 0,
            tokens: { input: 0, output: 0 }
          },
          agreement_score: 0
        };
      }
    });

    const results = await Promise.all(promises);
    const successfulResults = results.filter(r => r.response.confidence > 0);

    if (successfulResults.length === 0) {
      throw new Error('All LLM providers failed to respond');
    }

    logger.info('LLM calls completed', {
      totalProviders: providers.length,
      successfulProviders: successfulResults.length,
      failedProviders: providers.length - successfulResults.length
    });

    return successfulResults;
  }

  /**
   * ティアエスカレーション判定
   */
  private async checkTierEscalation(
    votes: VoteWithScore[],
    consensus: ConsensusResult,
    taskType: TaskType
  ): Promise<boolean> {
    const qualityEvaluation = this.consensusEngine.evaluateConsensusQuality(votes);

    // 品質が低い場合はエスカレーション
    const shouldEscalate = qualityEvaluation.quality === 'low' &&
                          consensus.confidence < 0.6 &&
                          taskType !== 'critical';

    if (shouldEscalate) {
      logger.info('Tier escalation triggered', {
        currentQuality: qualityEvaluation.quality,
        confidence: consensus.confidence,
        taskType
      });
    }

    return shouldEscalate;
  }

  /**
   * 結果オブジェクトの構築
   */
  private buildResult(
    votes: VoteWithScore[],
    consensus: ConsensusResult,
    startTime: number,
    tierEscalated: boolean
  ): WallBounceResult {
    const processingTime = Date.now() - startTime;
    const totalCost = votes.reduce((sum, vote) => sum + vote.response.cost, 0);

    return {
      consensus,
      llm_votes: votes,
      total_cost: totalCost,
      processing_time_ms: processingTime,
      debug: {
        wall_bounce_verified: votes.length >= 2,
        providers_used: votes.map(v => v.provider),
        tier_escalated: tierEscalated
      }
    };
  }

  /**
   * メトリクス記録
   */
  private recordMetrics(result: WallBounceResult, taskType: TaskType): void {
    recordWallBounceAnalysis(
      taskType,
      result.debug.providers_used,
      result.consensus.confidence,
      result.processing_time_ms,
      result.total_cost,
      'success'
    );
  }

  /**
   * 利用可能なプロバイダー確認
   */
  getAvailableProviders(): string[] {
    return this.providerRegistry.getAvailableProviders();
  }

  /**
   * プロバイダー可用性確認
   */
  isProviderAvailable(providerName: string): boolean {
    return this.providerRegistry.isProviderAvailable(providerName);
  }
}
