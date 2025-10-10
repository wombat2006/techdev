"use strict";
/**
 * Conversation History Builder
 * LLM間会話履歴を構築・管理するビルダークラス
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConversationHistoryBuilder = exports.ConversationHistoryBuilder = void 0;
const logger_1 = require("./logger");
/**
 * 会話履歴ビルダー
 */
class ConversationHistoryBuilder {
    conversationId;
    sessionId;
    startTime;
    executionMode;
    rounds = [];
    currentRound;
    consensusProcess;
    aggregationProcess;
    performanceData = {};
    constructor(conversationId, executionMode, sessionId) {
        this.conversationId = conversationId;
        this.executionMode = executionMode;
        this.sessionId = sessionId;
        this.startTime = new Date().toISOString();
        logger_1.logger.info('📚 ConversationHistoryBuilder initialized', {
            conversationId,
            executionMode,
            sessionId
        });
    }
    /**
     * 新しいラウンドを開始
     */
    startRound(roundNumber, originalPrompt, enrichedPrompt, context) {
        const round = {
            roundNumber,
            status: 'running',
            mode: this.executionMode,
            startTime: new Date().toISOString(),
            prompt: {
                original: originalPrompt,
                enriched: enrichedPrompt,
                context
            },
            providerResponses: [],
            errors: []
        };
        this.currentRound = round;
        this.rounds.push(round);
        logger_1.logger.info(`🔄 Round ${roundNumber} started`, {
            conversationId: this.conversationId,
            mode: this.executionMode
        });
        return round;
    }
    /**
     * プロバイダー応答を追加
     */
    addProviderResponse(providerId, providerName, tier, response, executionTime, circuitBreakerState) {
        if (!this.currentRound) {
            throw new Error('No active round. Call startRound() first.');
        }
        const message = this.createLLMMessage('provider', response.content || response.text || '', providerId, {
            confidence: response.confidence,
            tokens: response.tokens,
            cost: response.cost,
            model: response.provider,
            reasoning: response.reasoning
        });
        const providerResponse = {
            providerId,
            providerName,
            tier,
            message,
            response,
            executionTime,
            circuitBreakerState
        };
        this.currentRound.providerResponses.push(providerResponse);
        logger_1.logger.debug(`✅ Provider response added: ${providerId}`, {
            conversationId: this.conversationId,
            roundNumber: this.currentRound.roundNumber,
            executionTime
        });
        return providerResponse;
    }
    /**
     * ラウンドエラーを記録
     */
    addRoundError(providerId, error, recoverable, fallbackUsed) {
        if (!this.currentRound) {
            throw new Error('No active round. Call startRound() first.');
        }
        const roundError = {
            providerId,
            error,
            timestamp: new Date().toISOString(),
            recoverable,
            fallbackUsed
        };
        this.currentRound.errors = this.currentRound.errors || [];
        this.currentRound.errors.push(roundError);
        logger_1.logger.warn(`⚠️ Round error recorded: ${providerId}`, {
            conversationId: this.conversationId,
            error,
            recoverable
        });
    }
    /**
     * ラウンドを完了
     */
    completeRound(consensusScore, qualityScore, totalCost, totalTokens, bestResponse, earlyStop) {
        if (!this.currentRound) {
            throw new Error('No active round. Call startRound() first.');
        }
        const roundResult = {
            consensusScore,
            qualityScore,
            bestResponse,
            totalCost,
            totalTokens,
            earlyStop
        };
        this.currentRound.roundResult = roundResult;
        this.currentRound.status = 'completed';
        this.currentRound.endTime = new Date().toISOString();
        logger_1.logger.info(`✅ Round ${this.currentRound.roundNumber} completed`, {
            conversationId: this.conversationId,
            consensusScore,
            qualityScore,
            totalCost
        });
        this.currentRound = undefined;
        return roundResult;
    }
    /**
     * ラウンドを失敗としてマーク
     */
    failRound(reason) {
        if (!this.currentRound) {
            throw new Error('No active round. Call startRound() first.');
        }
        this.currentRound.status = 'failed';
        this.currentRound.endTime = new Date().toISOString();
        logger_1.logger.error(`❌ Round ${this.currentRound.roundNumber} failed`, {
            conversationId: this.conversationId,
            reason
        });
        this.currentRound = undefined;
    }
    /**
     * 合意形成プロセスを設定
     */
    setConsensusProcess(consensus) {
        this.consensusProcess = consensus;
        logger_1.logger.info('🤝 Consensus process set', {
            conversationId: this.conversationId,
            method: consensus.method,
            consensusConfidence: consensus.consensus.confidence
        });
    }
    /**
     * 集約プロセスを設定
     */
    setAggregationProcess(aggregation) {
        this.aggregationProcess = aggregation;
        logger_1.logger.info('🔄 Aggregation process set', {
            conversationId: this.conversationId,
            aggregatorId: aggregation.aggregatorId,
            inputResponsesCount: aggregation.inputResponses.length
        });
    }
    /**
     * 会話履歴を構築
     */
    build(finalAnswer, consensusScore, qualityScore, providersUsed) {
        const endTime = new Date().toISOString();
        // パフォーマンスメトリクスを計算
        const performance = this.calculatePerformance();
        const history = {
            conversationId: this.conversationId,
            sessionId: this.sessionId,
            startTime: this.startTime,
            endTime,
            executionMode: this.executionMode,
            rounds: this.rounds,
            consensusProcess: this.consensusProcess,
            aggregationProcess: this.aggregationProcess,
            finalResult: {
                answer: finalAnswer,
                consensusScore,
                qualityScore,
                providersUsed
            },
            performance
        };
        logger_1.logger.info('📚 Conversation history built', {
            conversationId: this.conversationId,
            totalRounds: this.rounds.length,
            totalCost: performance.totalCost,
            totalDurationMs: performance.totalDurationMs
        });
        return history;
    }
    /**
     * パフォーマンスメトリクスを計算
     */
    calculatePerformance() {
        const startMs = new Date(this.startTime).getTime();
        const endMs = Date.now();
        const totalDurationMs = endMs - startMs;
        let totalCost = 0;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        const providerStats = new Map();
        // 全ラウンドを集計
        for (const round of this.rounds) {
            for (const response of round.providerResponses) {
                const { providerId, message, executionTime } = response;
                totalCost += message.metadata.cost || 0;
                totalInputTokens += message.metadata.tokens?.input || 0;
                totalOutputTokens += message.metadata.tokens?.output || 0;
                // プロバイダー別集計
                const stats = providerStats.get(providerId) || {
                    calls: 0,
                    totalCost: 0,
                    totalTokens: 0,
                    totalLatency: 0
                };
                stats.calls++;
                stats.totalCost += message.metadata.cost || 0;
                stats.totalTokens += (message.metadata.tokens?.input || 0) + (message.metadata.tokens?.output || 0);
                stats.totalLatency += executionTime;
                providerStats.set(providerId, stats);
            }
        }
        const providerBreakdown = Array.from(providerStats.entries()).map(([providerId, stats]) => ({
            providerId,
            calls: stats.calls,
            totalCost: stats.totalCost,
            totalTokens: stats.totalTokens,
            averageLatencyMs: stats.calls > 0 ? stats.totalLatency / stats.calls : 0
        }));
        return {
            totalDurationMs,
            totalCost,
            totalTokens: {
                input: totalInputTokens,
                output: totalOutputTokens,
                total: totalInputTokens + totalOutputTokens
            },
            providerBreakdown
        };
    }
    /**
     * LLMメッセージを作成
     */
    createLLMMessage(role, content, provider, metadata) {
        return {
            id: this.generateMessageId(),
            role,
            provider,
            content,
            timestamp: new Date().toISOString(),
            metadata: {
                confidence: metadata?.confidence,
                tokens: metadata?.tokens,
                cost: metadata?.cost,
                latencyMs: metadata?.latencyMs,
                model: metadata?.model,
                fallbackFrom: metadata?.fallbackFrom,
                reasoning: metadata?.reasoning
            }
        };
    }
    /**
     * メッセージIDを生成
     */
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
    /**
     * 会話をエクスポート
     */
    export(format, history) {
        let content;
        switch (format) {
            case 'json':
                content = JSON.stringify(history, null, 2);
                break;
            case 'markdown':
                content = this.exportToMarkdown(history);
                break;
            case 'openai':
                content = this.exportToOpenAI(history);
                break;
            case 'anthropic':
                content = this.exportToAnthropic(history);
                break;
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
        return {
            format,
            content,
            metadata: {
                conversationId: history.conversationId,
                exportedAt: new Date().toISOString(),
                totalRounds: history.rounds.length,
                totalCost: history.performance.totalCost
            }
        };
    }
    /**
     * Markdown形式にエクスポート
     */
    exportToMarkdown(history) {
        const lines = [];
        lines.push(`# LLM Conversation History`);
        lines.push(`\n**Conversation ID**: ${history.conversationId}`);
        lines.push(`**Execution Mode**: ${history.executionMode}`);
        lines.push(`**Start Time**: ${history.startTime}`);
        lines.push(`**End Time**: ${history.endTime}`);
        lines.push(`**Total Cost**: $${history.performance.totalCost.toFixed(4)}`);
        lines.push(`\n---\n`);
        for (const round of history.rounds) {
            lines.push(`\n## Round ${round.roundNumber} (${round.status})`);
            lines.push(`\n**Prompt**: ${round.prompt.original}`);
            if (round.providerResponses.length > 0) {
                lines.push(`\n### Responses:\n`);
                for (const response of round.providerResponses) {
                    lines.push(`\n#### ${response.providerName} (Tier ${response.tier})`);
                    lines.push(`- **Confidence**: ${response.message.metadata.confidence?.toFixed(3)}`);
                    lines.push(`- **Cost**: $${response.message.metadata.cost?.toFixed(4)}`);
                    lines.push(`- **Latency**: ${response.executionTime}ms`);
                    lines.push(`\n${response.message.content}\n`);
                }
            }
            if (round.roundResult) {
                lines.push(`\n### Round Result`);
                lines.push(`- **Consensus Score**: ${round.roundResult.consensusScore.toFixed(3)}`);
                lines.push(`- **Quality Score**: ${round.roundResult.qualityScore.toFixed(3)}`);
                lines.push(`- **Total Cost**: $${round.roundResult.totalCost.toFixed(4)}`);
            }
        }
        lines.push(`\n---\n`);
        lines.push(`\n## Final Result`);
        lines.push(`\n**Answer**: ${history.finalResult.answer}`);
        lines.push(`\n**Consensus Score**: ${history.finalResult.consensusScore.toFixed(3)}`);
        lines.push(`**Quality Score**: ${history.finalResult.qualityScore.toFixed(3)}`);
        lines.push(`**Providers Used**: ${history.finalResult.providersUsed.join(', ')}`);
        return lines.join('\n');
    }
    /**
     * OpenAI ChatCompletion形式にエクスポート
     */
    exportToOpenAI(history) {
        const messages = [];
        for (const round of history.rounds) {
            // User prompt
            messages.push({
                role: 'user',
                content: round.prompt.original
            });
            // Provider responses (as assistant)
            for (const response of round.providerResponses) {
                messages.push({
                    role: 'assistant',
                    content: `[${response.providerName}] ${response.message.content}`
                });
            }
        }
        return JSON.stringify({ messages }, null, 2);
    }
    /**
     * Anthropic Messages形式にエクスポート
     */
    exportToAnthropic(history) {
        const messages = [];
        for (const round of history.rounds) {
            messages.push({
                role: 'user',
                content: round.prompt.original
            });
            for (const response of round.providerResponses) {
                messages.push({
                    role: 'assistant',
                    content: `[${response.providerName}] ${response.message.content}`
                });
            }
        }
        return JSON.stringify({ messages }, null, 2);
    }
    /**
     * 会話をバリデーション
     */
    validate(history) {
        const errors = [];
        const warnings = [];
        const checks = {
            hasRounds: history.rounds.length > 0,
            hasMessages: history.rounds.some(r => r.providerResponses.length > 0),
            hasFinalResult: !!history.finalResult.answer,
            allRoundsCompleted: history.rounds.every(r => r.status === 'completed' || r.status === 'skipped'),
            costsCalculated: history.performance.totalCost > 0,
            tokensRecorded: history.performance.totalTokens.total > 0
        };
        if (!checks.hasRounds) {
            errors.push('Conversation has no rounds');
        }
        if (!checks.hasMessages) {
            errors.push('Conversation has no provider responses');
        }
        if (!checks.hasFinalResult) {
            errors.push('Conversation has no final result');
        }
        if (!checks.allRoundsCompleted) {
            warnings.push('Some rounds are not completed');
        }
        if (!checks.costsCalculated) {
            warnings.push('No costs calculated');
        }
        if (!checks.tokensRecorded) {
            warnings.push('No tokens recorded');
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            checks
        };
    }
}
exports.ConversationHistoryBuilder = ConversationHistoryBuilder;
/**
 * 会話履歴ビルダーのファクトリー
 */
function createConversationHistoryBuilder(executionMode, sessionId) {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    return new ConversationHistoryBuilder(conversationId, executionMode, sessionId);
}
exports.createConversationHistoryBuilder = createConversationHistoryBuilder;
//# sourceMappingURL=conversation-history-builder.js.map