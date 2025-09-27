"use strict";
/**
 * Wall Bounce Orchestrator - Single Responsibility: Coordination & Flow Control
 * 壁打ち分析の調整と実行フロー制御のみを責任とする
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WallBounceOrchestrator = void 0;
const logger_1 = require("../utils/logger");
const prometheus_client_1 = require("../metrics/prometheus-client");
const llm_provider_registry_1 = require("./llm-provider-registry");
const consensus_engine_1 = require("./consensus-engine");
/**
 * 壁打ち分析の実行調整のみを責任とする
 * プロバイダー管理はLLMProviderRegistry、合意形成はConsensusEngineに委譲
 */
class WallBounceOrchestrator {
    providerRegistry;
    consensusEngine;
    constructor() {
        this.providerRegistry = new llm_provider_registry_1.LLMProviderRegistry();
        this.consensusEngine = new consensus_engine_1.ConsensusEngine();
    }
    /**
     * 壁打ち分析のメイン実行フロー
     */
    async analyze(prompt, taskType = 'basic', options = {}) {
        const startTime = Date.now();
        const { minProviders = 2, maxProviders = 4, requireConsensus = true, confidenceThreshold = 0.8 } = options;
        logger_1.logger.info('🔄 Wall-bounce analysis started', {
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
            const consensus = await this.consensusEngine.buildConsensus(llmVotes, requireConsensus, confidenceThreshold);
            // 4. エスカレーション判定
            const tierEscalated = await this.checkTierEscalation(llmVotes, consensus, taskType);
            // 5. 結果構築
            const result = this.buildResult(llmVotes, consensus, startTime, tierEscalated);
            // 6. メトリクス記録
            this.recordMetrics(result, taskType);
            logger_1.logger.info('✅ Wall-bounce analysis completed', {
                processingTime: result.processing_time_ms,
                finalConfidence: result.consensus.confidence,
                providersUsed: result.debug.providers_used
            });
            return result;
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            logger_1.logger.error('❌ Wall-bounce analysis failed', {
                error: error instanceof Error ? error.message : String(error),
                processingTime,
                taskType
            });
            (0, prometheus_client_1.recordError)('wall_bounce_analysis_error', 'high', 'wall-bounce-orchestrator');
            throw error;
        }
    }
    /**
     * 並列LLM呼び出しの実行
     */
    async executeLLMCalls(providers, prompt) {
        const promises = providers.map(async (provider) => {
            const startTime = Date.now();
            try {
                logger_1.logger.debug(`Calling LLM provider: ${provider.name}`);
                const response = await provider.invoke(prompt, {});
                const processingTime = Date.now() - startTime;
                // recordLLMResponse - 一時的にコメントアウト（メトリクス統合は後で実装）
                return {
                    provider: provider.name,
                    model: provider.model,
                    response,
                    agreement_score: 0 // ConsensusEngineで計算される
                };
            }
            catch (error) {
                const processingTime = Date.now() - startTime;
                logger_1.logger.warn(`LLM provider ${provider.name} failed`, {
                    error: error instanceof Error ? error.message : String(error),
                    processingTime
                });
                // recordLLMResponse - 一時的にコメントアウト（メトリクス統合は後で実装）
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
        logger_1.logger.info('LLM calls completed', {
            totalProviders: providers.length,
            successfulProviders: successfulResults.length,
            failedProviders: providers.length - successfulResults.length
        });
        return successfulResults;
    }
    /**
     * ティアエスカレーション判定
     */
    async checkTierEscalation(votes, consensus, taskType) {
        const qualityEvaluation = this.consensusEngine.evaluateConsensusQuality(votes);
        // 品質が低い場合はエスカレーション
        const shouldEscalate = qualityEvaluation.quality === 'low' &&
            consensus.confidence < 0.6 &&
            taskType !== 'critical';
        if (shouldEscalate) {
            logger_1.logger.info('Tier escalation triggered', {
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
    buildResult(votes, consensus, startTime, tierEscalated) {
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
    recordMetrics(result, taskType) {
        (0, prometheus_client_1.recordWallBounceAnalysis)(taskType, result.debug.providers_used, result.consensus.confidence, result.processing_time_ms, result.total_cost, 'success');
    }
    /**
     * 利用可能なプロバイダー確認
     */
    getAvailableProviders() {
        return this.providerRegistry.getAvailableProviders();
    }
    /**
     * プロバイダー可用性確認
     */
    isProviderAvailable(providerName) {
        return this.providerRegistry.isProviderAvailable(providerName);
    }
}
exports.WallBounceOrchestrator = WallBounceOrchestrator;
//# sourceMappingURL=wall-bounce-orchestrator.js.map