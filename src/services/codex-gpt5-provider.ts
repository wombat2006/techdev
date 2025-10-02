/**
 * Codex MCP経由でのGPT-5プロバイダー
 * OpenAI API KEY不要でCodex CLI経由でGPT-5を利用
 */

import { LLMProvider, LLMResponse } from './wall-bounce-analyzer';
import { logger } from '../utils/logger';
import { simpleCodexHandler } from './simple-codex-timeout-handler';

export class CodexGPT5Provider implements LLMProvider {
  name = 'codex-gpt5';
  model = 'gpt-5-codex';

  /**
   * Codex MCP経由でGPT-5を実行
   */
  async invoke(prompt: string, options?: { initialResponse?: number; inactivity?: number }): Promise<LLMResponse> {
    try {
      logger.info('🤖 Codex GPT-5 Codex実行開始', {
        model: this.model,
        prompt: prompt.substring(0, 100) + '...'
      });

      // Wall-Bounce用の高速タイムアウト制御
      const timeoutOptions = {
        initialResponse: 30000,
        inactivity: 20000,
        ...(options ?? {})
      };
      const result = await simpleCodexHandler.executeCodexWithSmartTimeout(
        prompt,
        'gpt-5-codex',
        timeoutOptions
      );

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
      logger.error('❌ Codex GPT-5 Codex実行失敗', { error });

      // 本番環境では明示的エラーを投げる（モック応答なし）
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      throw new Error(`Codex MCP実行失敗: ${errorMessage}`);
    }
  }

  /**
   * Codex MCP経由でのプロンプト実行（シンプル版）
   */
  private async executeCodexMCP(prompt: string, options?: { timeoutMs?: number }): Promise<{
    response: string;
    success: boolean;
    tokens?: { input: number; output: number };
  }> {
    try {
      logger.info('🔄 Codex MCP実行開始', { promptLength: prompt.length });
      if (options?.timeoutMs) {
        logger.debug('Codex MCP custom timeout applied', { timeoutMs: options.timeoutMs });
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
      
      logger.info('📤 Codex実行中...', { command: command.substring(0, 100) + '...' });

      const stdout = execSync(command, {
        timeout: 30000,
        encoding: 'utf8',
        maxBuffer: 2 * 1024 * 1024, // 2MB buffer
        stdio: ['inherit', 'pipe', 'pipe']
      });

      // 一時ファイル削除
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        // 削除失敗は無視
      }

      const response = this.parseCodexResponse(stdout);
      
      logger.info('✅ Codex MCP実行成功', { 
        responseLength: response.length,
        success: true 
      });

      return {
        response,
        success: true,
        tokens: this.estimateTokens(prompt, response)
      };

    } catch (error) {
      logger.error('❌ Codex実行失敗', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // 本番環境では明示的エラーを投げる（モック応答なし）
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Codex MCP実行失敗: ${errorMessage}`);
    }
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
