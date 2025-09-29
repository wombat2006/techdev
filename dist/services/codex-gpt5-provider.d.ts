/**
 * Codex MCP経由でのGPT-5プロバイダー
 * OpenAI API KEY不要でCodex CLI経由でGPT-5を利用
 */
import { LLMProvider, LLMResponse } from './wall-bounce-analyzer';
export declare class CodexGPT5Provider implements LLMProvider {
    name: string;
    model: string;
    /**
     * Codex MCP経由でGPT-5を実行
     */
    invoke(prompt: string, options?: {
        initialResponse?: number;
        inactivity?: number;
    }): Promise<LLMResponse>;
    /**
     * Codex MCP経由でのプロンプト実行（シンプル版）
     */
    private executeCodexMCP;
    /**
     * Codexの出力からレスポンスを抽出
     */
    private parseCodexResponse;
    /**
     * 信頼度の計算
     */
    private calculateConfidence;
    /**
     * 実際のToken数に基づくコスト計算
     */
    private calculateActualCost;
    /**
     * コスト見積もり（フォールバック用）
     */
    private estimateCost;
    /**
     * トークン数見積もり
     */
    private estimateTokens;
    /**
     * モックレスポンス生成（フォールバック用）
     */
    private generateMockResponse;
    /**
     * プロバイダー情報
     */
    toString(): string;
}
export declare const createCodexGPT5Provider: () => CodexGPT5Provider;
