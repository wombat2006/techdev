"use strict";
/**
 * Wall-Bounce Executors
 * 実行モード管理（Parallel/Sequential/Deep Sequential）
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WallBounceExecutor = void 0;
const logger_1 = require("../../utils/logger");
const audit_logger_1 = __importDefault(require("../audit-logger"));
const conversation_history_builder_1 = require("../../utils/conversation-history-builder");
const constants_1 = require("./constants");
class WallBounceExecutor {
    providerManager;
    invoker;
    promptBuilder;
    taskAnalyzer;
    constructor(providerManager, invoker, promptBuilder, taskAnalyzer) {
        this.providerManager = providerManager;
        this.invoker = invoker;
        this.promptBuilder = promptBuilder;
        this.taskAnalyzer = taskAnalyzer;
    }
    /**
     * Get provider tier from configuration
     */
    getProviderTier(providerKey) {
        const providerConfig = constants_1.providersConfig.providers.find(p => p.key === providerKey);
        return providerConfig?.tier || 3; // Default to tier 3 if not found
    }
    /**
     * Wall-Bounceを実行（メインエントリーポイント）
     */
    async execute(prompt, options) {
        const startTime = Date.now();
        logger_1.logger.info('🎯 Wall-Bounce execution started', {
            mode: options.mode || 'parallel',
            taskType: options.taskType || 'basic',
            depth: options.depth || 3,
            minProviders: options.minProviders || 2,
            maxProviders: options.maxProviders || 6,
            enableConversationHistory: options.enableConversationHistory || false
        });
        await audit_logger_1.default.logAction('wall_bounce_execution_start', {
            mode: options.mode,
            taskType: options.taskType,
            promptLength: prompt.length,
            timestamp: new Date().toISOString()
        });
        // Initialize conversation history builder if enabled
        let conversationBuilder;
        if (options.enableConversationHistory) {
            const mode = options.mode || 'parallel';
            const executionMode = mode === 'sequential'
                ? (options.depth && options.depth >= 3 ? 'deep-sequential' : 'sequential')
                : 'parallel';
            conversationBuilder = (0, conversation_history_builder_1.createConversationHistoryBuilder)(executionMode, options.sessionId);
            logger_1.logger.info('📚 Conversation history tracking enabled', {
                executionMode,
                sessionId: options.sessionId
            });
        }
        try {
            // Detect task type
            const detectedTaskType = this.taskAnalyzer.detectTaskType(prompt);
            const isCoding = this.taskAnalyzer.isCodingTask(prompt);
            logger_1.logger.info('📊 Task analysis complete', {
                detectedTaskType,
                isCoding,
                taskLevel: options.taskType
            });
            // Select execution mode
            const mode = options.mode || 'parallel';
            let result;
            switch (mode) {
                case 'parallel':
                    result = await this.executeParallel(prompt, options, detectedTaskType, conversationBuilder);
                    break;
                case 'sequential':
                    const depth = options.depth || 3;
                    if (depth >= 3) {
                        result = await this.executeDeepSequential(prompt, options, detectedTaskType, conversationBuilder);
                    }
                    else {
                        result = await this.executeSequential(prompt, options, detectedTaskType, conversationBuilder);
                    }
                    break;
                default:
                    throw new Error(`Unknown execution mode: ${mode}`);
            }
            // Build conversation history if enabled
            if (conversationBuilder) {
                const history = conversationBuilder.build(result.final_answer, result.consensus_score, result.quality_score, result.providers_used);
                result.conversation_history = history;
                logger_1.logger.info('📚 Conversation history built successfully', {
                    conversationId: history.conversationId,
                    totalRounds: history.rounds.length,
                    totalCost: history.performance.totalCost
                });
            }
            const processingTime = Date.now() - startTime;
            logger_1.logger.info('✅ Wall-Bounce execution completed', {
                mode,
                processingTimeMs: processingTime,
                consensusScore: result.consensus_score,
                qualityScore: result.quality_score,
                totalCost: result.total_cost
            });
            await audit_logger_1.default.logAction('wall_bounce_execution_complete', {
                mode,
                processingTimeMs: processingTime,
                consensusScore: result.consensus_score,
                totalCost: result.total_cost
            }, 'success');
            return result;
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            // Mark conversation as failed if tracking enabled
            if (conversationBuilder) {
                conversationBuilder.failRound(error instanceof Error ? error.message : String(error));
            }
            logger_1.logger.error('❌ Wall-Bounce execution failed', {
                error: error instanceof Error ? error.message : String(error),
                processingTimeMs: processingTime
            });
            await audit_logger_1.default.logAction('wall_bounce_execution_error', {
                error: error instanceof Error ? error.message : String(error),
                processingTimeMs: processingTime
            }, 'error');
            throw error;
        }
    }
    /**
     * Parallelモード実行
     */
    async executeParallel(prompt, options, taskType, conversationBuilder) {
        const startTime = Date.now();
        logger_1.logger.info('🔀 Executing in PARALLEL mode', {
            taskType,
            minProviders: options.minProviders || 2
        });
        // Start round if conversation history enabled
        if (conversationBuilder) {
            conversationBuilder.startRound(1, prompt);
        }
        // Get provider order
        const providerOrder = this.providerManager.getProviderOrder(options);
        const targetProviders = providerOrder.slice(0, options.maxProviders || 6);
        logger_1.logger.info('📋 Selected providers for parallel execution', {
            providers: targetProviders,
            count: targetProviders.length
        });
        // Execute all providers in parallel
        const responses = [];
        const errors = [];
        const providerPromises = targetProviders.map(async (providerKey) => {
            const execStart = Date.now();
            try {
                const providerPrompt = this.promptBuilder.buildProviderPrompt(prompt, providerKey, options);
                const response = await this.invoker.invokeProvider(providerKey, providerPrompt, options);
                const execTime = Date.now() - execStart;
                // Attach provider name to response
                response.provider = providerKey;
                // Record provider response in conversation history
                if (conversationBuilder) {
                    const providerConfig = constants_1.providersConfig.providers.find(p => p.key === providerKey);
                    const providerName = providerConfig?.name || providerKey;
                    const tier = this.getProviderTier(providerKey);
                    conversationBuilder.addProviderResponse(providerKey, providerName, tier, response, execTime);
                }
                return response;
            }
            catch (error) {
                const errorMsg = `[${providerKey}] ${error instanceof Error ? error.message : String(error)}`;
                logger_1.logger.warn(`⚠️ Provider failed in parallel execution: ${errorMsg}`);
                errors.push(errorMsg);
                // Record error in conversation history
                if (conversationBuilder) {
                    conversationBuilder.addRoundError(providerKey, error instanceof Error ? error.message : String(error), true // recoverable
                    );
                }
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
            throw new Error(`Insufficient providers responded (${responses.length}/${minProviders} required). ` +
                `Errors: ${errors.join('; ')}`);
        }
        logger_1.logger.info('📥 Parallel responses collected', {
            successCount: responses.length,
            failureCount: errors.length,
            totalProviders: targetProviders.length
        });
        // Select aggregator and run aggregation with fallback
        const aggregatorKey = this.providerManager.selectAggregator(prompt, options.taskType || 'basic');
        logger_1.logger.info(`🎯 Using aggregator: ${aggregatorKey}`);
        let finalAnalysis;
        try {
            const aggregatorPrompt = this.promptBuilder.buildAggregatorPrompt(prompt, responses);
            finalAnalysis = await this.invoker.invokeProvider(aggregatorKey, aggregatorPrompt, options);
            // Attach aggregator provider name
            finalAnalysis.provider = aggregatorKey;
        }
        catch (error) {
            // Fallback to Sonnet 4.5 if primary aggregator fails
            const fallbackAggregator = 'sonnet-4.5';
            if (aggregatorKey !== fallbackAggregator) {
                logger_1.logger.warn(`⚠️ Aggregator ${aggregatorKey} failed, falling back to ${fallbackAggregator}`, {
                    primaryAggregator: aggregatorKey,
                    error: error instanceof Error ? error.message : String(error)
                });
                await audit_logger_1.default.logAction('aggregator_fallback', {
                    primaryAggregator: aggregatorKey,
                    fallbackAggregator,
                    error: error instanceof Error ? error.message : String(error)
                }, 'error');
                const aggregatorPrompt = this.promptBuilder.buildAggregatorPrompt(prompt, responses);
                finalAnalysis = await this.invoker.invokeProvider(fallbackAggregator, aggregatorPrompt, options);
                finalAnalysis.provider = fallbackAggregator;
                finalAnalysis.fallbackFrom = aggregatorKey;
            }
            else {
                // If Sonnet 4.5 itself fails, throw the error
                logger_1.logger.error(`❌ Fallback aggregator ${fallbackAggregator} also failed`);
                throw error;
            }
        }
        // Build result
        const result = this.promptBuilder.buildWallBounceResult(finalAnalysis, responses, options, startTime);
        // Complete round if conversation history enabled
        if (conversationBuilder) {
            const totalCost = responses.reduce((sum, r) => sum + (r.cost || 0), 0) + (finalAnalysis.cost || 0);
            const totalTokens = responses.reduce((sum, r) => sum + ((r.tokens?.total || 0) || (r.tokens?.input || 0) + (r.tokens?.output || 0)), 0) +
                ((finalAnalysis.tokens?.total || 0) || (finalAnalysis.tokens?.input || 0) + (finalAnalysis.tokens?.output || 0));
            conversationBuilder.completeRound(result.consensus_score, result.quality_score, totalCost, totalTokens);
        }
        return result;
    }
    /**
     * Sequentialモード実行（簡易版）
     */
    async executeSequential(prompt, options, taskType, conversationBuilder) {
        const startTime = Date.now();
        logger_1.logger.info('➡️ Executing in SEQUENTIAL mode', {
            taskType,
            depth: options.depth || 2
        });
        // Start round if conversation history enabled
        if (conversationBuilder) {
            conversationBuilder.startRound(1, prompt);
        }
        const providerOrder = this.providerManager.getProviderOrder(options);
        const targetProviders = providerOrder.slice(0, options.maxProviders || 4);
        const responses = [];
        const errors = [];
        // Execute providers sequentially with cumulative context
        for (const providerKey of targetProviders) {
            const execStart = Date.now();
            try {
                const providerPrompt = this.promptBuilder.buildProviderPrompt(prompt, providerKey, options);
                // Add cumulative context from previous responses
                let fullPrompt = providerPrompt;
                if (responses.length > 0) {
                    const context = this.promptBuilder.buildCumulativeContext(responses);
                    fullPrompt = `${providerPrompt}\n\n既存の分析:\n${context}`;
                }
                const response = await this.invoker.invokeProvider(providerKey, fullPrompt, options);
                const execTime = Date.now() - execStart;
                response.provider = providerKey;
                responses.push(response);
                // Record provider response in conversation history
                if (conversationBuilder) {
                    const providerConfig = constants_1.providersConfig.providers.find(p => p.key === providerKey);
                    const providerName = providerConfig?.name || providerKey;
                    const tier = this.getProviderTier(providerKey);
                    conversationBuilder.addProviderResponse(providerKey, providerName, tier, response, execTime);
                }
                logger_1.logger.info(`✅ Sequential provider ${providerKey} completed`, {
                    responseLength: response.text?.length || 0,
                    confidence: response.confidence
                });
            }
            catch (error) {
                const errorMsg = `[${providerKey}] ${error instanceof Error ? error.message : String(error)}`;
                logger_1.logger.warn(`⚠️ Provider failed in sequential execution: ${errorMsg}`);
                errors.push(errorMsg);
                // Record error in conversation history
                if (conversationBuilder) {
                    conversationBuilder.addRoundError(providerKey, error instanceof Error ? error.message : String(error), true // recoverable
                    );
                }
            }
        }
        // Check minimum providers requirement
        const minProviders = options.minProviders || 2;
        if (responses.length < minProviders) {
            throw new Error(`Insufficient providers responded (${responses.length}/${minProviders} required). ` +
                `Errors: ${errors.join('; ')}`);
        }
        // Select aggregator and run aggregation with fallback
        const aggregatorKey = this.providerManager.selectAggregator(prompt, options.taskType || 'basic');
        let finalAnalysis;
        try {
            const aggregatorPrompt = this.promptBuilder.buildAggregatorPrompt(prompt, responses);
            finalAnalysis = await this.invoker.invokeProvider(aggregatorKey, aggregatorPrompt, options);
            finalAnalysis.provider = aggregatorKey;
        }
        catch (error) {
            // Fallback to Sonnet 4.5 if primary aggregator fails
            const fallbackAggregator = 'sonnet-4.5';
            if (aggregatorKey !== fallbackAggregator) {
                logger_1.logger.warn(`⚠️ Aggregator ${aggregatorKey} failed, falling back to ${fallbackAggregator}`, {
                    primaryAggregator: aggregatorKey,
                    error: error instanceof Error ? error.message : String(error)
                });
                await audit_logger_1.default.logAction('aggregator_fallback', {
                    primaryAggregator: aggregatorKey,
                    fallbackAggregator,
                    error: error instanceof Error ? error.message : String(error)
                }, 'error');
                const aggregatorPrompt = this.promptBuilder.buildAggregatorPrompt(prompt, responses);
                finalAnalysis = await this.invoker.invokeProvider(fallbackAggregator, aggregatorPrompt, options);
                finalAnalysis.provider = fallbackAggregator;
                finalAnalysis.fallbackFrom = aggregatorKey;
            }
            else {
                // If Sonnet 4.5 itself fails, throw the error
                logger_1.logger.error(`❌ Fallback aggregator ${fallbackAggregator} also failed`);
                throw error;
            }
        }
        const result = this.promptBuilder.buildWallBounceResult(finalAnalysis, responses, options, startTime);
        // Complete round if conversation history enabled
        if (conversationBuilder) {
            const totalCost = responses.reduce((sum, r) => sum + (r.cost || 0), 0) + (finalAnalysis.cost || 0);
            const totalTokens = responses.reduce((sum, r) => sum + ((r.tokens?.total || 0) || (r.tokens?.input || 0) + (r.tokens?.output || 0)), 0) +
                ((finalAnalysis.tokens?.total || 0) || (finalAnalysis.tokens?.input || 0) + (finalAnalysis.tokens?.output || 0));
            conversationBuilder.completeRound(result.consensus_score, result.quality_score, totalCost, totalTokens);
        }
        return result;
    }
    /**
     * Deep Sequentialモード実行（3-6ラウンド Wall-Bounce）
     */
    async executeDeepSequential(prompt, options, taskType, conversationBuilder) {
        const startTime = Date.now();
        // Enforce 3-6 rounds
        const depth = Math.max(3, Math.min(options.depth || 3, 6));
        logger_1.logger.info('🔄 Executing in DEEP SEQUENTIAL mode (Wall-Bounce)', {
            taskType,
            depth,
            rounds: depth
        });
        const providerOrder = this.providerManager.getProviderOrder(options);
        const allResponses = [];
        const errors = [];
        // Execute multiple rounds
        for (let round = 1; round <= depth; round++) {
            const providerKey = providerOrder[(round - 1) % providerOrder.length];
            logger_1.logger.info(`🎲 Wall-Bounce Round ${round}/${depth}: ${providerKey}`);
            // Start round if conversation history enabled
            if (conversationBuilder) {
                const roundPrompt = this.promptBuilder.buildDeepSequentialPrompt(prompt, providerKey, round, allResponses);
                conversationBuilder.startRound(round, prompt, roundPrompt);
            }
            const execStart = Date.now();
            try {
                const roundPrompt = this.promptBuilder.buildDeepSequentialPrompt(prompt, providerKey, round, allResponses);
                const response = await this.invoker.invokeProvider(providerKey, roundPrompt, options);
                const execTime = Date.now() - execStart;
                response.provider = providerKey;
                response.round = round;
                allResponses.push(response);
                // Record provider response in conversation history
                if (conversationBuilder) {
                    const providerConfig = constants_1.providersConfig.providers.find(p => p.key === providerKey);
                    const providerName = providerConfig?.name || providerKey;
                    const tier = this.getProviderTier(providerKey);
                    conversationBuilder.addProviderResponse(providerKey, providerName, tier, response, execTime);
                }
                logger_1.logger.info(`✅ Round ${round}/${depth} completed: ${providerKey}`, {
                    responseLength: response.text?.length || 0,
                    confidence: response.confidence,
                    cost: response.cost
                });
                // Complete round if conversation history enabled
                if (conversationBuilder) {
                    conversationBuilder.completeRound(response.confidence || 0.7, response.confidence || 0.7, response.cost || 0, (response.tokens?.total || 0) || (response.tokens?.input || 0) + (response.tokens?.output || 0));
                }
                // Optional: SSE callback for round completion
                if (options.onProviderResponse) {
                    options.onProviderResponse(providerKey, response.content);
                }
            }
            catch (error) {
                const errorMsg = `[Round ${round}] [${providerKey}] ${error instanceof Error ? error.message : String(error)}`;
                logger_1.logger.warn(`⚠️ Round ${round} failed: ${errorMsg}`);
                errors.push(errorMsg);
                // Record error in conversation history
                if (conversationBuilder) {
                    conversationBuilder.addRoundError(providerKey, error instanceof Error ? error.message : String(error), true // recoverable
                    );
                    // Fail round if catastrophic
                    if (round <= 2 && allResponses.length < 2) {
                        conversationBuilder.failRound(errorMsg);
                    }
                    else {
                        // Complete with low scores if we have enough responses
                        conversationBuilder.completeRound(0.0, 0.0, 0, 0);
                    }
                }
                // If early rounds fail, continue with next provider
                if (round <= 2 && allResponses.length < 2) {
                    continue;
                }
            }
        }
        // Check minimum providers requirement
        const minProviders = options.minProviders || 2;
        if (allResponses.length < minProviders) {
            throw new Error(`Insufficient responses in deep sequential mode (${allResponses.length}/${minProviders} required). ` +
                `Errors: ${errors.join('; ')}`);
        }
        logger_1.logger.info('📊 Deep sequential rounds completed', {
            totalRounds: depth,
            successfulRounds: allResponses.length,
            failedRounds: errors.length
        });
        // Select aggregator for final synthesis with fallback
        const aggregatorKey = this.providerManager.selectAggregator(prompt, options.taskType || 'critical');
        logger_1.logger.info(`🎯 Final aggregation with ${aggregatorKey}`);
        let finalAnalysis;
        try {
            const aggregatorPrompt = this.promptBuilder.buildAggregatorPrompt(prompt, allResponses);
            finalAnalysis = await this.invoker.invokeProvider(aggregatorKey, aggregatorPrompt, options);
            finalAnalysis.provider = aggregatorKey;
        }
        catch (error) {
            // Fallback to Sonnet 4.5 if primary aggregator fails
            const fallbackAggregator = 'sonnet-4.5';
            if (aggregatorKey !== fallbackAggregator) {
                logger_1.logger.warn(`⚠️ Aggregator ${aggregatorKey} failed, falling back to ${fallbackAggregator}`, {
                    primaryAggregator: aggregatorKey,
                    error: error instanceof Error ? error.message : String(error)
                });
                await audit_logger_1.default.logAction('aggregator_fallback', {
                    primaryAggregator: aggregatorKey,
                    fallbackAggregator,
                    error: error instanceof Error ? error.message : String(error),
                    executionMode: 'deep-sequential'
                }, 'error');
                const aggregatorPrompt = this.promptBuilder.buildAggregatorPrompt(prompt, allResponses);
                finalAnalysis = await this.invoker.invokeProvider(fallbackAggregator, aggregatorPrompt, options);
                finalAnalysis.provider = fallbackAggregator;
                finalAnalysis.fallbackFrom = aggregatorKey;
            }
            else {
                // If Sonnet 4.5 itself fails, throw the error
                logger_1.logger.error(`❌ Fallback aggregator ${fallbackAggregator} also failed`);
                throw error;
            }
        }
        // Optional: SSE callback for final result
        if (options.onConsensusUpdate) {
            // Consensus will be calculated in buildWallBounceResult
            const consensusPreview = allResponses.length >= 3 ? 0.75 : 0.65;
            options.onConsensusUpdate(consensusPreview);
        }
        const result = this.promptBuilder.buildWallBounceResult(finalAnalysis, allResponses, options, startTime);
        // Note: For deep sequential, rounds are completed individually within the loop
        // The final aggregation happens outside of the conversation history rounds
        // This is by design - each wall-bounce round is tracked separately
        return result;
    }
}
exports.WallBounceExecutor = WallBounceExecutor;
//# sourceMappingURL=executors.js.map