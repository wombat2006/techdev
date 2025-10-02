/**
 * OpenRouter経由でのQwen3-Coderプロバイダー
 * 480B MoE (35B active) コーディング特化モデル
 */

import { LLMProvider, LLMResponse } from './wall-bounce-analyzer';
import { logger } from '../utils/logger';
import { config } from '../config/environment';

export class OpenRouterQwen3Provider implements LLMProvider {
  name = 'openrouter-qwen3-coder';
  model = 'qwen/qwen3-coder';
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor() {
    this.apiKey = config.openrouter.apiKey;

    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is required for Qwen3-Coder provider');
    }
  }

  /**
   * Qwen3-Coder実行
   */
  async invoke(prompt: string, options?: { temperature?: number; maxTokens?: number }): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      logger.info('🤖 OpenRouter Qwen3-Coder実行開始', {
        model: this.model,
        promptLength: prompt.length
      });

      const response = await this.callOpenRouter(prompt, {
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 4096
      });

      const processingTime = Date.now() - startTime;

      logger.info('✅ OpenRouter Qwen3-Coder実行成功', {
        processingTime,
        tokens: response.tokens
      });

      return {
        content: response.content,
        text: response.content,
        confidence: this.calculateConfidence(response.content),
        reasoning: `OpenRouter Qwen3-Coder (480B MoE) 分析結果 (実行時間: ${Math.round(processingTime/1000)}秒)`,
        cost: response.cost,
        tokens: response.tokens
      };

    } catch (error) {
      logger.error('❌ OpenRouter Qwen3-Coder実行失敗', { error });

      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      throw new Error(`OpenRouter Qwen3-Coder実行失敗: ${errorMessage}`);
    }
  }

  /**
   * OpenRouter APIへのリクエスト
   */
  private async callOpenRouter(
    prompt: string,
    options: { temperature: number; maxTokens: number }
  ): Promise<{
    content: string;
    tokens: { input: number; output: number };
    cost: number;
  }> {
    const requestBody = {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: options.temperature,
      max_tokens: options.maxTokens
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://techsapo.ai',
        'X-Title': 'TechSapo Wall-Bounce System'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json() as any;
      const errorMessage = errorData.error?.message || response.statusText;
      throw new Error(`OpenRouter API error (${response.status}): ${errorMessage}`);
    }

    const data = await response.json() as any;

    // Extract response content
    const content = data.choices[0].message.content;

    // Extract token usage
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;

    // Calculate cost
    // Qwen3-Coder pricing: $0.22/M input, $0.95/M output
    const cost = this.calculateCost(inputTokens, outputTokens);

    return {
      content,
      tokens: {
        input: inputTokens,
        output: outputTokens
      },
      cost
    };
  }

  /**
   * コスト計算
   * Qwen3-Coder: $0.22/M input, $0.95/M output
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1_000_000) * 0.22;
    const outputCost = (outputTokens / 1_000_000) * 0.95;
    return inputCost + outputCost;
  }

  /**
   * 信頼度の計算
   */
  private calculateConfidence(response: string): number {
    if (!response || response.includes('Error') || response.includes('failed')) {
      return 0.1;
    }

    // レスポンス長と品質に基づく信頼度算出
    const wordCount = response.split(' ').length;
    const hasCode = response.includes('```') ||
                    response.includes('function') ||
                    response.includes('class') ||
                    response.includes('def ') ||
                    response.includes('const ') ||
                    response.includes('let ');
    const hasStructure = response.includes('\n') && response.length > 100;

    let confidence = Math.min(0.95, 0.6 + (wordCount / 300));

    if (hasCode) confidence += 0.15; // コーディング特化モデルとしてコード含有を高評価
    if (hasStructure) confidence += 0.05;

    return Math.max(0.1, Math.min(0.95, confidence));
  }

  /**
   * プロバイダー情報
   */
  toString(): string {
    return `${this.name} (${this.model})`;
  }
}

/**
 * ファクトリ関数
 */
export const createOpenRouterQwen3Provider = (): OpenRouterQwen3Provider => {
  return new OpenRouterQwen3Provider();
};
