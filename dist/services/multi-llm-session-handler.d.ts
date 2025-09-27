/**
 * Multi-LLM Session Handler
 * CLAUDE.md準拠: 2回目以降のセッション継続で異なるLLMプロバイダーにルーティング
 * フロー: User -> Claude Code -> Wall-Bounce -> GPT-5 -> Gemini-2.5-Pro -> Claude Sonnet4 -> Claude Code -> User
 */
export interface LLMProviderConfig {
    name: string;
    model: string;
    priority: number;
    specialization: 'coding' | 'analysis' | 'creative' | 'general';
}
export interface MultiLLMSessionConfig {
    minProviders: number;
    maxProviders: number;
    requireConsensus: boolean;
    confidenceThreshold: number;
    rotationPolicy: 'round-robin' | 'expertise-based' | 'random';
}
export interface MultiLLMResponse {
    success: boolean;
    sessionId: string;
    conversationId: string;
    response?: string;
    error?: string;
    metadata: {
        primaryLLM: string;
        wallBounceProviders: string[];
        consensusConfidence: number;
        totalCost: number;
        processingTimeMs: number;
        turnNumber: number;
        routingStrategy: string;
    };
}
export declare class MultiLLMSessionHandler {
    private wallBounceAnalyzer;
    private codexWrapper;
    private sessionManager;
    private llmProviders;
    constructor();
    /**
     * セッション継続時のマルチLLMルーティング処理
     */
    continueSessionWithWallBounce(args: {
        sessionId: string;
        prompt: string;
        userId?: string;
    }): Promise<MultiLLMResponse>;
    /**
     * ターン1: 直接Codex実行
     */
    private executeDirectCodex;
    /**
     * ターン2以降: Wall-Bounce分析実行
     */
    private executeWallBounceAnalysis;
    /**
     * 文脈プロンプトの構築
     */
    private buildContextualPrompt;
    /**
     * ターン数に応じたWall-Bounce設定
     */
    private getWallBounceConfig;
    /**
     * エラーレスポンス生成
     */
    private createErrorResponse;
    /**
     * セッション統計取得
     */
    getSessionStats(sessionId: string): Promise<{
        totalTurns: number;
        llmProviderUsage: Record<string, number>;
        totalCost: number;
        averageConfidence: number;
    }>;
}
export declare const getMultiLLMSessionHandler: () => MultiLLMSessionHandler;
