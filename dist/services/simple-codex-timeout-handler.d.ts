/**
 * シンプルなCodexタイムアウト制御とToken数実数取得
 */
export interface SimpleCodexResult {
    response: string;
    success: boolean;
    tokens: {
        input: number;
        output: number;
        total: number;
    };
    processingTime: number;
}
export declare class SimpleCodexTimeoutHandler {
    /**
     * シンプルな二段階タイムアウト制御
     */
    executeCodexWithSmartTimeout(prompt: string, model?: 'gpt-5' | 'gpt-5-codex', timeouts?: {
        initialResponse: number;
        inactivity: number;
    }): Promise<SimpleCodexResult>;
    /**
     * Codex出力の解析とToken数実数取得
     */
    private parseCodexOutput;
    /**
     * 実際のレスポンス部分を抽出（シンプル版）
     */
    private extractActualResponse;
    /**
     * 応答完了の簡単な判定
     */
    isResponseComplete(output: string): boolean;
    /**
     * Stuck状態の簡単な判定
     */
    isLikelyStuck(output: string, inactivityMs: number): boolean;
}
export declare const simpleCodexHandler: SimpleCodexTimeoutHandler;
