/**
 * LLM Provider Registry - Single Responsibility: Provider Management
 * 絶対的命令に従ったLLMプロバイダー管理クラス
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
    };
}
export type TaskType = 'basic' | 'premium' | 'critical';
/**
 * LLMプロバイダーの登録と管理のみを責任とする
 * 絶対的命令:
 * - OpenAI: 必ずcodex経由で呼び出し（直接API使用禁止）
 * - Anthropic: Claude Code直接呼び出しのみ（API使用絶対禁止）
 */
export declare class LLMProviderRegistry {
    private providers;
    private tierMapping;
    constructor();
    private initializeProviders;
    private initializeTierMapping;
    /**
     * タスクタイプに基づいてプロバイダーを選択
     */
    getProvidersForTask(taskType: TaskType, minProviders?: number): LLMProvider[];
    /**
     * プロバイダーの可用性確認
     */
    isProviderAvailable(providerName: string): boolean;
    /**
     * 利用可能なプロバイダー一覧
     */
    getAvailableProviders(): string[];
    private invokeGemini;
    private invokeGPT5;
    private invokeClaude;
}
