/**
 * LLM Conversation Schemas
 * LLM間の会話構造を完全に型定義
 *
 * このスキーマはWall-Bounce実行時のLLM間会話を構造化します：
 * - 各ラウンドの会話データ
 * - LLM間のメッセージフロー
 * - 合意形成プロセス
 * - 集約プロセス
 * - 会話履歴
 */
import { LLMResponse } from '../services/wall-bounce/types';
import { QuorumResult, ProviderScore } from './wall-bounce-nextgen';
/**
 * LLM間のメッセージタイプ
 */
export type LLMMessageRole = 'user' | 'provider' | 'aggregator' | 'system';
/**
 * LLMメッセージ（単一のやり取り）
 */
export interface LLMMessage {
    id: string;
    role: LLMMessageRole;
    provider?: string;
    content: string;
    timestamp: string;
    metadata: LLMMessageMetadata;
}
/**
 * LLMメッセージメタデータ
 */
export interface LLMMessageMetadata {
    confidence?: number;
    tokens?: {
        input: number;
        output: number;
        total?: number;
    };
    cost?: number;
    latencyMs?: number;
    model?: string;
    fallbackFrom?: string;
    reasoning?: string;
}
/**
 * ラウンドステータス
 */
export type RoundStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
/**
 * 会話ラウンド（1回のLLM呼び出しサイクル）
 */
export interface ConversationRound {
    roundNumber: number;
    status: RoundStatus;
    mode: 'parallel' | 'sequential' | 'deep-sequential';
    startTime: string;
    endTime?: string;
    prompt: {
        original: string;
        enriched?: string;
        context?: string;
    };
    providerResponses: ProviderResponse[];
    roundResult?: RoundResult;
    errors?: RoundError[];
}
/**
 * プロバイダー応答（1つのLLMからの返答）
 */
export interface ProviderResponse {
    providerId: string;
    providerName: string;
    tier: number;
    message: LLMMessage;
    response: LLMResponse;
    executionTime: number;
    circuitBreakerState?: 'closed' | 'open' | 'half-open';
}
/**
 * ラウンド結果（1ラウンドの集約結果）
 */
export interface RoundResult {
    consensusScore: number;
    qualityScore: number;
    bestResponse?: ProviderResponse;
    totalCost: number;
    totalTokens: number;
    earlyStop?: {
        triggered: boolean;
        reason: string;
        quorumResult?: QuorumResult;
    };
}
/**
 * ラウンドエラー
 */
export interface RoundError {
    providerId: string;
    error: string;
    timestamp: string;
    recoverable: boolean;
    fallbackUsed?: string;
}
/**
 * 合意形成プロセス（Consensus Building）
 */
export interface ConsensusProcess {
    method: 'quorum' | 'weighted-average' | 'majority-vote';
    scores: ProviderScore[];
    votes?: {
        confirm: number;
        abstain: number;
        reject: number;
        distribution: Record<string, number>;
    };
    weights?: Record<string, number>;
    consensus: {
        content: string;
        confidence: number;
        reasoning: string;
        achievedAt?: string;
    };
    metrics: {
        averageConfidence: number;
        medianConfidence: number;
        standardDeviation: number;
        agreementRate: number;
    };
}
/**
 * 集約プロセス（Aggregation）
 */
export interface AggregationProcess {
    aggregatorId: string;
    aggregatorTier: number;
    inputResponses: ProviderResponse[];
    aggregatorPrompt: {
        template: string;
        context: string;
        fullPrompt: string;
    };
    aggregatorResponse: LLMMessage;
    fallback?: {
        primaryAggregator: string;
        fallbackAggregator: string;
        reason: string;
    };
    synthesis: {
        finalAnswer: string;
        confidence: number;
        quality: number;
        reasoning: string;
    };
}
/**
 * 会話履歴（全ラウンドの記録）
 */
export interface ConversationHistory {
    conversationId: string;
    sessionId?: string;
    startTime: string;
    endTime?: string;
    executionMode: 'parallel' | 'sequential' | 'deep-sequential';
    rounds: ConversationRound[];
    consensusProcess?: ConsensusProcess;
    aggregationProcess?: AggregationProcess;
    finalResult: {
        answer: string;
        consensusScore: number;
        qualityScore: number;
        providersUsed: string[];
    };
    performance: ConversationPerformance;
}
/**
 * 会話パフォーマンスメトリクス
 */
export interface ConversationPerformance {
    totalDurationMs: number;
    totalCost: number;
    totalTokens: {
        input: number;
        output: number;
        total: number;
    };
    providerBreakdown: Array<{
        providerId: string;
        calls: number;
        totalCost: number;
        totalTokens: number;
        averageLatencyMs: number;
    }>;
    earlyStopSavings?: {
        providersSkipped: number;
        estimatedCostSaved: number;
        estimatedTimeSaved: number;
    };
}
/**
 * Parallelモード会話
 */
export interface ParallelConversation {
    mode: 'parallel';
    providers: string[];
    concurrency: number;
    results: ProviderResponse[];
}
/**
 * Sequentialモード会話
 */
export interface SequentialConversation {
    mode: 'sequential';
    providerOrder: string[];
    rounds: SequentialRound[];
}
/**
 * Sequentialラウンド
 */
export interface SequentialRound {
    roundNumber: number;
    providerId: string;
    input: {
        userPrompt: string;
        previousContext?: string;
    };
    output: ProviderResponse;
}
/**
 * Deep Sequentialモード会話
 */
export interface DeepSequentialConversation {
    mode: 'deep-sequential';
    depth: number;
    providerChain: string[];
    rounds: DeepSequentialRound[];
    cumulativeContext: string[];
}
/**
 * Deep Sequentialラウンド
 */
export interface DeepSequentialRound extends SequentialRound {
    depth: number;
    enrichment: {
        previousResponses: string[];
        cumulativeInsights: string;
    };
}
/**
 * 会話構築オプション
 */
export interface ConversationBuildOptions {
    includeSystemMessages?: boolean;
    includeMetadata?: boolean;
    includeErrors?: boolean;
    maxRounds?: number;
}
/**
 * 会話エクスポート形式
 */
export type ConversationExportFormat = 'json' | 'markdown' | 'openai' | 'anthropic';
/**
 * エクスポートされた会話
 */
export interface ExportedConversation {
    format: ConversationExportFormat;
    content: string;
    metadata: {
        conversationId: string;
        exportedAt: string;
        totalRounds: number;
        totalCost: number;
    };
}
/**
 * 会話バリデーション結果
 */
export interface ConversationValidation {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    checks: {
        hasRounds: boolean;
        hasMessages: boolean;
        hasFinalResult: boolean;
        allRoundsCompleted: boolean;
        costsCalculated: boolean;
        tokensRecorded: boolean;
    };
}
