"use strict";
/**
 * シンプルなCodexタイムアウト制御とToken数実数取得
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleCodexHandler = exports.SimpleCodexTimeoutHandler = void 0;
const child_process_1 = require("child_process");
const logger_1 = require("../utils/logger");
class SimpleCodexTimeoutHandler {
    /**
     * シンプルな二段階タイムアウト制御
     */
    async executeCodexWithSmartTimeout(prompt, model = 'gpt-5-codex', timeouts = {
        initialResponse: 600000, // 10分 - より長い初期レスポンス待ち
        inactivity: 90000 // 90秒 - より現実的な無反応タイムアウト
    }) {
        const startTime = Date.now();
        const fs = require('fs');
        const path = require('path');
        const tempFile = path.join('/tmp', `codex-prompt-${Date.now()}.txt`);
        fs.writeFileSync(tempFile, prompt, 'utf8');
        return new Promise((resolve, reject) => {
            const codexProcess = (0, child_process_1.spawn)('codex', [
                'exec', '--model', model, '--sandbox', 'read-only'
            ], {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            let outputBuffer = '';
            // let lastOutputTime = Date.now(); // 未使用のため削除
            let initialResponseReceived = false;
            let inactivityTimer;
            // 初期応答タイムアウト
            const initialTimeout = setTimeout(() => {
                if (!initialResponseReceived) {
                    logger_1.logger.warn('⏰ Initial response timeout');
                    codexProcess.kill();
                    cleanup();
                    reject(new Error('Initial response timeout'));
                }
            }, timeouts.initialResponse);
            // 無反応タイマーをリセット
            const resetInactivityTimer = () => {
                clearTimeout(inactivityTimer);
                inactivityTimer = setTimeout(() => {
                    logger_1.logger.warn('⏰ Inactivity timeout: No output for 90s');
                    codexProcess.kill();
                    cleanup();
                    reject(new Error('Inactivity timeout'));
                }, timeouts.inactivity);
            };
            // プロンプト送信
            codexProcess.stdin.write(prompt);
            codexProcess.stdin.end();
            // stdout監視（シンプル）
            codexProcess.stdout.on('data', (chunk) => {
                const newData = chunk.toString();
                outputBuffer += newData;
                // 初期応答検出（シンプル判定）
                if (!initialResponseReceived && newData.length > 10) {
                    initialResponseReceived = true;
                    clearTimeout(initialTimeout);
                    logger_1.logger.info('✅ Initial response received');
                }
                // 最後の出力時間を更新 (削除)
                resetInactivityTimer();
            });
            // プロセス終了処理
            codexProcess.on('close', (code) => {
                cleanup();
                const processingTime = Date.now() - startTime;
                if (code === 0) {
                    // 正常終了：Token数と応答を抽出
                    const result = this.parseCodexOutput(outputBuffer, prompt, processingTime);
                    resolve(result);
                }
                else {
                    reject(new Error(`Codex process exited with code ${code}`));
                }
            });
            // エラー処理
            codexProcess.on('error', (error) => {
                cleanup();
                reject(error);
            });
            // クリーンアップ
            const cleanup = () => {
                clearTimeout(initialTimeout);
                clearTimeout(inactivityTimer);
                try {
                    fs.unlinkSync(tempFile);
                }
                catch (e) {
                    // ファイル削除失敗は無視
                }
            };
        });
    }
    /**
     * Codex出力の解析とToken数実数取得
     */
    parseCodexOutput(rawOutput, originalPrompt, processingTime) {
        // Token数の実数抽出（最重要）
        const tokenMatch = rawOutput.match(/\[.*?\] tokens used: (\d+)/);
        const actualTotalTokens = tokenMatch ? parseInt(tokenMatch[1]) : null;
        // 実際のレスポンス部分を抽出
        const response = this.extractActualResponse(rawOutput);
        let tokens;
        if (actualTotalTokens !== null) {
            // 実数Token取得成功
            const estimatedInputTokens = Math.ceil(originalPrompt.length / 4);
            const outputTokens = Math.max(0, actualTotalTokens - estimatedInputTokens);
            tokens = {
                input: estimatedInputTokens,
                output: outputTokens,
                total: actualTotalTokens
            };
            logger_1.logger.info('✅ Token count extracted from Codex', {
                total_actual: actualTotalTokens,
                input_estimated: estimatedInputTokens,
                output_calculated: outputTokens
            });
        }
        else {
            // 実数取得失敗：フォールバック推測
            const inputTokens = Math.ceil(originalPrompt.length / 4);
            const outputTokens = Math.ceil(response.length / 4);
            tokens = {
                input: inputTokens,
                output: outputTokens,
                total: inputTokens + outputTokens
            };
            logger_1.logger.warn('⚠️ Token count fallback to estimation', {
                input_estimated: inputTokens,
                output_estimated: outputTokens,
                total_estimated: tokens.total
            });
        }
        return {
            response,
            success: true,
            tokens,
            processingTime
        };
    }
    /**
     * 実際のレスポンス部分を抽出（シンプル版）
     */
    extractActualResponse(rawOutput) {
        try {
            // [timestamp] codex 以降から tokens used 以前までを抽出
            const codexMatch = rawOutput.match(/\[.*?\] codex\n([\s\S]*?)\[.*?\] tokens used:/);
            if (codexMatch && codexMatch[1]) {
                return codexMatch[1].trim();
            }
            // フォールバック：codex以降の内容
            const lines = rawOutput.split('\n');
            let codexStarted = false;
            let response = '';
            for (const line of lines) {
                if (line.includes('] codex')) {
                    codexStarted = true;
                    continue;
                }
                if (codexStarted) {
                    if (line.includes('tokens used:') || line.includes('Reading prompt from stdin')) {
                        break;
                    }
                    response += line + '\n';
                }
            }
            return response.trim() || rawOutput;
        }
        catch (error) {
            logger_1.logger.warn('Response parsing failed, returning raw output');
            return rawOutput;
        }
    }
    /**
     * 応答完了の簡単な判定
     */
    isResponseComplete(output) {
        return output.includes('tokens used:') &&
            output.includes('Reading prompt from stdin');
    }
    /**
     * Stuck状態の簡単な判定
     */
    isLikelyStuck(output, inactivityMs) {
        // シンプルな判定条件
        return inactivityMs > 30000 || // 30秒以上無出力
            (output.includes('[') && !output.includes('codex') && inactivityMs > 45000); // thinking段階で45秒以上
    }
}
exports.SimpleCodexTimeoutHandler = SimpleCodexTimeoutHandler;
exports.simpleCodexHandler = new SimpleCodexTimeoutHandler();
//# sourceMappingURL=simple-codex-timeout-handler.js.map