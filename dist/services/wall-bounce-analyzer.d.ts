/**
 * 壁打ち分析システム - 複数LLMによる協調分析
 * 必須要件: すべてのクエリで最低2つのLLMによる分析を実行
 */
export interface LLMProvider {
    name: string;
    model: string;
    invoke: (prompt: string, options?: any) => Promise<LLMResponse>;
}
export interface LLMResponse {
    content: string;
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
    };
}
export declare class WallBounceAnalyzer {
    private providers;
    constructor();
    private initializeProviders;
    /**
     * Google Gemini API経由での実行
     */
    private executeGeminiCLI;
    /**
     * 壁打ち分析の実行 - 必須：最低2つのLLMで分析
     */
    executeWallBounce(prompt: string, options?: {
        taskType?: 'basic' | 'premium' | 'critical';
    }): Promise<WallBounceResult>;
    private invokeGemini;
    private invokeGPT5;
    private invokeClaude;
    private performClaudeInternalAnalysis;
}
export declare const wallBounceAnalyzer: WallBounceAnalyzer;
