/**
 * Codex MCP経由でのGPT-5プロバイダー
 * OpenAI API KEY不要でCodex CLI経由でGPT-5を利用
 */

import { spawn, spawnSync } from 'child_process';
import { LLMProvider, LLMResponse } from './wall-bounce-analyzer';
import { logger } from '../utils/logger';
import { simpleCodexHandler, SimpleCodexResult } from './simple-codex-timeout-handler';

export class CodexGPT5Provider implements LLMProvider {
  name = 'codex-gpt5';
  model = 'gpt-5-codex';

  private static codexCliValidated = false;
  private static codexCliValidationError: Error | null = null;

  private readonly maxHandlerAttempts = 2;
  private readonly retryBackoffMs = [250, 750];

  /**
   * Codex MCP経由でGPT-5を実行
   */
  async invoke(prompt: string, options?: { initialResponse?: number; inactivity?: number }): Promise<LLMResponse> {
    try {
      if (!prompt || !prompt.trim()) {
        throw new Error('Codex MCP実行失敗: Prompt is empty');
      }

      const promptPreview = prompt.length > 100 ? `${prompt.substring(0, 100)}...` : prompt;

      logger.info('🤖 Codex GPT-5 Codex実行開始', {
        model: this.model,
        prompt: promptPreview
      });

      // Wall-Bounce用の高速タイムアウト制御
      const timeoutOptions = {
        initialResponse: 30000,
        inactivity: 20000,
        ...(options ?? {})
      };
      const attempts = Math.max(1, this.maxHandlerAttempts);
      const handlerErrors: Error[] = [];

      let result: SimpleCodexResult | undefined;

      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          if (attempt > 1) {
            logger.warn('🔁 Retrying Codex handler execution', { attempt });
          }
          result = await simpleCodexHandler.executeCodexWithSmartTimeout(
            prompt,
            'gpt-5-codex',
            timeoutOptions
          );
          break;
        } catch (handlerError) {
          const normalized = handlerError instanceof Error
            ? handlerError
            : new Error(String(handlerError));
          handlerErrors.push(normalized);
          logger.warn('⚠️ Codex handler attempt failed', {
            attempt,
            error: normalized.message
          });

          const backoff = this.retryBackoffMs[Math.min(attempt - 1, this.retryBackoffMs.length - 1)] ?? 0;
          if (attempt < attempts && backoff > 0) {
            await this.delay(backoff);
          }
        }
      }

      if (!result) {
        logger.info('🛟 Falling back to direct Codex MCP execution');
        result = await this.executeCodexMCP(prompt, {
          timeoutMs: timeoutOptions.initialResponse,
          retries: 2,
          previousErrors: handlerErrors
        });
      }

      const actualCost = this.calculateActualCost(result.tokens.total);

      return {
        content: result.response,
        text: result.response, // Alias for compatibility
        confidence: this.calculateConfidence(result.response),
        reasoning: `Codex MCP経由でのGPT-5 Codex分析結果 (実行時間: ${Math.round(result.processingTime/1000)}秒)`,
        cost: actualCost,
        tokens: {
          input: result.tokens.input,
          output: result.tokens.output
        }
      };

    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));

      logger.error('❌ Codex GPT-5 Codex実行失敗', {
        error: normalizedError.message,
        stack: normalizedError.stack
      });

      throw new Error(`Codex MCP実行失敗: ${normalizedError.message}`);
    }
  }

  /**
   * Codex MCP経由でのプロンプト実行（シンプル版）
   */
  private async executeCodexMCP(prompt: string, options?: { timeoutMs?: number; retries?: number; previousErrors?: Error[] }): Promise<SimpleCodexResult> {
    const timeoutMs = options?.timeoutMs ?? 30000;
    const retries = Math.max(1, options?.retries ?? 1);

    this.ensureCodexCliIsAvailable();

    logger.info('🔄 Codex MCP実行開始', {
      promptLength: prompt.length,
      timeoutMs,
      retries
    });

    const aggregatedErrors = options?.previousErrors ? [...options.previousErrors] : [];

    for (let attempt = 1; attempt <= retries; attempt += 1) {
      try {
        const result = await this.runCodexProcess(prompt, timeoutMs);
        logger.info('✅ Codex MCP実行成功', {
          attempt,
          responseLength: result.response.length
        });
        return result;
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error));
        aggregatedErrors.push(normalizedError);
        logger.warn('⚠️ Codex MCP execution attempt failed', {
          attempt,
          message: normalizedError.message
        });

        if (attempt < retries) {
          const backoff = this.retryBackoffMs[Math.min(attempt - 1, this.retryBackoffMs.length - 1)] ?? 500;
          await this.delay(backoff > 0 ? backoff : 500);
        }
      }
    }

    const errorMessages = aggregatedErrors.map((err, index) => `attempt ${index + 1}: ${err.message}`);
    throw new Error(`Codex MCP実行失敗: ${errorMessages.join('; ')}`);
  }

  private ensureCodexCliIsAvailable(): void {
    if (CodexGPT5Provider.codexCliValidated) return;

    if (CodexGPT5Provider.codexCliValidationError) {
      throw CodexGPT5Provider.codexCliValidationError;
    }

    const check = spawnSync('codex', ['--version'], {
      encoding: 'utf8',
      timeout: 2000
    });

    if (check.error) {
      const error = new Error(`codex CLI not available: ${check.error.message}`);
      CodexGPT5Provider.codexCliValidationError = error;
      throw error;
    }

    if (typeof check.status === 'number' && check.status !== 0) {
      const stderr = (check.stderr || '').toString().trim();
      const stdout = (check.stdout || '').toString().trim();
      const detail = stderr || stdout || 'no diagnostic output';
      const error = new Error(`codex CLI validation failed with exit code ${check.status}: ${detail}`);
      CodexGPT5Provider.codexCliValidationError = error;
      throw error;
    }

    CodexGPT5Provider.codexCliValidated = true;
    logger.debug('codex CLI validation succeeded');
  }

  private runCodexProcess(prompt: string, timeoutMs: number): Promise<SimpleCodexResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const codexProcess = spawn('codex', [
        'exec',
        '--model', this.model,
        '--sandbox', 'read-only',
        '--approval-policy', 'never'
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let completed = false;

      const timeoutHandle = setTimeout(() => {
        if (completed) {
          return;
        }
        completed = true;
        codexProcess.kill('SIGKILL');
        const timeoutError = new Error(`Codex CLI timed out after ${timeoutMs}ms`);
        timeoutError.name = 'CodexTimeoutError';
        clearTimeout(timeoutHandle);
        reject(timeoutError);
      }, timeoutMs);

      const concludeSuccess = (result: SimpleCodexResult) => {
        if (completed) {
          return;
        }
        completed = true;
        clearTimeout(timeoutHandle);
        resolve(result);
      };

      const concludeFailure = (error: Error) => {
        if (completed) {
          return;
        }
        completed = true;
        clearTimeout(timeoutHandle);
        reject(error);
      };

      codexProcess.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });

      codexProcess.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });

      codexProcess.on('error', (processError: Error) => {
        concludeFailure(processError);
      });

      codexProcess.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
        if (code === 0) {
          const response = this.parseCodexResponse(stdout);
          const tokens = this.estimateTokens(prompt, response);
          const totalTokens = tokens.input + tokens.output;

          concludeSuccess({
            response,
            success: true,
            tokens: {
              input: tokens.input,
              output: tokens.output,
              total: totalTokens
            },
            processingTime: Date.now() - startTime
          });
        } else {
          const snippet = (stderr || stdout).toString().trim().slice(0, 500);
          const error = new Error(`Codex CLI exited abnormally (code=${code}, signal=${signal}): ${snippet || 'no output captured'}`);
          concludeFailure(error);
        }
      });

      codexProcess.stdin.write(prompt);
      codexProcess.stdin.end();
    });
  }

  private delay(durationMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, durationMs));
  }

  /**
   * Codexの出力からレスポンスを抽出
   */
  private parseCodexResponse(stdout: string): string {
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

    } catch (error) {
      logger.warn('Codex response parsing failed, returning raw output');
      return stdout;
    }
  }

  /**
   * 信頼度の計算
   */
  private calculateConfidence(response: string): number {
    if (!response || response.includes('Error') || response.includes('failed')) {
      return 0.1;
    }

    // レスポンス長と品質に基づく簡易信頼度算出
    const wordCount = response.split(' ').length;
    const hasCode = response.includes('```') || response.includes('def ') || response.includes('function');

    let confidence = Math.min(0.95, 0.5 + (wordCount / 200)); // 単語数ベース
    if (hasCode) confidence += 0.1; // コード含有ボーナス

    return Math.max(0.1, Math.min(0.95, confidence));
  }

  /**
   * 実際のToken数に基づくコスト計算
   */
  private calculateActualCost(totalTokens: number): number {
    // GPT-5 Codex推定コスト: $0.03/1K input + $0.06/1K output
    const inputTokens = Math.floor(totalTokens * 0.6);
    const outputTokens = Math.floor(totalTokens * 0.4);

    return (inputTokens / 1000) * 0.03 + (outputTokens / 1000) * 0.06;
  }

  /**
   * コスト見積もり（フォールバック用）
   */
  private estimateCost(tokens: number): number {
    // GPT-5推定コスト: $0.03/1K input + $0.06/1K output
    const inputTokens = Math.floor(tokens * 0.6);
    const outputTokens = Math.floor(tokens * 0.4);

    return (inputTokens / 1000) * 0.03 + (outputTokens / 1000) * 0.06;
  }

  /**
   * トークン数見積もり
   */
  private estimateTokens(prompt: string, response: string): { input: number; output: number } {
    // 4文字 ≈ 1トークンの概算
    const input = Math.ceil(prompt.length / 4);
    const output = Math.ceil(response.length / 4);

    return { input, output };
  }

  /**
   * プロバイダー情報
   */
  toString(): string {
    return `${this.name} (${this.model})`;
  }
}

// ファクトリ関数
export const createCodexGPT5Provider = (): CodexGPT5Provider => {
  return new CodexGPT5Provider();
};
