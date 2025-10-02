/**
 * 壁打ち分析システム - 複数LLMによる協調分析
 * 必須要件: すべてのクエリで最低2つのLLMによる分析を実行
 */
export interface LLMProvider {
    name: string;
    model: string;
    modelArgs?: {
        version?: string;
        specialization?: string;
        [key: string]: any;
    };
    invoke: (prompt: string, options?: any) => Promise<LLMResponse>;
}
export interface LLMResponse {
    content: string;
    text: string;
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
interface ExecuteOptions {
    taskType?: 'basic' | 'premium' | 'critical';
    domain?: 'coding' | 'analysis' | 'creative' | 'general';
    minProviders?: number;
    maxProviders?: number;
    mode?: 'parallel' | 'sequential';
    depth?: number;
    onThinking?: (provider: string, step: string, content: string) => void;
    onProviderResponse?: (provider: string, response: string) => void;
    onConsensusUpdate?: (score: number) => void;
}
export declare class WallBounceAnalyzer {
    private providers;
    private providerOrder;
    constructor();
    private initializeProviders;
    private createOpenRouterProvider;
    /**
     * Determine query complexity and select appropriate aggregator
     * Uses Sonnet 4.5 for most queries, escalates to Opus 4.1 for complex cases
     */
    private selectAggregator;
    /**
     * Google Gemini API経由での実行
     */
    private executeGeminiCLI;
    /**
     * 壁打ち分析の実行 - モードによって並列/逐次を切り替え
     */
    executeWallBounce(prompt: string, options?: ExecuteOptions): Promise<WallBounceResult>;
    private executeParallelMode;
    private executeSequentialMode;
    private buildProviderPrompt;
    private buildAggregatorPrompt;
    private updateSequentialSummary;
    private buildWallBounceResult;
    private invokeProvider;
    private truncate;
    private calculateConsensusScore;
    private getProviderOrder;
    private isCodingTask;
    private invokeGemini;
    private invokeGPT5;
    private invokeClaude;
    private performClaudeInternalAnalysis;
}
export declare const wallBounceAnalyzer: WallBounceAnalyzer;
export {};
