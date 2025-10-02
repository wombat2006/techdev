/**
 * OpenRouter経由でのQwen3-Coderプロバイダー
 * 480B MoE (35B active) コーディング特化モデル
 */
import { LLMProvider, LLMResponse } from './wall-bounce-analyzer';
export declare class OpenRouterQwen3Provider implements LLMProvider {
    name: string;
    model: string;
    private apiKey;
    private baseUrl;
    constructor();
    /**
     * Qwen3-Coder実行
     */
    invoke(prompt: string, options?: {
        temperature?: number;
        maxTokens?: number;
    }): Promise<LLMResponse>;
    /**
     * OpenRouter APIへのリクエスト
     */
    private callOpenRouter;
    /**
     * コスト計算
     * Qwen3-Coder: $0.22/M input, $0.95/M output
     */
    private calculateCost;
    /**
     * 信頼度の計算
     */
    private calculateConfidence;
    /**
     * プロバイダー情報
     */
    toString(): string;
}
/**
 * ファクトリ関数
 */
export declare const createOpenRouterQwen3Provider: () => OpenRouterQwen3Provider;
