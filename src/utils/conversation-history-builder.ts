/**
 * Conversation History Builder
 * LLM間会話履歴を構築・管理するビルダークラス
 */

import {
  ConversationHistory,
  ConversationRound,
  ProviderResponse,
  LLMMessage,
  LLMMessageMetadata,
  LLMMessageRole,
  RoundStatus,
  RoundResult,
  RoundError,
  ConsensusProcess,
  AggregationProcess,
  ConversationPerformance,
  ConversationValidation,
  ExportedConversation,
  ConversationExportFormat
} from '../types/llm-conversation-schemas';
import { LLMResponse } from '../services/wall-bounce/types';
import { QuorumResult } from '../types/wall-bounce-nextgen';
import { logger } from './logger';

/**
 * 会話履歴ビルダー
 */
export class ConversationHistoryBuilder {
  private conversationId: string;
  private sessionId?: string;
  private startTime: string;
  private executionMode: 'parallel' | 'sequential' | 'deep-sequential';
  private rounds: ConversationRound[] = [];
  private currentRound?: ConversationRound;
  private consensusProcess?: ConsensusProcess;
  private aggregationProcess?: AggregationProcess;
  private performanceData: Partial<ConversationPerformance> = {};

  constructor(
    conversationId: string,
    executionMode: 'parallel' | 'sequential' | 'deep-sequential',
    sessionId?: string
  ) {
    this.conversationId = conversationId;
    this.executionMode = executionMode;
    this.sessionId = sessionId;
    this.startTime = new Date().toISOString();

    logger.info('📚 ConversationHistoryBuilder initialized', {
      conversationId,
      executionMode,
      sessionId
    });
  }

  /**
   * 新しいラウンドを開始
   */
  startRound(
    roundNumber: number,
    originalPrompt: string,
    enrichedPrompt?: string,
    context?: string
  ): ConversationRound {
    const round: ConversationRound = {
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

    logger.info(`🔄 Round ${roundNumber} started`, {
      conversationId: this.conversationId,
      mode: this.executionMode
    });

    return round;
  }

  /**
   * プロバイダー応答を追加
   */
  addProviderResponse(
    providerId: string,
    providerName: string,
    tier: number,
    response: LLMResponse,
    executionTime: number,
    circuitBreakerState?: 'closed' | 'open' | 'half-open'
  ): ProviderResponse {
    if (!this.currentRound) {
      throw new Error('No active round. Call startRound() first.');
    }

    const message = this.createLLMMessage(
      'provider',
      response.content || response.text || '',
      providerId,
      {
        confidence: response.confidence,
        tokens: response.tokens,
        cost: response.cost,
        model: response.provider,
        reasoning: response.reasoning
      }
    );

    const providerResponse: ProviderResponse = {
      providerId,
      providerName,
      tier,
      message,
      response,
      executionTime,
      circuitBreakerState
    };

    this.currentRound.providerResponses.push(providerResponse);

    logger.debug(`✅ Provider response added: ${providerId}`, {
      conversationId: this.conversationId,
      roundNumber: this.currentRound.roundNumber,
      executionTime
    });

    return providerResponse;
  }

  /**
   * ラウンドエラーを記録
   */
  addRoundError(
    providerId: string,
    error: string,
    recoverable: boolean,
    fallbackUsed?: string
  ): void {
    if (!this.currentRound) {
      throw new Error('No active round. Call startRound() first.');
    }

    const roundError: RoundError = {
      providerId,
      error,
      timestamp: new Date().toISOString(),
      recoverable,
      fallbackUsed
    };

    this.currentRound.errors = this.currentRound.errors || [];
    this.currentRound.errors.push(roundError);

    logger.warn(`⚠️ Round error recorded: ${providerId}`, {
      conversationId: this.conversationId,
      error,
      recoverable
    });
  }

  /**
   * ラウンドを完了
   */
  completeRound(
    consensusScore: number,
    qualityScore: number,
    totalCost: number,
    totalTokens: number,
    bestResponse?: ProviderResponse,
    earlyStop?: { triggered: boolean; reason: string; quorumResult?: QuorumResult }
  ): RoundResult {
    if (!this.currentRound) {
      throw new Error('No active round. Call startRound() first.');
    }

    const roundResult: RoundResult = {
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

    logger.info(`✅ Round ${this.currentRound.roundNumber} completed`, {
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
  failRound(reason: string): void {
    if (!this.currentRound) {
      throw new Error('No active round. Call startRound() first.');
    }

    this.currentRound.status = 'failed';
    this.currentRound.endTime = new Date().toISOString();

    logger.error(`❌ Round ${this.currentRound.roundNumber} failed`, {
      conversationId: this.conversationId,
      reason
    });

    this.currentRound = undefined;
  }

  /**
   * 合意形成プロセスを設定
   */
  setConsensusProcess(consensus: ConsensusProcess): void {
    this.consensusProcess = consensus;

    logger.info('🤝 Consensus process set', {
      conversationId: this.conversationId,
      method: consensus.method,
      consensusConfidence: consensus.consensus.confidence
    });
  }

  /**
   * 集約プロセスを設定
   */
  setAggregationProcess(aggregation: AggregationProcess): void {
    this.aggregationProcess = aggregation;

    logger.info('🔄 Aggregation process set', {
      conversationId: this.conversationId,
      aggregatorId: aggregation.aggregatorId,
      inputResponsesCount: aggregation.inputResponses.length
    });
  }

  /**
   * 会話履歴を構築
   */
  build(
    finalAnswer: string,
    consensusScore: number,
    qualityScore: number,
    providersUsed: string[]
  ): ConversationHistory {
    const endTime = new Date().toISOString();

    // パフォーマンスメトリクスを計算
    const performance = this.calculatePerformance();

    const history: ConversationHistory = {
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

    logger.info('📚 Conversation history built', {
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
  private calculatePerformance(): ConversationPerformance {
    const startMs = new Date(this.startTime).getTime();
    const endMs = Date.now();
    const totalDurationMs = endMs - startMs;

    let totalCost = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    const providerStats: Map<string, {
      calls: number;
      totalCost: number;
      totalTokens: number;
      totalLatency: number;
    }> = new Map();

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
  private createLLMMessage(
    role: LLMMessageRole,
    content: string,
    provider?: string,
    metadata?: Partial<LLMMessageMetadata>
  ): LLMMessage {
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
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 会話をエクスポート
   */
  export(format: ConversationExportFormat, history: ConversationHistory): ExportedConversation {
    let content: string;

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
  private exportToMarkdown(history: ConversationHistory): string {
    const lines: string[] = [];

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
  private exportToOpenAI(history: ConversationHistory): string {
    const messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: string;
    }> = [];

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
  private exportToAnthropic(history: ConversationHistory): string {
    const messages: Array<{
      role: 'user' | 'assistant';
      content: string;
    }> = [];

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
  validate(history: ConversationHistory): ConversationValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

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

/**
 * 会話履歴ビルダーのファクトリー
 */
export function createConversationHistoryBuilder(
  executionMode: 'parallel' | 'sequential' | 'deep-sequential',
  sessionId?: string
): ConversationHistoryBuilder {
  const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  return new ConversationHistoryBuilder(conversationId, executionMode, sessionId);
}
