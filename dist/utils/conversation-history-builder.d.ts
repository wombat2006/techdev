/**
 * Conversation History Builder
 * LLM間会話履歴を構築・管理するビルダークラス
 */
import { ConversationHistory, ConversationRound, ProviderResponse, RoundResult, ConsensusProcess, AggregationProcess, ConversationValidation, ExportedConversation, ConversationExportFormat } from '../types/llm-conversation-schemas';
import { LLMResponse } from '../services/wall-bounce/types';
import { QuorumResult } from '../types/wall-bounce-nextgen';
/**
 * 会話履歴ビルダー
 */
export declare class ConversationHistoryBuilder {
    private conversationId;
    private sessionId?;
    private startTime;
    private executionMode;
    private rounds;
    private currentRound?;
    private consensusProcess?;
    private aggregationProcess?;
    private performanceData;
    constructor(conversationId: string, executionMode: 'parallel' | 'sequential' | 'deep-sequential', sessionId?: string);
    /**
     * 新しいラウンドを開始
     */
    startRound(roundNumber: number, originalPrompt: string, enrichedPrompt?: string, context?: string): ConversationRound;
    /**
     * プロバイダー応答を追加
     */
    addProviderResponse(providerId: string, providerName: string, tier: number, response: LLMResponse, executionTime: number, circuitBreakerState?: 'closed' | 'open' | 'half-open'): ProviderResponse;
    /**
     * ラウンドエラーを記録
     */
    addRoundError(providerId: string, error: string, recoverable: boolean, fallbackUsed?: string): void;
    /**
     * ラウンドを完了
     */
    completeRound(consensusScore: number, qualityScore: number, totalCost: number, totalTokens: number, bestResponse?: ProviderResponse, earlyStop?: {
        triggered: boolean;
        reason: string;
        quorumResult?: QuorumResult;
    }): RoundResult;
    /**
     * ラウンドを失敗としてマーク
     */
    failRound(reason: string): void;
    /**
     * 合意形成プロセスを設定
     */
    setConsensusProcess(consensus: ConsensusProcess): void;
    /**
     * 集約プロセスを設定
     */
    setAggregationProcess(aggregation: AggregationProcess): void;
    /**
     * 会話履歴を構築
     */
    build(finalAnswer: string, consensusScore: number, qualityScore: number, providersUsed: string[]): ConversationHistory;
    /**
     * パフォーマンスメトリクスを計算
     */
    private calculatePerformance;
    /**
     * LLMメッセージを作成
     */
    private createLLMMessage;
    /**
     * メッセージIDを生成
     */
    private generateMessageId;
    /**
     * 会話をエクスポート
     */
    export(format: ConversationExportFormat, history: ConversationHistory): ExportedConversation;
    /**
     * Markdown形式にエクスポート
     */
    private exportToMarkdown;
    /**
     * OpenAI ChatCompletion形式にエクスポート
     */
    private exportToOpenAI;
    /**
     * Anthropic Messages形式にエクスポート
     */
    private exportToAnthropic;
    /**
     * 会話をバリデーション
     */
    validate(history: ConversationHistory): ConversationValidation;
}
/**
 * 会話履歴ビルダーのファクトリー
 */
export declare function createConversationHistoryBuilder(executionMode: 'parallel' | 'sequential' | 'deep-sequential', sessionId?: string): ConversationHistoryBuilder;
