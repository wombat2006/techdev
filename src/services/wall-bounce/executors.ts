/**
 * Wall-Bounce Executors
 * 実行モード管理（Parallel/Sequential/Deep Sequential）
 */

import type {
  IWallBounceExecutor,
  IWallBounceProviderManager,
  IWallBounceInvoker,
  IWallBouncePromptBuilder,
  IWallBounceTaskAnalyzer,
  ExecuteOptions,
  WallBounceResult,
  LLMResponse
} from './types';
import { logger } from '../../utils/logger';
import AuditLogger from '../audit-logger';

export class WallBounceExecutor implements IWallBounceExecutor {
  constructor(
    private providerManager: IWallBounceProviderManager,
    private invoker: IWallBounceInvoker,
    private promptBuilder: IWallBouncePromptBuilder,
    private taskAnalyzer: IWallBounceTaskAnalyzer
  ) {}

  /**
   * Wall-Bounceを実行（メインエントリーポイント）
   */
  async execute(prompt: string, options: ExecuteOptions): Promise<WallBounceResult> {
    const startTime = Date.now();

    logger.info('🎯 Wall-Bounce execution started', {
      mode: options.mode || 'parallel',
      taskType: options.taskType || 'basic',
      depth: options.depth || 3,
      minProviders: options.minProviders || 2,
      maxProviders: options.maxProviders || 6
    });

    await AuditLogger.logAction('wall_bounce_execution_start', {
      mode: options.mode,
      taskType: options.taskType,
      promptLength: prompt.length,
      timestamp: new Date().toISOString()
    });

    try {
      // Detect task type
      const detectedTaskType = this.taskAnalyzer.detectTaskType(prompt);
      const isCoding = this.taskAnalyzer.isCodingTask(prompt);

      logger.info('📊 Task analysis complete', {
        detectedTaskType,
        isCoding,
        taskLevel: options.taskType
      });

      // Select execution mode
      const mode = options.mode || 'parallel';
      let result: WallBounceResult;

      switch (mode) {
        case 'parallel':
          result = await this.executeParallel(prompt, options, detectedTaskType);
          break;

        case 'sequential':
          const depth = options.depth || 3;
          if (depth >= 3) {
            result = await this.executeDeepSequential(prompt, options, detectedTaskType);
          } else {
            result = await this.executeSequential(prompt, options, detectedTaskType);
          }
          break;

        default:
          throw new Error(`Unknown execution mode: ${mode}`);
      }

      const processingTime = Date.now() - startTime;
      logger.info('✅ Wall-Bounce execution completed', {
        mode,
        processingTimeMs: processingTime,
        consensusScore: result.consensus_score,
        qualityScore: result.quality_score,
        totalCost: result.total_cost
      });

      await AuditLogger.logAction('wall_bounce_execution_complete', {
        mode,
        processingTimeMs: processingTime,
        consensusScore: result.consensus_score,
        totalCost: result.total_cost
      }, 'success');

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('❌ Wall-Bounce execution failed', {
        error: error instanceof Error ? error.message : String(error),
        processingTimeMs: processingTime
      });

      await AuditLogger.logAction('wall_bounce_execution_error', {
        error: error instanceof Error ? error.message : String(error),
        processingTimeMs: processingTime
      }, 'error');

      throw error;
    }
  }

  /**
   * Parallelモード実行
   */
  private async executeParallel(
    prompt: string,
    options: ExecuteOptions,
    taskType: string
  ): Promise<WallBounceResult> {
    const startTime = Date.now();

    logger.info('🔀 Executing in PARALLEL mode', {
      taskType,
      minProviders: options.minProviders || 2
    });

    // Get provider order
    const providerOrder = this.providerManager.getProviderOrder(options);
    const targetProviders = providerOrder.slice(0, options.maxProviders || 6);

    logger.info('📋 Selected providers for parallel execution', {
      providers: targetProviders,
      count: targetProviders.length
    });

    // Execute all providers in parallel
    const responses: LLMResponse[] = [];
    const errors: string[] = [];

    const providerPromises = targetProviders.map(async (providerKey) => {
      try {
        const providerPrompt = this.promptBuilder.buildProviderPrompt(
          prompt,
          providerKey,
          options
        );

        const response = await this.invoker.invokeProvider(
          providerKey,
          providerPrompt,
          options
        );

        // Attach provider name to response
        (response as any).provider = providerKey;
        return response;
      } catch (error) {
        const errorMsg = `[${providerKey}] ${error instanceof Error ? error.message : String(error)}`;
        logger.warn(`⚠️ Provider failed in parallel execution: ${errorMsg}`);
        errors.push(errorMsg);
        return null;
      }
    });

    const results = await Promise.all(providerPromises);

    // Filter out null responses (failed providers)
    for (const result of results) {
      if (result) {
        responses.push(result);
      }
    }

    // Check minimum providers requirement
    const minProviders = options.minProviders || 2;
    if (responses.length < minProviders) {
      throw new Error(
        `Insufficient providers responded (${responses.length}/${minProviders} required). ` +
        `Errors: ${errors.join('; ')}`
      );
    }

    logger.info('📥 Parallel responses collected', {
      successCount: responses.length,
      failureCount: errors.length,
      totalProviders: targetProviders.length
    });

    // Select aggregator and run aggregation
    const aggregatorKey = this.providerManager.selectAggregator(
      prompt,
      options.taskType || 'basic'
    );

    logger.info(`🎯 Using aggregator: ${aggregatorKey}`);

    const aggregatorPrompt = this.promptBuilder.buildAggregatorPrompt(
      prompt,
      responses
    );

    const finalAnalysis = await this.invoker.invokeProvider(
      aggregatorKey,
      aggregatorPrompt,
      options
    );

    // Attach aggregator provider name
    (finalAnalysis as any).provider = aggregatorKey;

    // Build result
    return this.promptBuilder.buildWallBounceResult(
      finalAnalysis,
      responses,
      options,
      startTime
    );
  }

  /**
   * Sequentialモード実行（簡易版）
   */
  private async executeSequential(
    prompt: string,
    options: ExecuteOptions,
    taskType: string
  ): Promise<WallBounceResult> {
    const startTime = Date.now();

    logger.info('➡️ Executing in SEQUENTIAL mode', {
      taskType,
      depth: options.depth || 2
    });

    const providerOrder = this.providerManager.getProviderOrder(options);
    const targetProviders = providerOrder.slice(0, options.maxProviders || 4);

    const responses: LLMResponse[] = [];
    const errors: string[] = [];

    // Execute providers sequentially with cumulative context
    for (const providerKey of targetProviders) {
      try {
        const providerPrompt = this.promptBuilder.buildProviderPrompt(
          prompt,
          providerKey,
          options
        );

        // Add cumulative context from previous responses
        let fullPrompt = providerPrompt;
        if (responses.length > 0) {
          const context = this.promptBuilder.buildCumulativeContext(responses);
          fullPrompt = `${providerPrompt}\n\n既存の分析:\n${context}`;
        }

        const response = await this.invoker.invokeProvider(
          providerKey,
          fullPrompt,
          options
        );

        (response as any).provider = providerKey;
        responses.push(response);

        logger.info(`✅ Sequential provider ${providerKey} completed`, {
          responseLength: response.text?.length || 0,
          confidence: response.confidence
        });
      } catch (error) {
        const errorMsg = `[${providerKey}] ${error instanceof Error ? error.message : String(error)}`;
        logger.warn(`⚠️ Provider failed in sequential execution: ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Check minimum providers requirement
    const minProviders = options.minProviders || 2;
    if (responses.length < minProviders) {
      throw new Error(
        `Insufficient providers responded (${responses.length}/${minProviders} required). ` +
        `Errors: ${errors.join('; ')}`
      );
    }

    // Select aggregator and run aggregation
    const aggregatorKey = this.providerManager.selectAggregator(
      prompt,
      options.taskType || 'basic'
    );

    const aggregatorPrompt = this.promptBuilder.buildAggregatorPrompt(
      prompt,
      responses
    );

    const finalAnalysis = await this.invoker.invokeProvider(
      aggregatorKey,
      aggregatorPrompt,
      options
    );

    (finalAnalysis as any).provider = aggregatorKey;

    return this.promptBuilder.buildWallBounceResult(
      finalAnalysis,
      responses,
      options,
      startTime
    );
  }

  /**
   * Deep Sequentialモード実行（3-6ラウンド Wall-Bounce）
   */
  private async executeDeepSequential(
    prompt: string,
    options: ExecuteOptions,
    taskType: string
  ): Promise<WallBounceResult> {
    const startTime = Date.now();

    // Enforce 3-6 rounds
    const depth = Math.max(3, Math.min(options.depth || 3, 6));

    logger.info('🔄 Executing in DEEP SEQUENTIAL mode (Wall-Bounce)', {
      taskType,
      depth,
      rounds: depth
    });

    const providerOrder = this.providerManager.getProviderOrder(options);
    const allResponses: LLMResponse[] = [];
    const errors: string[] = [];

    // Execute multiple rounds
    for (let round = 1; round <= depth; round++) {
      const providerKey = providerOrder[(round - 1) % providerOrder.length];

      logger.info(`🎲 Wall-Bounce Round ${round}/${depth}: ${providerKey}`);

      try {
        const roundPrompt = this.promptBuilder.buildDeepSequentialPrompt(
          prompt,
          providerKey,
          round,
          allResponses
        );

        const response = await this.invoker.invokeProvider(
          providerKey,
          roundPrompt,
          options
        );

        (response as any).provider = providerKey;
        (response as any).round = round;
        allResponses.push(response);

        logger.info(`✅ Round ${round}/${depth} completed: ${providerKey}`, {
          responseLength: response.text?.length || 0,
          confidence: response.confidence,
          cost: response.cost
        });

        // Optional: SSE callback for round completion
        if (options.onProviderResponse) {
          options.onProviderResponse(providerKey, response.content);
        }
      } catch (error) {
        const errorMsg = `[Round ${round}] [${providerKey}] ${error instanceof Error ? error.message : String(error)}`;
        logger.warn(`⚠️ Round ${round} failed: ${errorMsg}`);
        errors.push(errorMsg);

        // If early rounds fail, continue with next provider
        if (round <= 2 && allResponses.length < 2) {
          continue;
        }
      }
    }

    // Check minimum providers requirement
    const minProviders = options.minProviders || 2;
    if (allResponses.length < minProviders) {
      throw new Error(
        `Insufficient responses in deep sequential mode (${allResponses.length}/${minProviders} required). ` +
        `Errors: ${errors.join('; ')}`
      );
    }

    logger.info('📊 Deep sequential rounds completed', {
      totalRounds: depth,
      successfulRounds: allResponses.length,
      failedRounds: errors.length
    });

    // Select aggregator for final synthesis
    const aggregatorKey = this.providerManager.selectAggregator(
      prompt,
      options.taskType || 'critical'
    );

    logger.info(`🎯 Final aggregation with ${aggregatorKey}`);

    const aggregatorPrompt = this.promptBuilder.buildAggregatorPrompt(
      prompt,
      allResponses
    );

    const finalAnalysis = await this.invoker.invokeProvider(
      aggregatorKey,
      aggregatorPrompt,
      options
    );

    (finalAnalysis as any).provider = aggregatorKey;

    // Optional: SSE callback for final result
    if (options.onConsensusUpdate) {
      // Consensus will be calculated in buildWallBounceResult
      const consensusPreview = allResponses.length >= 3 ? 0.75 : 0.65;
      options.onConsensusUpdate(consensusPreview);
    }

    return this.promptBuilder.buildWallBounceResult(
      finalAnalysis,
      allResponses,
      options,
      startTime
    );
  }
}
