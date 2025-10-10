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

// ============================================================================
// LLMメッセージ構造
// ============================================================================

/**
 * LLM間のメッセージタイプ
 */
export type LLMMessageRole =
  | 'user'           // ユーザーからの入力
  | 'provider'       // LLMプロバイダーからの応答
  | 'aggregator'     // アグリゲーターからの統合結果
  | 'system';        // システムメッセージ（プロンプト構築など）

/**
 * LLMメッセージ（単一のやり取り）
 */
export interface LLMMessage {
  id: string;                    // メッセージID（一意識別子）
  role: LLMMessageRole;          // メッセージ送信者の役割
  provider?: string;             // プロバイダーID（role=providerの場合）
  content: string;               // メッセージ本文
  timestamp: string;             // ISO 8601 timestamp
  metadata: LLMMessageMetadata;  // メタデータ
}

/**
 * LLMメッセージメタデータ
 */
export interface LLMMessageMetadata {
  confidence?: number;           // 信頼度スコア（0-1）
  tokens?: {
    input: number;
    output: number;
    total?: number;              // オプショナル（LLMResponse互換）
  };
  cost?: number;                 // USD
  latencyMs?: number;            // レイテンシ（ミリ秒）
  model?: string;                // 使用モデル名
  fallbackFrom?: string;         // フォールバック元プロバイダー
  reasoning?: string;            // 推論プロセスの説明
}

// ============================================================================
// 会話ラウンド構造
// ============================================================================

/**
 * ラウンドステータス
 */
export type RoundStatus =
  | 'pending'     // 開始待ち
  | 'running'     // 実行中
  | 'completed'   // 完了
  | 'failed'      // 失敗
  | 'skipped';    // スキップ（early stop等）

/**
 * 会話ラウンド（1回のLLM呼び出しサイクル）
 */
export interface ConversationRound {
  roundNumber: number;           // ラウンド番号（1始まり）
  status: RoundStatus;           // ステータス
  mode: 'parallel' | 'sequential' | 'deep-sequential';
  startTime: string;             // ISO 8601 timestamp
  endTime?: string;              // ISO 8601 timestamp（完了時）

  // プロンプト情報
  prompt: {
    original: string;            // 元のユーザープロンプト
    enriched?: string;           // エンリッチされたプロンプト
    context?: string;            // 前ラウンドからのコンテキスト
  };

  // プロバイダー応答
  providerResponses: ProviderResponse[];

  // ラウンド結果
  roundResult?: RoundResult;

  // エラー情報
  errors?: RoundError[];
}

/**
 * プロバイダー応答（1つのLLMからの返答）
 */
export interface ProviderResponse {
  providerId: string;            // プロバイダーID
  providerName: string;          // プロバイダー名（表示用）
  tier: number;                  // プロバイダーTier
  message: LLMMessage;           // LLMメッセージ
  response: LLMResponse;         // レガシー互換用
  executionTime: number;         // 実行時間（ミリ秒）
  circuitBreakerState?: 'closed' | 'open' | 'half-open';
}

/**
 * ラウンド結果（1ラウンドの集約結果）
 */
export interface RoundResult {
  consensusScore: number;        // 合意スコア（0-1）
  qualityScore: number;          // 品質スコア（0-1）
  bestResponse?: ProviderResponse; // 最高評価応答
  totalCost: number;             // 累積コスト（USD）
  totalTokens: number;           // 累積トークン数

  // Early stop判定
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
  timestamp: string;             // ISO 8601 timestamp
  recoverable: boolean;
  fallbackUsed?: string;         // 使用されたフォールバック
}

// ============================================================================
// 合意形成プロセス
// ============================================================================

/**
 * 合意形成プロセス（Consensus Building）
 */
export interface ConsensusProcess {
  method: 'quorum' | 'weighted-average' | 'majority-vote';

  // スコア計算
  scores: ProviderScore[];       // 各プロバイダーのスコア

  // 投票情報（quorum方式）
  votes?: {
    confirm: number;
    abstain: number;
    reject: number;
    distribution: Record<string, number>; // providerId -> vote count
  };

  // 重み付け平均（weighted-average方式）
  weights?: Record<string, number>; // providerId -> weight

  // 最終合意
  consensus: {
    content: string;             // 合意された内容
    confidence: number;          // 合意の信頼度
    reasoning: string;           // 合意に至った理由
    achievedAt?: string;         // ISO 8601 timestamp
  };

  // メトリクス
  metrics: {
    averageConfidence: number;
    medianConfidence: number;
    standardDeviation: number;
    agreementRate: number;       // 応答間の一致率
  };
}

// ============================================================================
// 集約プロセス
// ============================================================================

/**
 * 集約プロセス（Aggregation）
 */
export interface AggregationProcess {
  aggregatorId: string;          // アグリゲーターID（sonnet-4.5等）
  aggregatorTier: number;        // アグリゲーターTier

  // 入力データ
  inputResponses: ProviderResponse[];

  // アグリゲータープロンプト
  aggregatorPrompt: {
    template: string;            // プロンプトテンプレート
    context: string;             // 統合コンテキスト
    fullPrompt: string;          // 完全なプロンプト
  };

  // アグリゲーター応答
  aggregatorResponse: LLMMessage;

  // フォールバック情報
  fallback?: {
    primaryAggregator: string;
    fallbackAggregator: string;
    reason: string;
  };

  // 統合結果
  synthesis: {
    finalAnswer: string;
    confidence: number;
    quality: number;
    reasoning: string;
  };
}

// ============================================================================
// 会話履歴
// ============================================================================

/**
 * 会話履歴（全ラウンドの記録）
 */
export interface ConversationHistory {
  conversationId: string;        // 会話ID
  sessionId?: string;            // セッションID（オプション）

  // タイムスタンプ
  startTime: string;             // ISO 8601 timestamp
  endTime?: string;              // ISO 8601 timestamp

  // 実行モード
  executionMode: 'parallel' | 'sequential' | 'deep-sequential';

  // ラウンド履歴
  rounds: ConversationRound[];

  // 合意形成プロセス
  consensusProcess?: ConsensusProcess;

  // 集約プロセス
  aggregationProcess?: AggregationProcess;

  // 最終結果
  finalResult: {
    answer: string;
    consensusScore: number;
    qualityScore: number;
    providersUsed: string[];
  };

  // コスト・パフォーマンス
  performance: ConversationPerformance;
}

/**
 * 会話パフォーマンスメトリクス
 */
export interface ConversationPerformance {
  totalDurationMs: number;       // 合計実行時間
  totalCost: number;             // 合計コスト（USD）
  totalTokens: {
    input: number;
    output: number;
    total: number;
  };

  // プロバイダー別集計
  providerBreakdown: Array<{
    providerId: string;
    calls: number;
    totalCost: number;
    totalTokens: number;
    averageLatencyMs: number;
  }>;

  // Early stop効果
  earlyStopSavings?: {
    providersSkipped: number;
    estimatedCostSaved: number;
    estimatedTimeSaved: number;
  };
}

// ============================================================================
// 実行モード固有型
// ============================================================================

/**
 * Parallelモード会話
 */
export interface ParallelConversation {
  mode: 'parallel';
  providers: string[];           // 並列実行プロバイダー
  concurrency: number;           // 同時実行数
  results: ProviderResponse[];   // 全プロバイダー結果
}

/**
 * Sequentialモード会話
 */
export interface SequentialConversation {
  mode: 'sequential';
  providerOrder: string[];       // 実行順序
  rounds: SequentialRound[];     // 各ラウンドの詳細
}

/**
 * Sequentialラウンド
 */
export interface SequentialRound {
  roundNumber: number;
  providerId: string;
  input: {
    userPrompt: string;
    previousContext?: string;    // 前ラウンドのコンテキスト
  };
  output: ProviderResponse;
}

/**
 * Deep Sequentialモード会話
 */
export interface DeepSequentialConversation {
  mode: 'deep-sequential';
  depth: number;                 // 深さ（3-6）
  providerChain: string[];       // プロバイダーチェーン
  rounds: DeepSequentialRound[];
  cumulativeContext: string[];   // 累積コンテキスト
}

/**
 * Deep Sequentialラウンド
 */
export interface DeepSequentialRound extends SequentialRound {
  depth: number;                 // このラウンドの深さ
  enrichment: {
    previousResponses: string[]; // 前の全応答
    cumulativeInsights: string;  // 累積的な洞察
  };
}

// ============================================================================
// 会話ビルダーヘルパー型
// ============================================================================

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
export type ConversationExportFormat =
  | 'json'          // JSON形式
  | 'markdown'      // Markdown形式（人間可読）
  | 'openai'        // OpenAI ChatCompletion形式
  | 'anthropic';    // Anthropic Messages形式

/**
 * エクスポートされた会話
 */
export interface ExportedConversation {
  format: ConversationExportFormat;
  content: string;
  metadata: {
    conversationId: string;
    exportedAt: string;         // ISO 8601 timestamp
    totalRounds: number;
    totalCost: number;
  };
}

// ============================================================================
// バリデーション型
// ============================================================================

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
