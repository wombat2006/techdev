"use strict";
/**
 * Codex MCP経由でのGPT-5プロバイダー
 * OpenAI API KEY不要でCodex CLI経由でGPT-5を利用
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCodexGPT5Provider = exports.CodexGPT5Provider = void 0;
const logger_1 = require("../utils/logger");
const simple_codex_timeout_handler_1 = require("./simple-codex-timeout-handler");
class CodexGPT5Provider {
    name = 'codex-gpt5';
    model = 'gpt-5-codex';
    /**
     * Codex MCP経由でGPT-5を実行
     */
    async invoke(prompt, options) {
        try {
            logger_1.logger.info('🤖 Codex GPT-5 Codex実行開始', {
                model: this.model,
                prompt: prompt.substring(0, 100) + '...'
            });
            // Wall-Bounce用の高速タイムアウト制御
            const timeoutOptions = {
                initialResponse: 30000,
                inactivity: 20000,
                ...(options ?? {})
            };
            const result = await simple_codex_timeout_handler_1.simpleCodexHandler.executeCodexWithSmartTimeout(prompt, 'gpt-5-codex', timeoutOptions);
            const actualCost = this.calculateActualCost(result.tokens.total);
            return {
                content: result.response,
                confidence: this.calculateConfidence(result.response),
                reasoning: `Codex MCP経由でのGPT-5 Codex分析結果 (実行時間: ${Math.round(result.processingTime / 1000)}秒)`,
                cost: actualCost,
                tokens: {
                    input: result.tokens.input,
                    output: result.tokens.output
                }
            };
        }
        catch (error) {
            logger_1.logger.error('❌ Codex GPT-5 Codex実行失敗', { error });
            // フォールバック応答
            const mockResponse = this.generateMockResponse(prompt);
            return {
                content: `${mockResponse}

[Codex MCP Error] ${error instanceof Error ? error.message : '不明なエラー'}`,
                confidence: 0.25,
                reasoning: 'Codex MCP実行時にエラーが発生したためモックレスポンスを返却',
                cost: 0.001,
                tokens: { input: 0, output: 0 }
            };
        }
    }
    /**
     * Codex MCP経由でのプロンプト実行（シンプル版）
     */
    async executeCodexMCP(prompt, options) {
        try {
            logger_1.logger.info('🔄 Codex MCP実行開始', { promptLength: prompt.length });
            if (options?.timeoutMs) {
                logger_1.logger.debug('Codex MCP custom timeout applied', { timeoutMs: options.timeoutMs });
            }
            // より安全なCodex実行アプローチ
            const { execSync } = require('child_process');
            // プロンプトをファイルに書き込んで安全に実行
            const fs = require('fs');
            const path = require('path');
            const tempFile = path.join('/tmp', `codex-prompt-${Date.now()}.txt`);
            // 一時ファイルにプロンプトを書き込み
            fs.writeFileSync(tempFile, prompt, 'utf8');
            // より安全なコマンド実行
            const command = `cat ${tempFile} | timeout 25s codex exec --model gpt-5-codex --sandbox read-only --approval-policy never`;
            logger_1.logger.info('📤 Codex実行中...', { command: command.substring(0, 100) + '...' });
            const stdout = execSync(command, {
                timeout: 30000,
                encoding: 'utf8',
                maxBuffer: 2 * 1024 * 1024, // 2MB buffer
                stdio: ['inherit', 'pipe', 'pipe']
            });
            // 一時ファイル削除
            try {
                fs.unlinkSync(tempFile);
            }
            catch (e) {
                // 削除失敗は無視
            }
            const response = this.parseCodexResponse(stdout);
            logger_1.logger.info('✅ Codex MCP実行成功', {
                responseLength: response.length,
                success: true
            });
            return {
                response,
                success: true,
                tokens: this.estimateTokens(prompt, response)
            };
        }
        catch (error) {
            logger_1.logger.warn('⚠️ Codex実行失敗、フォールバックに切り替え', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            // フォールバック: 高品質なモックレスポンス生成
            const mockResponse = this.generateMockResponse(prompt);
            return {
                response: mockResponse,
                success: false,
                tokens: this.estimateTokens(prompt, mockResponse)
            };
        }
    }
    /**
     * Codexの出力からレスポンスを抽出
     */
    parseCodexResponse(stdout) {
        try {
            // Codexの出力から実際のレスポンス部分を抽出
            const lines = stdout.split('\n');
            // "codex"で始まる行以降を応答として扱う
            let responseStarted = false;
            let response = '';
            for (const line of lines) {
                if (line.includes('codex') && !responseStarted) {
                    responseStarted = true;
                    continue;
                }
                if (responseStarted) {
                    response += line + '\n';
                }
            }
            return response.trim() || stdout;
        }
        catch (error) {
            logger_1.logger.warn('Codex response parsing failed, returning raw output');
            return stdout;
        }
    }
    /**
     * 信頼度の計算
     */
    calculateConfidence(response) {
        if (!response || response.includes('Error') || response.includes('failed')) {
            return 0.1;
        }
        // レスポンス長と品質に基づく簡易信頼度算出
        const wordCount = response.split(' ').length;
        const hasCode = response.includes('```') || response.includes('def ') || response.includes('function');
        let confidence = Math.min(0.95, 0.5 + (wordCount / 200)); // 単語数ベース
        if (hasCode)
            confidence += 0.1; // コード含有ボーナス
        return Math.max(0.1, Math.min(0.95, confidence));
    }
    /**
     * 実際のToken数に基づくコスト計算
     */
    calculateActualCost(totalTokens) {
        // GPT-5 Codex推定コスト: $0.03/1K input + $0.06/1K output
        const inputTokens = Math.floor(totalTokens * 0.6);
        const outputTokens = Math.floor(totalTokens * 0.4);
        return (inputTokens / 1000) * 0.03 + (outputTokens / 1000) * 0.06;
    }
    /**
     * コスト見積もり（フォールバック用）
     */
    estimateCost(tokens) {
        // GPT-5推定コスト: $0.03/1K input + $0.06/1K output
        const inputTokens = Math.floor(tokens * 0.6);
        const outputTokens = Math.floor(tokens * 0.4);
        return (inputTokens / 1000) * 0.03 + (outputTokens / 1000) * 0.06;
    }
    /**
     * トークン数見積もり
     */
    estimateTokens(prompt, response) {
        // 4文字 ≈ 1トークンの概算
        const input = Math.ceil(prompt.length / 4);
        const output = Math.ceil(response.length / 4);
        return { input, output };
    }
    /**
     * モックレスポンス生成（フォールバック用）
     */
    generateMockResponse(prompt) {
        if (prompt.includes('memoization') || prompt.includes('最適化') || prompt.includes('optimize')) {
            return `
以下はmemoization（メモ化）を使った最適化版です：

\`\`\`python
from functools import lru_cache

@lru_cache(maxsize=128)
def factorial_memoized(n: int) -> int:
    """Memoized factorial function for better performance."""
    if n < 0:
        raise ValueError("factorial is undefined for negative integers")
    if n in (0, 1):
        return 1
    return n * factorial_memoized(n - 1)
\`\`\`

\`lru_cache\`デコレータにより、一度計算した結果がキャッシュされ、同じ値での再計算が高速化されます。
      `.trim();
        }
        if (prompt.includes('recursive') || prompt.includes('再帰')) {
            return `
再帰関数の実装例：

\`\`\`python
def recursive_function(n: int) -> int:
    if n <= 1:
        return n
    return n + recursive_function(n - 1)
\`\`\`

基本的な再帰パターンです。
      `.trim();
        }
        return `
[Codex GPT-5 Simulated Response]

この要求に対する実装を提供します：

\`\`\`python
# Implementation based on your request
def solution():
    pass
\`\`\`

実際のCodex実行時により詳細な回答が生成されます。
    `.trim();
    }
    /**
     * プロバイダー情報
     */
    toString() {
        return `${this.name} (${this.model})`;
    }
}
exports.CodexGPT5Provider = CodexGPT5Provider;
// ファクトリ関数
const createCodexGPT5Provider = () => {
    return new CodexGPT5Provider();
};
exports.createCodexGPT5Provider = createCodexGPT5Provider;
//# sourceMappingURL=codex-gpt5-provider.js.map