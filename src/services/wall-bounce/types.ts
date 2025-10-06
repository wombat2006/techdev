/**
 * Wall-Bounce型定義
 * 共通の型とインターフェースを定義
 */

export interface LLMResponse {
  content: string;
  text?: string;
  confidence: number;
  reasoning: string;
  cost: number;
  tokens: {
    input: number;
    output: number;
    total?: number;
  };
  provider?: string;
}

export interface LLMProvider {
  name: string;
  model: string;
  modelArgs?: Record<string, any>;
  invoke: (prompt: string) => Promise<LLMResponse>;
}

export interface ProviderConfig {
  key: string;
  name: string;
  model: string;
  modelArgs?: Record<string, any>;
  tier: number;
  capabilities: string[];
  invocationType: 'gemini' | 'gpt5' | 'claude' | 'openrouter';
  role?: 'default-aggregator' | 'complex-aggregator';
}

export interface LLMProvidersConfig {
  providers: ProviderConfig[];
  aggregatorSelection: {
    defaultAggregator: string;
    complexAggregator: string;
    complexityThreshold: number;
    complexityIndicators: {
      keywords: string[];
      japaneseKeywords: string[];
      promptLengthThreshold: number;
      questionMarkThreshold: number;
    };
  };
  taskTypeMapping: Record<string, string>;
}

export interface WallBounceResult {
  final_answer: string;
  consensus_score: number;
  quality_score: number;
  providers_used: string[];
  responses: Array<{
    provider: string;
    content: string;
    confidence: number;
  }>;
  consensus: {
    content: string;
    confidence: number;
    reasoning: string;
  };
  llm_votes: Array<{
    provider: string;
    model: string;
    response: LLMResponse;
    agreement_score: number;
  }>;
  total_cost: number;
  processing_time_ms: number;
  debug: {
    wall_bounce_verified: boolean;
    providers_used: string[];
    tier_escalated: boolean;
    provider_errors?: string[];
  };
}

export interface ExecuteOptions {
  taskType?: 'basic' | 'premium' | 'critical';
  domain?: 'coding' | 'analysis' | 'creative' | 'general';
  minProviders?: number;
  maxProviders?: number;
  mode?: 'parallel' | 'sequential';
  depth?: number; // 1-6: シリアルモード時のwall-bounce深度 (enforced 3-6)

  // Provider selection options
  providerOverride?: string[];              // 特定プロバイダ指定
  providerOrder?: string[];                 // シリアルモード時のプロバイダ順序
  customGuidance?: Record<string, string>;  // プロバイダ固有のカスタム指示
  timeout?: number;                         // タイムアウト延長 (ms, デフォルト: 120000)

  // SSE streaming callbacks
  onThinking?: (provider: string, step: string, content: string) => void;
  onProviderResponse?: (provider: string, response: string) => void;
  onConsensusUpdate?: (score: number) => void;
  onError?: (provider: string, error: string) => void;
}

export type TaskType =
  | 'architecture'
  | 'code-review'
  | 'implementation'
  | 'security'
  | 'optimization'
  | 'integration'
  | 'general';

// ============================================================================
// MODULE INTERFACES (Schema-driven design)
// ============================================================================

/**
 * IWallBounceProviderManager
 * プロバイダー管理インターフェース
 */
export interface IWallBounceProviderManager {
  readonly providers: Map<string, LLMProvider>;
  readonly providerOrder: string[];
  readonly circuitBreakers: Map<string, any>; // CircuitBreaker type

  /**
   * プロバイダーを初期化
   */
  initializeProviders(): void;

  /**
   * プロバイダー順序を取得
   */
  getProviderOrder(options: ExecuteOptions): string[];

  /**
   * 特定のプロバイダーを選択
   */
  selectSpecificProviders(taskType: TaskType): string[];

  /**
   * Aggregatorを選択
   */
  selectAggregator(prompt: string, taskType: 'basic' | 'premium' | 'critical'): string;
}

/**
 * IWallBounceInvoker
 * LLM呼び出しインターフェース
 */
export interface IWallBounceInvoker {
  /**
   * Gemini CLI経由で呼び出し
   */
  invokeGemini(prompt: string, version: string): Promise<LLMResponse>;

  /**
   * GPT-5を呼び出し
   */
  invokeGPT5(prompt: string, config: { model: string; specialization: string }): Promise<LLMResponse>;

  /**
   * Claudeを呼び出し (内部分析 or API)
   */
  invokeClaude(prompt: string, version: string): Promise<LLMResponse>;

  /**
   * 汎用プロバイダー呼び出し
   */
  invokeProvider(
    providerKey: string,
    prompt: string,
    options: ExecuteOptions
  ): Promise<LLMResponse>;

  /**
   * Fallback付き実行（内部メソッド - インターフェースから削除）
   */
  // executeWithFallback は private メソッドのため、インターフェースから削除
}

/**
 * IWallBouncePromptBuilder
 * プロンプト構築インターフェース
 */
export interface IWallBouncePromptBuilder {
  /**
   * プロバイダー別プロンプトを構築
   */
  buildProviderPrompt(
    prompt: string,
    providerKey: string,
    options: ExecuteOptions
  ): string;

  /**
   * Deep sequentialプロンプトを構築
   */
  buildDeepSequentialPrompt(
    prompt: string,
    providerKey: string,
    roundNumber: number,
    previousResponses: LLMResponse[]
  ): string;

  /**
   * Aggregatorプロンプトを構築
   */
  buildAggregatorPrompt(
    prompt: string,
    responses: LLMResponse[]
  ): string;

  /**
   * 累積コンテキストを構築
   */
  buildCumulativeContext(responses: LLMResponse[]): string;

  /**
   * Wall-Bounce結果を構築
   */
  buildWallBounceResult(
    finalAnalysis: LLMResponse,
    responses: LLMResponse[],
    options: ExecuteOptions,
    startTime: number
  ): WallBounceResult;
}

/**
 * IWallBounceConsensus
 * コンセンサス計算インターフェース
 */
export interface IWallBounceConsensus {
  /**
   * コンセンサススコアを計算
   */
  calculateConsensusScore(responses: LLMResponse[]): number;
}

/**
 * IWallBounceExecutor
 * 実行モード管理インターフェース
 */
export interface IWallBounceExecutor {
  /**
   * Wall-Bounceを実行（メインエントリーポイント）
   */
  execute(prompt: string, options: ExecuteOptions): Promise<WallBounceResult>;
}

/**
 * IWallBounceTaskAnalyzer
 * タスク分析インターフェース
 */
export interface IWallBounceTaskAnalyzer {
  /**
   * タスクタイプを検出
   */
  detectTaskType(prompt: string): TaskType;

  /**
   * コーディングタスクか判定
   */
  isCodingTask(prompt: string): boolean;

  /**
   * タスク別分析を実行
   */
  analyzeByTaskType(prompt: string, taskType: TaskType, options: ExecuteOptions): Promise<WallBounceResult>;
}
