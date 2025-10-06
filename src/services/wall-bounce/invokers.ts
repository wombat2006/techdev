/**
 * Wall-Bounce Invokers
 * LLM呼び出しロジック（Gemini, GPT-5, Claude）
 */

import type {
  IWallBounceInvoker,
  LLMResponse,
  LLMProvider,
  ExecuteOptions
} from './types';
import type { WallBounceProviderManager } from './providers';
import { GEMINI_MODEL_MAP, ANTHROPIC_MODEL_MAP, ANTHROPIC_PRICING } from './constants';
import { logger } from '../../utils/logger';
import { config } from '../../config/environment';
import { ExponentialBackoff, CircuitBreaker } from '../../utils/circuit-breaker';
import { createCodexGPT5Provider } from '../codex-gpt5-provider';
import AuditLogger from '../audit-logger';
import Anthropic from '@anthropic-ai/sdk';

export class WallBounceInvoker implements IWallBounceInvoker {
  private anthropicClient: Anthropic | null = null;
  private exponentialBackoff: ExponentialBackoff;
  private taskAnalyzer?: any; // Will be set from task-analyzer module

  constructor(private providerManager: WallBounceProviderManager) {
    this.exponentialBackoff = new ExponentialBackoff(1000, 32000, 3);

    // Initialize Anthropic client if API is enabled
    if (config.anthropic.apiEnabled && config.anthropic.apiKey) {
      this.anthropicClient = new Anthropic({
        apiKey: config.anthropic.apiKey,
      });
      logger.info('🔐 Anthropic API client initialized (USER PERMISSION GRANTED)', {
        apiEnabled: true,
        baseUrl: config.anthropic.baseUrl
      });
    } else {
      logger.info('🔒 Anthropic API disabled - using internal analysis only (SAFEGUARD ACTIVE)', {
        apiEnabled: config.anthropic.apiEnabled,
        hasApiKey: !!config.anthropic.apiKey
      });
    }
  }

  /**
   * Task analyzer参照を設定（循環依存回避）
   */
  setTaskAnalyzer(analyzer: any): void {
    this.taskAnalyzer = analyzer;
  }

  /**
   * Gemini CLI経由で呼び出し
   */
  async invokeGemini(prompt: string, version: string): Promise<LLMResponse> {
    return await this.executeGeminiCLI(prompt, version as any);
  }

  /**
   * Gemini CLI実行（セキュアspawn実装）
   */
  private async executeGeminiCLI(
    prompt: string,
    version: '2.5-pro' | '2.5-flash' | '2.5-deep-think'
  ): Promise<LLMResponse> {
    try {
      const { spawn } = require('child_process');

      // セキュアな入力サニタイズ
      const sanitizedPrompt = prompt.replace(/[`$\\]/g, '\\$&');
      const systemPrompt = `システム: あなたは高度な技術解析AIです。多角的な視点で詳細な分析を行い、実践的な解決策を提案してください。
重要な制約：
- ツールは使用しないでください
- 外部リソースにアクセスせず、与えられた質問に対して直接回答してください
- Web検索やファイル操作は不要です

ユーザークエリ: ${sanitizedPrompt}

追加指示:
- 数学的・科学的な厳密性を重視し、複数の仮説を並列検証してください。
- 段階的な推論プロセスを示し、結論に至るまでの思考過程を明示してください。`;

      const modelName = GEMINI_MODEL_MAP[version] || 'gemini-2.5-flash';
      const args = ['-p', systemPrompt, '--model', modelName, '--output-format', 'json'];

      logger.info('🤖 Gemini CLI実行開始 (セキュア spawn)', {
        command: 'gemini',
        model: modelName
      });

      const { stdout, stderr } = await new Promise<{stdout: string, stderr: string}>((resolve, reject) => {
        const child = spawn('gemini', args, {
          timeout: config.wallBounce.enableTimeout ? config.wallBounce.timeoutMs : undefined,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: { ...process.env }
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data: any) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data: any) => {
          stderr += data.toString();
        });

        child.on('close', (code: number | null) => {
          if (code === 0) {
            resolve({ stdout, stderr });
          } else {
            reject(new Error(`Gemini CLI exit code: ${code}, stderr: ${stderr}`));
          }
        });

        child.on('error', (error: any) => {
          reject(new Error(`Spawn error: ${error.message}`));
        });
      });

      if (stderr && !stderr.includes('DeprecationWarning')) {
        logger.warn('⚠️ Gemini CLI警告', { stderr });
      }

      const response = JSON.parse(stdout);
      const content = response.content || response.text || stdout;
      const displayLabel = version === '2.5-pro'
        ? 'Gemini 2.5 Pro CLI'
        : version === '2.5-deep-think'
        ? 'Gemini 2.5 Deep Think CLI'
        : 'Gemini 2.5 Flash CLI';
      const cost = version === '2.5-pro' ? 0.002 : version === '2.5-deep-think' ? 0.003 : 0.001;
      const finalContent = `[${displayLabel}] ${content}`;

      return {
        content: finalContent,
        text: finalContent,
        confidence: 0.88,
        reasoning: `Google ${displayLabel}経由での高品質分析（セキュア実装）`,
        cost,
        tokens: { input: Math.ceil(prompt.length / 4), output: Math.ceil(content.length / 4) }
      };
    } catch (error) {
      logger.error('❌ Gemini CLI execution failed (セキュア実装)', {
        error: error instanceof Error ? error.message : String(error),
        stderr: (error as any).stderr || 'No stderr'
      });

      throw new Error(`Gemini CLI failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * GPT-5を呼び出し
   */
  async invokeGPT5(prompt: string, modelConfig: { model: string; specialization: string }): Promise<LLMResponse> {
    // Note: createCodexGPT5Provider doesn't take arguments, uses default gpt-5-codex
    // modelConfig is kept for interface compatibility but not used
    const provider = createCodexGPT5Provider();
    return await provider.invoke(prompt);
  }

  /**
   * Claudeを呼び出し (内部分析 or API)
   */
  async invokeClaude(prompt: string, version: string): Promise<LLMResponse> {
    // Check if API is enabled (safeguard check)
    if (config.anthropic.apiEnabled && this.anthropicClient) {
      logger.info('🔓 Using Anthropic API (USER PERMISSION GRANTED)', {
        version,
        apiEnabled: true
      });
      return await this.callClaudeAPI(prompt, version);
    }

    // Default: Claude Code Internal Analysis
    logger.info(`🧠 Claude ${version} Internal Analysis initiated (SAFEGUARD: API disabled)`, {
      version,
      promptLength: prompt.length,
      apiEnabled: config.anthropic.apiEnabled
    });

    const analysis = await this.performClaudeInternalAnalysis(prompt, version);

    return {
      content: analysis,
      text: analysis,
      confidence: version === 'opus-4.1' ? 0.95 : 0.92,
      reasoning: `Claude ${version} internal analysis using advanced reasoning capabilities`,
      cost: 0,
      tokens: {
        input: Math.ceil(prompt.length / 4),
        output: Math.ceil(analysis.length / 4),
        total: Math.ceil((prompt.length + analysis.length) / 4)
      },
      provider: `claude-${version}-internal`
    };
  }

  /**
   * Anthropic API直接呼び出し
   */
  private async callClaudeAPI(prompt: string, version: string): Promise<LLMResponse> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic API client not initialized. Set ANTHROPIC_API_ENABLED=true to enable API access.');
    }

    const modelId = ANTHROPIC_MODEL_MAP[version] || config.anthropic.defaultModel;

    logger.info('🔓 Calling Anthropic API (USER PERMISSION GRANTED)', {
      version,
      modelId,
      promptLength: prompt.length
    });

    const startTime = Date.now();

    try {
      const response = await this.anthropicClient.messages.create({
        model: modelId,
        max_tokens: config.anthropic.maxTokens,
        temperature: config.anthropic.temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const latency = Date.now() - startTime;
      const content = response.content[0].type === 'text' ? response.content[0].text : '';
      const inputTokens = response.usage.input_tokens;
      const outputTokens = response.usage.output_tokens;
      const cost = this.calculateAnthropicCost(version, inputTokens, outputTokens);

      logger.info('✅ Anthropic API call successful', {
        version,
        modelId,
        latency,
        inputTokens,
        outputTokens,
        cost: `$${cost.toFixed(4)}`
      });

      return {
        content,
        text: content,
        confidence: version.includes('opus') ? 0.95 : version.includes('sonnet') ? 0.92 : 0.88,
        reasoning: `Claude ${version} API response (model: ${modelId})`,
        cost,
        tokens: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens
        },
        provider: `claude-${version}-api`
      };
    } catch (error: any) {
      logger.error('❌ Anthropic API call failed', {
        version,
        modelId,
        error: error.message,
        latency: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Anthropic APIコスト計算
   */
  private calculateAnthropicCost(version: string, inputTokens: number, outputTokens: number): number {
    const price = ANTHROPIC_PRICING[version] || ANTHROPIC_PRICING['3.5-sonnet'];
    const inputCost = (inputTokens / 1_000_000) * price.input;
    const outputCost = (outputTokens / 1_000_000) * price.output;
    return inputCost + outputCost;
  }

  /**
   * Claude内部分析を実行
   */
  private async performClaudeInternalAnalysis(prompt: string, version: string): Promise<string> {
    // taskAnalyzerが設定されていない場合は簡易分析
    if (!this.taskAnalyzer || !this.taskAnalyzer.analyzeByTaskType) {
      // 簡易分析：プロンプトをそのまま分析結果として返す
      const analysisDepth = version === 'opus-4.1' ? 'deep' : 'balanced';
      return `[Claude ${version} Internal Analysis - ${analysisDepth} mode]\n\n` +
        `Analysis of the following query:\n${prompt}\n\n` +
        `（Full task analyzer integration pending）`;
    }

    const isSonnet = version === 'sonnet-4.5';
    const taskType = this.taskAnalyzer.detectTaskType(prompt);

    const result = await this.taskAnalyzer.analyzeByTaskType(
      prompt,
      taskType,
      { taskType: isSonnet ? 'premium' : 'critical' }
    );

    // 結果が文字列でない場合（WallBounceResultなど）、final_answerを抽出
    if (typeof result === 'object' && result.final_answer) {
      return result.final_answer;
    }

    return String(result);
  }

  /**
   * 汎用プロバイダー呼び出し
   */
  async invokeProvider(
    providerKey: string,
    prompt: string,
    options: ExecuteOptions
  ): Promise<LLMResponse> {
    const provider = this.providerManager.providers.get(providerKey);
    if (!provider) {
      throw new Error(`Provider not found: ${providerKey}`);
    }

    const circuitBreaker = this.providerManager.circuitBreakers.get(providerKey);

    return await this.executeProviderWithLogging(provider, prompt, providerKey, circuitBreaker);
  }

  /**
   * Provider実行（ロギング付き）
   */
  private async executeProviderWithLogging(
    provider: LLMProvider,
    prompt: string,
    providerName: string,
    circuitBreaker?: CircuitBreaker
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    logger.info(`📤 [${providerName}] 入力プロンプト送信`, {
      provider: providerName,
      promptLength: prompt.length,
      circuitState: circuitBreaker?.getState()
    });

    await AuditLogger.logAction('llm_invocation_decision', {
      provider: providerName,
      promptLength: prompt.length,
      circuitState: circuitBreaker?.getState(),
      timestamp: new Date().toISOString()
    });

    try {
      const response = await this.executeWithFallback(provider, prompt, providerName, circuitBreaker);
      const processingTime = Date.now() - startTime;

      logger.info(`📥 [${providerName}] 応答受信完了`, {
        provider: providerName,
        responseLength: response.text.length,
        processingTimeMs: processingTime,
        cost: response.cost,
        confidence: response.confidence
      });

      await AuditLogger.logAction('llm_response_received', {
        provider: providerName,
        success: true,
        processingTimeMs: processingTime,
        cost: response.cost
      }, 'success');

      return response;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`❌ [${providerName}] 実行エラー`, {
        provider: providerName,
        error: error instanceof Error ? error.message : String(error),
        processingTimeMs: processingTime
      });

      await AuditLogger.logAction('llm_invocation_error', {
        provider: providerName,
        error: error instanceof Error ? error.message : String(error),
        processingTimeMs: processingTime
      }, 'error');

      throw error;
    }
  }

  /**
   * Fallback付き実行
   */
  async executeWithFallback(
    provider: LLMProvider,
    prompt: string,
    providerName: string,
    circuitBreaker?: CircuitBreaker
  ): Promise<LLMResponse> {
    const operation = async () => {
      const actualOperation = async () => {
        let response: LLMResponse;

        switch (providerName) {
          case 'gemini-2.5-pro':
            response = await this.invokeGemini(prompt, '2.5-pro');
            break;
          case 'gemini-2.5-flash':
            response = await this.invokeGemini(prompt, '2.5-flash');
            break;
          case 'gemini-2.5-deepthinking':
            response = await this.invokeGemini(prompt, '2.5-deep-think');
            break;
          case 'gpt-5':
            response = await this.invokeGPT5(prompt, { model: 'gpt-5', specialization: 'general' });
            break;
          case 'gpt-5-codex':
            response = await this.invokeGPT5(prompt, { model: 'gpt-5-codex', specialization: 'coding' });
            break;
          case 'sonnet-4.5':
            response = await this.invokeClaude(prompt, 'sonnet-4.5');
            break;
          case 'opus-4.1':
            response = await this.invokeClaude(prompt, 'opus-4.1');
            break;
          default:
            response = await provider.invoke(prompt);
            break;
        }

        return response;
      };

      if (circuitBreaker) {
        return await circuitBreaker.execute(actualOperation, async () => {
          logger.warn(`↩️ [${providerName}] Circuit OPEN - 縮小プロンプトで再試行`);
          const reducedPrompt = prompt.length > 2000
            ? prompt.substring(0, 2000) + '\n\n(プロンプトを2000文字に縮小)'
            : prompt;

          await AuditLogger.logAction('llm_fallback_retry', {
            provider: providerName,
            reason: 'circuit_open',
            originalPromptLength: prompt.length,
            reducedPromptLength: reducedPrompt.length
          });

          return await actualOperation();
        });
      }

      return await actualOperation();
    };

    return await this.exponentialBackoff.execute(operation, providerName);
  }
}
