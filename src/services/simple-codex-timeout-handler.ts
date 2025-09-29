/**
 * シンプルなCodexタイムアウト制御とToken数実数取得
 */

import { spawn } from 'child_process';
import { logger } from '../utils/logger';
import { config } from '../config/environment';

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

export class SimpleCodexTimeoutHandler {

  /**
   * シンプルな二段階タイムアウト制御
   */
  async executeCodexWithSmartTimeout(
    prompt: string,
    model: 'gpt-5' | 'gpt-5-codex' = 'gpt-5',
    timeouts: {
      initialResponse: number;  // 初期レスポンス待ち (デフォルト10分)
      inactivity: number;       // 無反応タイムアウト (デフォルト90秒)
    } = {
      initialResponse: config.wallBounce.enableTimeout ? (config.wallBounce.timeoutMs || 600000) : Number.MAX_SAFE_INTEGER,
      inactivity: config.wallBounce.enableTimeout ? (config.wallBounce.timeoutMs || 90000) : Number.MAX_SAFE_INTEGER
    }
  ): Promise<SimpleCodexResult> {

    const startTime = Date.now();
    const fs = require('fs');
    const path = require('path');

    const tempFile = path.join('/tmp', `codex-prompt-${Date.now()}.txt`);
    fs.writeFileSync(tempFile, prompt, 'utf8');

    return new Promise((resolve, reject) => {
      const codexProcess = spawn('codex', [
        'exec', '--model', model, '--skip-git-repo-check', '--json'
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let outputBuffer = '';
      // let lastOutputTime = Date.now(); // 未使用のため削除
      let initialResponseReceived = false;
      let inactivityTimer: ReturnType<typeof setTimeout> | undefined;

      // 初期応答タイムアウト
      const initialTimeout = setTimeout(() => {
        if (!initialResponseReceived) {
          logger.warn('⏰ Initial response timeout');
          codexProcess.kill();
          cleanup();
          reject(new Error('Initial response timeout'));
        }
      }, timeouts.initialResponse);

      // 無反応タイマーをリセット
      const resetInactivityTimer = () => {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
          logger.warn('⏰ Inactivity timeout: No output for 90s');
          codexProcess.kill();
          cleanup();
          reject(new Error('Inactivity timeout'));
        }, timeouts.inactivity);
      };

      // プロンプト送信
      codexProcess.stdin.write(prompt);
      codexProcess.stdin.end();

      // stdout監視（シンプル）
      codexProcess.stdout.on('data', (chunk: Buffer) => {
        const newData = chunk.toString();
        outputBuffer += newData;

        // 初期応答検出（シンプル判定）
        if (!initialResponseReceived && newData.length > 10) {
          initialResponseReceived = true;
          clearTimeout(initialTimeout);
          logger.info('✅ Initial response received');
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
        } else {
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
        } catch (e) {
          // ファイル削除失敗は無視
        }
      };
    });
  }

  /**
   * Codex出力の解析とToken数実数取得
   */
  private parseCodexOutput(
    rawOutput: string,
    originalPrompt: string,
    processingTime: number
  ): SimpleCodexResult {

    // JSON形式でトークン数を抽出
    let actualInputTokens: number | null = null;
    let actualOutputTokens: number | null = null;
    let actualTotalTokens: number | null = null;

    try {
      const lines = rawOutput.split('\n');
      // 最後のtoken_countメッセージを探す（最終的なトークン数が含まれる）
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        if (line.trim().startsWith('{"id":')) {
          const jsonData = JSON.parse(line);
          if (jsonData.msg && jsonData.msg.type === 'token_count' && jsonData.msg.info) {
            const tokenInfo = jsonData.msg.info;
            if (tokenInfo.last_token_usage) {
              // 最後のやり取りのトークン数を使用
              actualInputTokens = tokenInfo.last_token_usage.input_tokens;
              actualOutputTokens = tokenInfo.last_token_usage.output_tokens;
              actualTotalTokens = tokenInfo.last_token_usage.total_tokens;
              break;
            }
          }
        }
      }
    } catch (e) {
      // JSON解析失敗時は従来の方法でフォールバック
      const tokenMatch = rawOutput.match(/\[.*?\] tokens used: (\d+)/);
      actualTotalTokens = tokenMatch ? parseInt(tokenMatch[1]) : null;
    }

    // 実際のレスポンス部分を抽出
    const response = this.extractActualResponse(rawOutput);

    let tokens: { input: number; output: number; total: number };

    if (actualInputTokens !== null && actualOutputTokens !== null) {
      // 実数Token取得成功
      tokens = {
        input: actualInputTokens,
        output: actualOutputTokens,
        total: actualInputTokens + actualOutputTokens
      };

      logger.info('✅ Token count extracted from Codex', {
        input_actual: actualInputTokens,
        output_actual: actualOutputTokens,
        total_actual: actualInputTokens + actualOutputTokens
      });

    } else {
      // 実数取得失敗：フォールバック推測
      const inputTokens = Math.ceil(originalPrompt.length / 4);
      const outputTokens = Math.ceil(response.length / 4);

      tokens = {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens
      };

      logger.warn('⚠️ Token count fallback to estimation', {
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
   * 実際のレスポンス部分を抽出（JSON対応版）
   */
  private extractActualResponse(rawOutput: string): string {
    try {
      // JSON形式から agent_message を探す
      const lines = rawOutput.split('\n');

      for (const line of lines) {
        if (line.trim().startsWith('{"id":')) {
          try {
            const jsonData = JSON.parse(line);
            if (jsonData.msg && jsonData.msg.type === 'agent_message' && jsonData.msg.message) {
              return jsonData.msg.message;
            }
          } catch (e) {
            // JSON解析失敗は無視して次の行へ
            continue;
          }
        }
      }

      // フォールバック：従来の形式で解析
      // [timestamp] codex 以降から tokens used 以前までを抽出
      const codexMatch = rawOutput.match(/\[.*?\] codex\n([\s\S]*?)\[.*?\] tokens used:/);
      if (codexMatch && codexMatch[1]) {
        return codexMatch[1].trim();
      }

      // フォールバック：codex以降の内容
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

    } catch (error) {
      logger.warn('Response parsing failed, returning raw output');
      return rawOutput;
    }
  }

  /**
   * 応答完了の簡単な判定
   */
  isResponseComplete(output: string): boolean {
    return output.includes('tokens used:') &&
           output.includes('Reading prompt from stdin');
  }

  /**
   * Stuck状態の簡単な判定
   */
  isLikelyStuck(output: string, inactivityMs: number): boolean {
    // シンプルな判定条件
    // タイムアウト無効化時は常にfalse
    if (!config.wallBounce.enableTimeout) return false;
    
    return inactivityMs > 30000 || // 30秒以上無出力
           (output.includes('[') && !output.includes('codex') && inactivityMs > 45000); // thinking段階で45秒以上
  }
}

export const simpleCodexHandler = new SimpleCodexTimeoutHandler();